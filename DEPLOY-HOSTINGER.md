# Deploy na Hostinger — passo a passo

Sua situação hoje: VPS KVM 8 (8 vCPU / 32 GB RAM) na Hostinger, já com Docker
rodando o Whaticket. Vamos subir o Panorama do lado, sem tocar no que já existe.

Já criei um repositório Git local nesta pasta (commit inicial feito). Falta só
você criar o repositório remoto e colocar o código na VPS.

---

## Parte A — no seu computador (uma vez só)

### A.1 Criar o repositório no GitHub

1. Acesse [github.com/new](https://github.com/new) e crie um repositório **privado**
   (ex.: `panorama-home-center`). Não marque nenhuma opção de inicializar com README.
2. No terminal, dentro desta pasta:

```bash
git remote add origin https://github.com/SEU_USUARIO/panorama-home-center.git
git branch -M main
git push -u origin main
```

Se pedir login, o GitHub hoje exige um *token* em vez de senha — ele mesmo te
guia a criar um em Settings → Developer settings → Personal access tokens.

---

## Parte B — na VPS (via SSH)

### B.1 Diagnóstico rápido antes de tudo

Já existe o arquivo `diagnostico-antes-de-instalar.md` com os comandos —
rode-os primeiro. O ponto crítico: confirmar que as portas 80/443 são de um
**Nginx no host** (padrão nas instalações de Whaticket) e não de um container
(Traefik/Nginx Proxy Manager). O resto deste guia assume Nginx no host — me
avise se for diferente.

### B.2 Clonar o repositório

```bash
cd /opt
sudo git clone https://github.com/SEU_USUARIO/panorama-home-center.git panorama
cd panorama
```

### B.3 Configurar variáveis de ambiente

```bash
cd api
cp .env.example .env
nano .env
```

Edite:
- `DATABASE_URL` → troque `TROQUE_ESTA_SENHA` pela mesma senha que você vai
  usar no `docker-compose.panorama.yml` (próximo passo).
- `JWT_SECRET` → gere uma string aleatória: `openssl rand -hex 32`

```bash
cd ..
nano docker-compose.panorama.yml
```

Troque as duas ocorrências de `TROQUE_ESTA_SENHA` pela mesma senha de banco
(uma no `panorama_postgres`, outra no `DATABASE_URL` da `panorama_api`).

### B.4 Subir os containers

```bash
docker compose -f docker-compose.panorama.yml up -d --build
docker compose -f docker-compose.panorama.yml ps
```

Deve aparecer `panorama_postgres`, `panorama_redis` e `panorama_api` como
`running`. Se `panorama_api` reiniciar em loop, veja o log:

```bash
docker compose -f docker-compose.panorama.yml logs -f panorama_api
```

### B.5 Rodar a migração e criar o admin

```bash
docker compose -f docker-compose.panorama.yml exec panorama_api node scripts/migrate.js
docker compose -f docker-compose.panorama.yml exec panorama_api node scripts/create-admin.js "Seu Nome" seu@email.com "senha-forte-aqui"
```

### B.6 Testar localmente na própria VPS (antes de expor ao público)

```bash
curl http://127.0.0.1:3001/health
# esperado: {"status":"ok"}
```

### B.7 Apontar o subdomínio

No painel de DNS da Hostinger (ou onde seu domínio está registrado), crie um
registro **A**: `painel` (ou o nome que preferir) → IP da sua VPS.

### B.8 Configurar o Nginx

```bash
sudo cp nginx-panorama.conf.example /etc/nginx/sites-available/panorama
sudo nano /etc/nginx/sites-available/panorama   # troque painel.seudominio.com.br pelo domínio real
sudo ln -s /etc/nginx/sites-available/panorama /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### B.9 Gerar o certificado SSL

```bash
sudo certbot --nginx -d painel.seudominio.com.br
```

(Se `certbot` não estiver instalado: `sudo apt install certbot python3-certbot-nginx`.)

### B.10 Teste final, pelo domínio público

```bash
curl https://painel.seudominio.com.br/health

curl -X POST https://painel.seudominio.com.br/api/auth/login \
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
  `https://painel.seudominio.com.br/api`.
