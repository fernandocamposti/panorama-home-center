import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const CORES = {
  Windows: "#3b82f6",
  Linux: "#22c55e",
  Offline: "#ef4444",
  Outros: "#a855f7",
};

export default function SoDonut({ dados }) {
  const total = dados.reduce((soma, d) => soma + Number(d.total), 0);

  return (
    <div className="bg-panel border border-panelborder rounded-xl p-4">
      <h2 className="text-sm font-semibold text-white mb-3">Status de Sistemas</h2>
      <div className="flex items-center gap-4">
        <div className="w-40 h-40 relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados}
                dataKey="total"
                nameKey="categoria"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={2}
              >
                {dados.map((d) => (
                  <Cell key={d.categoria} fill={CORES[d.categoria] || "#64748b"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#182236", border: "1px solid #1f2a3d", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-semibold text-white">{total}</span>
            <span className="text-[10px] text-gray-500">Total</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {dados.map((d) => (
            <div key={d.categoria} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-300">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: CORES[d.categoria] || "#64748b" }}
                />
                {d.categoria}
              </span>
              <span className="text-gray-400">
                {d.total} ({total ? Math.round((d.total / total) * 100) : 0}%)
              </span>
            </div>
          ))}
          {dados.length === 0 && <p className="text-sm text-gray-500">Sem dados ainda.</p>}
        </div>
      </div>
    </div>
  );
}
