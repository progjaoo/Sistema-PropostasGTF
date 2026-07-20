# Seguranca do Sistema de Propostas

Este documento descreve o estado implementado nas Tarefas 1 a 6 do
`plan-026-seguranca-completa-owasp-lgpd.md`. As Tarefas 7 a 12 continuam fora
do escopo desta etapa.

## Estado Implementado

- configuracao de seguranca validada no boot;
- JWT de acesso curto, assinado com `HS256`, `issuer`, `audience`, `subject` e
  `jti`;
- refresh token opaco armazenado no banco somente como hash;
- rotacao de refresh token, deteccao de replay e revogacao por familia;
- sessao web com access token somente em memoria e refresh token em cookie
  `HttpOnly`, `Secure` em producao e `SameSite=Strict`;
- sessao mobile com access e refresh tokens no armazenamento seguro do
  dispositivo;
- revalidacao de `active` e `role` no banco em todas as rotas privadas;
- rate limiting duravel no PostgreSQL para autenticacao e limite global da API;
- CORS por allowlist, verificacao de origem nos endpoints com cookie, Helmet,
  cache privado e identificador de requisicao;
- JSON global limitado a 1 MB e ate 3 MB somente em rotas com imagem;
- schemas Zod estritos, limites de arrays/campos, imagens PNG/JPEG/WebP de ate
  2 MB decodificados e paginacao limitada a 100;
- respostas de erro estruturadas, sem stack, SQL ou detalhes internos;
- banco PostgreSQL isolado para testes e matriz automatizada de autorizacao.

## Variaveis Obrigatorias em Producao

Configure no Vercel antes de publicar a versao segura:

```env
NODE_ENV=production
DATABASE_URL=<DATABASE_PUBLIC_URL atual do Railway>
JWT_SECRET=<64 ou mais caracteres aleatorios>
JWT_REFRESH_SECRET=<outros 64 ou mais caracteres aleatorios>
RATE_LIMIT_HMAC_SECRET=<outros 64 ou mais caracteres aleatorios>
CRON_SECRET=<32 ou mais caracteres aleatorios>
CORS_ALLOWED_ORIGINS=https://propostasmosaico-one.vercel.app
APP_PUBLIC_URL=https://propostasmosaico-one.vercel.app
TRUST_PROXY=1
PUBLIC_COMMERCIAL_REGISTRATION_ENABLED=false
EMAIL_PROVIDER=resend
RESEND_API_KEY=<chave atual>
RESEND_FROM_EMAIL=GTF Propostas <nao-responda@dominio-verificado>
```

Nao reutilize o mesmo valor nos tres secrets. Nao coloque valores reais em
arquivos Markdown, `.env.example`, issues ou mensagens de commit.

## Rotacao Externa Obrigatoria

A implementacao nao rotaciona credenciais nos provedores. Antes do deploy:

1. rotacione a chave Resend;
2. rotacione a senha publica do PostgreSQL Railway;
3. atualize `DATABASE_URL` no Vercel;
4. gere novos `JWT_SECRET`, `JWT_REFRESH_SECRET` e
   `RATE_LIMIT_HMAC_SECRET`;
5. publique a migration antes do codigo;
6. valide login web e mobile;
7. revogue as credenciais anteriores.

A troca dos secrets JWT encerra as sessoes anteriores. Planeje uma janela curta
e informe os usuarios.

## Ordem Segura de Rollout

Esta etapa adiciona colunas de forma expansiva e mantem temporariamente a coluna
legada de refresh token. A ordem recomendada e:

1. backup restauravel do Railway;
2. homologacao com uma copia do banco;
3. `prisma migrate deploy` no banco de homologacao;
4. testes de seguranca e smoke tests;
5. migration no Railway;
6. configuracao das variaveis no Vercel;
7. deploy da API e frontend;
8. validacao de `/api/healthz`, login, refresh, logout e CRUD principal;
9. monitoramento de `401`, `403`, `429` e `500`;
10. rollback do codigo, se necessario, sem remover colunas.

Nao use `prisma db push` em producao.

## Testes Locais

```bash
docker compose --profile test up -d postgres-test
DATABASE_URL=postgresql://propostas_test:propostas_test@localhost:5435/propostas_test \
  pnpm --filter @workspace/db exec prisma db push --schema ./prisma/schema.prisma
pnpm run test:security
pnpm run typecheck
```

O helper de testes recusa qualquer banco cujo nome nao termine em `_test`.

## Contrato de Erro

Erros HTTP usam:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensagem segura",
    "requestId": "identificador",
    "fields": []
  }
}
```

`fields` e opcional. Erros inesperados retornam mensagem generica e o
`requestId` permite localizar o log sem expor stack ou detalhes do Prisma.

## Limites desta Etapa

Ainda dependem das Tarefas 7 a 12:

- policies centralizadas e auditoria persistente;
- inventario e operacao LGPD;
- hardening de imagem/container e supply chain;
- validacoes MASVS adicionais no aplicativo;
- DAST/ZAP e homologacao E2E;
- ativacao do Cron de limpeza depende de configurar `CRON_SECRET` no Vercel;
- rollout definitivo que remova a coluna legada de refresh token.
