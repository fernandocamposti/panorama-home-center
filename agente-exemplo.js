/**
 * Panorama Home Center — Agente de monitoramento (esqueleto)
 * ------------------------------------------------------------
 * Roda em cada computador/servidor (Windows ou Linux), coleta métricas
 * básicas e envia para a API central via HTTPS a cada intervalo fixo.
 *
 * Este é um PONTO DE PARTIDA, não código de produção. Antes de instalar
 * em máquinas reais: mover o token para fora do código-fonte, validar
 * o certificado TLS do servidor, e testar o comportamento offline
 * (fila local + reenvio quando a rede voltar).
 *
 * Dependências:
 *   npm install systeminformation node-fetch
 *
 * Variáveis de ambiente esperadas:
 *   PANORAMA_API_URL   -> ex: https://painel.panoramahomecenter.com.br/api
 *   PANORAMA_AGENT_TOKEN -> token gerado no cadastro do ativo no dashboard
 *   PANORAMA_INTERVAL_MS -> opcional, padrão 60000 (60s)
 */

const si = require("systeminformation");
const fetch = require("node-fetch");
const os = require("os");

const API_URL = process.env.PANORAMA_API_URL || "https://painel.panoramahomecenter.com.br/api";
const TOKEN = process.env.PANORAMA_AGENT_TOKEN;
const INTERVAL_MS = Number(process.env.PANORAMA_INTERVAL_MS || 60000);

if (!TOKEN) {
  console.error("[agente] PANORAMA_AGENT_TOKEN não definido. Encerrando.");
  process.exit(1);
}

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

// (Opcional / fase posterior) levanta lista de software instalado.
// Chamar com menos frequência que o heartbeat (ex.: 1x por dia), pois é mais pesado.
async function coletarSoftware() {
  try {
    const lista = await si.getStaticData().then((d) => d.system);
    return lista;
  } catch (e) {
    console.warn("[agente] Falha ao coletar inventário de software:", e.message);
    return null;
  }
}

async function enviarCheckin(payload) {
  const resposta = await fetch(`${API_URL}/agents/checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
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

console.log(`[agente] Iniciando — enviando para ${API_URL} a cada ${INTERVAL_MS / 1000}s`);
cicloDeChekin();
setInterval(cicloDeChekin, INTERVAL_MS);
