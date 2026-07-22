// Cliente de API simples. Usa caminhos relativos (/api/...) — em produção o
// Nginx do próprio container serve o build e proxeia /api para a API do
// Panorama no mesmo domínio, então não existe problema de CORS.

const TOKEN_KEY = "panorama_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    clearToken();
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
  filiais: () => request("/api/filiais"),
  departamentos: (filialId) => request(`/api/departamentos?filial_id=${filialId}`),
  organizarAtivo: (id, dados) =>
    request(`/api/ativos/${id}`, { method: "PATCH", body: JSON.stringify(dados) }),
};
