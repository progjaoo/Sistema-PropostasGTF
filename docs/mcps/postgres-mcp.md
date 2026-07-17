# Postgres MCP Pro

## Objetivo

O Postgres MCP Pro permite consultar o schema real do PostgreSQL local para apoiar a documentacao final do banco de dados.

Neste projeto, ele nao deve ser usado como ferramenta de trabalho durante a implementacao das tasks. O uso fica restrito ao fechamento de tarefas, quando for necessario comparar Prisma/schema esperado com o banco real e documentar a estrutura final.

## Configuracao Atual

Registrado no Codex como `postgres-propostas`, apontando para o Postgres local do Docker Compose:

```toml
[mcp_servers.postgres-propostas]
command = "docker"
args = ["run", "-i", "--rm", "-e", "DATABASE_URI", "crystaldba/postgres-mcp", "--access-mode=restricted"]

[mcp_servers.postgres-propostas.env]
DATABASE_URI = "postgresql://propostas:propostas@host.docker.internal:5433/propostas?schema=public"
```

## Decisao de Seguranca

O MCP foi configurado em `restricted`, nao em `unrestricted`.

Motivo:

- evita escrita acidental via ferramenta;
- preserva o fluxo oficial de schema via Prisma;
- reduz risco em analises futuras quando o ambiente estiver parecido com producao.

Para alteracoes reais de banco, use:

```bash
pnpm db:generate
pnpm db:push
```

ou migrations Prisma quando aplicavel.

## Pre-requisitos Locais

O banco deve estar ativo:

```bash
docker compose up -d postgres
```

O Compose do projeto expõe:

- container: `sistema-propostas-postgres`
- database: `propostas`
- user: `propostas`
- porta local: `5433`

## Quando Usar

- Ao final de uma task que alterou banco de dados.
- Para gerar ou revisar documentacao final do schema real.
- Para conferir tabelas, colunas, indices e relacoes depois que migrations/`db push` ja foram aplicados.
- Para apoiar atualizacao de `docs/06-banco-de-dados.md` ou documentos finais equivalentes.

## Quando Nao Usar

- Nao usar durante implementacao normal da task.
- Nao usar como substituto de leitura do `schema.prisma`.
- Nao usar para decidir modelagem antes do planejamento.
- Nao usar para debugging comum de API/frontend.
- Nao usar para editar dados sensiveis sem necessidade.
- Nao usar para alterar schema fora do Prisma.
- Nao apontar para banco de producao sem trocar para credenciais restritas e revisar permissao.

## Fluxo Correto no Projeto

1. Planejar a mudanca lendo docs, agents e `schema.prisma`.
2. Implementar via Prisma schema, migrations e API.
3. Rodar validacoes locais.
4. Somente no fechamento da task, usar `postgres-propostas` se for necessario documentar o schema real.
5. Atualizar a documentacao final do banco.

## Fontes

- https://github.com/crystaldba/postgres-mcp
