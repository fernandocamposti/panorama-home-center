// Página "Agents": download do instalador do agente por sistema operacional.
// O .exe é servido estaticamente pelo nginx a partir de agent-releases/
// (ver docker-compose.panorama.yml) e é regenerado por scripts/build-agent-exe.sh.
const DOWNLOAD_EXE = "/agente-download/panorama-agent.exe";

function CardSistema({ nome, descricao, badge, href, disponivel = true }) {
  return (
    <div className="bg-panel border border-panelborder rounded-xl p-5 flex flex-col gap-3 min-w-[240px] flex-1">
      <div className="flex items-center justify-between">
        <span className="text-white font-semibold">{nome}</span>
        <span
          className={`text-[10px] tracking-widest rounded-full px-2 py-0.5 ${
            disponivel ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-500"
          }`}
        >
          {badge}
        </span>
      </div>
      <p className="text-xs text-gray-400 flex-1">{descricao}</p>
      {disponivel ? (
        <a
          href={href}
          download
          className="text-sm text-center bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 transition"
        >
          Baixar
        </a>
      ) : (
        <button
          disabled
          className="text-sm text-center bg-panelalt text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
        >
          Em breve
        </button>
      )}
    </div>
  );
}

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-panel border border-panelborder rounded-xl p-5">
        <h2 className="text-white font-semibold mb-1">Instalar o agente</h2>
        <p className="text-sm text-gray-400">
          Baixe o instalador do sistema operacional da máquina e execute — não precisa criar pasta,
          preencher config nem copiar token. O agente se cadastra sozinho no painel na primeira
          execução e aparece em <span className="text-gray-300">"não organizado"</span> no Dashboard,
          onde você define nome, tipo, filial e departamento.
        </p>
      </div>

      <div className="flex flex-wrap gap-4">
        <CardSistema
          nome="Windows"
          badge="Disponível"
          descricao='Baixe o .exe e execute como Administrador (só na primeira vez). Ele se instala em C:\ProgramData\PanoramaAgent, se registra para iniciar com o Windows e começa a enviar métricas na hora.'
          href={DOWNLOAD_EXE}
        />
        <CardSistema
          nome="Linux"
          badge="Em breve"
          descricao="Instalador via systemd para servidores e workstations Linux."
          disponivel={false}
        />
        <CardSistema
          nome="macOS"
          badge="Em breve"
          descricao="Instalador para máquinas macOS."
          disponivel={false}
        />
      </div>
    </div>
  );
}
