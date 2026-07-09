# Banco de Dados e Prisma

## Tecnologia

- Banco: PostgreSQL
- ORM: Prisma
- Schema: `lib/db/prisma/schema.prisma`
- Client: exportado por `lib/db/src/index.ts`

## Modelos Principais

- `User`
- `RefreshToken`
- `Station`
- `Advertiser`
- `ProductTemplate`
- `ProposalType`
- `ProposalCategory`
- `ProposalTemplate`
- `ProposalTemplateProduct`
- `Proposal`
- `ProposalProduct`
- `ProposalVersion`

## Enums Principais

- `UserRole`: `ADMIN`, `COMERCIAL`
- `ProposalStatus`: `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `ARCHIVED`
- `ProposalPeriodicity`: `MONTHLY`, `QUARTERLY`, `YEARLY`
- `ProductColor`: `BLUE`, `YELLOW`, `RED`, `GREEN`, `DARK`

## Convencoes

- IDs usam `cuid()`.
- Datas usam `createdAt` e `updatedAt`.
- Tabelas usam nomes em snake_case via `@@map`.
- Campos fisicos usam `@map` quando o nome no banco diverge do nome TypeScript.
- Imagens/logos/avatars podem ser armazenados como base64 em campos `@db.Text`.

## Relacionamentos Importantes

- `Proposal.stationId` define a empresa/emissora da proposta.
- `Proposal.createdById` define o dono/vendedor da proposta.
- `Proposal.advertiserId` define o anunciante/cliente.
- `Proposal.products` define o plano de produtos da proposta.
- `ProposalProduct.productTemplateId` rastreia origem do item no catalogo.
- `ProductTemplate.programId` vincula produto a programa.

## Comandos

Gerar Prisma Client:

```bash
pnpm db:generate
```

Aplicar schema no banco local:

```bash
pnpm db:push
```

Popular dados locais:

```bash
pnpm seed
```

## Cuidado com Mudancas de Schema

- Depois de alterar `schema.prisma`, rode `pnpm db:generate`.
- Em ambiente local/Docker, o compose executa `db push` e `seed` na subida da API.
- Antes de producao, avaliar migracoes formais se o deploy passar a exigir historico de migrations.

