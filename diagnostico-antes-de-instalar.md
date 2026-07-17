# Antes de instalar o Panorama: checar o que já roda na VPS

Rode isso via SSH na VPS (KVM 8) e me mande a saída, ou revise você mesmo antes de continuar.

```bash
# 1. Containers do Whaticket já rodando e quais portas eles usam
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"

# 2. O que já está escutando nas portas 80/443 (é Nginx do host, Traefik, ou o container direto?)
sudo ss -tlnp | grep -E ':80|:443'

# 3. Se for Nginx no host — ver os sites já configurados
ls /etc/nginx/sites-enabled/
cat /etc/nginx/sites-enabled/*whaticket* 2>/dev/null

# 4. Espaço livre em RAM e disco (KVM 8 tem 32 GB / 400 GB — só para confirmar quanto o Whaticket já consome)
free -h
df -h /

# 5. Redes Docker existentes (para não misturar o Postgres/Redis do Panorama com o do Whaticket)
docker network ls
```

## O que eu preciso saber do resultado

- **Portas 80/443 são de um Nginx no host** (instalação manual clássica do Whaticket) → ótimo, é só adicionar
  um novo bloco `server {}` para o subdomínio do Panorama (arquivo `nginx-panorama.conf.example` incluso).
- **Portas 80/443 são de um container** (Traefik, Nginx Proxy Manager, ou Nginx dockerizado) → me diga qual,
  o Panorama entra nesse mesmo proxy por label/config em vez de um Nginx separado no host.

Com KVM 8 (8 vCPU / 32 GB RAM) sobra recurso de sobra para os dois sistemas — o único ponto de atenção real
é **não deixar dois serviços tentando ocupar a porta 80/443 ao mesmo tempo** e **não usar os mesmos nomes de
container/rede Docker** que o Whaticket já usa (para não colidir Postgres com Postgres, Redis com Redis).
