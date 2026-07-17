# Banco de Dados e Prisma

## Tecnologia

- Banco: PostgreSQL
- ORM: Prisma
- Schema: `lib/db/prisma/schema.prisma`
- Client: exportado por `lib/db/src/index.ts`

## Modelos Principais

- `User`
- `UserStationAccess`
- `PasswordResetToken`
- `RefreshToken`
- `Station`
- `StationPresentationItem`
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
- `ProposalTimeline`
- `ProposalRecallReminder`

## Enums Principais

- `UserRole`: `ADMIN`, `COMERCIAL`
- `ProposalStatus`: `DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `ARCHIVED`
- `ProposalPeriodicity`: `MONTHLY`, `QUARTERLY`, `YEARLY`
- `ProposalProductSeasonality`: `MONTHLY`, `SEMIANNUAL`, `ANNUAL`
- `ProductColor`: `BLUE`, `YELLOW`, `RED`, `GREEN`, `DARK`
- `AdvertiserStatus`: `LEAD`, `CLIENT`
- `ProposalTimelineStep`: `LEAD_CREATED`, `IN_CONVERSATION`, `PROPOSAL_SENT`, `CLIENT_REVIEWING`, `NEGOTIATION`, `APPROVED`, `REJECTED`
- `ProposalRecallReminderStatus`: `PENDING`, `NOTIFIED`, `SNOOZED`, `DONE`, `CANCELLED`

## Convencoes

- IDs usam `cuid()`.
- Datas usam `createdAt` e `updatedAt`.
- Tabelas usam nomes em snake_case via `@@map`.
- Campos fisicos usam `@map` quando o nome no banco diverge do nome TypeScript.
- Imagens/logos/avatars podem ser armazenados como base64 em campos `@db.Text`.

## Relacionamentos Importantes

- `Proposal.stationId` define a empresa/emissora da proposta.
- `UserStationAccess` relaciona um usuario COMERCIAL a uma Empresa, com permissoes independentes para criar propostas e visualizar o catalogo.
- A chave unica `userId + stationId` impede acessos duplicados para a mesma Empresa.
- ADMIN nao depende de registros em `UserStationAccess`; seu acesso global vem do perfil.
- `Proposal.createdById` define o dono/vendedor da proposta.
- `Proposal.advertiserId` define o cliente/lead vinculado.
- `Proposal.products` define o plano de produtos da proposta.
- `ProposalProduct.productTemplateId` rastreia origem do item no catalogo.
- `ProductTemplate.programId` vincula produto a programa.
- `ProposalCategory.stationId` vincula programa a uma empresa/emissora. O campo aceita nulo para dados legados, mas a API exige empresa em novos cadastros e edicoes.
- `Station.proposalCategories` lista os programas daquela empresa.
- `ProductTemplate.durationId` vincula produto a uma duracao reutilizavel.
- `ProposalProduct.durationLabel` guarda a duracao exibida na proposta como snapshot textual.
- `ProposalProduct.airTime` guarda o horario negociado daquele item na proposta.
- `ProposalProduct.seasonality` guarda a sazonalidade do item (`MONTHLY`, `SEMIANNUAL`, `ANNUAL`).
- `Advertiser.status` separa Leads (`LEAD`) de Clientes (`CLIENT`) sem duplicar tabela.
- `Station.primaryColor` define a cor padrao usada no preview da proposta.
- `StationPresentationItem` guarda ate quatro itens de apresentacao padrao por Empresa.
- `Proposal.showPeriod` controla se o periodo aparece no preview/PDF sem apagar datas salvas.
- `Proposal.stats` e snapshot da apresentacao no momento da criacao/troca de Empresa.
- `PasswordResetToken` guarda apenas hash SHA-256 do token de recuperacao, com expiracao e uso unico.
- `Proposal.timeline` registra as etapas comerciais da negociacao.
- `ProposalTimeline.createdById` registra quem adicionou uma etapa manual ou automatica.
- `Proposal.recallReminders` registra avisos recorrentes de recaptura quando a proposta e rejeitada.
- `ProposalRecallReminder.assignedToId` aponta para o vendedor responsavel pela proposta rejeitada.
- `ProposalRecallReminder.milestoneMonths` define o marco de recaptura: 3, 6 ou 10 meses.
- `ProposalRecallReminder.dueAt` e `snoozedUntil` controlam quando o aviso aparece.
- `ProposalRecallReminder.status` controla se o aviso esta pendente, avisado, reagendado, tratado ou cancelado.

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
- A migration `20260715120000_user_station_accesses` cria a matriz de acesso e faz backfill dos COMERCIAIS ativos para as Empresas ativas existentes.
- O seed faz o backfill apenas para COMERCIAIS ativos que ainda nao possuem nenhum vinculo, sem ampliar matrizes que ja tenham sido revisadas pelo ADMIN.
- Em producao, use a migration formal e revise os acessos legados no painel administrativo apos o deploy.
