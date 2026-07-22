/**
 * Panorama Home Center — Agente de monitoramento
 * ------------------------------------------------------------
 * Roda em cada computador/servidor (Windows ou Linux), coleta métricas
 * básicas e envia para a API central via HTTPS a cada intervalo fixo.
 *
 * Configuração: lida de um arquivo "config.json" na MESMA pasta do
 * executável (veja config.exemplo.json). Também aceita variáveis de
 * ambiente (PANORAMA_API_URL, PANORAMA_AGENT_TOKEN, PANORAMA_INTERVAL_MS),
 * que têm prioridade sobre o arquivo — útil para testes rápidos.
 *
 * Este script é o mesmo usado tanto rodando via `node agente-exemplo.js`
 * quanto compilado como executável standalone (pkg) — não precisa de
 * Node.js instalado na máquina de destino quando compilado.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const si = require("systeminformation");

const TASK_NAME = "PanoramaAgent";

function carregarConfig() {
  // process.pkg só existe quando rodando dentro do executável compilado —
  // nesse caso, usamos a pasta onde o .exe está, não uma pasta temporária interna.
  const dirBase = process.pkg ? path.dirname(process.execPath) : __dirname;
  const configPath = path.join(dirBase, "config.json");

  let arquivo = {};
  if (fs.existsSync(configPath)) {
    try {
      arquivo = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (e) {
      console.error(`[agente] Falha ao ler ${configPath}:`, e.message);
    }
  }

  // Permite passar o token como argumento na primeira execução (ex.: um
  // atalho "panorama-agent.exe SEU_TOKEN"). Uma vez gravado em config.json,
  // as próximas execuções (inclusive via tarefa agendada) não precisam mais
  // do argumento.
  const tokenArg = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
  if (tokenArg && tokenArg !== arquivo.token) {
    arquivo.token = tokenArg;
    try {
      fs.writeFileSync(configPath, JSON.stringify(arquivo, null, 2));
      console.log(`[agente] Token gravado em ${configPath}.`);
    } catch (e) {
      console.error(`[agente] Não consegui gravar ${configPath}:`, e.message);
    }
  }

  return {
    apiUrl: process.env.PANORAMA_API_URL || arquivo.apiUrl || "https://painel.panoramahc.com.br/api",
    token: process.env.PANORAMA_AGENT_TOKEN || arquivo.token,
    intervalMs: Number(process.env.PANORAMA_INTERVAL_MS || arquivo.intervalMs || 60000),
    configPath,
  };
}

const config = carregarConfig();

if (!config.token) {
  console.error(
    `[agente] Token não configurado. Coloque um "config.json" com {"token": "...", "apiUrl": "..."} na mesma pasta do executável, ou rode "panorama-agent.exe SEU_TOKEN" uma vez. Encerrando.`
  );
  process.exit(1);
}

// Se estiver rodando como o .exe compilado no Windows, se registra sozinho
// para iniciar com o sistema — assim a pessoa só precisa dar 2 cliques (ou
// "Executar como Administrador") UMA vez; nas próximas vezes o Windows já
// inicia o agente automaticamente, sem precisar rodar nada manualmente.
function garantirInicioAutomatico() {
  if (process.platform !== "win32" || !process.pkg) return;

  try {
    execFileSync("schtasks", ["/query", "/tn", TASK_NAME], { stdio: "ignore" });
    return; // já está instalado
  } catch {
    // ainda não existe — tenta criar abaixo
  }

  const exePath = process.execPath;

  try {
    // Precisa ser Administrador: roda mesmo sem ninguém logado, reinicia com a máquina.
    execFileSync(
      "schtasks",
      ["/create", "/tn", TASK_NAME, "/tr", `"${exePath}"`, "/sc", "onstart", "/ru", "SYSTEM", "/rl", "HIGHEST", "/f"],
      { stdio: "ignore" }
    );
    console.log(`[agente] Instalado para iniciar sozinho com o Windows (tarefa "${TASK_NAME}").`);
    return;
  } catch {
    // sem privilégio de Administrador — tenta um modo que não exige elevação
  }

  try {
    execFileSync("schtasks", ["/create", "/tn", TASK_NAME, "/tr", `"${exePath}"`, "/sc", "onlogon", "/f"], {
      stdio: "ignore",
    });
    console.log(
      `[agente] Instalado para iniciar sozinho ao entrar no Windows (tarefa "${TASK_NAME}"). Para iniciar mesmo sem login, dê 1 clique com "Executar como Administrador".`
    );
  } catch (e) {
    console.warn(
      `[agente] Não consegui me registrar para iniciar sozinho (${e.message}). Vou continuar rodando agora, mas não sobrevivo a um reinício — dê 1 clique com "Executar como Administrador" para isso ficar automático.`
    );
  }
}

garantirInicioAutomatico();

// Coleta as métricas atuais da máquina (mesma chamada funciona em Windows e Linux)
async function coletarMetricas() {
  const [cpuLoad, mem, fsSize, osInfo, sysInfo] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.osInfo(),
    si.system(),
  ]);

  const discoPrincipal = fsSize[0] || { size: 0, used: 0 };

  return {
    hostname: os.hostname(),
    so: `${osInfo.distro} ${osInfo.release}`.trim(),
    arquitetura: osInfo.arch,
    fabricante: sysInfo.manufacturer,
    modelo: sysInfo.model,
    cpu_pct: Number(cpuLoad.currentLoad.toFixed(1)),
    mem_pct: Number(((mem.active / mem.total) * 100).toFixed(1)),
    mem_total_gb: Number((mem.total / 1e9).toFixed(1)),
    disco_pct: discoPrincipal.size
      ? Number(((discoPrincipal.used / discoPrincipal.size) * 100).toFixed(1))
      : null,
    disco_total_gb: Number((discoPrincipal.size / 1e9).toFixed(1)),
    uptime_s: os.uptime(),
    timestamp: new Date().toISOString(),
  };
}

async function enviarCheckin(payload) {
  // fetch nativo do Node 18+ — sem dependência externa (node-fetch),
  // o que deixa o executável compilado (pkg) mais simples e leve.
  const resposta = await fetch(`${config.apiUrl}/agents/checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resposta.ok) {
    throw new Error(`Checkin falhou: HTTP ${resposta.status}`);
  }

  return resposta.json();
}

async function cicloDeChekin() {
  try {
    const metricas = await coletarMetricas();
    await enviarCheckin(metricas);
    console.log(`[agente] Checkin OK — CPU ${metricas.cpu_pct}% | MEM ${metricas.mem_pct}% | DISCO ${metricas.disco_pct}%`);
  } catch (erro) {
    // Em produção: guardar o payload numa fila local (arquivo/sqlite) e
    // reenviar no próximo ciclo, para não perder dados quando a rede cair.
    console.error("[agente] Erro no checkin:", erro.message);
  }
}

console.log(`[agente] Iniciando — enviando para ${config.apiUrl} a cada ${config.intervalMs / 1000}s`);
cicloDeChekin();
setInterval(cicloDeChekin, config.intervalMs);
