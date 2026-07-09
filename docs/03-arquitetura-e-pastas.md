# Arquitetura e Pastas

## Raiz

```text
Sistema-Propostas/
  artifacts/
  docs/
  lib/
  scripts/
  docker-compose.yml
  Dockerfile
  package.json
  pnpm-workspace.yaml
```

## Frontend

Local:

```text
artifacts/proposta/
```

Pastas principais:

```text
artifacts/proposta/src/App.tsx
artifacts/proposta/src/main.tsx
artifacts/proposta/src/pages/
artifacts/proposta/src/components/
artifacts/proposta/src/components/ui/
artifacts/proposta/src/store/
artifacts/proposta/src/lib/
```

Responsabilidades:

- `pages`: paginas por rota.
- `components/layout`: layout global, sidebar e estrutura autenticada.
- `components/proposal`: componentes especificos de proposta e preview.
- `components/ui`: componentes shadcn/Radix reutilizaveis.
- `store/auth.ts`: estado de usuario e token.
- `lib/masks.ts`: mascaras de CPF/CNPJ, telefone, moeda e e-mail.

## Backend/API

Local:

```text
artifacts/api-server/
```

Pastas principais:

```text
artifacts/api-server/src/app.ts
artifacts/api-server/src/index.ts
artifacts/api-server/src/routes/
artifacts/api-server/src/middlewares/
artifacts/api-server/src/lib/
```

Responsabilidades:

- `app.ts`: configura Express, CORS, JSON, cookies, logs e prefixo `/api`.
- `index.ts`: sobe o servidor na porta definida por `PORT`.
- `routes`: endpoints por dominio.
- `middlewares/auth.ts`: autenticacao e autorizacao.
- `lib/jwt.ts`: assinatura e validacao de tokens.
- `lib/logger.ts`: logger Pino.

## Banco de Dados

Local:

```text
lib/db/
lib/db/prisma/schema.prisma
```

Responsabilidades:

- Centralizar o Prisma Client.
- Definir modelos, enums, relacionamentos e nomes reais de tabelas.
- Exportar `prisma` para a API e scripts.

## Contratos de API

Locais:

```text
lib/api-spec/openapi.yaml
lib/api-zod/
lib/api-client-react/
```

Responsabilidades:

- `api-spec`: especificacao OpenAPI.
- `api-zod`: schemas gerados/compartilhados para validacao.
- `api-client-react`: client React gerado para consumo no frontend.

## Scripts

Local:

```text
scripts/
```

Responsabilidades:

- Seed local.
- Rotinas auxiliares do projeto.

## Documentacao

Local:

```text
docs/
```

Responsabilidades:

- Guidelines tecnicas.
- Fluxos funcionais.
- Instrucoes de execucao local.
- Documentos de tarefas/PRDs mantidos como referencia.

