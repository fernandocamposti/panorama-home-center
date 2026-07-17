# Deploy na Hostinger — passo a passo

Sua situação real (confirmada via diagnóstico na VPS `srv904964`): Docker
com o Ticketz (variante do Whaticket) rodando via `nginx-proxy` +
`acme-companion` — dois containers que expõem tudo ao público nas portas
80/443 e emitem certificado SSL automaticamente, lendo variáveis de ambiente
dos outros containers. Rede desse proxy: `ticketz-docker-acme_nginx-proxy`.

Isso simplifica o deploy: **não precisa editar Nginx nem rodar certbot à
mão** — só colocar o `panorama_api` na mesma rede e definir duas variáveis
de ambiente, que já estão configuradas no `docker-compose.panorama.yml`
para o domínio `pchat.panoramahc.com.br`.

Repositório já criado e no ar: `github.com/fernandocamposti/panorama-home-center`.

---

## Parte A — já feita ✅

Repositório criado no GitHub e código enviado.

---

## Parte B — na VPS (via SSH)

### B.1 DNS — já feito ✅

`pchat.panoramahc.com.br` → `31.97.82.10`. Só confirme que esse é mesmo o IP
público desta VPS antes de seguir:

```bash
curl -4 ifconfig.me
```

Se a propagação do DNS ainda estiver recente, pode levar alguns minutos até
funcionar globalmente — sem problema, o resto do deploy não depende disso.

### B.2 Clonar o repositório

```bash
cd /opt
git clone https://github.com/fernandocamposti/panorama-home-center.git panorama
cd panorama
```

(Repositório é privado — vai pedir usuário + token do GitHub, o mesmo token
que você já usou no seu Mac.)

### B.3 Configurar variáveis de ambiente

```bash
cd api
cp .env.example .env
nano .env
```

Edite:
- `DATABASE_URL` → troque `TROQUE_ESTA_SENHA` pela senha que você vai usar
  no `docker-compose.panorama.yml` (próximo passo — use a mesma nos dois lugares).
- `JWT_SECRET` → gere uma string aleatória: `openssl rand -hex 32`

```bash
cd ..
nano docker-compose.panorama.yml
```

Troque as duas ocorrências de `TROQUE_ESTA_SENHA` (uma em `panorama_postgres`,
outra em `DATABASE_URL` de `panorama_api`) pela mesma senha.

### B.4 Subir os containers

```bash
docker compose -f docker-compose.panorama.yml up -d --build
docker compose -f docker-compose.panorama.yml ps
```

Deve aparecer `panorama_postgres`, `panorama_redis` e `panorama_api` como
`running`/`Up`. Se `panorama_api` reiniciar em loop:

```bash
docker compose -f docker-compose.panorama.yml logs -f panorama_api
```

### B.5 Rodar a migração e criar o admin

```bash
docker compose -f docker-compose.panorama.yml exec panorama_api node scripts/migrate.js
docker compose -f docker-compose.panorama.yml exec panorama_api node scripts/create-admin.js "Seu Nome" seu@email.com "senha-forte-aqui"
```

### B.6 Esperar o certificado SSL

O `acme-companion` detecta o `panorama_api` (pela variável `LETSENCRYPT_HOST`)
e emite o certificado sozinho, em até 1-2 minutos. Acompanhar:

```bash
docker logs -f ticketz-acme-companion
```

(Ctrl+C para sair depois de ver algo como "Certificate obtained" para
`pchat.panoramahc.com.br`.)

### B.7 Teste final, pelo domínio público

```bash
curl https://pchat.panoramahc.com.br/health
# esperado: {"status":"ok"}

curl -X POST https://pchat.panoramahc.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"seu@email.com","senha":"senha-forte-aqui"}'
```

Se o login retornar um `token`, o backend está no ar em produção.

---

## Depois disso

- **Atualizar o código no futuro**: `git pull && docker compose -f docker-compose.panorama.yml up -d --build`
- **Backup do banco**: `docker compose -f docker-compose.panorama.yml exec panorama_postgres pg_dump -U panorama panorama > backup.sql`
- **Próxima fase**: cadastrar a primeira filial/ativo de teste e instalar o
  agente (`agente-exemplo.js`) numa máquina real apontando para
  `https://pchat.panoramahc.com.br/api`.
