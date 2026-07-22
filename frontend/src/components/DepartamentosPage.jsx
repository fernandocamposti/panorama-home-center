import { useEffect, useState } from "react";
import { api, getUsuario } from "../api";

const campoCls =
  "bg-panelalt border border-panelborder rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500";

function LinhaDepartamento({ departamento, filiais, podeExcluir, onSalvo, onExcluido }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(departamento.nome);
  const [filialId, setFilialId] = useState(departamento.filial_id);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    setSalvando(true);
    setErro("");
    try {
      await api.atualizarDepartamento(departamento.id, { nome, filial_id: Number(filialId) });
      setEditando(false);
      onSalvo();
    } catch (e) {
      setErro(e.message || "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirm(`Excluir o departamento "${departamento.nome}"?`)) return;
    try {
      await api.excluirDepartamento(departamento.id);
      onExcluido();
    } catch (e) {
      alert(e.message || "Falha ao excluir");
    }
  }

  const filialNome = filiais.find((f) => f.id === departamento.filial_id)?.nome || "—";

  if (!editando) {
    return (
      <tr className="border-b border-panelborder/50 last:border-0">
        <td className="py-2 pr-2 text-gray-200">{departamento.nome}</td>
        <td className="py-2 pr-2 text-gray-400">{filialNome}</td>
        <td className="py-2">
          <div className="flex gap-3">
            <button onClick={() => setEditando(true)} className="text-xs text-blue-400 hover:text-blue-300">
              Editar
            </button>
            {podeExcluir && (
              <button onClick={excluir} className="text-xs text-red-400 hover:text-red-300">
                Excluir
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-panelborder/50 last:border-0 bg-panelalt/30 align-top">
      <td className="py-2 pr-2">
        <input className={`${campoCls} w-full`} value={nome} onChange={(e) => setNome(e.target.value)} />
      </td>
      <td className="py-2 pr-2">
        <select className={campoCls} value={filialId} onChange={(e) => setFilialId(e.target.value)}>
          {filiais.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
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
          <button onClick={() => setEditando(false)} className="text-xs text-gray-400 hover:text-gray-200 px-2">
            Cancelar
          </button>
        </div>
        {erro && <div className="text-[11px] text-red-400 mt-1">{erro}</div>}
      </td>
    </tr>
  );
}

function NovoDepartamento({ filiais, onCriado }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [filialId, setFilialId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function criar() {
    if (!nome || !filialId) {
      setErro("Nome e filial são obrigatórios");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.criarDepartamento({ nome, filial_id: Number(filialId) });
      setNome("");
      setFilialId("");
      setAberto(false);
      onCriado();
    } catch (e) {
      setErro(e.message || "Falha ao criar");
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-2 transition"
      >
        + Novo departamento
      </button>
    );
  }

  return (
    <div className="bg-panelalt border border-panelborder rounded-lg p-3 flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Nome</label>
        <input className={campoCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Financeiro" />
      </div>
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Filial</label>
        <select className={campoCls} value={filialId} onChange={(e) => setFilialId(e.target.value)}>
          <option value="">Escolha</option>
          {filiais.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={criar}
        disabled={salvando}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
      >
        {salvando ? "Criando..." : "Criar"}
      </button>
      <button onClick={() => setAberto(false)} className="text-sm text-gray-400 hover:text-gray-200 px-2 py-2">
        Cancelar
      </button>
      {erro && <div className="text-xs text-red-400 w-full">{erro}</div>}
    </div>
  );
}

export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const usuario = getUsuario();
  const podeExcluir = usuario?.perfil === "admin";

  const carregar = async () => {
    setCarregando(true);
    setErro("");
    try {
      const [d, f] = await Promise.all([api.todosDepartamentos(), api.filiais()]);
      setDepartamentos(d);
      setFiliais(f);
    } catch (e) {
      setErro(e.message || "Falha ao carregar");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Departamentos</h2>
        <NovoDepartamento filiais={filiais} onCriado={carregar} />
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{erro}</div>
      )}

      <div className="bg-panel border border-panelborder rounded-xl p-4 overflow-x-auto">
        {carregando ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : departamentos.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum departamento cadastrado ainda.</p>
        ) : (
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b border-panelborder">
                <th className="pb-2 font-medium">Nome</th>
                <th className="pb-2 font-medium">Filial</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {departamentos.map((d) => (
                <LinhaDepartamento
                  key={d.id}
                  departamento={d}
                  filiais={filiais}
                  podeExcluir={podeExcluir}
                  onSalvo={carregar}
                  onExcluido={carregar}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
