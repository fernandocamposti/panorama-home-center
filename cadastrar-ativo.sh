#!/usr/bin/env bash
# Cadastra um ativo no painel e imprime o token do agente — tudo em 1 comando.
# Rodar na VPS (ou qualquer máquina com curl + python3).
#
# Uso:
#   ./cadastrar-ativo.sh <tipo> "<nome>" "<filial>" ["<departamento>"]
#
# Exemplos:
#   ./cadastrar-ativo.sh computador "PC-FINANCEIRO-05" "Matriz" "Financeiro"
#   ./cadastrar-ativo.sh servidor "SRV-VENDAS-02" "Matriz"
#
# tipo: computador | servidor | rede | impressora | telefone | monitor
#
# Variáveis de ambiente (opcionais, senão usa os padrões abaixo):
#   PANORAMA_URL, PANORAMA_EMAIL, PANORAMA_SENHA

set -euo pipefail

PANORAMA_URL="${PANORAMA_URL:-https://painel.panoramahc.com.br}"
PANORAMA_EMAIL="${PANORAMA_EMAIL:-suporteti@panorama.com.br}"
PANORAMA_SENHA="${PANORAMA_SENHA:-phc28@09}"

TIPO="${1:?Uso: ./cadastrar-ativo.sh <tipo> \"<nome>\" \"<filial>\" [\"<departamento>\"]}"
NOME="${2:?nome do ativo é obrigatório}"
FILIAL_NOME="${3:?nome da filial é obrigatório}"
DEPTO_NOME="${4:-}"

json_get() { python3 -c "import sys,json;print(json.load(sys.stdin).get('$1',''))"; }

TOKEN=$(curl -s -X POST "$PANORAMA_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$PANORAMA_EMAIL\",\"senha\":\"$PANORAMA_SENHA\"}" | json_get token)

if [ -z "$TOKEN" ]; then
  echo "Falha no login. Confira PANORAMA_EMAIL/PANORAMA_SENHA." >&2
  exit 1
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"

# Busca a filial pelo nome; cria se não existir.
FILIAL_ID=$(curl -s "$PANORAMA_URL/api/filiais" -H "$AUTH_HEADER" \
  | python3 -c "import sys,json; fs=json.load(sys.stdin); print(next((f['id'] for f in fs if f['nome']=='$FILIAL_NOME'), ''))")

if [ -z "$FILIAL_ID" ]; then
  FILIAL_ID=$(curl -s -X POST "$PANORAMA_URL/api/filiais" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
    -d "{\"nome\":\"$FILIAL_NOME\"}" | json_get id)
  echo "Filial \"$FILIAL_NOME\" criada (id $FILIAL_ID)." >&2
fi

DEPTO_ID=""
if [ -n "$DEPTO_NOME" ]; then
  DEPTO_ID=$(curl -s "$PANORAMA_URL/api/departamentos?filial_id=$FILIAL_ID" -H "$AUTH_HEADER" \
    | python3 -c "import sys,json; ds=json.load(sys.stdin); print(next((d['id'] for d in ds if d['nome']=='$DEPTO_NOME'), ''))")
  if [ -z "$DEPTO_ID" ]; then
    DEPTO_ID=$(curl -s -X POST "$PANORAMA_URL/api/departamentos" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
      -d "{\"nome\":\"$DEPTO_NOME\",\"filial_id\":$FILIAL_ID}" | json_get id)
    echo "Departamento \"$DEPTO_NOME\" criado (id $DEPTO_ID)." >&2
  fi
fi

DEPTO_JSON="null"
[ -n "$DEPTO_ID" ] && DEPTO_JSON="$DEPTO_ID"

ATIVO_ID=$(curl -s -X POST "$PANORAMA_URL/api/ativos" -H "$AUTH_HEADER" -H "Content-Type: application/json" \
  -d "{\"tipo\":\"$TIPO\",\"nome\":\"$NOME\",\"filial_id\":$FILIAL_ID,\"departamento_id\":$DEPTO_JSON}" | json_get id)

if [ -z "$ATIVO_ID" ]; then
  echo "Falha ao criar o ativo." >&2
  exit 1
fi

AGENT_TOKEN=$(curl -s -X POST "$PANORAMA_URL/api/ativos/$ATIVO_ID/enroll" -H "$AUTH_HEADER" | json_get token)

echo ""
echo "Ativo \"$NOME\" cadastrado (id $ATIVO_ID)."
echo ""
echo "Token do agente:"
echo "$AGENT_TOKEN"
echo ""
echo "Comando para instalar na máquina (Windows, PowerShell como Administrador):"
echo "  irm https://raw.githubusercontent.com/fernandocamposti/panorama-home-center/main/instalar.ps1 -OutFile instalar.ps1; .\\instalar.ps1 -Token \"$AGENT_TOKEN\""
