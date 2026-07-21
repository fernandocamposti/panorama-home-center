# Deploy na Hostinger — status e próximos passos

## Status atual ✅

- Backend (API) em produção, isolado do Ticketz, rodando em `/opt/panorama` na VPS `srv904964`.
- Repositório: `github.com/fernandocamposti/panorama-home-center` (público).
- Banco migrado, usuário admin (`suporteti@panorama.com.br`) criado.
- Domínio `painel.panoramahc.com.br` com SSL automático via `nginx-proxy` +
  `acme-companion` (os mesmos containers que já cuidam do Ticketz em
  `pchat.panoramahc.com.br` — cada domínio com seu próprio certificado, sem
  interferência entre eles).

## O que muda agora (Fase 3 — frontend)

Até aqui, `painel.panoramahc.com.br` só respondia às rotas JSON da API
(`/health`, `/api/*`). Agora existe um frontend React (pasta `frontend/`)
que vira a tela de verdade do painel.

Mudança de arquitetura: quem passa a ficar exposto ao público é o
**panorama_frontend** (Nginx servindo o React + fazendo proxy interno para
a API). O `panorama_api` sai da rede do proxy do Ticketz e fica 100%
isolado, só acessível pelo `panorama_frontend` dentro da rede interna
(`panorama_net`). Isso é mais seguro: só um ponto de entrada público em vez
de dois.

### Passo a passo na VPS

```bash
cd /opt/panorama
git pull
docker compose -f docker-compose.panorama.yml up -d --build
docker compose -f docker-compose.panorama.yml ps
```

Deve aparecer `panorama_postgres`, `panorama_redis`, `panorama_api` e
`panorama_frontend`, todos `Up`.

Confere que o `panorama_api` **não** está mais na rede do proxy (voltou a
ficar só na `panorama_net`), e que quem está lá agora é o `panorama_frontend`:

```bash
docker inspect panorama_api --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool
docker inspect panorama_frontend --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool
```

Acompanha a emissão do certificado para o novo container (mesmo domínio de
antes, então deve ser rápido — só troca qual container recebe o tráfego):

```bash
docker logs -f ticketz-acme-companion
```

Ctrl+C ao ver algo sobre `painel.panoramahc.com.br`. Teste final:

```bash
curl -I https://painel.panoramahc.com.br
curl https://painel.panoramahc.com.br/health

# e o Ticketz, para garantir que nada mudou por lá:
curl -I https://pchat.panoramahc.com.br
```

Depois disso, abra `https://painel.panoramahc.com.br` no navegador — deve
aparecer a tela de login. Entre com `suporteti@panorama.com.br` e a senha
que você definiu.

---

## Referência rápida

- **Atualizar o código no futuro**: `git pull && docker compose -f docker-compose.panorama.yml up -d --build`
- **Backup do banco**: `docker compose -f docker-compose.panorama.yml exec panorama_postgres pg_dump -U panorama panorama > backup.sql`
- **Próxima fase**: instalar o agente (`agente-exemplo.js`) numa máquina real, gerando o token pela tela de ativos do painel (endpoint `/api/ativos/:id/enroll`).
