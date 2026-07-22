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

const TITULOS = {
  computador: "Computadores",
  servidor: "Servidores",
  rede: "Dispositivos de Rede",
  impressora: "Impressoras",
  telefone: "Telefones IP",
  monitor: "Monitores",
};

const campoCls =
  "bg-panelalt border border-panelborder rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500";

function LinhaAtivo({ ativo, filiais, mostrarTipo, podeExcluir, onSalvo, onExcluido }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(ativo.nome);
  const [tipo, setTipo] = useState(ativo.tipo);
  const [filialId, setFilialId] = useState(ativo.filial_id || "");
  const [departamentos, setDepartamentos] = useState([]);
  const [departamentoId, setDepartamentoId] = useState(ativo.departamento_id || "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!editando || !filialId) {
      if (!filialId) setDepartamentos([]);
      return;
    }
    api.departamentos(filialId).then(setDepartamentos).catch(() => setDepartamentos([]));
  }, [filialId, editando]);

  async function salvar() {
    setSalvando(true);
    setErro("");
    try {
      await api.atualizarAtivo(ativo.id, {
        nome,
        tipo,
        filial_id: filialId ? Number(filialId) : null,
        departamento_id: departamentoId ? Number(departamentoId) : null,
      });
      setEditando(false);
      onSalvo();
    } catch (e) {
      setErro(e.message || "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirm(`Excluir "${ativo.nome}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await api.excluirAtivo(ativo.id);
      onExcluido();
    } catch (e) {
      alert(e.message || "Falha ao excluir");
    }
  }

  if (!editando) {
    return (
      <tr className="border-b border-panelborder/50 last:border-0">
        <td className="py-2 pr-2 text-gray-200">{ativo.nome}</td>
        {mostrarTipo && (
          <td className="py-2 pr-2 text-gray-400">{TIPOS.find((t) => t.valor === ativo.tipo)?.label || ativo.tipo}</td>
        )}
        <td className="py-2 pr-2 text-gray-400">{ativo.filial_nome || "—"}</td>
        <td className="py-2 pr-2 text-gray-400">{ativo.departamento_nome || "—"}</td>
        <td className="py-2 pr-2 text-gray-400">{ativo.so || "—"}</td>
        <td className="py-2 pr-2">
          <span
            className={`text-[11px] rounded-full px-2 py-0.5 ${
              ativo.status === "online" ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-500"
            }`}
          >
            {ativo.status}
          </span>
        </td>
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
    <tr className="border-b border-panelborder/50 last:border-0 align-top bg-panelalt/30">
      <td className="py-2 pr-2">
        <input className={`${campoCls} w-full`} value={nome} onChange={(e) => setNome(e.target.value)} />
      </td>
      {mostrarTipo && (
        <td className="py-2 pr-2">
          <select className={campoCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
        </td>
      )}
      <td className="py-2 pr-2">
        <select className={campoCls} value={filialId} onChange={(e) => setFilialId(e.target.value)}>
          <option value="">Sem filial</option>
          {filiais.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
      </td>
      <td className="py-2 pr-2">
        <select
          className={campoCls}
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
      <td className="py-2 pr-2 text-gray-500 text-xs">{ativo.so || "—"}</td>
      <td className="py-2 pr-2 text-gray-500 text-xs">{ativo.status}</td>
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

function NovoAtivo({ tipoFixo, filiais, onCriado }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState(tipoFixo || "computador");
  const [filialId, setFilialId] = useState("");
  const [departamentos, setDepartamentos] = useState([]);
  const [departamentoId, setDepartamentoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!filialId) {
      setDepartamentos([]);
      return;
    }
    api.departamentos(filialId).then(setDepartamentos).catch(() => setDepartamentos([]));
  }, [filialId]);

  async function criar() {
    if (!nome || !filialId) {
      setErro("Nome e filial são obrigatórios");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.criarAtivo({
        nome,
        tipo,
        filial_id: Number(filialId),
        departamento_id: departamentoId ? Number(departamentoId) : null,
      });
      setNome("");
      setFilialId("");
      setDepartamentoId("");
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
        + Novo
      </button>
    );
  }

  return (
    <div className="bg-panelalt border border-panelborder rounded-lg p-3 flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Nome</label>
        <input className={campoCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do ativo" />
      </div>
      {!tipoFixo && (
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Tipo</label>
          <select className={campoCls} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}
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
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Departamento</label>
        <select
          className={campoCls}
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

export default function AtivosPage({ tipo }) {
  const [ativos, setAtivos] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const usuario = getUsuario();
  const podeExcluir = usuario?.perfil === "admin";

  const carregar = async () => {
    setCarregando(true);
    setErro("");
    try {
      const params = { limit: 200, order: "recentes" };
      if (tipo) params.tipo = tipo;
      const [a, f] = await Promise.all([api.ativos(params), api.filiais()]);
      setAtivos(a);
      setFiliais(f);
    } catch (e) {
      setErro(e.message || "Falha ao carregar");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">{tipo ? TITULOS[tipo] : "Todos os ativos"}</h2>
        <NovoAtivo tipoFixo={tipo} filiais={filiais} onCriado={carregar} />
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{erro}</div>
      )}

      <div className="bg-panel border border-panelborder rounded-xl p-4 overflow-x-auto">
        {carregando ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : ativos.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum ativo cadastrado ainda.</p>
        ) : (
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b border-panelborder">
                <th className="pb-2 font-medium">Nome</th>
                {!tipo && <th className="pb-2 font-medium">Tipo</th>}
                <th className="pb-2 font-medium">Filial</th>
                <th className="pb-2 font-medium">Departamento</th>
                <th className="pb-2 font-medium">SO</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ativos.map((ativo) => (
                <LinhaAtivo
                  key={ativo.id}
                  ativo={ativo}
                  filiais={filiais}
                  mostrarTipo={!tipo}
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
