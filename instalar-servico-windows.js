/**
 * Instala o agente como Serviço do Windows — roda automaticamente no boot,
 * reinicia sozinho se cair, sem precisar de terminal aberto.
 *
 * Uso (PowerShell como Administrador, na pasta onde está agente-exemplo.js):
 *   npm install
 *   node instalar-servico-windows.js <TOKEN_DO_AGENTE> [URL_DA_API]
 *
 * Exemplo:
 *   node instalar-servico-windows.js 6060f216dcbc... https://painel.panoramahc.com.br/api
 *
 * Depois de instalado, o serviço aparece no "Serviços" do Windows como
 * "PanoramaAgent". Para reinstalar com um token novo, rode o
 * desinstalar-servico-windows.js antes.
 */

const path = require("path");

let Service;
try {
  Service = require("node-windows").Service;
} catch (e) {
  console.error(
    "[instalador] Pacote node-windows não encontrado. Rode 'npm install' nesta pasta primeiro."
  );
  process.exit(1);
}

const token = process.argv[2];
const apiUrl = process.argv[3] || "https://painel.panoramahc.com.br/api";

if (!token) {
  console.error("Uso: node instalar-servico-windows.js <TOKEN_DO_AGENTE> [URL_DA_API]");
  process.exit(1);
}

const svc = new Service({
  name: "PanoramaAgent",
  description: "Panorama Home Center - Agente de Monitoramento de TI",
  script: path.join(__dirname, "agente-exemplo.js"),
  env: [
    { name: "PANORAMA_API_URL", value: apiUrl },
    { name: "PANORAMA_AGENT_TOKEN", value: token },
  ],
});

svc.on("install", () => {
  console.log("[instalador] Serviço instalado. Iniciando...");
  svc.start();
});

svc.on("start", () => {
  console.log("[instalador] Serviço 'PanoramaAgent' rodando. Pode fechar este terminal.");
});

svc.on("alreadyinstalled", () => {
  console.log("[instalador] Já existe um serviço PanoramaAgent instalado. Rode o desinstalador antes de reinstalar.");
});

svc.on("error", (err) => {
  console.error("[instalador] Erro:", err);
});

console.log("[instalador] Instalando o serviço PanoramaAgent...");
svc.install();
