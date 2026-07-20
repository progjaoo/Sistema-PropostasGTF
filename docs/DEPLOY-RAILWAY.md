# Deploy no Railway

Este guia documenta como publicar o Sistema de Propostas no Railway com:

- PostgreSQL gerenciado pelo Railway.
- API Express como servico Node/Docker.
- Frontend React/Vite como servico separado.
- Comunicacao interna entre servicos pela rede privada do Railway.

## Referencias Oficiais

- Railway Docs: https://docs.railway.com/
- Railway Monorepos: https://docs.railway.com/deployments/monorepo
- Railway Docker Compose Guide: https://docs.railway.com/guides/docker-compose
- Railway CLI Deploy: https://docs.railway.com/cli/deploy

## Como o Projeto Local Mapeia para Railway

O `docker-compose.yml` local possui:

| Compose | Railway |
|---|---|
| `postgres` | PostgreSQL Database Service |
| `api` | Railway Service usando o repositorio/Dockerfile |
| `frontend` | Railway Service usando o repositorio/Dockerfile |
| `depends_on` | Nao existe equivalente direto; app deve tolerar startup sem DB pronto |
| rede Docker local | Private networking automatico do Railway |
| `env_file` | Variables do Railway |
| `ports` | Public networking ou private networking |

Importante: Railway nao executa `docker-compose.yml` diretamente em producao. Cada servico do Compose vira um servico separado no mesmo Railway Project.

## Arquitetura Recomendada

Crie um Railway Project com tres servicos:

1. `postgres`: plugin/servico PostgreSQL Railway.
2. `api`: backend Express.
3. `frontend`: Vite preview/serve ou servidor web estatico.

Fluxo:

```text
Usuario -> frontend public domain
frontend -> /api via proxy/rewrites ou API public domain
api -> PostgreSQL via DATABASE_URL privada Railway
```

No Railway, servicos do mesmo projeto se comunicam pela rede privada automatica. Ainda assim, nao conte com `localhost` para acessar outro servico. `localhost` dentro de um container aponta para o proprio container. Use variaveis de referencia do Railway ou host privado do servico.

## Criar Projeto e Banco

### Pelo painel

1. Acesse Railway.
2. Crie um novo Project.
3. Adicione um servico PostgreSQL.
4. Anote ou referencie a variavel `DATABASE_URL` do PostgreSQL. Nunca registre o valor real na documentacao ou no Git.

### Pela CLI

Opcionalmente:

```bash
railway login
railway init
railway deploy -t postgres
```

Para codigo proprio, use deploy pelo GitHub ou `railway up`.

## Servico API

### Configuracao

Adicionar novo Railway Service apontando para o repositorio GitHub do `Sistema-Propostas`.

Como o monorepo usa workspace compartilhado, deixe o root como raiz do repositorio.

