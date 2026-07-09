# Docker, Ambientes e Operacao

## Execucao Local Padrao

```bash
cd /Users/joaomvalente/Projetos/Projetos-GTF/Sistema-Propostas
docker compose up -d --build
```

URLs:

- Frontend: `http://localhost:21709`
- API: `http://localhost:8081`
- Postgres: `localhost:5433`
- Healthcheck via proxy: `http://localhost:21709/api/healthz`

## Servicos Docker

### postgres

- Imagem: `postgres:16-alpine`
- Container: `sistema-propostas-postgres`
- Banco: `propostas`
- Usuario: `propostas`
- Porta host: `5433`

### api

- Container: `sistema-propostas-api`
- Porta interna: `8080`
- Porta host: `8081` por padrao
- Comandos de boot:
  - Prisma generate
  - Prisma db push
  - seed
  - build/start da API

### frontend

- Container: `sistema-propostas-frontend`
- Porta: `21709`
- Usa Vite em modo dev.
- Proxy para API via `API_PROXY_TARGET=http://api:8080`.

## Variaveis Importantes

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `PORT`
- `BASE_PATH`
- `API_PROXY_TARGET`
- `API_HOST_PORT`

## Alterar Porta da API no Host

```bash
API_HOST_PORT=8080 docker compose up -d --build
```

## Logs

```bash
docker compose logs -f api frontend
```

## Status

```bash
docker compose ps
docker ps -a
```

## Troubleshooting: Postgres em Loop de Restart

### Sintoma

O compose nao sobe completamente e o Postgres fica em restart:

```text
sistema-propostas-postgres   Restarting
sistema-propostas-api        Created
sistema-propostas-frontend   Created
```

Como a API depende do healthcheck do Postgres, quando o banco nao fica `healthy`, o restante da aplicacao nao sobe corretamente.

### Erro de Lock Corrompido

Verifique os logs:

```bash
docker logs --tail 120 sistema-propostas-postgres
```

Erro comum:

```text
FATAL: bogus data in lock file "postmaster.pid": ""
```

Esse arquivo fica no volume persistente em:

```text
/var/lib/postgresql/data/postmaster.pid
```

Ele pode sobrar corrompido depois de desligamento forçado do Docker Desktop, queda da maquina ou encerramento incompleto do Postgres.

### Recuperacao Segura, Sem Remover Volume

Pare os containers:

```bash
docker compose stop postgres api frontend
```

Crie backup do volume antes de alterar qualquer arquivo:

```bash
mkdir -p ./tmp-backups
docker run --rm \
  -v sistema-propostas_propostas_postgres_data:/var/lib/postgresql/data:ro \
  -v "$PWD/tmp-backups:/backup" \
  alpine \
  sh -c "tar czf /backup/propostas-postgres-$(date +%Y%m%d-%H%M%S).tgz -C /var/lib/postgresql/data ."
```

Inspecione o lock:

```bash
docker run --rm \
  -v sistema-propostas_propostas_postgres_data:/var/lib/postgresql/data \
  alpine \
  sh -c "ls -l /var/lib/postgresql/data/postmaster.pid || true; wc -c /var/lib/postgresql/data/postmaster.pid || true; cat /var/lib/postgresql/data/postmaster.pid || true"
```

Se o arquivo estiver vazio, invalido ou composto por bytes nulos, remova somente esse lock:

```bash
docker run --rm \
  -v sistema-propostas_propostas_postgres_data:/var/lib/postgresql/data \
  alpine \
  sh -c "rm -f /var/lib/postgresql/data/postmaster.pid"
```

Suba novamente:

```bash
docker compose up -d --build
docker compose ps
curl http://localhost:21709/api/healthz
```

### Segundo Lock em `/var/run/postgresql`

Se o `postmaster.pid` ja foi removido, mas o log passar a mostrar:

```text
FATAL: bogus data in lock file "/var/run/postgresql/.s.PGSQL.5432.lock": ""
```

esse segundo lock esta no filesystem efemero do container, nao no volume do banco. Recrie apenas o container do Postgres:

```bash
docker compose stop postgres
docker compose rm -f postgres
docker compose up -d --build
```

Esse procedimento preserva o volume `sistema-propostas_propostas_postgres_data`.

### Comando que Apaga Dados

Use somente se aceitar resetar o banco local:

```bash
docker compose down -v
```

Esse comando remove o volume do Postgres e apaga os dados locais. Para recuperar lock corrompido, prefira o fluxo com backup e remocao seletiva do lock.

## Parar

```bash
docker compose down
```

## Depois de Alterar Codigo

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
```
