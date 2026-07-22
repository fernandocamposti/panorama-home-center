import { useEffect, useState } from "react";
import { api } from "../api";

const ABAS = [
  { valor: "abertos", label: "Abertos" },
  { valor: "resolvidos", label: "Resolvidos" },
  { valor: "todos", label: "Todos" },
];

export default function AlertasPage() {
  const [aba, setAba] = useState("abertos");
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = async (status) => {
    setCarregando(true);
    setErro("");
    try {
      setAlertas(await api.alertas(status));
    } catch (e) {
      setErro(e.message || "Falha ao carregar");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar(aba);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba]);

  async function resolver(id) {
    try {
      await api.resolverAlerta(id);
      carregar(aba);
    } catch (e) {
      alert(e.message || "Falha ao resolver");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Alertas</h2>
        <div className="flex gap-1 bg-panelalt border border-panelborder rounded-lg p-1">
          {ABAS.map((a) => (
            <button
              key={a.valor}
              onClick={() => setAba(a.valor)}
              className={`text-xs px-3 py-1.5 rounded-md transition ${
                aba === a.valor ? "bg-blue-600 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{erro}</div>
      )}

      <div className="bg-panel border border-panelborder rounded-xl p-4 overflow-x-auto">
        {carregando ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : alertas.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum alerta {aba === "abertos" ? "em aberto" : "por aqui"}.</p>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b border-panelborder">
                <th className="pb-2 font-medium">Ativo</th>
                <th className="pb-2 font-medium">Tipo</th>
                <th className="pb-2 font-medium">Severidade</th>
                <th className="pb-2 font-medium">Mensagem</th>
                <th className="pb-2 font-medium">Criado em</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {alertas.map((al) => (
                <tr key={al.id} className="border-b border-panelborder/50 last:border-0">
                  <td className="py-2 pr-2 text-gray-200">{al.ativo_nome}</td>
                  <td className="py-2 pr-2 text-gray-400">{al.tipo}</td>
                  <td className="py-2 pr-2">
                    <span
                      className={`text-[11px] rounded-full px-2 py-0.5 ${
                        al.severidade === "critico" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {al.severidade}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-gray-400">{al.mensagem}</td>
                  <td className="py-2 pr-2 text-gray-500 text-xs">
                    {new Date(al.criado_em).toLocaleString("pt-BR")}
                  </td>
                  <td className="py-2">
                    {!al.resolvido_em && (
                      <button onClick={() => resolver(al.id)} className="text-xs text-blue-400 hover:text-blue-300">
                        Marcar resolvido
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
