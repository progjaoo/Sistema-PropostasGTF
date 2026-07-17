# SUBIR-PRODUÇÃO

Guia operacional para publicar o Sistema de Propostas em uma VPS com Docker, PostgreSQL, API e frontend.

## 1. Pre-requisitos da VPS

- Ubuntu Server 22.04 LTS ou 24.04 LTS.
- Acesso SSH com usuario sudo.
- Dominio apontando para o IP da VPS.
- Docker Engine e Docker Compose Plugin.
- Git instalado.
- Firewall liberando apenas SSH, HTTP e HTTPS.
- Backup externo configurado para o banco.

Portas do projeto:

- Frontend local do container: `21709`
- API local do container: `8080`
- Postgres interno: `5432`

Em producao, a recomendacao e expor publicamente apenas `80` e `443` via proxy reverso. API, frontend e Postgres devem ficar em rede Docker privada.

## 2. Preparar a VPS

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
```

Instalar Docker:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

Depois saia e entre novamente no SSH para aplicar o grupo `docker`.

Configurar firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## 3. Clonar o projeto

```bash
mkdir -p ~/apps
cd ~/apps
git clone <URL_DO_REPOSITORIO> sistema-propostas
cd sistema-propostas
```

Substitua `<URL_DO_REPOSITORIO>` pela URL real do Git.

## 4. Variaveis de ambiente de producao

Crie um arquivo `.env.production` fora do Git:

```bash
nano .env.production
```

Exemplo:

```env
POSTGRES_DB=propostas
POSTGRES_USER=propostas
POSTGRES_PASSWORD=troque-esta-senha

DATABASE_URL=postgresql://propostas:troque-esta-senha@postgres:5432/propostas?schema=public

NODE_ENV=production
PORT=8080
JWT_SECRET=gere-um-segredo-grande
JWT_REFRESH_SECRET=gere-outro-segredo-grande
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

APP_PUBLIC_URL=https://propostas.seudominio.com.br
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL=GTF Propostas <nao-responda@subdominio-verificado>
PASSWORD_RESET_TTL_MINUTES=30

BASE_PATH=/
API_PROXY_TARGET=http://api:8080
```

Gere segredos fortes:

```bash
openssl rand -hex 32
```

Nao use os segredos de desenvolvimento do `docker-compose.yml` em producao.

Para recuperacao de senha, crie uma chave nova no Resend e configure SPF/DKIM do dominio ou subdominio usado em `RESEND_FROM_EMAIL`. A chave exposta durante o levantamento do projeto deve ser revogada antes do deploy. Nunca coloque a chave em arquivos versionados, docs ou prints.

## 5. Docker Compose de producao

Crie um compose separado para producao, por exemplo `docker-compose.prod.yml`, mantendo o compose local intacto.

Modelo base:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: sistema-propostas-postgres
    restart: unless-stopped
    env_file:
      - .env.production
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - propostas_postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 12

  api:
    build:
      context: .
    container_name: sistema-propostas-api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    env_file:
      - .env.production
    command: >
      sh -c "pnpm --filter @workspace/db run generate &&
             pnpm --filter @workspace/db run push &&
             pnpm --filter @workspace/api-server run build &&
             pnpm --filter @workspace/api-server run start"
    expose:
      - "8080"

  frontend:
    build:
      context: .
    container_name: sistema-propostas-frontend
    restart: unless-stopped
    depends_on:
      - api
    env_file:
      - .env.production
    environment:
      PORT: "21709"
      BASE_PATH: /
      API_PROXY_TARGET: http://api:8080
    command: >
      sh -c "PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build &&
             PORT=21709 BASE_PATH=/ API_PROXY_TARGET=http://api:8080 pnpm --filter @workspace/proposta run serve"
    expose:
      - "21709"

volumes:
  propostas_postgres_data:
```

Observacao: para producao madura, prefira migrations versionadas em vez de `db push`. Enquanto o projeto ainda usa `db push`, revise o schema antes de subir alteracoes destrutivas.

Nota do plano 012: o sistema de `Avisos de Recaptura` adiciona o modelo `ProposalRecallReminder` e o enum `ProposalRecallReminderStatus`. Antes de publicar essa versao em uma VPS com dados reais, faca backup do Postgres e confirme que o comando da API executou `pnpm --filter @workspace/db run push` com a `DATABASE_URL` de producao correta.

## 6. Subir os containers

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Verificar status:

```bash
docker compose -f docker-compose.prod.yml ps
docker logs sistema-propostas-api --tail=100
docker logs sistema-propostas-frontend --tail=100
```

Validar API pela rede interna da VPS:

```bash
curl http://localhost:8080/api/healthz
```

Se o frontend estiver exposto temporariamente para teste:

```bash
curl http://localhost:21709
```

## 7. Seed inicial

Rode seed somente quando precisar criar dados iniciais ou resetar ambiente novo.

```bash
docker compose -f docker-compose.prod.yml exec api pnpm --filter @workspace/scripts run seed
```

Antes de rodar seed em producao com dados reais, confirme se o script e idempotente e nao sobrescreve usuarios/clientes/propostas existentes.

## 8. Proxy reverso e HTTPS

Use Nginx ou Caddy na VPS.

Exemplo com Nginx:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Config basica:

```nginx
server {
  server_name exemplo.com.br;

  location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    proxy_pass http://127.0.0.1:21709;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Ativar:

```bash
sudo ln -s /etc/nginx/sites-available/sistema-propostas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d exemplo.com.br
```

## 9. Deploy de atualizacao

```bash
cd ~/apps/sistema-propostas
git pull
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml ps
curl https://exemplo.com.br/api/healthz
```

Depois valide login ADMIN e COMERCIAL no navegador.

## 10. Backup do Postgres

Criar backup:

```bash
mkdir -p ~/backups/sistema-propostas
docker exec sistema-propostas-postgres pg_dump -U propostas -d propostas > ~/backups/sistema-propostas/propostas-$(date +%F-%H%M).sql
```

Compactar:

```bash
gzip ~/backups/sistema-propostas/propostas-*.sql
```

Restaurar backup:

```bash
gunzip -c ~/backups/sistema-propostas/propostas-YYYY-MM-DD-HHMM.sql.gz | docker exec -i sistema-propostas-postgres psql -U propostas -d propostas
```

Recomendacao: automatizar backup diario com `cron` e copiar para armazenamento externo.

## 11. Monitoramento basico

Comandos uteis:

```bash
docker compose -f docker-compose.prod.yml ps
docker stats
docker logs sistema-propostas-api --tail=200
docker logs sistema-propostas-frontend --tail=200
docker logs sistema-propostas-postgres --tail=200
```

Checar disco:

```bash
df -h
docker system df
```

Nao rode `docker system prune -a` sem entender o impacto, pois pode remover imagens e caches necessarios.

## 12. Checklist final de producao

- [ ] Dominio aponta para o IP da VPS.
- [ ] Firewall permite apenas SSH, HTTP e HTTPS.
- [ ] Docker e Compose instalados.
- [ ] `.env.production` criado com segredos fortes.
- [ ] Postgres sobe healthy.
- [ ] API responde `/api/healthz`.
- [ ] Frontend abre pelo dominio.
- [ ] Login ADMIN validado.
- [ ] Login COMERCIAL validado.
- [ ] Criacao/edicao de proposta validada.
- [ ] Backup manual testado.
- [ ] Certificado HTTPS ativo.
- [ ] Comandos de deploy documentados para o time.
