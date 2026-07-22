/**
 * Panorama Home Center — Agente de monitoramento
 * ------------------------------------------------------------
 * Roda em cada computador/servidor (Windows ou Linux), coleta métricas
 * básicas e envia para a API central via HTTPS a cada intervalo fixo.
 *
 * Dois jeitos de configurar:
 *
 * 1) Clássico (ainda funciona): um "config.json" com {"token": "..."} na
 *    mesma pasta do executável, gerado por ./cadastrar-ativo.sh — útil
 *    quando você já sabe o nome/filial da máquina de antemão.
 *
 * 2) Auto-cadastro (novo, padrão quando não há config.json): o próprio
 *    .exe se cadastra sozinho no painel na primeira vez que roda, usando
 *    uma "chave de instalação" embutida no build (ver
 *    scripts/build-agent-exe.sh). Não precisa de nenhum arquivo nem
 *    comando — só baixar o .exe e rodar. O dispositivo aparece no painel
 *    como "não organizado" para você definir nome/filial/departamento
 *    depois, em painel.panoramahc.com.br.
 *
 * Este script é o mesmo usado tanto rodando via `node agente-exemplo.js`
 * quanto compilado como executável standalone (pkg) — não precisa de
 * Node.js instalado na máquina de destino quando compilado.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const si = require("systeminformation");

const TASK_NAME = "PanoramaAgent";
const API_URL_PADRAO = "https://painel.panoramahc.com.br/api";
const PASTA_INSTALACAO_WINDOWS = "C:\\ProgramData\\PanoramaAgent";

// Substituído por scripts/build-agent-exe.sh na hora de compilar o .exe —
// é a mesma chave configurada em PANORAMA_ENROLL_KEY no servidor. Rodando
// via "node agente-exemplo.js" direto (sem compilar), fica como placeholder
// e só funciona se PANORAMA_ENROLL_KEY estiver nas variáveis de ambiente.
const CHAVE_INSTALACAO_EMBUTIDA = "__PANORAMA_ENROLL_KEY__";

function lerJsonSeExistir(caminho) {
  if (!fs.existsSync(caminho)) return {};
  try {
    return JSON.parse(fs.readFileSync(caminho, "utf8"));
  } catch (e) {
    console.error(`[agente] Falha ao ler ${caminho}:`, e.message);
    return {};
  }
}

function salvarJson(caminho, dados) {
  fs.writeFileSync(caminho, JSON.stringify(dados, null, 2));
}

// No Windows compilado, copia o .exe para um lugar fixo
// (C:\ProgramData\PanoramaAgent) para sobreviver caso o arquivo original
// (ex.: em Downloads) seja apagado ou movido depois. Diferente da versão
// anterior, NÃO relança um processo filho nem encerra o processo atual —
// ele copia e segue rodando dali mesmo, no mesmo processo. Isso evita o
// padrão "copia a si mesmo + relança + encerra", que é justamente o que
// antivírus (Windows Defender e outros) tendem a marcar como
// comportamento de dropper/malware e apagar/bloquear silenciosamente —
// foi o que aconteceu nos testes: o processo original encerrava antes do
// auto-cadastro rodar, e o antivírus removia a cópia antes dela conseguir
// rodar sozinha.
function garantirInstalado(dirAtual) {
  if (process.platform !== "win32" || !process.pkg) {
    return dirAtual; // Linux ou rodando via "node" direto: usa a pasta atual mesmo
  }

  const exeAlvo = path.join(PASTA_INSTALACAO_WINDOWS, "panorama-agent.exe");

  if (path.resolve(process.execPath).toLowerCase() === path.resolve(exeAlvo).toLowerCase()) {
    return PASTA_INSTALACAO_WINDOWS; // já está rodando do lugar certo
  }

  try {
    fs.mkdirSync(PASTA_INSTALACAO_WINDOWS, { recursive: true });
    fs.copyFileSync(process.execPath, exeAlvo);
    console.log(
      `[agente] Copiado para ${PASTA_INSTALACAO_WINDOWS} (para sobreviver se este arquivo for apagado depois). Continuando a rodar a partir daqui.`
    );
    return PASTA_INSTALACAO_WINDOWS;
  } catch (e) {
    console.warn(`[agente] Não consegui copiar para ${PASTA_INSTALACAO_WINDOWS} (${e.message}). Vou continuar rodando direto daqui.`);
    return dirAtual;
  }
}

async function autoCadastrar(apiUrl, chaveMaquina, hostname) {
  const chaveInstalacao = process.env.PANORAMA_ENROLL_KEY || CHAVE_INSTALACAO_EMBUTIDA;
  // Não compara com o texto literal do placeholder da constante acima,
  // porque o script de build faz um "sed" global no arquivo inteiro: se o
  // placeholder aparecesse igual nos dois lugares (na constante E nesta
  // checagem), a substituição trocaria os dois ao mesmo tempo e a
  // comparação sempre bateria consigo mesma, quebrando a validação mesmo
  // com a chave certa embutida (bug real, encontrado em produção). Em vez
  // disso, valida o formato esperado (hex gerado por "openssl rand -hex 24").
  if (!chaveInstalacao || !/^[0-9a-f]{32,}$/i.test(chaveInstalacao)) {
    throw new Error(
      'Este .exe não tem uma "chave de instalação" embutida (foi rodado via "node agente-exemplo.js" sem PANORAMA_ENROLL_KEY, ou o build não passou por scripts/build-agent-exe.sh).'
    );
  }

  const resposta = await fetch(`${apiUrl}/agents/self-enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chave_instalacao: chaveInstalacao,
      chave_maquina: chaveMaquina,
      hostname,
      so: `${os.type()} ${os.release()}`,
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Auto-cadastro falhou: HTTP ${resposta.status}`);
  }

  const dados = await resposta.json();
  return dados.token;
}

async function resolverConfig() {
  // Caminho clássico: config.json (ou env vars) já com token pronto,
  // na mesma pasta de onde o executável está rodando agora.
  const dirExeAtual = process.pkg ? path.dirname(process.execPath) : __dirname;
  const configClassico = lerJsonSeExistir(path.join(dirExeAtual, "config.json"));
  const tokenClassico = process.env.PANORAMA_AGENT_TOKEN || configClassico.token;

  if (tokenClassico) {
    return {
      apiUrl: process.env.PANORAMA_API_URL || configClassico.apiUrl || API_URL_PADRAO,
      token: tokenClassico,
      intervalMs: Number(process.env.PANORAMA_INTERVAL_MS || configClassico.intervalMs || 60000),
      exePersistente: process.execPath,
    };
  }

  // Caminho novo: sem config.json, sem token — se auto-cadastra sozinho.
  const apiUrl = process.env.PANORAMA_API_URL || API_URL_PADRAO;
  const dirInstalacao = garantirInstalado(dirExeAtual);
  const estadoPath = path.join(dirInstalacao, "estado.json");
  let estado = lerJsonSeExistir(estadoPath);

  if (!estado.chave_maquina) {
    estado.chave_maquina = crypto.randomUUID();
    salvarJson(estadoPath, estado);
  }

  if (!estado.token) {
    console.log("[agente] Nenhum token configurado — cadastrando automaticamente no painel...");
    estado.token = await autoCadastrar(apiUrl, estado.chave_maquina, os.hostname());
    salvarJson(estadoPath, estado);
    console.log(
      `[agente] Cadastrado! Organize o nome/filial/departamento deste dispositivo em ${apiUrl.replace(/\/api$/, "")} (procure por "${os.hostname()}").`
    );
  }

  // A tarefa agendada deve apontar para a cópia fixa em ProgramData quando
  // ela existir (sobrevive se o .exe baixado for apagado); só cai para
  // process.execPath se a cópia não foi possível (ex.: sem permissão).
  const exePersistente =
    process.platform === "win32" && process.pkg
      ? path.join(dirInstalacao, "panorama-agent.exe")
      : process.execPath;

  return {
    apiUrl,
    token: estado.token,
    intervalMs: Number(process.env.PANORAMA_INTERVAL_MS || estado.intervalMs || 60000),
    exePersistente,
  };
}

// Se estiver rodando como o .exe compilado no Windows, se registra sozinho
// para iniciar com o sistema — assim a pessoa só precisa dar 2 cliques (ou
// "Executar como Administrador") UMA vez; nas próximas vezes o Windows já
// inicia o agente automaticamente, sem precisar rodar nada manualmente.
//
// Devolve o nível de automação conseguido, pra quem chamou decidir se dá
// pra entregar o trabalho pra essa tarefa e fechar a janela com segurança:
//   "invisivel"     → tarefa rodando como SYSTEM: inicia sozinha com o
//                      Windows, sem precisar de login e sem abrir janela.
//   "visivel-logon" → tarefa só por usuário (sem elevação): só inicia
//                      quando a pessoa loga, e ainda abre uma janela —
//                      fechar esta janela agora derrubaria o monitoramento.
//   "falhou"        → não conseguiu registrar nada.
function garantirInicioAutomatico(exePath) {
  if (process.platform !== "win32" || !process.pkg) return "sem-suporte";

  try {
    const saida = execFileSync("schtasks", ["/query", "/tn", TASK_NAME, "/fo", "list", "/v"], { encoding: "utf8" });
    return /Run As User:\s*SYSTEM/i.test(saida) ? "invisivel" : "visivel-logon";
  } catch {
    // ainda não existe — tenta criar abaixo
  }

  try {
    // Precisa ser Administrador: roda mesmo sem ninguém logado, reinicia com a máquina.
    execFileSync(
      "schtasks",
      ["/create", "/tn", TASK_NAME, "/tr", `"${exePath}"`, "/sc", "onstart", "/ru", "SYSTEM", "/rl", "HIGHEST", "/f"],
      { stdio: "ignore" }
    );
    console.log(`[agente] Instalado para iniciar sozinho com o Windows (tarefa "${TASK_NAME}").`);
    return "invisivel";
  } catch {
    // sem privilégio de Administrador — tenta um modo que não exige elevação
  }

  try {
    execFileSync("schtasks", ["/create", "/tn", TASK_NAME, "/tr", `"${exePath}"`, "/sc", "onlogon", "/f"], {
      stdio: "ignore",
    });
    console.log(
      `[agente] Instalado para iniciar sozinho ao entrar no Windows (tarefa "${TASK_NAME}"). Para iniciar mesmo sem login e sem precisar manter nenhuma janela aberta, dê 1 clique com "Executar como Administrador".`
    );
    return "visivel-logon";
  } catch (e) {
    console.warn(
      `[agente] Não consegui me registrar para iniciar sozinho (${e.message}). Vou continuar rodando agora, mas não sobrevivo a um reinício nem a esta janela sendo fechada — dê 1 clique com "Executar como Administrador" para isso ficar automático.`
    );
    return "falhou";
  }
}

// IP da máquina na rede local — usa o módulo nativo "os" (síncrono, sem
// depender de resolução de DNS ou do systeminformation) e pega a primeira
// interface IPv4 que não seja loopback/interna.
function obterIpPrincipal() {
  const interfaces = os.networkInterfaces();
  for (const nome of Object.keys(interfaces)) {
    for (const iface of interfaces[nome] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

// Resumo legível dos discos físicos (ex.: "SSD 476GB (Samsung SSD 970 EVO),
// HDD 931GB (Seagate ...)") — diferente de disco_pct/disco_total_gb, que são
// sobre o uso do sistema de arquivos, não o hardware em si.
function resumirDiscos(discos) {
  if (!discos || discos.length === 0) return null;
  return discos
    .map((d) => {
      const tamanhoGb = d.size ? Math.round(d.size / 1e9) : null;
      const tipo = d.type || "disco";
      const nome = d.name || d.vendor || "";
      return `${tipo}${tamanhoGb ? ` ${tamanhoGb}GB` : ""}${nome ? ` (${nome})` : ""}`.trim();
    })
    .join(", ");
}

// Coleta as métricas atuais da máquina (mesma chamada funciona em Windows e Linux).
// Cada chamada tem seu próprio .catch(): numa máquina real (VM, hardening de
// permissões, etc.) é comum uma dessas consultas específicas falhar — sem
// isso, UMA falha (ex.: si.cpu() sem permissão) derrubava o Promise.all
// inteiro e cancelava o checkin todo, inclusive CPU/memória/disco que
// sempre funcionaram. Assim, manda o que conseguir coletar em vez de nada.
async function coletarMetricas() {
  const [cpuLoad, mem, fsSize, osInfo, sysInfo, cpuInfo, discoLayout] = await Promise.all([
    si.currentLoad().catch((e) => (console.warn("[agente] si.currentLoad() falhou:", e.message), { currentLoad: 0 })),
    si.mem().catch((e) => (console.warn("[agente] si.mem() falhou:", e.message), { active: 0, total: 0 })),
    si.fsSize().catch((e) => (console.warn("[agente] si.fsSize() falhou:", e.message), [])),
    si.osInfo().catch((e) => (console.warn("[agente] si.osInfo() falhou:", e.message), { distro: "", release: "", arch: null })),
    si.system().catch((e) => (console.warn("[agente] si.system() falhou:", e.message), { manufacturer: null, model: null })),
    si.cpu().catch((e) => (console.warn("[agente] si.cpu() falhou:", e.message), { manufacturer: null, brand: null })),
    si.diskLayout().catch((e) => (console.warn("[agente] si.diskLayout() falhou:", e.message), [])),
  ]);

  const discoPrincipal = fsSize[0] || { size: 0, used: 0 };
  const processador = cpuInfo.brand
    ? `${cpuInfo.manufacturer ? `${cpuInfo.manufacturer} ` : ""}${cpuInfo.brand}`.trim()
    : null;

  return {
    hostname: os.hostname(),
    so: `${osInfo.distro} ${osInfo.release}`.trim(),
    arquitetura: osInfo.arch,
    fabricante: sysInfo.manufacturer,
    modelo: sysInfo.model,
    ip: obterIpPrincipal(),
    processador,
    disco_resumo: resumirDiscos(discoLayout),
    cpu_pct: Number(cpuLoad.currentLoad.toFixed(1)),
    mem_pct: Number(((mem.active / mem.total) * 100).toFixed(1)),
    mem_total_gb: Number((mem.total / 1e9).toFixed(1)),
    disco_pct: discoPrincipal.size
      ? Number(((discoPrincipal.used / discoPrincipal.size) * 100).toFixed(1))
      : null,
    disco_total_gb: Number((discoPrincipal.size / 1e9).toFixed(1)),
    // Arredondado: os.uptime() vem com casas decimais e o banco guarda isso
    // como inteiro (BIGINT) — mandar com decimal quebrava o checkin (HTTP 500).
    uptime_s: Math.round(os.uptime()),
    timestamp: new Date().toISOString(),
  };
}

async function enviarCheckin(config, payload) {
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

async function cicloDeChekin(config) {
  try {
    const metricas = await coletarMetricas();
    await enviarCheckin(config, metricas);
    console.log(
      `[agente] Checkin OK — CPU ${metricas.cpu_pct}% | MEM ${metricas.mem_pct}% | DISCO ${metricas.disco_pct}% | IP ${metricas.ip || "?"} | CPU: ${metricas.processador || "?"} | Disco: ${metricas.disco_resumo || "?"}`
    );
  } catch (erro) {
    // Em produção: guardar o payload numa fila local (arquivo/sqlite) e
    // reenviar no próximo ciclo, para não perder dados quando a rede cair.
    console.error("[agente] Erro no checkin:", erro.message);
  }
}

async function iniciar() {
  const config = await resolverConfig();

  const statusInicio = garantirInicioAutomatico(config.exePersistente);

  console.log(`[agente] Iniciando — enviando para ${config.apiUrl} a cada ${config.intervalMs / 1000}s`);
  await cicloDeChekin(config);

  if (statusInicio === "invisivel") {
    // Já existe uma tarefa do Windows rodando isso como SYSTEM (sem janela,
    // sem precisar de login). Em vez de depender desta janela continuar
    // aberta pra sempre, aciona essa tarefa agora mesmo e entrega o
    // monitoramento pra ela — sem isso, fechar a janela derrubava o
    // monitoramento até o próximo login/reinício.
    try {
      execFileSync("schtasks", ["/run", "/tn", TASK_NAME], { stdio: "ignore" });
      console.log(
        `[agente] Já está rodando em segundo plano (tarefa "${TASK_NAME}" do Windows, sem precisar de login). Pode fechar esta janela — o monitoramento continua.`
      );
      process.exit(0);
    } catch (e) {
      console.warn(
        `[agente] Registrei a tarefa mas não consegui iniciá-la agora (${e.message}). Vou continuar por esta janela até o próximo reinício — a partir dele, fica automático mesmo com a janela fechada.`
      );
    }
  } else if (statusInicio === "visivel-logon") {
    console.log(
      '[agente] Aviso: sem privilégio de Administrador, esta janela precisa continuar aberta para o monitoramento funcionar. Feche e rode de novo com "Executar como Administrador" para isso ficar automático, sem precisar manter nenhuma janela aberta.'
    );
  } else if (process.platform === "win32" && (statusInicio === "falhou" || statusInicio === "sem-suporte")) {
    console.warn("[agente] Esta janela precisa continuar aberta para o monitoramento funcionar.");
  }

  setInterval(() => cicloDeChekin(config), config.intervalMs);
}

iniciar().catch((erro) => {
  console.error("[agente] Falha ao iniciar:", erro.message);
  process.exitCode = 1;
});
