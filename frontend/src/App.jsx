import { useState } from "react";
import { getToken } from "./api";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";

export default function App() {
  const [logado, setLogado] = useState(!!getToken());

  if (!logado) {
    return <Login onLogin={() => setLogado(true)} />;
  }
  return <Dashboard onLogout={() => setLogado(false)} />;
}
