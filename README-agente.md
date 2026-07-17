# Agente Panorama — guia rápido

Esqueleto funcional (não é produção) do agente que roda em cada computador/servidor
e envia métricas para a API do painel. Arquivos:

- `agente-exemplo.js` — script principal (coleta + envio)
- `package.json` — dependências
- `panorama-agent.service` — exemplo de serviço systemd (Linux)

## Testar localmente

```bash
npm install
PANORAMA_API_URL="http://localhost:3000/api" \
PANORAMA_AGENT_TOKEN="token-de-teste" \
npm start
```

## Instalar em produção — Linux

1. Copiar a pasta para `/opt/panorama-agente` na máquina de destino.
2. `npm install --production`
3. Editar `panorama-agent.service` com o token real do ativo (gerado no painel).
4. `sudo cp panorama-agent.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl enable --now panorama-agent`

## Instalar em produção — Windows

Duas opções:

1. **node-windows** (mais simples, exige Node instalado na máquina):
   `npm install node-windows` e usar seu instalador de serviço para registrar
   `agente-exemplo.js` como Serviço do Windows, com as variáveis de ambiente
   configuradas no próprio script de instalação do serviço.
2. **Executável único** (recomendado para distribuição em massa): compilar com
   `npx pkg agente-exemplo.js --targets node18-win-x64` gerando um `.exe` que
   não depende de Node instalado, e registrar esse `.exe` como serviço via NSSM.

## Próximo passo

Este script só faz "coleta e envia". Antes de rodar em máquinas reais, faltam:
fila local para não perder dados quando a rede cai, validação de certificado TLS,
e o endpoint `/api/agents/checkin` do lado do servidor (fase 1 do roadmap no
documento `plano-tecnico-panorama.docx`).
