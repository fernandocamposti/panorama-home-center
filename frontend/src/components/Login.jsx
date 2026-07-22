import { useState } from "react";
import { api, setToken, setUsuario } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const data = await api.login(email, senha);
      setToken(data.token);
      setUsuario(data.usuario);
      onLogin();
    } catch (err) {
      setErro(err.message || "Falha ao entrar");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1220]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-panel border border-panelborder rounded-xl p-8 shadow-xl"
      >
        <h1 className="text-xl font-semibold text-white mb-1">Panorama Home Center</h1>
        <p className="text-sm text-gray-400 mb-6">Entre para acessar o painel</p>

        <label className="block text-xs text-gray-400 mb-1">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 rounded-lg bg-panelalt border border-panelborder px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          placeholder="seu@email.com"
        />

        <label className="block text-xs text-gray-400 mb-1">Senha</label>
        <input
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full mb-4 rounded-lg bg-panelalt border border-panelborder px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          placeholder="••••••••"
        />

        {erro && <p className="text-sm text-red-400 mb-4">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2 transition"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
