// Cliente de API simples. Usa caminhos relativos (/api/...) — em produção o
// Nginx do próprio container serve o build e proxeia /api para a API do
// Panorama no mesmo domínio, então não existe problema de CORS.

const TOKEN_KEY = "panorama_token";
const USUARIO_KEY = "panorama_usuario";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Guarda { id, nome, perfil } devolvido pelo login — usado para mostrar/
// esconder ações de admin (excluir ativo, gerenciar usuários) na interface.
// A API sempre valida de novo no servidor; isso é só pra experiência de uso.
export function getUsuario() {
  try {
    return JSON.parse(localStorage.getItem(USUARIO_KEY) || "null");
  } catch {
    return null;
  }
}

export function setUsuario(usuario) {
  localStorage.setItem(USUARIO_KEY, JSON.stringify(usuario));
}

export function clearSessao() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USUARIO_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    clearSessao();
    window.location.reload();
    throw new Error("Sessão expirada");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.erro || `Erro ${res.status}`);
  }
  return data;
}

export const api = {
  login: (email, senha) =>
    request("/api/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) }),
  resumo: () => request("/api/dashboard/resumo"),
  porSo: () => request("/api/dashboard/por-so"),
  alertasRecentes: () => request("/api/dashboard/alertas-recentes"),
  topDepartamentos: () => request("/api/dashboard/top-departamentos"),
  ultimosAtivos: (limit = 5) => request(`/api/ativos?order=recentes&limit=${limit}`),
  naoOrganizados: () => request("/api/ativos?nao_organizado=1&limit=200"),
  organizarAtivo: (id, dados) =>
    request(`/api/ativos/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),

  // Ativos (telas de Computadores/Servidores/etc. e Inventário)
  ativos: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    return request(`/api/ativos${query ? `?${query}` : ""}`);
  },
  criarAtivo: (dados) => request("/api/ativos", { method: "POST", body: JSON.stringify(dados) }),
  atualizarAtivo: (id, dados) => request(`/api/ativos/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),
  excluirAtivo: (id) => request(`/api/ativos/${id}`, { method: "DELETE" }),

  // Filiais
  filiais: () => request("/api/filiais"),
  criarFilial: (dados) => request("/api/filiais", { method: "POST", body: JSON.stringify(dados) }),
  atualizarFilial: (id, dados) => request(`/api/filiais/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),
  excluirFilial: (id) => request(`/api/filiais/${id}`, { method: "DELETE" }),

  // Departamentos
  departamentos: (filialId) => request(`/api/departamentos?filial_id=${filialId}`),
  todosDepartamentos: () => request("/api/departamentos"),
  criarDepartamento: (dados) => request("/api/departamentos", { method: "POST", body: JSON.stringify(dados) }),
  atualizarDepartamento: (id, dados) =>
    request(`/api/departamentos/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),
  excluirDepartamento: (id) => request(`/api/departamentos/${id}`, { method: "DELETE" }),

  // Usuários do painel (admin)
  usuarios: () => request("/api/usuarios"),
  criarUsuario: (dados) => request("/api/usuarios", { method: "POST", body: JSON.stringify(dados) }),
  atualizarUsuario: (id, dados) => request(`/api/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),
  excluirUsuario: (id) => request(`/api/usuarios/${id}`, { method: "DELETE" }),

  // Alertas
  alertas: (status = "abertos") => request(`/api/alertas?status=${status}`),
  resolverAlerta: (id) => request(`/api/alertas/${id}/resolver`, { method: "PATCH" }),
};
