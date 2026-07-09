# Plano 001 - Corrigir Postgres no Docker Compose

## Metadados

- Projeto: Sistema de Propostas
- Data: 2026-07-09
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces
- Agente principal: DevOps Engineer
- Agente de apoio: Database Engineer
- Status: Concluido em 2026-07-09

## Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-devops-engineer.md`
- `.agents/agent-database-engineer.md`
- `docs/09-docker-ambientes-operacao.md`
- `docs/rodar-local.md`
- `docker-compose.yml`

## Escolha do Agente

O melhor agente para esta tarefa e o **DevOps Engineer**, porque o problema envolve Docker Desktop, Docker Compose, containers, healthcheck, portas, volumes e operacao local/producao.

O **Database Engineer** deve apoiar porque a falha esta no volume persistente do PostgreSQL e qualquer correcao precisa preservar integridade dos dados.

## Problema

O servico `postgres` do `docker-compose.yml` nao esta subindo corretamente. Como a API depende de:

```yaml
depends_on:
  postgres:
    condition: service_healthy
```

quando o Postgres nao fica healthy, os containers `api` e `frontend` permanecem travados/criados e o sistema nao sobe.

## Evidencias Coletadas

Comando:

```bash
docker ps -a
```

Resultado relevante:

```text
sistema-propostas-postgres   Restarting (1)
sistema-propostas-api        Created
sistema-propostas-frontend   Created
```

Comando:

```bash
docker logs --tail 120 sistema-propostas-postgres
```

Erro relevante:

```text
FATAL: bogus data in lock file "postmaster.pid": ""
PostgreSQL Database directory appears to contain a database; Skipping initialization
```

Comando:

```bash
docker inspect sistema-propostas-postgres
```

Pontos relevantes:

- Container: `sistema-propostas-postgres`
- Status: `restarting`
- ExitCode: `1`
- Health: `unhealthy`
- Volume: `sistema-propostas_propostas_postgres_data`
- Mount: `/var/lib/postgresql/data`
- Porta host configurada: `5433`

## Diagnostico Inicial

A causa mais provavel e um arquivo `postmaster.pid` corrompido ou vazio dentro do volume persistente:

```text
/var/lib/postgresql/data/postmaster.pid
```

Esse arquivo normalmente e criado pelo Postgres enquanto o servidor esta rodando. Se o Docker/Desktop ou a maquina desligar em momento ruim, pode sobrar um arquivo invalido no volume. Neste caso, o Postgres tenta iniciar, encontra o lock file invalido e aborta.

## Objetivo

Restaurar o funcionamento local do `docker compose up -d --build` sem perda de dados, garantindo que:

- Postgres fique `healthy`.
- API execute Prisma generate, db push, seed e suba.
- Frontend suba em `http://localhost:21709`.
- O procedimento fique documentado para uso futuro e preparacao de producao.

## Principios de Execucao

1. Nao remover volume antes de tentar preservar dados.
2. Fazer backup do volume antes de mexer no `postmaster.pid`.
3. Confirmar que nao existe processo Postgres ativo usando o volume.
4. Remover apenas o lock file corrompido se ele estiver vazio/invalido.
5. Subir o compose e validar healthcheck.
6. Documentar o procedimento em `docs/rodar-local.md` ou `docs/09-docker-ambientes-operacao.md`.

## Plano de Acao

### Fase 1 - Congelar Estado Atual

1. Verificar status dos containers:

```bash
docker compose ps
docker ps -a
```

2. Coletar logs atuais:

```bash
docker logs --tail 200 sistema-propostas-postgres
docker compose logs --tail=100 api frontend
```

3. Registrar estado do volume:

```bash
docker volume inspect sistema-propostas_propostas_postgres_data
```

### Fase 2 - Parar Tentativas de Restart

1. Parar o stack para interromper o loop:

```bash
docker compose stop postgres api frontend
```

2. Confirmar que o container saiu do estado `Restarting`:

```bash
docker ps -a
```

### Fase 3 - Backup do Volume PostgreSQL

Criar backup tar do volume antes de qualquer alteracao:

```bash
mkdir -p ./tmp-backups
docker run --rm \
  -v sistema-propostas_propostas_postgres_data:/var/lib/postgresql/data:ro \
  -v "$PWD/tmp-backups:/backup" \
  alpine \
  sh -c "tar czf /backup/propostas-postgres-$(date +%Y%m%d-%H%M%S).tgz -C /var/lib/postgresql/data ."
```

Validar que o arquivo foi criado:

```bash
ls -lh ./tmp-backups
```

### Fase 4 - Inspecionar Lock File

Usar container temporario para inspecionar o volume:

```bash
docker run --rm \
  -v sistema-propostas_propostas_postgres_data:/var/lib/postgresql/data \
  alpine \
  sh -c "ls -la /var/lib/postgresql/data && ls -l /var/lib/postgresql/data/postmaster.pid || true && cat /var/lib/postgresql/data/postmaster.pid || true"
```

Resultado esperado para confirmar diagnostico:

- Arquivo `postmaster.pid` existe.
- Conteudo esta vazio ou invalido.
- Nao ha Postgres rodando de fato.

### Fase 5 - Corrigir Lock File Corrompido

Se o arquivo estiver vazio/invalido e os containers estiverem parados, remover apenas o lock:

```bash
docker run --rm \
  -v sistema-propostas_propostas_postgres_data:/var/lib/postgresql/data \
  alpine \
  sh -c "rm -f /var/lib/postgresql/data/postmaster.pid"
```

Nao remover outros arquivos do volume.

### Fase 6 - Subir Compose e Validar

Subir o stack:

```bash
docker compose up -d --build
```

Validar status:

