#!/usr/bin/env bash
# Compila o agente num .exe standalone (não precisa de Node.js na máquina de
# destino) e deixa disponível para download em
# https://painel.panoramahc.com.br/agente-download/panorama-agent.exe
#
# Rodar UMA VEZ na VPS (precisa de internet livre — não funciona em ambientes
# com proxy restrito). Usa Docker só como ambiente de build, não interfere
# em nada que já está rodando.
#
# Uso: ./scripts/build-agent-exe.sh
# Rodar de novo sempre que agente-exemplo.js mudar.

set -euo pipefail
cd "$(dirname "$0")/.."   # raiz do repo

mkdir -p agent-releases

docker run --rm -v "$(pwd)":/work -w /work node:22 sh -c '
  set -e
  mkdir -p /tmp/build && cp /work/agente-exemplo.js /tmp/build/
  cd /tmp/build
  cat > package.json << "EOF"
{ "name": "panorama-agente-build", "bin": "agente-exemplo.js", "dependencies": { "systeminformation": "^5.22.0" } }
EOF
  npm install --no-audit --no-fund
  npm install --no-save @yao-pkg/pkg
  npx pkg agente-exemplo.js -t node22-win-x64 --no-bytecode --public-packages "*" --public -o /work/agent-releases/panorama-agent.exe
'

echo ""
echo "Pronto: agent-releases/panorama-agent.exe"
echo "Fica disponível em: https://painel.panoramahc.com.br/agente-download/panorama-agent.exe"
echo "(o painel serve esse arquivo automaticamente — não precisa reiniciar nada)"
