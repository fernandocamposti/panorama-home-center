export default function StatCard({ titulo, valor, corValor = "text-white", nota }) {
  return (
    <div className="bg-panel border border-panelborder rounded-xl p-4 flex-1 min-w-[160px]">
      <div className="text-xs text-gray-400 mb-2">{titulo}</div>
      <div className={`text-2xl font-semibold ${corValor}`}>{valor}</div>
      {nota && <div className="text-[11px] text-gray-500 mt-1">{nota}</div>}
    </div>
  );
}
