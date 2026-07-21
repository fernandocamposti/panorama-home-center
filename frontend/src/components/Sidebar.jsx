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

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-panel border-r border-panelborder h-screen sticky top-0 overflow-y-auto">
      <div className="px-5 py-5 border-b border-panelborder">
        <span className="text-white font-bold text-lg">PANORAMA</span>
        <div className="text-[10px] tracking-widest text-gray-500">HOME CENTER</div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <a
          href="#"
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 text-sm font-medium mb-4"
        >
          Dashboard
        </a>

        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo} className="mb-4">
            <div className="px-3 text-[10px] tracking-widest text-gray-500 mb-1">{grupo.titulo}</div>
            {grupo.itens.map((item) => (
              <a
                key={item}
                href="#"
                title="Disponível em uma próxima fase"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:bg-panelalt hover:text-gray-200 text-sm transition"
              >
                {item}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
