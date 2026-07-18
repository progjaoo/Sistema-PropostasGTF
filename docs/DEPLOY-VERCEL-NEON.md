# Deploy no Vercel com Neon DB

Este guia documenta como publicar o Sistema de Propostas usando:

- Frontend React/Vite no Vercel.
- Backend Express em Vercel Functions ou projeto Node adaptado para Vercel.
- Banco PostgreSQL no Neon, conectado ao Vercel pela integração/plugin Neon.

## Estado Atual do Projeto

O projeto e um monorepo PNPM:

| Camada | Pasta | Observacao |
|---|---|---|
| Frontend | `artifacts/proposta` | React + Vite. Build gera `artifacts/proposta/dist/public`. |
| API | `artifacts/api-server` | Express + Node. Hoje roda como servidor long-lived com `app.listen(PORT)`. |
| Banco | `lib/db` | Prisma + PostgreSQL. Migrations em `lib/db/prisma/migrations`. |
| Seed | `scripts` | Popular dados iniciais. Usar com cuidado em producao. |

Ponto critico: o frontend chama a API usando caminhos relativos `/api/*`. Em producao, o dominio do frontend precisa encaminhar `/api` para a API.

## Referencias Oficiais

- Vercel Monorepos: https://vercel.com/docs/monorepos
- Vercel Build Settings: https://vercel.com/docs/builds/configure-a-build
- Vercel Express: https://vercel.com/docs/frameworks/backend/express
- Vercel Node.js Runtime: https://vercel.com/docs/functions/runtimes/node-js
- Neon + Prisma: https://docs.prisma.io/docs/orm/v6/overview/databases/neon
- Prisma PostgreSQL connector: https://docs.prisma.io/docs/orm/core-concepts/supported-databases/postgresql

## Arquitetura Recomendada no Vercel

Inicialmente, para este projeto, use um unico projeto Vercel para frontend + API:

1. Frontend Vite servido pelo output `artifacts/proposta/dist/public`.
2. API Express servida por Vercel Function em `/api/*`.
3. Banco PostgreSQL externo, que pode ser Neon ou Railway PostgreSQL.

Esta abordagem evita dois projetos Vercel e preserva o comportamento atual do frontend, que chama a API por caminhos relativos `/api/*`.

## Banco Neon

### 1. Criar o banco

1. Acesse o Neon.
2. Crie um projeto, exemplo: `gtf-propostas-prod`.
3. Crie ou use o banco `propostas`.
4. Copie duas URLs:
   - `DATABASE_URL`: URL pooled, preferencialmente com host `-pooler`.
   - `DIRECT_URL`: URL direta sem pooler, para migrations e comandos Prisma CLI.

