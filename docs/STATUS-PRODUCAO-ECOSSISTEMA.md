# Status de Producao - Ecossistema de Propostas

Documento de referencia do ambiente publicado em producao/homologacao inicial.

## Resumo

O Ecossistema de Propostas foi publicado com:

- Frontend React/Vite no Vercel.
- API Express no Vercel, servida em `/api/*` por Vercel Function.
- Banco PostgreSQL no Railway.
- Prisma usando `DATABASE_URL` publica do PostgreSQL Railway.

## URLs

| Recurso | URL |
|---|---|
| Sistema Web | `https://propostasmosaico-one.vercel.app` |
| Health check da API | `https://propostasmosaico-one.vercel.app/api/healthz` |
| API base | `https://propostasmosaico-one.vercel.app/api` |

## Arquitetura Publicada

```text
Usuario
  -> Vercel Frontend
  -> /api/* no mesmo dominio
  -> Vercel Function Express
  -> PostgreSQL Railway via DATABASE_PUBLIC_URL cadastrada no Vercel como DATABASE_URL
```

O frontend continua chamando caminhos relativos `/api/*`. O roteamento e feito pelo `vercel.json`:

```json
{
  "source": "/api/:path*",
  "destination": "/api/index.js?path=:path*"
}
```

A Function em `api/index.js` reconstrói a URL antes de entregar a requisicao para o Express, mantendo o prefixo `/api` esperado por `artifacts/api-server/src/app.ts`.

## Arquivos de Deploy

| Arquivo | Funcao |
|---|---|
| `vercel.json` | Configura install, build, output, function e rewrites. |
| `api/index.js` | Entrada serverless do Vercel para a API Express. |
| `artifacts/api-server/build.mjs` | Gera `dist/index.mjs` e `dist/app.mjs`; a Function carrega `dist/app.mjs`. |
| `docs/DEPLOY-VERCEL-NEON.md` | Guia de deploy Vercel + banco externo. |
| `docs/DEPLOY-RAILWAY.md` | Guia de deploy Railway. |

## Variaveis de Ambiente no Vercel

As variaveis sensiveis ficam no painel da Vercel em:

```text
Project > Settings > Environment Variables
```

Variaveis obrigatorias:

```env
DATABASE_URL=<DATABASE_PUBLIC_URL do Railway>
JWT_SECRET=<segredo forte>
JWT_REFRESH_SECRET=<outro segredo forte>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
APP_PUBLIC_URL=https://propostasmosaico-one.vercel.app
PASSWORD_RESET_TTL_MINUTES=30
EMAIL_PROVIDER=resend
RESEND_API_KEY=<chave Resend>
RESEND_FROM_EMAIL=GTF Propostas <email-verificado>
MOBILE_APP_RESET_URL=gtfpropostas://reset-password
LOG_LEVEL=info
```

Observacao importante:

- No Railway existe `DATABASE_URL` interna com host `postgres.railway.internal`.
- Essa URL interna nao funciona fora do Railway.
- No Vercel, `DATABASE_URL` deve receber o valor da `DATABASE_PUBLIC_URL` do Railway.

## Validacoes Executadas

### Health check

Comando:

```bash
curl -i https://propostasmosaico-one.vercel.app/api/healthz
```

Resultado validado:

```http
HTTP/2 200
content-type: application/json; charset=utf-8
x-powered-by: Express
```

Payload:

```json
{"status":"ok"}
```

### Autenticacao protegida sem token

Comando:

```bash
curl -i https://propostasmosaico-one.vercel.app/api/auth/me
```

Resultado validado:

```http
HTTP/2 401
```

Payload:

```json
{"error":"Unauthorized"}
```

Esse resultado confirma que:

- a rota `/api/auth/me` esta chegando na API Express;
- o 404 de roteamento foi resolvido;
- o middleware de autenticacao esta ativo.

### Login pelo navegador

Validado manualmente:

- Login no sistema publicado funcionou.
- A API conseguiu consultar o banco PostgreSQL Railway.

## Banco Railway

O banco local do Docker foi migrado para o PostgreSQL Railway por dump/restore.

Validacao executada:

```bash
docker run --rm -i \
  -e DATABASE_URL="$RAILWAY_DATABASE_URL" \
  postgres:16-alpine \
  sh -c 'psql "$DATABASE_URL" -c "\dt"'
```

Resultado validado:

- 18 tabelas listadas no schema `public`.
- Tabelas principais presentes: `users`, `stations`, `proposals`, `advertisers`, `product_templates`, `proposal_products`, `refresh_tokens`.

## Processo de Deploy Atual

Build command configurado no Vercel:

```bash
pnpm --filter @workspace/db run generate && pnpm --filter @workspace/api-server run build && PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
```

Output directory:

```text
artifacts/proposta/dist/public
```

Install command:

```bash
pnpm install --frozen-lockfile
```

## Checklist para Proximos Deploys

- [ ] Fazer commit das alteracoes.
- [ ] Fazer push para o GitHub.
- [ ] Conferir build no painel Vercel.
- [ ] Testar `/api/healthz`.
- [ ] Testar `/api/auth/me` esperando `401`.
- [ ] Testar login Admin.
- [ ] Testar login Comercial.
- [ ] Testar criacao/edicao de proposta.
- [ ] Testar reset de senha se `RESEND_*` estiver configurado.

## Cuidados de Seguranca

- A senha do PostgreSQL Railway apareceu durante a configuracao assistida. Recomenda-se rotacionar a senha no Railway depois que o ambiente estiver estabilizado.
- Ao rotacionar a senha, atualizar a `DATABASE_URL` no Vercel com a nova `DATABASE_PUBLIC_URL`.
- Nunca commitar `.env` com segredos.
- Usar dominos finais HTTPS antes de liberar para usuarios reais.

## Pendencias Recomendadas

- Configurar dominio definitivo do sistema.
- Atualizar `APP_PUBLIC_URL` para o dominio definitivo.
- Revisar `RESEND_FROM_EMAIL` com dominio verificado.
- Validar fluxo completo de recuperacao de senha.
- Avaliar pooling/conexoes do Postgres Railway com workload serverless do Vercel.
- Criar rotina controlada para migrations em producao usando `prisma migrate deploy`.
