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
existirem) e gera um arquivo pronto em `pacotes-agente/config-NOME.json`
com o token já preenchido.

## Instalar o agente — Windows, via .exe (só executar, sem comandos)

**Passo único, na VPS** (fazer uma vez, ou de novo sempre que
`agente-exemplo.js` mudar):

```bash
./scripts/build-agent-exe.sh
```

Isso compila `panorama-agent.exe` e deixa disponível em
`https://painel.panoramahc.com.br/agente-download/panorama-agent.exe`.

**Depois, para instalar em cada máquina Windows, sem rodar nenhum comando
nela:**

1. Baixe `panorama-agent.exe`.
2. Pegue o `pacotes-agente/config-NOME.json` gerado pelo cadastro e
   renomeie para `config.json`.
3. Coloque os dois arquivos (`panorama-agent.exe` + `config.json`) na
   mesma pasta na máquina de destino (pen drive, rede, e-mail — o meio não
   importa).
4. Dê 1 clique com o botão direito no `.exe` > **Executar como
   Administrador** (só na primeira vez).

Pronto. O agente já começa a mandar dados na hora e, sozinho, se registra
para iniciar automaticamente com o Windows — não precisa rodar mais nada
depois disso, mesmo que a máquina reinicie. Para a próxima máquina, é só
repetir o passo 1 acima (cadastro) e os passos 1–4 (copiar e clicar).

> Se não der para "Executar como Administrador" na primeira vez, o agente
> ainda funciona (fica rodando enquanto a janela ficar aberta) e avisa na
> tela que não conseguiu se registrar para iniciar sozinho — nesse caso,
> repita o clique como Administrador quando puder.

## Alternativa: instalador PowerShell (`instalar.ps1`)

Só é necessário se você já tem o `.exe` mas não tem como copiar um
`config.json` junto (ex.: instalação remota via um único link). Baixa o
`.exe`, grava a configuração a partir do `-Token` informado e testa antes
de registrar a tarefa:

```powershell
irm https://raw.githubusercontent.com/fernandocamposti/panorama-home-center/main/instalar.ps1 -OutFile instalar.ps1
.\instalar.ps1 -Token "TOKEN_GERADO_NO_CADASTRO"
```

> **Nota de verificação**: o build do `.exe`, a auto-instalação embutida
> nele e o `instalar.ps1` foram revisados com cuidado, mas não puderam ser
> executados ponta a ponta neste ambiente (sem acesso a uma máquina
> Windows real para testar). Teste na primeira máquina e confira se o
> agente aparece "online" no painel depois de alguns minutos.

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