Exemplo:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST-pooler.REGION.aws.neon.tech/propostas?sslmode=require
DIRECT_URL=postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/propostas?sslmode=require
```

Observacao: o schema Prisma atual usa `DATABASE_URL`. Para uma operacao ideal com Neon, o proximo ajuste recomendado e adicionar `directUrl = env("DIRECT_URL")` no datasource do Prisma ou criar `prisma.config.ts`. Ate esse ajuste existir, rode migrations usando temporariamente a URL direta em `DATABASE_URL`.

### 2. Conectar Neon ao Vercel

Pelo Marketplace/Integrations do Vercel:

1. Instale a integracao Neon no time/projeto.
2. Vincule o banco Neon ao projeto da API.
3. Confirme se as variaveis foram criadas no projeto Vercel correto.
4. Ajuste manualmente se necessario:
   - `DATABASE_URL`: pooled.
   - `DIRECT_URL`: direta.

## Variaveis da API

No projeto Vercel da API:

```env
NODE_ENV=production
PORT=8080
DATABASE_URL=postgresql://...neon...pooler...?sslmode=require
DIRECT_URL=postgresql://...neon...direct...?sslmode=require
JWT_SECRET=<gerar-valor-forte>
JWT_REFRESH_SECRET=<gerar-outro-valor-forte>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
APP_PUBLIC_URL=https://gtf-propostas-web.vercel.app
MOBILE_APP_RESET_URL=gtfpropostas://reset-password
PASSWORD_RESET_TTL_MINUTES=30
EMAIL_PROVIDER=resend
RESEND_API_KEY=<sua-chave-resend>
RESEND_FROM_EMAIL=GTF Propostas <nao-responda@seudominio-verificado.com.br>
LOG_LEVEL=info
```

Use segredos longos para `JWT_SECRET` e `JWT_REFRESH_SECRET`. Exemplo local para gerar:

```bash
openssl rand -base64 48
```

## Variaveis do Frontend

O Vite exige `PORT` e `BASE_PATH` mesmo no build:

```env
NODE_ENV=production
PORT=21709
BASE_PATH=/
```

Se a API estiver em outro dominio, configurar rewrites no Vercel para manter `/api/*` funcionando no mesmo dominio do frontend.

## Adaptacao Necessaria da API para Vercel

O backend atual tem entrada em `artifacts/api-server/src/index.ts` com:

```ts
app.listen(port)
```

Em Vercel Functions, a API Express deve ser exportada como handler/function, nao iniciar um processo long-lived do mesmo jeito que Docker/Railway.

Esta adaptacao ja foi preparada no projeto:

```text
api/[...path].ts
vercel.json
```

Entrada serverless:

```ts
// api/[...path].ts
import app from "../artifacts/api-server/src/app";

export default app;
```

Antes de fazer deploy produtivo, validar no Vercel se o bundling inclui corretamente workspace packages, Prisma Client e `@workspace/db`.

## Configuracao do Projeto no Vercel

Crie um projeto Vercel apontando para o repositorio do `Sistema-Propostas`.

Configurar:

```text
Root Directory: .
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm --filter @workspace/db run generate && PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
Output Directory: artifacts/proposta/dist/public
Framework Preset: Vite ou Other
```

O arquivo `vercel.json` ja define esses comandos, mas confira no painel se o Vercel nao sobrescreveu as configuracoes.

## Rewrites entre Frontend e API

O projeto usa uma Function catch-all em `api/[...path].ts`. Assim, as chamadas `/api/*` chegam na API Express no mesmo dominio do frontend. O `vercel.json` tambem possui fallback para SPA, evitando erro ao abrir rotas internas do frontend diretamente no navegador.

## Migrations no Neon

O projeto ainda nao possui script `migrate deploy`; hoje existem `generate` e `push`.

Para producao, nao use `db push` como rotina principal. Use migrations:

```bash
pnpm --filter @workspace/db exec prisma migrate deploy --schema ./prisma/schema.prisma
```

Se estiver usando `DIRECT_URL`, rode com a URL direta:

```bash
DATABASE_URL="$DIRECT_URL" pnpm --filter @workspace/db exec prisma migrate deploy --schema ./prisma/schema.prisma
```

Depois:

```bash
pnpm --filter @workspace/db run generate
```

Seed em producao deve ser executado somente quando intencional:

```bash
pnpm --filter @workspace/scripts run seed
```

## Checklist de Deploy Vercel + Neon

- [ ] Repositorio enviado ao GitHub.
- [ ] Projeto Neon criado.
- [ ] `DATABASE_URL` pooled copiada.
- [ ] `DIRECT_URL` direta copiada.
- [ ] Variaveis configuradas no projeto API.
- [ ] Variaveis `PORT=21709` e `BASE_PATH=/` configuradas no frontend.
- [ ] API adaptada para Vercel Function.
- [ ] Rewrites `/api/*` configurados no frontend.
- [ ] Prisma Client gerado no build.
- [ ] Migrations aplicadas no Neon.
- [ ] Seed executado somente se necessario.
- [ ] Login Admin testado.
- [ ] Login Comercial testado.
- [ ] Criacao/edicao de proposta testada.
- [ ] Reset de senha com Resend testado.
- [ ] Mobile apontando para a API publica testado.

## Riscos e Cuidados

- Vercel Functions sao serverless; conexoes PostgreSQL devem usar pooling do Neon.
- O backend Express atual foi criado para servidor persistente; requer adaptacao para Vercel Function.
- `express.static()` nao deve ser usado para servir build frontend no Vercel.
- Cookies de refresh precisam ser validados em dominio final HTTPS.
- O tamanho do bundle da Function deve respeitar limites do Vercel.
- `db push` nao deve substituir migrations em producao.

## Comando de Smoke Test

Depois do deploy da API:

```bash
curl https://gtf-propostas-api.vercel.app/api/healthz
```

Esperado:

```json
{"status":"ok"}
```
