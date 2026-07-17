# Panorama API — Fase 1 (Fundação)

Backend Node.js/Fastify + PostgreSQL. Cobre: autenticação de usuários, cadastro
de filiais/departamentos/ativos, geração de token de agente (enrollment),
recebimento de checkin dos agentes, regras básicas de alerta e resumo para
o dashboard.

## Rodar localmente (com Docker Compose da raiz do projeto)

A partir da raiz onde está o `docker-compose.panorama.yml`:

```bash
docker compose -f docker-compose.panorama.yml up -d panorama_postgres panorama_redis
cd api
cp .env.example .env        # ajustar DATABASE_URL/JWT_SECRET
npm install
npm run migrate             # cria as tabelas
npm run create-admin -- "Seu Nome" seu@email.com "senha-forte"
npm run dev
```

Testar:

```bash
curl http://localhost:3000/health

curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","senha":"senha-forte"}'
# copie o "token" da resposta para os próximos comandos

curl http://localhost:3000/api/filiais -H "Authorization: Bearer TOKEN_AQUI"

curl -X POST http://localhost:3000/api/filiais \
  -H "Authorization: Bearer TOKEN_AQUI" -H "Content-Type: application/json" \
  -d '{"nome":"Matriz"}'
```

## Endpoints principais

| Método | Rota | Autenticação | Descrição |
|---|---|---|---|
| POST | /api/auth/login | — | Login do usuário, retorna JWT |
| GET/POST | /api/filiais | JWT (usuário) | Listar/criar filiais |
| GET/POST | /api/departamentos | JWT (usuário) | Listar/criar departamentos |
| GET/POST | /api/ativos | JWT (usuário) | Listar/criar ativos (computador, servidor, etc.) |
| POST | /api/ativos/:id/enroll | JWT (usuário) | Gera o token do agente para aquele ativo |
| POST | /api/agents/checkin | Token do agente | Recebe métricas do agente |
| GET | /api/dashboard/resumo | JWT (usuário) | Contagens por tipo/filial, igual aos cards do dashboard |
| GET | /api/dashboard/alertas-recentes | JWT (usuário) | Últimos alertas abertos |

## O que falta antes de produção

- Rate limiting nas rotas de agente e login.
- Paginação nas listagens (`/api/ativos`, `/api/dashboard/alertas-recentes`).
- Testes automatizados.
- Fase 3 do roadmap: frontend React consumindo esses endpoints.
