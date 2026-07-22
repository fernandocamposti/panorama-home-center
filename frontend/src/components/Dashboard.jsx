import { useEffect, useState, useCallback } from "react";
import { api, clearSessao } from "../api";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import StatCard from "./StatCard.jsx";
import BranchTable from "./BranchTable.jsx";
import SoDonut from "./SoDonut.jsx";
import AlertsList from "./AlertsList.jsx";
import RecentAssetsTable from "./RecentAssetsTable.jsx";
import TopDepartments from "./TopDepartments.jsx";
import PendingDevices from "./PendingDevices.jsx";
import AgentsPage from "./AgentsPage.jsx";
import AtivosPage from "./AtivosPage.jsx";
import FiliaisPage from "./FiliaisPage.jsx";
import DepartamentosPage from "./DepartamentosPage.jsx";
import UsuariosPage from "./UsuariosPage.jsx";
import AlertasPage from "./AlertasPage.jsx";
import ComingSoon from "./ComingSoon.jsx";

const TIPO_LABEL = {
  computador: "Computadores",
  servidor: "Servidores",
  rede: "Dispositivos de Rede",
  impressora: "Impressoras",
  telefone: "Telefones IP",
  monitor: "Monitores",
};

const TITULOS_PAGINA = {
  dashboard: "Dashboard",
  agents: "Agents",
  inventario: "Inventário",
  filiais: "Filiais",
  departamentos: "Departamentos",
  usuarios: "Usuários",
  alertas: "Alertas",
  software: "Software",
  hardware: "Hardware",
  politicas: "Políticas",
  "perfil-empresa": "Perfil da Empresa",
};

function tituloDaPagina(pagina) {
  if (pagina.startsWith("ativos:")) return TIPO_LABEL[pagina.split(":")[1]] || "Ativos";
  return TITULOS_PAGINA[pagina] || "Dashboard";
}

function renderPagina(pagina) {
  if (pagina.startsWith("ativos:")) {
    return <AtivosPage tipo={pagina.split(":")[1]} />;
  }
  switch (pagina) {
    case "agents":
      return <AgentsPage />;
    case "inventario":
      return <AtivosPage />;
    case "filiais":
      return <FiliaisPage />;
    case "departamentos":
      return <DepartamentosPage />;
    case "usuarios":
      return <UsuariosPage />;
    case "alertas":
      return <AlertasPage />;
    case "software":
      return (
        <ComingSoon
          titulo="Inventário de Software"
          descricao='Em breve. O agente ainda não coleta a lista de programas instalados em cada máquina — a tabela já existe no banco ("inventario_software"), falta o agente enviar isso no checkin e esta tela consumir.'
        />
      );
    case "hardware":
      return (
        <ComingSoon
          titulo="Inventário de Hardware"
          descricao="Em breve. O agente já coleta fabricante, modelo, memória e disco a cada checkin, mas a API ainda não guarda esses detalhes (só CPU/memória/disco em %) nem existe uma tela para exibi-los — é o próximo passo natural do roadmap."
        />
      );
    case "politicas":
      return (
        <ComingSoon
          titulo="Políticas de Alerta"
          descricao="Em breve. Hoje os limites de alerta (ex.: CPU/memória/disco acima de 90%) são fixos no código da API. Essa tela vai permitir configurar esses limites por filial ou tipo de ativo sem precisar mexer no código."
        />
      );
    case "perfil-empresa":
      return (
        <ComingSoon
          titulo="Perfil da Empresa"
          descricao="Em breve. Tela para configurar dados da empresa (nome, logo, domínio do painel etc.) — ainda não existe um cadastro para isso no banco."
        />
      );
    default:
      return null;
  }
}

export default function Dashboard({ onLogout }) {
  const [pagina, setPagina] = useState("dashboard");
  const [resumo, setResumo] = useState(null);
  const [porSo, setPorSo] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [ultimosAtivos, setUltimosAtivos] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [atualizadoEm, setAtualizadoEm] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [r, s, a, d, u] = await Promise.all([
        api.resumo(),
        api.porSo(),
        api.alertasRecentes(),
        api.topDepartamentos(),
        api.ultimosAtivos(5),
      ]);
      setResumo(r);
      setPorSo(s);
      setAlertas(a);
      setDepartamentos(d);
      setUltimosAtivos(u);
      setAtualizadoEm(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      setErro(err.message || "Falha ao carregar dados do painel");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (pagina === "dashboard") carregar();
  }, [carregar, pagina]);

  function handleLogout() {
    clearSessao();
    onLogout();
  }

  const porTipoMap = Object.fromEntries((resumo?.por_tipo || []).map((t) => [t.tipo, t]));
  const cardsBase = ["computador", "servidor", "rede", "impressora"];

  return (
    <div className="min-h-screen flex bg-[#0b1220]">
      <Sidebar pagina={pagina} onNavegar={setPagina} />

      <div className="flex-1 min-w-0">
        <Topbar
          titulo={tituloDaPagina(pagina)}
          onRefresh={pagina === "dashboard" ? carregar : undefined}
          onLogout={handleLogout}
          atualizadoEm={pagina === "dashboard" ? atualizadoEm : ""}
        />

        <main className="p-6 space-y-6">
          {pagina === "dashboard" ? (
            <>
              {erro && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
                  {erro}
                </div>
              )}

              {carregando && !resumo ? (
                <p className="text-gray-400 text-sm">Carregando...</p>
              ) : (
                resumo && (
                  <>
                    <PendingDevices />

                    <div className="flex flex-wrap gap-4">
                      {cardsBase.map((tipo) => {
                        const t = porTipoMap[tipo];
                        return (
                          <StatCard
                            key={tipo}
                            titulo={TIPO_LABEL[tipo]}
                            valor={t ? `${t.online} / ${Number(t.total)}` : "0 / 0"}
                            corValor="text-white"
                            nota={t ? `${t.online} online, ${t.offline} offline` : "sem ativos cadastrados"}
                          />
                        );
                      })}
                      <StatCard
                        titulo="Alertas Críticos"
                        valor={resumo.alertas_criticos}
                        corValor={resumo.alertas_criticos > 0 ? "text-red-400" : "text-green-400"}
                        nota="em aberto agora"
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <BranchTable filiais={resumo.por_filial} />
                      </div>
                      <SoDonut dados={porSo} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div className="lg:col-span-2">
                        <RecentAssetsTable ativos={ultimosAtivos} />
                      </div>
                      <AlertsList alertas={alertas} />
                    </div>

                    <TopDepartments departamentos={departamentos} />
                  </>
                )
              )}
            </>
          ) : (
            renderPagina(pagina)
          )}
        </main>
      </div>
    </div>
  );
}
