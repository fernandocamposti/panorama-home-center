/**
 * Remove o serviço "PanoramaAgent" instalado pelo instalar-servico-windows.js.
 * Uso (PowerShell como Administrador):
 *   node desinstalar-servico-windows.js
 */

const path = require("path");
const Service = require("node-windows").Service;

const svc = new Service({
  name: "PanoramaAgent",
  script: path.join(__dirname, "agente-exemplo.js"),
});

svc.on("uninstall", () => {
  console.log("[desinstalador] Serviço removido.");
});

svc.uninstall();
