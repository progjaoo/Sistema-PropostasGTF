# Stack e Tipo do Projeto

## Tipo

- Tipo de produto: WEB + API
- Frontend: SPA web
- Backend: API HTTP REST
- Banco: PostgreSQL
- Execucao local principal: Docker Compose

## Stack

### Monorepo

- PNPM Workspaces
- TypeScript
- Pacotes separados em `artifacts`, `lib` e `scripts`

### Frontend

- React
- Vite
- Wouter para rotas
- TanStack Query para chamadas e cache de dados
- Zustand para estado de autenticacao
- Tailwind CSS
- shadcn/ui com Radix UI
- Sonner para toasts
- Lucide React para icones

### Backend

- Node.js
- Express
- Prisma Client
- Zod para validacao
- JWT para access token
- Refresh token em cookie HTTP-only
- Pino para logs

### Banco

- PostgreSQL 16
- Prisma Schema em `lib/db/prisma/schema.prisma`
- Prisma `db push` no ambiente local/Docker

### Infra Local

- Dockerfile unico para instalar workspace
- Docker Compose com servicos:
  - `postgres`
  - `api`
  - `frontend`

## Convencoes de Ferramenta

- Usar `pnpm`, nao `npm` ou `yarn`.
- Rodar comandos na raiz do projeto: `Projetos-GTF/Sistema-Propostas`.
- Gerar Prisma Client apos mudancas no schema.
- Rodar typecheck antes de considerar a tarefa finalizada.

