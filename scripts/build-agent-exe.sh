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

# O .exe se auto-cadastra no painel usando uma "chave de instalação"
# compartilhada por todos os agentes (não é o token de cada máquina — esse
# é gerado individualmente no primeiro cadastro). Fica salva em api/.env,
# igual DATABASE_URL/JWT_SECRET, e é lida em tempo real pela API.
ENV_FILE="api/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Não encontrei $ENV_FILE — rode este script a partir da raiz do repositório, com a API já configurada." >&2
  exit 1
fi

ENROLL_KEY=$(grep -oP '(?<=^PANORAMA_ENROLL_KEY=).+' "$ENV_FILE" || true)
CHAVE_NOVA=0
if [ -z "$ENROLL_KEY" ]; then
  ENROLL_KEY=$(openssl rand -hex 24)
  { echo ""; echo "PANORAMA_ENROLL_KEY=$ENROLL_KEY"; } >> "$ENV_FILE"
  CHAVE_NOVA=1
  echo "Gerei uma chave de instalação nova e salvei em $ENV_FILE."
fi

docker run --rm -v "$(pwd)":/work -w /work -e ENROLL_KEY="$ENROLL_KEY" node:22 sh -c '
  set -e
  mkdir -p /tmp/build && cp /work/agente-exemplo.js /tmp/build/
  cd /tmp/build
  sed -i "s/__PANORAMA_ENROLL_KEY__/$ENROLL_KEY/" agente-exemplo.js
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

if [ "$CHAVE_NOVA" = "1" ]; then
  echo ""
  echo "IMPORTANTE: a chave de instalação é nova — a API precisa ser reconstruída"
  echo "para reconhecê-la, senão o auto-cadastro do .exe vai dar 'chave inválida':"
  echo "  docker compose -f docker-compose.panorama.yml build panorama_api"
  echo "  docker compose -f docker-compose.panorama.yml up -d panorama_api"
fi
