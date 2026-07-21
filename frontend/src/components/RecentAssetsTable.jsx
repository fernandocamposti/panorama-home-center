export default function RecentAssetsTable({ ativos }) {
  return (
    <div className="bg-panel border border-panelborder rounded-xl p-4">
      <h2 className="text-sm font-semibold text-white mb-3">Últimos Computadores</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 text-xs border-b border-panelborder">
            <th className="pb-2 font-medium">Nome</th>
            <th className="pb-2 font-medium">Departamento</th>
            <th className="pb-2 font-medium">Filial</th>
            <th className="pb-2 font-medium">SO</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {ativos.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-500">
                Nenhum ativo cadastrado ainda.
              </td>
            </tr>
          )}
          {ativos.map((a) => (
            <tr key={a.id} className="border-b border-panelborder/50 last:border-0">
              <td className="py-2 text-gray-200">{a.nome}</td>
              <td className="py-2 text-gray-400">{a.departamento_nome || "—"}</td>
              <td className="py-2 text-gray-400">{a.filial_nome || "—"}</td>
              <td className="py-2 text-gray-400">{a.so || "—"}</td>
              <td className="py-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    a.status === "online"
                      ? "bg-green-500/15 text-green-400"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {a.status === "online" ? "Online" : "Offline"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
