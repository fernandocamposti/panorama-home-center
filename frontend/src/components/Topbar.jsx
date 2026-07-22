export default function Topbar({ titulo = "Dashboard", onRefresh, onLogout, atualizadoEm }) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-panelborder bg-panel">
      <div>
        <h1 className="text-xl font-semibold text-white">{titulo}</h1>
        <p className="text-xs text-gray-500">
          Início / {titulo}
          {atualizadoEm && <span className="ml-2">· atualizado às {atualizadoEm}</span>}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-sm text-gray-300 border border-panelborder rounded-lg px-3 py-1.5 hover:bg-panelalt transition"
          >
            Atualizar
          </button>
        )}
        <button
          onClick={onLogout}
          className="text-sm text-gray-300 border border-panelborder rounded-lg px-3 py-1.5 hover:bg-panelalt transition"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
