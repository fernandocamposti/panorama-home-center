const GRUPOS = [
  {
    titulo: "INVENTÁRIO",
    itens: ["Computadores", "Servidores", "Dispositivos de Rede", "Impressoras", "Telefones IP", "Monitores"],
  },
  {
    titulo: "ORGANIZAÇÃO",
    itens: ["Filiais", "Departamentos", "Usuários"],
  },
  {
    titulo: "RELATÓRIOS",
    itens: ["Inventário", "Software", "Hardware", "Alertas"],
  },
  {
    titulo: "CONFIGURAÇÕES",
    itens: ["Agents", "Políticas", "Usuários", "Perfil da Empresa"],
  },
];

// Itens que já têm uma página funcional. O resto continua desabilitado
// (href="#") até ganhar sua própria tela.
const ROTAS = {
  Agents: "agents",
};

export default function Sidebar({ pagina = "dashboard", onNavegar }) {
  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-panel border-r border-panelborder h-screen sticky top-0 overflow-y-auto">
      <div className="px-5 py-5 border-b border-panelborder">
        <span className="text-white font-bold text-lg">PANORAMA</span>
        <div className="text-[10px] tracking-widest text-gray-500">HOME CENTER</div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavegar?.("dashboard");
          }}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium mb-4 transition ${
            pagina === "dashboard" ? "bg-blue-600/20 text-blue-400" : "text-gray-400 hover:bg-panelalt hover:text-gray-200"
          }`}
        >
          Dashboard
        </a>

        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="mb-4">
            <div className="px-3 text-[10px] tracking-widest text-gray-500 mb-1">{grupo.titulo}</div>
            {grupo.itens.map((item) => {
              const rota = ROTAS[item];
              const ativo = rota && rota === pagina;
              return (
                <a
                  key={item}
                  href="#"
                  title={rota ? undefined : "Disponível em uma próxima fase"}
                  onClick={(e) => {
                    e.preventDefault();
                    if (rota) onNavegar?.(rota);
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    ativo
                      ? "bg-blue-600/20 text-blue-400"
                      : rota
                        ? "text-gray-400 hover:bg-panelalt hover:text-gray-200"
                        : "text-gray-500 cursor-default"
                  }`}
                >
                  {item}
                </a>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
