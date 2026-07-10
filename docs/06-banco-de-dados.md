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
- `ProductDuration`
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
- `ProposalProductSeasonality`: `MONTHLY`, `SEMIANNUAL`, `ANNUAL`
- `ProductColor`: `BLUE`, `YELLOW`, `RED`, `GREEN`, `DARK`
- `AdvertiserStatus`: `LEAD`, `CLIENT`

## Convencoes

- IDs usam `cuid()`.
- Datas usam `createdAt` e `updatedAt`.
- Tabelas usam nomes em snake_case via `@@map`.
- Campos fisicos usam `@map` quando o nome no banco diverge do nome TypeScript.
- Imagens/logos/avatars podem ser armazenados como base64 em campos `@db.Text`.

## Relacionamentos Importantes

- `Proposal.stationId` define a empresa/emissora da proposta.
- `Proposal.createdById` define o dono/vendedor da proposta.
- `Proposal.advertiserId` define o cliente/lead vinculado.
- `Proposal.products` define o plano de produtos da proposta.
- `ProposalProduct.productTemplateId` rastreia origem do item no catalogo.
- `ProductTemplate.programId` vincula produto a programa.
- `ProductTemplate.durationId` vincula produto a uma duracao reutilizavel.
- `ProposalProduct.durationLabel` guarda a duracao exibida na proposta como snapshot textual.
- `ProposalProduct.airTime` guarda o horario negociado daquele item na proposta.
- `ProposalProduct.seasonality` guarda a sazonalidade do item (`MONTHLY`, `SEMIANNUAL`, `ANNUAL`).
- `Advertiser.status` separa Leads (`LEAD`) de Clientes (`CLIENT`) sem duplicar tabela.
- `Station.primaryColor` define a cor padrao usada no preview da proposta.

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
