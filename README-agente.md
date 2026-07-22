# Agente Panorama — guia rápido

Agente que roda em cada computador/servidor e envia métricas para a API do
painel.

## Instalar numa máquina Windows (só o .exe, nada mais)

**Passo único, na VPS** (fazer uma vez, ou de novo sempre que
`agente-exemplo.js` mudar):

```bash
./scripts/build-agent-exe.sh
```

Isso compila `panorama-agent.exe` (já com a chave de instalação do seu
painel embutida) e deixa disponível em
`https://painel.panoramahc.com.br/agente-download/panorama-agent.exe`.

**Na máquina Windows: baixe o `panorama-agent.exe` e dê 1 clique com o
botão direito > "Executar como Administrador" (só na primeira vez).**
Nada de pasta, nada de config.json, nada de comando.

O agente sozinho:
1. Se copia para `C:\ProgramData\PanoramaAgent` (pasta fixa, para
   sobreviver mesmo se você apagar o `.exe` que baixou).
2. Se cadastra automaticamente no painel.
3. Se registra para iniciar com o Windows, como tarefa do sistema (SYSTEM) —
   sobrevive a reinício e não depende de ninguém logado.
4. Aciona essa tarefa agora mesmo e entrega o monitoramento pra ela — a
   janela do Prompt de Comando avisa **"Pode fechar esta janela"** e a
   partir daí o agente continua rodando escondido, sem nenhuma janela
   aberta.

Ele aparece no painel como **"não organizado"** — dá pra ver e organizar
(nome, tipo, filial, departamento) direto em
`https://painel.panoramahc.com.br`, num aviso amarelo no topo do
dashboard. Não precisa saber o nome/filial da máquina antes de instalar.

> Se não der para "Executar como Administrador" na primeira vez, o agente
> registra uma versão mais limitada da tarefa (só inicia quando alguém
> loga) e avisa na tela **"esta janela precisa continuar aberta"** — nesse
> caso, feche e repita o clique como Administrador para não depender de
> manter nenhuma janela aberta.

> **Nota de verificação**: o auto-cadastro, a auto-instalação e o build do
> `.exe` foram revisados e testados com um servidor mock (simulando a API)
> neste ambiente, mas não puderam ser executados ponta a ponta numa
> máquina Windows real. Teste na primeira máquina e confira se ela aparece
> no painel (em "não organizado" ou já com métricas) depois de alguns
> minutos.

## Alternativa: pré-cadastrar com nome/filial definidos

Útil quando você já sabe de antemão o nome/filial da máquina (ex.: vai
preparar várias de uma vez) e prefere não organizar depois pelo painel.

Na VPS (ou qualquer máquina com `curl`+`python3`):

```bash
./cadastrar-ativo.sh computador "PC-FINANCEIRO-05" "Matriz" "Financeiro"
```

Isso cadastra o ativo no painel e gera um arquivo pronto em
`pacotes-agente/config-NOME.json` com o token já preenchido. Renomeie para
`config.json`, coloque na mesma pasta do `panorama-agent.exe` na máquina de
destino, e rode o `.exe` — ele detecta o `config.json` e usa aquele
cadastro específico em vez de se auto-cadastrar.

## Alternativa: instalador PowerShell (`instalar.ps1`)

Baixa o `.exe`, grava a configuração a partir de um `-Token` já gerado via
`cadastrar-ativo.sh` e testa antes de registrar a tarefa — útil para
instalação remota via um único link, sem precisar copiar dois arquivos:

```powershell
irm https://raw.githubusercontent.com/fernandocamposti/panorama-home-center/main/instalar.ps1 -OutFile instalar.ps1
.\instalar.ps1 -Token "TOKEN_GERADO_NO_CADASTRO"
```

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
