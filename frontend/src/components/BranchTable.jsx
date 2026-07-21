export default function BranchTable({ filiais }) {
  return (
    <div className="bg-panel border border-panelborder rounded-xl p-4">
      <h2 className="text-sm font-semibold text-white mb-3">Resumo por Filial</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 text-xs border-b border-panelborder">
            <th className="pb-2 font-medium">Filial</th>
            <th className="pb-2 font-medium">Online</th>
            <th className="pb-2 font-medium">Offline</th>
            <th className="pb-2 font-medium">Alertas</th>
          </tr>
        </thead>
        <tbody>
          {filiais.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-500">
                Nenhuma filial cadastrada ainda.
              </td>
            </tr>
          )}
          {filiais.map((f) => (
            <tr key={f.id} className="border-b border-panelborder/50 last:border-0">
              <td className="py-2 text-gray-200">{f.nome}</td>
              <td className="py-2 text-green-400">{f.online}</td>
              <td className="py-2 text-red-400">{f.offline}</td>
              <td className={`py-2 ${Number(f.alertas) > 0 ? "text-red-400" : "text-gray-500"}`}>
                {f.alertas}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
