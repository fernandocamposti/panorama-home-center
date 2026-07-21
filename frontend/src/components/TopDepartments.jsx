export default function TopDepartments({ departamentos }) {
  const max = Math.max(1, ...departamentos.map((d) => Number(d.total)));

  return (
    <div className="bg-panel border border-panelborder rounded-xl p-4">
      <h2 className="text-sm font-semibold text-white mb-3">Top Departamentos por Equipamentos</h2>
      <div className="space-y-3">
        {departamentos.length === 0 && <p className="text-sm text-gray-500">Nenhum departamento ainda.</p>}
        {departamentos.map((d) => (
          <div key={d.id}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-300">{d.nome}</span>
              <span className="text-gray-400">{d.total}</span>
            </div>
            <div className="h-2 rounded-full bg-panelalt overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${(Number(d.total) / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
