# Rodar Localmente

## Docker

```bash
cd /Users/joaomvalente/Projetos/Projetos-GTF/Sistema-Propostas
docker compose up -d --build
```

Servicos:

- Frontend: http://localhost:21709
- API: http://localhost:8081
- Postgres: localhost:5433
- Healthcheck: http://localhost:21709/api/healthz

Admin:
admin@radio88fm.com.br
Admin@123

Comercial:
carlos@radio88fm.com.br
Comercial@123

teko@gmail.com 
Teko@123

## Depois de alterar textos, icones, botoes ou telas

Importante: o `docker-compose.yml` atual roda frontend e API a partir da imagem `sistema-propostas-app:latest`. O codigo local e copiado para a imagem no build do Dockerfile, nao fica montado por volume. Portanto, se voce alterar arquivos React/API e apenas atualizar o navegador, o container pode continuar servindo a versao antiga.

Sempre rode os comandos abaixo dentro da pasta do projeto:

```bash
cd /Users/joaomvalente/Projetos/Projetos-GTF/Sistema-Propostas
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
pnpm --filter @workspace/api-server run build
docker compose up -d --build
```

Se quiser forcar rebuild completo quando suspeitar de cache da imagem:

```bash
cd /Users/joaomvalente/Projetos/Projetos-GTF/Sistema-Propostas
docker compose build --no-cache
docker compose up -d
```

Para alteracoes visuais de proposta/PDF, rode pelo menos:

```bash
cd /Users/joaomvalente/Projetos/Projetos-GTF/Sistema-Propostas
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
```

Depois abra uma proposta, clique em `PDF` e confirme no dialog de impressao se o papel esta em A4 e se os fundos da proposta aparecem. No Chrome, ative `Graficos de fundo` se essa opcao aparecer.

Depois acesse novamente:

```text
http://localhost:21709
```

Se a tela ainda mostrar a versao antiga, faca um hard refresh no navegador:

```text
Cmd + Shift + R
```

Para confirmar se o Docker esta servindo o codigo novo de Propostas:

```bash
curl -s http://localhost:21709/src/pages/proposals/index.tsx
```

Procure no retorno por termos do fluxo novo, como:

```text
program-board
Navegue por programas, produtos e propostas vinculadas
Nova proposta
```

Se aparecer `useListProposals` com tabela simples e botao para `/proposals/new`, a imagem ainda esta antiga e precisa de `docker compose up -d --build`.

## Validacao

```bash
pnpm run typecheck
PORT=8080 pnpm --filter @workspace/api-server run build
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
curl http://localhost:21709/api/healthz
```

## Banco

```bash
pnpm db:generate
pnpm db:push
pnpm seed
```

## Logs e Status

```bash
docker compose ps
docker compose logs -f api frontend
```

## Troubleshooting: Imagem Docker com node_modules corrompido

Sintoma:

```text
Error: Invalid package config /app/node_modules/.pnpm/prisma...
ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL
```

Esse erro pode aparecer depois de falha interna do Docker Desktop durante build/recreate. O codigo pode estar correto, mas a camada cacheada da imagem fica corrompida.

Procedimento usado para recuperar:

```bash
cd /Users/joaomvalente/Projetos/Projetos-GTF/Sistema-Propostas
docker compose build --no-cache
docker compose up -d --force-recreate
curl http://localhost:21709/api/healthz
```

Resultado esperado:

```json
{"status":"ok"}
```

## Troubleshooting: Postgres em Restarting

Sintoma:

```text
sistema-propostas-postgres   Restarting
```

Erro comum nos logs:

```text
FATAL: bogus data in lock file "postmaster.pid": ""
```

Procedimento seguro, preservando o volume:

```bash
cd /Users/joaomvalente/Projetos/Projetos-GTF/Sistema-Propostas
docker compose stop postgres api frontend
mkdir -p ./tmp-backups
docker run --rm \
  -v sistema-propostas_propostas_postgres_data:/var/lib/postgresql/data:ro \
  -v "$PWD/tmp-backups:/backup" \
  alpine \
  sh -c "tar czf /backup/propostas-postgres-$(date +%Y%m%d-%H%M%S).tgz -C /var/lib/postgresql/data ."
docker run --rm \
  -v sistema-propostas_propostas_postgres_data:/var/lib/postgresql/data \
  alpine \
  sh -c "ls -l /var/lib/postgresql/data/postmaster.pid || true; wc -c /var/lib/postgresql/data/postmaster.pid || true; cat /var/lib/postgresql/data/postmaster.pid || true"
docker run --rm \
  -v sistema-propostas_propostas_postgres_data:/var/lib/postgresql/data \
  alpine \
  sh -c "rm -f /var/lib/postgresql/data/postmaster.pid"
docker compose up -d --build
docker compose ps
curl http://localhost:21709/api/healthz
```

Se depois disso o log mostrar erro em `/var/run/postgresql/.s.PGSQL.5432.lock`, recrie apenas o container do Postgres, mantendo o volume:

```bash
docker compose stop postgres
docker compose rm -f postgres
docker compose up -d --build
```

Nao use `docker compose down -v` nesse fluxo, porque esse comando remove o volume e apaga os dados locais do Postgres.

## Parar

```bash
docker compose down
```

## Credenciais Seed

- Admin: admin@radio88fm.com.br / Admin@123
- Comercial: carlos@radio88fm.com.br / Comercial@123

## Portas

A API roda internamente na porta 8080, mas esta publicada no host como 8081 para evitar conflito com outros projetos locais.

Para usar outra porta externa:

```bash
API_HOST_PORT=8080 docker compose up -d --build
```
