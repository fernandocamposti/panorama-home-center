# Agente Panorama — guia rápido

Agente que roda em cada computador/servidor e envia métricas para a API do
painel. Arquivos:

- `agente-exemplo.js` — script principal (coleta + envio). Lê configuração de
  `config.json` (na mesma pasta) ou de variáveis de ambiente.
- `package.json` — dependências
- `panorama-agent.service` — serviço systemd (Linux)
- `instalar-servico-windows.js` / `desinstalar-servico-windows.js` — registram/removem
  o agente como Serviço do Windows (usa `node-windows`)

## Testar manualmente (qualquer SO)

```bash
npm install
PANORAMA_API_URL="https://painel.panoramahc.com.br/api" \
PANORAMA_AGENT_TOKEN="token-gerado-no-painel" \
npm start
```

Se aparecer `[agente] Checkin OK — CPU ...% | MEM ...% | DISCO ...%` a cada
minuto, está funcionando. Ctrl+C para parar (isso é só um teste manual, não
fica rodando depois que fechar o terminal — para isso, instale como serviço,
abaixo).

## Instalar como serviço — Linux (systemd)

```bash
npm install --production
```

Edite `panorama-agent.service` com o token real do ativo (gerado no painel)
e a URL da API, depois:

```bash
sudo cp panorama-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now panorama-agent
```

## Instalar como serviço — Windows

Requer Node.js instalado na máquina (`winget install OpenJS.NodeJS.LTS` se
ainda não tiver). Abra o PowerShell **como Administrador**, na pasta onde
estão os arquivos do agente:

```powershell
npm install
node instalar-servico-windows.js SEU_TOKEN_AQUI https://painel.panoramahc.com.br/api
```

Isso registra e inicia o serviço "PanoramaAgent" — aparece em
`services.msc`, inicia sozinho com o Windows e reinicia se cair. Não precisa
mais abrir terminal depois disso.

Para trocar o token (ex.: reinstalou o SO, gerou um token novo no painel):

```powershell
node desinstalar-servico-windows.js
node instalar-servico-windows.js NOVO_TOKEN_AQUI
```

### Alternativa: executável único (.exe), sem precisar de Node.js na máquina

Também é possível compilar o agente num `.exe` standalone com a ferramenta
`@yao-pkg/pkg`, que não depende de Node.js instalado no computador de
destino — útil para distribuir em massa. Isso precisa ser compilado numa
máquina com acesso irrestrito à internet (ex.: a própria VPS, rodando Linux,
consegue compilar o `.exe` para Windows via cross-compile):

```bash
# Numa máquina/VPS com internet livre (não funciona dentro de ambientes
# com proxy restrito, como sandboxes de IA — o build baixa o binário base
# do Node direto do GitHub):
npm install --no-save @yao-pkg/pkg
npx pkg agente-exemplo.js -t node22-win-x64 -o panorama-agent.exe
```

O `.exe` resultado ainda roda como processo comum (não é um serviço do
Windows sozinho) — para rodar em segundo plano/no boot sem Node.js, seria
necessário também um wrapper de serviço como o NSSM (nssm.cc), apontando
para o `panorama-agent.exe`. Essa combinação (pkg + NSSM) não foi testada
ponta a ponta neste projeto; a rota com `node-windows` acima é a testada e
recomendada por enquanto.

## Configuração via arquivo (alternativa às variáveis de ambiente)

Crie um `config.json` na mesma pasta do `agente-exemplo.js`:

```json
{
  "apiUrl": "https://painel.panoramahc.com.br/api",
  "token": "token-gerado-no-painel",
  "intervalMs": 60000
}
```

Variáveis de ambiente, se definidas, têm prioridade sobre o arquivo.

## Próximo passo

Este script faz "coleta e envia" com o essencial. Antes de uma distribuição
maior, vale adicionar: fila local para não perder dados quando a rede cai,
validação de certificado TLS, e envio periódico de inventário de software
(a função `coletarSoftware`, ainda não usada no ciclo principal).
