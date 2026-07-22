import { useEffect, useState } from "react";
import { api, getUsuario } from "../api";

const campoCls =
  "bg-panelalt border border-panelborder rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500";

function LinhaUsuario({ usuarioLinha, filiais, souEu, onSalvo, onExcluido }) {
  const [editando, setEditando] = useState(false);
  const [nome, setNome] = useState(usuarioLinha.nome);
  const [email, setEmail] = useState(usuarioLinha.email);
  const [perfil, setPerfil] = useState(usuarioLinha.perfil);
  const [filialId, setFilialId] = useState(usuarioLinha.filial_id || "");
  const [novaSenha, setNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar() {
    setSalvando(true);
    setErro("");
    try {
      const dados = { nome, email, perfil, filial_id: filialId ? Number(filialId) : null };
      if (novaSenha) dados.senha = novaSenha;
      await api.atualizarUsuario(usuarioLinha.id, dados);
      setEditando(false);
      setNovaSenha("");
      onSalvo();
    } catch (e) {
      setErro(e.message || "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirm(`Excluir o usuário "${usuarioLinha.nome}"?`)) return;
    try {
      await api.excluirUsuario(usuarioLinha.id);
      onExcluido();
    } catch (e) {
      alert(e.message || "Falha ao excluir");
    }
  }

  if (!editando) {
    return (
      <tr className="border-b border-panelborder/50 last:border-0">
        <td className="py-2 pr-2 text-gray-200">
          {usuarioLinha.nome}
          {souEu && <span className="text-[11px] text-gray-500 ml-1">(você)</span>}
        </td>
        <td className="py-2 pr-2 text-gray-400">{usuarioLinha.email}</td>
        <td className="py-2 pr-2 text-gray-400">{usuarioLinha.perfil === "admin" ? "Administrador" : "Leitura"}</td>
        <td className="py-2 pr-2 text-gray-400">{usuarioLinha.filial_nome || "—"}</td>
        <td className="py-2">
          <div className="flex gap-3">
            <button onClick={() => setEditando(true)} className="text-xs text-blue-400 hover:text-blue-300">
              Editar
            </button>
            {!souEu && (
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
        <input className={`${campoCls} w-full`} value={email} onChange={(e) => setEmail(e.target.value)} />
      </td>
      <td className="py-2 pr-2">
        <select className={campoCls} value={perfil} onChange={(e) => setPerfil(e.target.value)} disabled={souEu}>
          <option value="viewer">Leitura</option>
          <option value="admin">Administrador</option>
        </select>
      </td>
      <td className="py-2 pr-2">
        <select className={`${campoCls} w-full mb-1`} value={filialId} onChange={(e) => setFilialId(e.target.value)}>
          <option value="">Sem filial</option>
          {filiais.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </select>
        <input
          className={`${campoCls} w-full`}
          type="password"
          placeholder="Nova senha (opcional)"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
        />
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

function NovoUsuario({ filiais, onCriado }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [perfil, setPerfil] = useState("viewer");
  const [filialId, setFilialId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function criar() {
    if (!nome || !email || !senha) {
      setErro("Nome, e-mail e senha são obrigatórios");
      return;
    }
    setSalvando(true);
    setErro("");
    try {
      await api.criarUsuario({ nome, email, senha, perfil, filial_id: filialId ? Number(filialId) : null });
      setNome("");
      setEmail("");
      setSenha("");
      setPerfil("viewer");
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
        + Novo usuário
      </button>
    );
  }

  return (
    <div className="bg-panelalt border border-panelborder rounded-lg p-3 flex flex-wrap items-end gap-2">
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Nome</label>
        <input className={campoCls} value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">E-mail</label>
        <input className={campoCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Senha</label>
        <input className={campoCls} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Perfil</label>
        <select className={campoCls} value={perfil} onChange={(e) => setPerfil(e.target.value)}>
          <option value="viewer">Leitura</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
      <div>
        <label className="block text-[11px] text-gray-500 mb-1">Filial</label>
        <select className={campoCls} value={filialId} onChange={(e) => setFilialId(e.target.value)}>
          <option value="">Sem filial</option>
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

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const usuarioAtual = getUsuario();

  const carregar = async () => {
    setCarregando(true);
    setErro("");
    try {
      const [u, f] = await Promise.all([api.usuarios(), api.filiais()]);
      setUsuarios(u);
      setFiliais(f);
    } catch (e) {
      setErro(e.message || "Falha ao carregar");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (usuarioAtual?.perfil === "admin") carregar();
    else setCarregando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (usuarioAtual?.perfil !== "admin") {
    return (
      <div className="bg-panel border border-panelborder rounded-xl p-5">
        <h2 className="text-white font-semibold mb-1">Usuários</h2>
        <p className="text-sm text-gray-400">Apenas administradores podem gerenciar os usuários do painel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Usuários</h2>
        <NovoUsuario filiais={filiais} onCriado={carregar} />
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">{erro}</div>
      )}

      <div className="bg-panel border border-panelborder rounded-xl p-4 overflow-x-auto">
        {carregando ? (
          <p className="text-gray-400 text-sm">Carregando...</p>
        ) : usuarios.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum usuário cadastrado ainda.</p>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b border-panelborder">
                <th className="pb-2 font-medium">Nome</th>
                <th className="pb-2 font-medium">E-mail</th>
                <th className="pb-2 font-medium">Perfil</th>
                <th className="pb-2 font-medium">Filial</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <LinhaUsuario
                  key={u.id}
                  usuarioLinha={u}
                  filiais={filiais}
                  souEu={u.id === usuarioAtual?.id}
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
