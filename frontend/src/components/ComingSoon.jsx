// Página genérica para itens do menu que ainda não têm dado real por trás
// (nem faz sentido fingir uma tela cheia sem nada pra mostrar). Explica pra
// pessoa exatamente o que falta em vez de só dizer "em breve" sem contexto.
export default function ComingSoon({ titulo, descricao }) {
  return (
    <div className="bg-panel border border-panelborder rounded-xl p-6">
      <div className="inline-block text-[10px] tracking-widest text-amber-400 bg-amber-500/10 rounded-full px-2 py-0.5 mb-3">
        EM BREVE
      </div>
      <h2 className="text-white font-semibold mb-2">{titulo}</h2>
      <p className="text-sm text-gray-400 max-w-2xl">{descricao}</p>
    </div>
  );
}
