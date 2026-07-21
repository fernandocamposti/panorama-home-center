function tempoRelativo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

export default function AlertsList({ alertas }) {
  return (
    <div className="bg-panel border border-panelborder rounded-xl p-4">
      <h2 className="text-sm font-semibold text-white mb-3">Alertas Recentes</h2>
      <div className="space-y-3">
        {alertas.length === 0 && <p className="text-sm text-gray-500">Nenhum alerta em aberto.</p>}
        {alertas.map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <span
              className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                a.severidade === "critico" ? "bg-red-500" : "bg-yellow-500"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${a.severidade === "critico" ? "text-red-400" : "text-yellow-400"}`}>
                {a.mensagem}
              </p>
              <p className="text-xs text-gray-500 truncate">{a.ativo_nome}</p>
            </div>
            <span className="text-[11px] text-gray-500 shrink-0">{tempoRelativo(a.criado_em)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