```bash
docker compose ps
docker ps -a
```

Validar logs do Postgres:

```bash
docker logs --tail 80 sistema-propostas-postgres
```

Sinais esperados:

```text
database system is ready to accept connections
/var/run/postgresql:5432 - accepting connections
```

Validar API e frontend:

```bash
curl http://localhost:21709/api/healthz
curl http://localhost:8081/api/healthz
```

Observacao: se `/api/healthz` estiver exposto apenas pelo proxy do frontend, priorizar `http://localhost:21709/api/healthz`.

### Fase 7 - Validar Banco com Prisma

Se API subir, validar que o boot executou:

- Prisma generate
- Prisma db push
- seed
- start da API

Comando:

```bash
docker compose logs --tail=160 api
```

Sinais esperados:

```text
Prisma schema loaded
Your database is now in sync
Seed completed successfully
Server listening
```

### Fase 8 - Atualizar Documentacao Operacional

Adicionar uma secao de troubleshooting em:

- `docs/rodar-local.md`
- `docs/09-docker-ambientes-operacao.md`

Conteudo minimo:

- Sintoma: Postgres em `Restarting`.
- Erro: `bogus data in lock file "postmaster.pid"`.
- Procedimento seguro:
  - parar compose
  - backup do volume
  - inspecionar lock file
  - remover apenas `postmaster.pid`
  - subir compose
  - validar healthcheck

## Alternativas e Riscos

### Alternativa Rapida, com Perda de Dados

Remover volume e recriar banco:

```bash
docker compose down -v
docker compose up -d --build
```

Risco:

- Apaga todos os dados locais do Postgres.
- Aceitavel apenas se o ambiente local puder ser resetado e o seed for suficiente.

### Alternativa Recomendada

Backup + remocao apenas de `postmaster.pid`.

Risco:

- Baixo, desde que nao exista processo Postgres ativo.
- Preserva dados do volume.

## Preparacao para Producao

Antes de subir em VPS/producao:

1. Nao usar `POSTGRES_PASSWORD=propostas`.
2. Mover segredos para `.env` ou secrets do provedor.
3. Evitar `prisma db push` automatico em boot de producao.
4. Preferir migrations versionadas.
5. Ter backup automatico do Postgres.
6. Definir politica de restore testada.
7. Evitar expor Postgres publicamente se nao for necessario.
8. Usar healthcheck e restart policy, mas monitorar loops de restart.
9. Separar portas internas e externas.
10. Documentar processo de deploy e rollback.

## Criterios de Aceite

- `docker compose ps` mostra `postgres` como `healthy`.
- `api` fica `running`.
- `frontend` fica `running`.
- `http://localhost:21709` abre a aplicacao.
- Login ADMIN funciona.
- Login COMERCIAL funciona.
- API consegue conectar no banco.
- Logs nao exibem mais `bogus data in lock file`.
- Documentacao de troubleshooting atualizada.

## Comandos de Validacao Final

```bash
docker compose ps
docker logs --tail 80 sistema-propostas-postgres
docker compose logs --tail=120 api
curl http://localhost:21709/api/healthz
```

## Proxima Acao Recomendada

Plano executado e incidente fechado. O Postgres voltou para `healthy`, a API subiu, o frontend subiu e o healthcheck respondeu `200 OK`.

Se o erro voltar em outro momento mesmo apos remover o lock file, tratar como possivel corrupcao mais profunda do volume e seguir uma das opcoes:

1. Restaurar backup valido anterior.
2. Exportar o que for possivel via ferramentas PostgreSQL.
3. Resetar volume local com `docker compose down -v`, se perda local for aceitavel.

## Execucao Realizada

### Resultado

O problema foi corrigido sem remover o volume do banco.

Validacoes finais:

```text
sistema-propostas-postgres   Up (healthy)   5433->5432
sistema-propostas-api        Up             8081->8080
sistema-propostas-frontend   Up             21709->21709
```

Healthcheck:

```bash
curl -i http://localhost:21709/api/healthz
```

Resposta:

```text
HTTP/1.1 200 OK
{"status":"ok"}
```

### Backup Criado

Antes de alterar o volume, foi criado o backup:

```text
tmp-backups/propostas-postgres-20260709-0924.tgz
```

Tamanho aproximado: `9.2M`.

### Correcao Aplicada

1. Os containers foram parados para interromper o loop de restart.
2. O volume `sistema-propostas_propostas_postgres_data` foi copiado para `tmp-backups`.
3. O arquivo `/var/lib/postgresql/data/postmaster.pid` foi inspecionado dentro do volume.
4. O `postmaster.pid` estava corrompido: tinha `94` bytes compostos por bytes nulos.
5. Foi removido apenas o `postmaster.pid` corrompido.
6. Ao subir novamente, apareceu um segundo lock corrompido em `/var/run/postgresql/.s.PGSQL.5432.lock`, dentro do filesystem do container.
7. O container `postgres` foi recriado com `docker compose rm -f postgres`, preservando o volume do banco.
8. O stack foi reconstruido com `docker compose up -d --build`.

### Logs de Confirmacao

Postgres:

```text
database system is ready to accept connections
```

API:

```text
The database is already in sync with the Prisma schema.
Seed completed successfully!
Server listening
```

### Observacao Operacional

Se o erro envolver somente `/var/lib/postgresql/data/postmaster.pid`, remover apenas esse arquivo apos backup costuma ser suficiente.

Se tambem aparecer erro em `/var/run/postgresql/.s.PGSQL.5432.lock`, esse lock fica no filesystem efemero do container. Nesse caso, recrie apenas o container do Postgres com `docker compose rm -f postgres`, sem usar `docker compose down -v` e sem remover o volume.
