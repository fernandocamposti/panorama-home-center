import { useEffect, useState } from "react";
import { api, getUsuario } from "../api";

const TIPOS = [
  { valor: "computador", label: "Computador" },
  { valor: "servidor", label: "Servidor" },
  { valor: "rede", label: "Dispositivo de rede" },
  { valor: "impressora", label: "Impressora" },
  { valor: "telefone", label: "Telefone IP" },
  { valor: "monitor", label: "Monitor" },
];

function LinhaOrganizar({ ativo, filiais, podeExcluir, onSalvar, onExcluir }) {
  const [nome, setNome] = useState(ativo.nome);
  const [tipo, setTipo] = useState(ativo.tipo || "computador");
  const [filialId, setFilialId] = useState("");
  const [departamentos, setDepartamentos] = useState([]);
  const [departamentoId, setDepartamentoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function excluir() {
    if (!confirm(`Excluir "${ativo.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.excluirAtivo(ativo.id);
      onExcluir();
    } catch (e) {
      alert(e.message || "Falha ao excluir");
    }
  }

  useEffect(() => {
    if (!filialId) {
      setDepartamentos([]);
      setDepartamentoId("");
      return;
    }
    api.departamentos(filialId).then(setDepartamentos).catch(() => setDepartamentos([]));
  }, [filialId]);

  async function salvar() {
    if (!filialId) {
      setErro("Escolha uma filial");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.organizarAtivo(ativo.id, {
        nome,
        tipo,
        filial_id: Number(filialId),
        departamento_id: departamentoId ? Number(departamentoId) : null,
      });
      onSalvar();
    } catch (e) {
      setErro(e.message || "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  const campo =
    "bg-panelalt border border-panelborder rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500";

  return (
    <tr className="border-b border-panelborder/50 last:border-0 align-top">
      <td className="py-2 pr-2">
        <input className={`${campo} w-full`} value={nome} onChange={(e) => setNome(e.target.value)} />
        <div className="text-[11px] text-gray-500 mt-1">{ativo.so || "SO desconhecido"}</div>
      </td>
      <td className="py-2 pr-2">
        <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.label}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-2">
        <select className={campo} value={filialId} onChange={(e) => setFilialId(e.target.value)}>
          <option value="">Escolha a filial</option>
          {filiais.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-2">
        <select
          className={campo}
          value={departamentoId}
          onChange={(e) => setDepartamentoId(e.target.value)}
          disabled={!filialId}
        >
          <option value="">Sem departamento</option>
          {departamentos.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nome}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2">
        <div className="flex gap-2">
          <button
            onClick={salvar}
            disabled={salvando}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
          >
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          {podeExcluir && (
            <button
              onClick={excluir}
              className="text-xs text-red-400 hover:text-red-300 px-2"
              title="Excluir este dispositivo"
            >
              Excluir
            </button>
          )}
        </div>
        {erro && <div className="text-[11px] text-red-400 mt-1">{erro}</div>}
      </td>
    </tr>
  );
}

export default function PendingDevices() {
  const [dispositivos, setDispositivos] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const podeExcluir = getUsuario()?.perfil === "admin";

  const carregar = async () => {
    setCarregando(true);
    try {
      const [d, f] = await Promise.all([api.naoOrganizados(), api.filiais()]);
      setDispositivos(d);
      setFiliais(f);
    } catch {
      // silencioso — se falhar, só não mostra o aviso; o dashboard principal já mostra erro geral
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  if (carregando || dispositivos.length === 0) return null;

  return (
    <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-amber-400 mb-1">
        {dispositivos.length} dispositivo{dispositivos.length > 1 ? "s" : ""} aguardando organização
      </h2>
      <p className="text-xs text-gray-400 mb-3">
        Esses agentes se cadastraram sozinhos (rodaram o .exe sem cadastro prévio). Defina nome, tipo,
        filial e departamento de cada um.
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 text-xs border-b border-panelborder">
            <th className="pb-2 font-medium">Nome</th>
            <th className="pb-2 font-medium">Tipo</th>
            <th className="pb-2 font-medium">Filial</th>
            <th className="pb-2 font-medium">Departamento</th>
            <th className="pb-2 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {dispositivos.map((ativo) => (
            <LinhaOrganizar
              key={ativo.id}
              ativo={ativo}
              filiais={filiais}
              podeExcluir={podeExcluir}
              onSalvar={carregar}
              onExcluir={carregar}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
