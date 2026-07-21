# Agente Panorama — guia rápido

Agente que roda em cada computador/servidor e envia métricas para a API do
painel. Lê configuração de `config.json` (na mesma pasta do executável) ou
de variáveis de ambiente.

## Cadastrar uma máquina nova (1 comando)

Na VPS (ou qualquer máquina com `curl`+`python3`):

```bash
./cadastrar-ativo.sh computador "PC-FINANCEIRO-05" "Matriz" "Financeiro"
```

Isso cadastra o ativo no painel (reaproveita filial/departamento se já
existirem) e imprime o comando pronto para colar na máquina Windows.

## Instalar o agente — Windows, via .exe (recomendado, sem Node.js)

**Passo único, na VPS** (fazer uma vez, ou de novo sempre que
`agente-exemplo.js` mudar):

```bash
./scripts/build-agent-exe.sh
```

Isso compila `panorama-agent.exe` e deixa disponível em
`https://painel.panoramahc.com.br/agente-download/panorama-agent.exe`.

**Depois, em cada máquina Windows** (PowerShell como Administrador):

```powershell
irm https://raw.githubusercontent.com/fernandocamposti/panorama-home-center/main/instalar.ps1 -OutFile instalar.ps1
.\instalar.ps1 -Token "TOKEN_GERADO_NO_CADASTRO"
```

O `instalar.ps1` baixa o `.exe`, grava a configuração, testa por alguns
segundos e registra uma Tarefa Agendada do Windows (roda no boot, reinicia
sozinha se cair) — sem precisar de Node.js nem de nenhuma ferramenta extra
na máquina de destino. É o fluxo pensado para instalar em várias máquinas
rapidamente: só muda o `-Token` a cada uma.

> **Nota de verificação**: o build do `.exe` e o `instalar.ps1` foram
> revisados com cuidado, mas não puderam ser executados ponta a ponta neste
> ambiente (sem acesso a uma máquina Windows real para testar). Na primeira
> instalação, acompanhe a saída do `instalar.ps1` — ele testa o agente
> manualmente por 8 segundos antes de registrar a tarefa, e avisa se algo
> falhar nesse teste.

## Instalar o agente — Windows, com Node.js (alternativa já testada ponta a ponta)

Se preferir não usar o `.exe`, ou tiver algum problema com ele, esta rota
foi testada e funciona (é a que usamos no primeiro servidor):

```powershell
mkdir C:\panorama-agent; cd C:\panorama-agent
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/fernandocamposti/panorama-home-center/main/agente-exemplo.js" -OutFile "agente-exemplo.js"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/fernandocamposti/panorama-home-center/main/package.json" -OutFile "package.json"
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/fernandocamposti/panorama-home-center/main/instalar-servico-windows.js" -OutFile "instalar-servico-windows.js"
npm install
node instalar-servico-windows.js SEU_TOKEN_AQUI https://painel.panoramahc.com.br/api
```

Registra e inicia o serviço "PanoramaAgent" (visível em `services.msc`).
Para trocar o token: `node desinstalar-servico-windows.js` e reinstalar.

## Instalar como serviço — Linux (systemd)

```bash
npm install --production
```

Edite `panorama-agent.service` com o token real do ativo e a URL da API:

```bash
sudo cp panorama-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now panorama-agent
```

## Testar manualmente, sem instalar nada

```bash
npm install
PANORAMA_API_URL="https://painel.panoramahc.com.br/api" \
PANORAMA_AGENT_TOKEN="token-gerado-no-painel" \
npm start
```

`[agente] Checkin OK — CPU ...% | MEM ...% | DISCO ...%` a cada minuto
confirma que está funcionando. Ctrl+C para parar.

## Arquivos

- `agente-exemplo.js` — script principal
- `package.json` / `package-lock.json` — dependências (Node)
- `cadastrar-ativo.sh` — cadastra um ativo e gera o token, em 1 comando
- `instalar.ps1` — instalador Windows via `.exe`
- `scripts/build-agent-exe.sh` — compila o `.exe` (rodar na VPS)
- `instalar-servico-windows.js` / `desinstalar-servico-windows.js` — instalador Windows via Node.js
- `panorama-agent.service` — serviço systemd (Linux)

## Próximo passo

Antes de uma distribuição maior, vale adicionar: fila local para não perder
dados quando a rede cai, validação de certificado TLS, e envio periódico de
inventário de software (a função `coletarSoftware`, ainda não usada no
ciclo principal).