Configurar variaveis no servico `api`:

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<gerar-valor-forte>
JWT_REFRESH_SECRET=<gerar-outro-valor-forte>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
APP_PUBLIC_URL=https://<dominio-frontend-railway>
MOBILE_APP_RESET_URL=gtfpropostas://reset-password
PASSWORD_RESET_TTL_MINUTES=30
EMAIL_PROVIDER=resend
RESEND_API_KEY=<sua-chave-resend>
RESEND_FROM_EMAIL=GTF Propostas <nao-responda@seudominio-verificado.com.br>
LOG_LEVEL=info
```

No Railway, prefira reference variables para `DATABASE_URL` em vez de copiar usuario/senha manualmente. Assim, se o banco mudar, a variavel se mantem sincronizada.

### Build e Start

O Dockerfile atual instala o monorepo todo. Para o servico API, configure o Start Command:

```bash
pnpm --filter @workspace/db run generate && pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/api-server run start
```

Se quiser aplicar migrations automaticamente no boot, use com cuidado:

```bash
pnpm --filter @workspace/db run generate && pnpm --filter @workspace/db exec prisma migrate deploy --schema ./prisma/schema.prisma && pnpm --filter @workspace/api-server run build && pnpm --filter @workspace/api-server run start
```

Recomendacao: em producao, rodar migrations como etapa controlada antes do deploy ou como job separado, para evitar concorrencia quando houver mais de uma replica.

### Public Networking

Gere um dominio publico para a API se:

- o frontend nao estiver proxyando internamente;
- o app mobile precisar consumir a API diretamente;
- voce quiser testar `curl` publicamente.

Smoke test:

```bash
curl https://<api-domain>/api/healthz
```

## Servico Frontend

Adicionar outro Railway Service apontando para o mesmo repositorio.

Variaveis:

```env
NODE_ENV=production
PORT=21709
BASE_PATH=/
API_PROXY_TARGET=http://<api-private-host>:8080
```

Em Railway, substitua `<api-private-host>` pelo host privado/reference variable do servico `api`. Nao use `localhost` para chamar a API em outro servico.

Start Command recomendado para servir o build Vite:

```bash
pnpm --filter @workspace/proposta run build && pnpm --filter @workspace/proposta run serve
```

O `vite preview` e aceitavel para uma primeira publicacao, mas para producao mais robusta o ideal e servir `artifacts/proposta/dist/public` com um servidor estatico dedicado ou Nginx/Caddy.

Se usar `vite preview`, garanta:

```env
PORT=21709
BASE_PATH=/
API_PROXY_TARGET=http://<api-private-host>:8080
```

## Proxy da API no Frontend

Hoje o frontend chama `/api/*`.

No ambiente local, o Vite faz proxy para `API_PROXY_TARGET`.

Em producao no Railway existem duas opcoes:

### Opcao A: manter Vite preview com proxy

Configurar `API_PROXY_TARGET` para o endereco interno do servico `api`.

### Opcao B: API publica e frontend sem proxy

Alterar o frontend para aceitar uma variavel de URL publica da API ou configurar proxy no servidor estatico. Esta opcao exige ajuste de codigo/configuracao e nao e o comportamento atual.

Para menor mudanca inicial, use a Opcao A.

## Migrations no Railway

O projeto tem migrations em:

```text
lib/db/prisma/migrations
```

Aplicar:

```bash
railway run pnpm --filter @workspace/db exec prisma migrate deploy --schema ./prisma/schema.prisma
```

Se estiver executando fora da CLI Railway, exporte `DATABASE_URL` do PostgreSQL Railway:

```bash
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db exec prisma migrate deploy --schema ./prisma/schema.prisma
```

Gerar Prisma Client:

```bash
pnpm --filter @workspace/db run generate
```

Seed:

```bash
railway run pnpm --filter @workspace/scripts run seed
```

Use seed em producao apenas quando desejar criar dados iniciais/controlados.

## Watch Paths no Monorepo

Para evitar rebuild desnecessario:

Servico API:

```text
artifacts/api-server/**
lib/**
scripts/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
Dockerfile
```

Servico Frontend:

```text
artifacts/proposta/**
lib/api-client-react/**
lib/api-spec/**
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
Dockerfile
```

## Checklist Railway

- [ ] GitHub conectado ao Railway.
- [ ] PostgreSQL criado no mesmo Railway Project.
- [ ] Servico API criado.
- [ ] Servico Frontend criado.
- [ ] `DATABASE_URL` da API referenciando o PostgreSQL Railway.
- [ ] `JWT_SECRET` e `JWT_REFRESH_SECRET` fortes configurados.
- [ ] `APP_PUBLIC_URL` apontando para o dominio frontend.
- [ ] `RESEND_*` configurado se reset de senha estiver ativo.
- [ ] Migrations aplicadas.
- [ ] Seed executado somente se necessario.
- [ ] Dominio publico da API criado, se o mobile for consumir direto.
- [ ] Dominio publico do frontend criado.
- [ ] `API_PROXY_TARGET` do frontend apontando para a API pela rede privada.
- [ ] `/api/healthz` testado.
- [ ] Login Admin testado.
- [ ] Login Comercial testado.
- [ ] Criacao/edicao de proposta testada.
- [ ] Reset de senha testado.
- [ ] Logs de API verificados.

## Pontos de Atencao

- Railway nao usa `docker-compose.yml` diretamente.
- `depends_on` nao existe; a API pode iniciar antes do banco estar pronto.
- `localhost` nao conecta servicos diferentes. Use host privado/reference variables.
- Volumes so sao necessarios se voce tiver arquivos persistentes. O banco gerenciado ja cuida da persistencia.
- Nao rode `prisma db push` como fluxo principal de producao.
- Se escalar a API horizontalmente, evite rodar migrations automaticamente em cada replica.
- O app mobile deve apontar para o dominio publico da API:

```env
EXPO_PUBLIC_API_URL=https://<api-domain>/api
```

## Comandos Uteis

Ver logs:

```bash
railway logs
```

Rodar comando com variaveis do servico linkado:

```bash
railway run pnpm --filter @workspace/db exec prisma migrate deploy --schema ./prisma/schema.prisma
```

Deploy manual pelo CLI:

```bash
railway up
```

Health check:

```bash
curl https://<api-domain>/api/healthz
```
