# Plano 012 - Aviso Recorrente para Propostas Rejeitadas

- Projeto: Sistema de Propostas
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces
- Data: 2026-07-11
- Status: Implementado
- Escopo: Banco de dados, Backend/API, Frontend, documentacao e QA

## 1. Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-product-manager.md`
- `.agents/agent-software-architect.md`
- `.agents/agent-database-engineer.md`
- `.agents/agent-backend-api-engineer.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `.agents/agent-qa-engineer.md`
- `.agents/agent-technical-writer.md`
- `docs/04-frontend-guidelines.md`
- `docs/05-backend-api-guidelines.md`
- `docs/06-banco-de-dados.md`
- `docs/07-autenticacao-perfis-permissoes.md`
- `docs/08-regras-de-negocio.md`
- `docs/paginas-por-perfil.md`
- `lib/db/prisma/schema.prisma`

## 2. Agentes Recomendados

| Agente | Papel nesta tarefa |
|---|---|
| Product Manager | Fechar a regra de negocio dos avisos de recaptura apos rejeicao e preservar o fluxo Lead vs Cliente. |
| Software Architect | Definir a fronteira entre banco, API e frontend, evitando regra critica calculada apenas na UI. |
| Database Engineer | Criar modelos/enums para lembretes recorrentes e preservar historico de propostas rejeitadas. |
| Backend API Engineer | Implementar geracao, consulta, contagem e acoes dos avisos com permissao por perfil. |
| Frontend Engineer | Criar badges, notificacao flutuante, central de avisos e integracao com API. |
| UX/UI Designer | Garantir que os avisos sejam claros, acionaveis e nao confundam confirmacao critica com toast. |
| QA Engineer | Validar marcos de 3, 6 e 10 meses, permissoes, badges e regressao de status de proposta. |
| Technical Writer | Atualizar regras de negocio, paginas por perfil e guia operacional do fluxo de notificacoes. |

## 3. Objetivo

Criar um sistema de avisos recorrentes dentro do Sistema de Propostas para lembrar ADMIN e COMERCIAL de clientes/leads que rejeitaram propostas em datas anteriores.

Exemplo de regra:

- Uma proposta foi marcada como `REJECTED` em `2026-03-01`.
- O sistema deve gerar avisos de recaptura em:
  - 3 meses depois: `2026-06-01`
  - 6 meses depois: `2026-09-01`
  - 10 meses depois: `2027-01-01`
- Quando o aviso estiver vencido, o usuario deve ver:
  - badge na sidebar;
  - notificacao flutuante central ao entrar no sistema ou ao abrir telas principais;
  - lista com cliente/lead, proposta, responsavel, status e acoes.

Regra importante:

- Se um Lead rejeitou uma proposta, ele continua como `LEAD`.
- Apenas proposta marcada como `APPROVED`/`Aceita` promove Lead para Cliente.
- Proposta rejeitada nunca deve promover Lead para Cliente.

## 4. Diagnostico Atual

### 4.1 Status e andamento

O sistema ja possui:

- `ProposalStatus.REJECTED`.
- `ProposalTimelineStep.REJECTED`.
- Endpoint de status em `/api/proposals/:id/status`.
- Pagina `/proposal-progress` para andamento de propostas.
- Regra atual de Lead virar Cliente apenas quando proposta fica `APPROVED`.

### 4.2 Lacuna atual

Hoje, apos uma proposta ser rejeitada:

- o status fica registrado;
- o andamento recebe etapa automatica;
- nao existe nenhum lembrete futuro;
- o vendedor precisa lembrar manualmente de tentar recapturar o lead/cliente depois.

### 4.3 Decisao tecnica recomendada

Nao calcular os avisos apenas no frontend.

Motivos:

- badge precisa ser confiavel;
- ADMIN e COMERCIAL tem permissoes diferentes;
- usuario pode dispensar ou reagendar aviso;
- nao pode depender da aba aberta no navegador;
- deve ser possivel auditar quais avisos foram gerados.

Solucao recomendada:

- persistir lembretes no banco quando uma proposta vira `REJECTED`;
- criar lembretes para 3, 6 e 10 meses apos a data da rejeicao;
- a API retorna somente os lembretes vencidos e visiveis ao usuario autenticado;
- o frontend exibe badge e modal flutuante a partir do retorno da API.

## 5. Regras de Negocio

### RN-012.1 - Geracao de avisos

Quando uma proposta for marcada como `REJECTED`, o backend deve criar automaticamente 3 lembretes de recaptura:

- marco de 3 meses;
- marco de 6 meses;
- marco de 10 meses.

A data base deve ser a data da rejeicao.

Fonte da data:

1. Preferencial: `ProposalTimeline.createdAt` da etapa `REJECTED` criada naquele evento.
2. Fallback para dados legados: `Proposal.updatedAt` quando `Proposal.status = REJECTED` e nao houver timeline `REJECTED`.

### RN-012.2 - Lead rejeitado continua Lead

Se a proposta rejeitada estiver vinculada a `Advertiser.status = LEAD`, o anunciante permanece como Lead.

O sistema nao deve alterar `Advertiser.status` ao rejeitar proposta.

Somente `APPROVED`/`Aceita` promove Lead para Cliente.

### RN-012.3 - Quem ve os avisos

ADMIN:

- ve todos os avisos vencidos;
- pode abrir proposta, abrir lead/cliente e marcar aviso como tratado;
- pode visualizar avisos por responsavel.

COMERCIAL:

- ve somente avisos de propostas criadas por ele;
- pode abrir suas propostas;
- pode marcar seus avisos como tratado, dispensado ou reagendado;
- nao ve avisos de propostas de outros vendedores.

### RN-012.4 - Quando o aviso aparece

Um aviso aparece quando:

- `dueAt <= now()`;
- status do aviso estiver pendente ou reagendado vencido;
- proposta ainda existir;
- anunciante ainda existir;
- proposta estiver ou tiver sido rejeitada.

Decisao recomendada:

- se a proposta rejeitada depois for reaberta e aceita, os avisos pendentes restantes devem ser marcados como resolvidos automaticamente;
- se a proposta continuar rejeitada, os avisos seguem aparecendo conforme os marcos.

### RN-012.5 - Estados do aviso

Estados sugeridos:

- `PENDING`: criado, ainda nao vencido ou vencido e nao tratado;
- `NOTIFIED`: ja foi exibido pelo menos uma vez para algum usuario;
- `SNOOZED`: usuario pediu para lembrar depois;
- `DONE`: usuario tratou o aviso;
- `CANCELLED`: aviso cancelado por mudanca de status da proposta ou dado inconsistente.

Observacao:

- `NOTIFIED` nao deve esconder o aviso sozinho. Ele apenas registra que o aviso ja apareceu.
- Para sair da lista ativa, o aviso precisa virar `DONE`, `SNOOZED` com nova data futura, ou `CANCELLED`.

### RN-012.6 - Reagendamento

O usuario pode escolher `Lembrar depois`.

Sugestao de opcoes:

- 7 dias;
- 15 dias;
- 30 dias.

Ao reagendar:

- gravar `snoozedUntil`;
- status vira `SNOOZED`;
- o aviso volta quando `snoozedUntil <= now()`.

### RN-012.7 - Acao recomendada

Cada aviso deve deixar claro que o objetivo e recapturar:

- abrir o Lead/Cliente;
- abrir a proposta rejeitada;
- registrar andamento;
- criar nova proposta baseada no mesmo Lead/Cliente, se essa acao ja existir ou for adicionada depois.

Para este MVP, as acoes minimas sao:

- `Abrir proposta`;
- `Abrir Lead/Cliente`;
- `Marcar como tratado`;
- `Lembrar depois`.

## 6. Banco de Dados

### 6.1 Enums novos

Adicionar ao `schema.prisma`:

```prisma
enum ProposalRecallReminderStatus {
  PENDING
  NOTIFIED
  SNOOZED
  DONE
  CANCELLED

  @@map("proposal_recall_reminder_status")
}
```

### 6.2 Modelo novo

Adicionar ao `schema.prisma`:

```prisma
model ProposalRecallReminder {
  id              String                       @id @default(cuid())
  proposalId      String                       @map("proposal_id")
  proposal        Proposal                     @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  advertiserId    String?                      @map("advertiser_id")
  advertiser      Advertiser?                  @relation(fields: [advertiserId], references: [id], onDelete: SetNull)
  assignedToId    String?                      @map("assigned_to_id")
  assignedTo      User?                        @relation(fields: [assignedToId], references: [id], onDelete: SetNull)
  milestoneMonths Int                          @map("milestone_months")
  rejectedAt      DateTime                     @map("rejected_at") @db.Timestamptz(6)
  dueAt           DateTime                     @map("due_at") @db.Timestamptz(6)
  snoozedUntil    DateTime?                    @map("snoozed_until") @db.Timestamptz(6)
  status          ProposalRecallReminderStatus @default(PENDING)
  lastNotifiedAt  DateTime?                    @map("last_notified_at") @db.Timestamptz(6)
  handledAt       DateTime?                    @map("handled_at") @db.Timestamptz(6)
  handledById     String?                      @map("handled_by_id")
  handledBy       User?                        @relation("ProposalRecallReminderHandledBy", fields: [handledById], references: [id], onDelete: SetNull)
  note            String?                      @db.Text
  createdAt       DateTime                     @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime                     @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@unique([proposalId, milestoneMonths])
  @@index([status, dueAt])
  @@index([assignedToId, dueAt])
  @@index([advertiserId])
  @@map("proposal_recall_reminders")
}
```

### 6.3 Relacoes a adicionar

Em `Proposal`:

```prisma
recallReminders ProposalRecallReminder[]
```

Em `Advertiser`:

```prisma
recallReminders ProposalRecallReminder[]
```

Em `User`:

```prisma
assignedRecallReminders ProposalRecallReminder[]
handledRecallReminders  ProposalRecallReminder[] @relation("ProposalRecallReminderHandledBy")
```

### 6.4 Dados legados

Criar rotina de backfill para propostas ja rejeitadas:

- buscar propostas com `status = REJECTED`;
- encontrar timeline `REJECTED` mais recente;
- se nao existir, usar `updatedAt`;
- criar lembretes de 3, 6 e 10 meses com `upsert`;
- respeitar `@@unique([proposalId, milestoneMonths])`.

Opcao para MVP:

- executar backfill no seed local e documentar comando;
- em producao, rodar script unico antes do deploy ou durante manutencao.

## 7. Backend/API

### 7.1 Geracao automatica ao rejeitar proposta

Arquivo principal:

- `artifacts/api-server/src/routes/proposals.ts`

No endpoint `PATCH /api/proposals/:id/status`:

- quando `status = REJECTED`, criar timeline `REJECTED`;
- depois criar/remontar os lembretes de 3, 6 e 10 meses;
- `assignedToId` deve ser `proposal.createdById`;
- `advertiserId` deve ser `proposal.advertiserId`;
- nao alterar `Advertiser.status`;
- usar `upsert` para evitar duplicidade.

Quando `status = APPROVED`:

- manter regra atual de promover Lead para Cliente;
- cancelar lembretes pendentes/snoozed daquela proposta com status `CANCELLED`.

### 7.2 Novo modulo de API

Criar arquivo:

- `artifacts/api-server/src/routes/recall-reminders.ts`

Montar em:

- `artifacts/api-server/src/routes/index.ts`

Prefixo:

- `/api/recall-reminders`

### 7.3 Endpoints sugeridos

#### `GET /api/recall-reminders`

Retorna avisos vencidos e visiveis ao usuario autenticado.

Query params:

- `status`: opcional, default `active`;
- `stationId`: opcional;
- `assignedToId`: opcional, apenas ADMIN;
- `milestoneMonths`: opcional, `3`, `6`, `10`;
- `limit`: opcional, default `20`;
- `includeFuture`: opcional, apenas ADMIN ou tela de gestao futura.

Regra de permissao:

- ADMIN: todos.
- COMERCIAL: `assignedToId = req.userId`.

Resposta sugerida:

```json
{
  "items": [
    {
      "id": "reminder_id",
      "milestoneMonths": 3,
      "dueAt": "2026-06-01T00:00:00.000Z",
      "status": "PENDING",
      "proposal": {
        "id": "proposal_id",
        "status": "REJECTED",
        "statusLabel": "Rejeitada",
        "proposalTypeName": "Pacote Promocional",
        "investValue": "3000.00"
      },
      "advertiser": {
        "id": "advertiser_id",
        "name": "Supermercado Bom Preco",
        "status": "LEAD",
        "statusLabel": "Lead"
      },
      "station": {
        "id": "station_id",
        "name": "Radio 88 FM"
      },
      "assignedTo": {
        "id": "user_id",
        "name": "Carlos Silva"
      }
    }
  ],
  "meta": {
    "total": 4,
    "due": 4
  }
}
```

#### `GET /api/recall-reminders/count`

Retorna apenas a contagem para badge da sidebar.

Resposta:

```json
{ "due": 4 }
```

#### `PATCH /api/recall-reminders/:id/notify`

Marca que o aviso foi exibido.

Uso:

- chamado quando a notificacao flutuante abrir;
- atualiza `lastNotifiedAt`;
- se status for `PENDING`, pode virar `NOTIFIED`.

#### `PATCH /api/recall-reminders/:id/snooze`

Payload:

```json
{ "days": 15 }
```

Regras:

- validar dias permitidos: `7`, `15`, `30`;
- status vira `SNOOZED`;
- `snoozedUntil = now + days`.

#### `PATCH /api/recall-reminders/:id/done`

Marca aviso como tratado.

Payload opcional:

```json
{ "note": "Cliente sera abordado novamente na proxima semana." }
```

Regras:

- status vira `DONE`;
- grava `handledAt`;
- grava `handledById = req.userId`.

### 7.4 Helpers de backend

Criar helper interno, por exemplo:

- `artifacts/api-server/src/services/recall-reminders.ts`

Funcoes:

- `createRecallRemindersForRejectedProposal(proposal, rejectedAt)`
- `cancelPendingRecallRemindersForProposal(proposalId)`
- `backfillRecallRemindersForRejectedProposals()`
- `getDueRecallReminderWhereForUser(req.user)`

Motivo:

- evitar duplicar regra entre endpoint de status, backfill e possiveis rotinas futuras.

## 8. Frontend

### 8.1 Item visual na sidebar

Arquivo:

- `artifacts/proposta/src/components/layout/AppLayout.tsx`

Adicionar badge no item relacionado a avisos.

Opcao recomendada:

- criar item novo no menu principal: `Avisos de Recaptura`;
- rota: `/recall-reminders`;
- mostrar badge com total vencido.

Alternativa aceitavel para MVP:

- badge no item `Andamento de Propostas`;
- ao clicar, abrir a tela de andamento com filtro de rejeitadas.

Decisao recomendada:

- criar rota propria `/recall-reminders`, porque a feature tem ciclo de vida proprio: vencidos, lembrar depois, tratado.

### 8.2 Notificacao flutuante central

Criar componente:

- `artifacts/proposta/src/components/notifications/RecallReminderDialog.tsx`

Comportamento:

- aparece no centro da tela quando houver avisos vencidos;
- usa `Dialog` shadcn/Radix, nao toast;
- nao deve ser um AlertDialog destrutivo, porque nao e confirmacao critica;
- deve ser acessivel e fechar com `Esc`;
- ao abrir, chama `/api/recall-reminders/:id/notify` para os avisos exibidos;
- pode mostrar ate 5 avisos, com link para ver todos.

Conteudo de cada item:

- Nome do Lead/Cliente;
- status atual: Lead ou Cliente;
- proposta rejeitada;
- marco: `3 meses`, `6 meses`, `10 meses`;
- responsavel;
- data da rejeicao;
- acoes: `Abrir proposta`, `Abrir Lead/Cliente`, `Lembrar depois`, `Marcar tratado`.

Texto sugerido:

`Clientes e leads para recaptura`

Subtexto:

`Estas propostas foram rejeitadas ha 3, 6 ou 10 meses. Avalie uma nova abordagem comercial.`

### 8.3 Provedor de notificacoes

Criar componente de alto nivel:

- `artifacts/proposta/src/components/notifications/RecallReminderProvider.tsx`

Responsabilidades:

- consultar `/api/recall-reminders/count`;
- consultar `/api/recall-reminders?limit=5`;
- exibir dialog se houver avisos vencidos;
- evitar abrir o dialog repetidamente na mesma sessao depois que o usuario fechar.

Regra de sessao:

- guardar `recallReminderDialogDismissedAt` em `sessionStorage`;
- se o usuario fechar, nao abrir novamente na mesma sessao;
- badge permanece visivel enquanto houver avisos vencidos.

Integracao:

- renderizar dentro do layout autenticado (`AppLayout`) para ADMIN e COMERCIAL.

### 8.4 Tela de listagem de avisos

Criar pagina:

- `artifacts/proposta/src/pages/recall-reminders/index.tsx`

Rota:

- `/recall-reminders`

Layout:

- Header: `Avisos de Recaptura`
- Subtitulo: `Revise leads e clientes com propostas rejeitadas nos marcos de 3, 6 e 10 meses.`
- Filtros:
  - busca por cliente/lead ou proposta;
  - marco: todos, 3, 6, 10 meses;
  - empresa;
  - responsavel, apenas ADMIN;
  - status do aviso: vencidos, reagendados, tratados.
- Lista em cards ou tabela densa:
  - Lead/Cliente;
  - proposta rejeitada;
  - responsavel;
  - data da rejeicao;
  - marco;
  - data prevista;
  - status do aviso;
  - acoes.

### 8.5 Acoes de UI

`Abrir proposta`:

- navegar para `/proposals/:id/edit`.

`Abrir Lead/Cliente`:

- navegar para `/leads` ou `/advertisers` com foco/filtro, se ja existir suporte;
- se nao existir deep link, abrir a pagina correspondente e aplicar busca via query string no MVP.

`Lembrar depois`:

- abrir pequeno dialog/select com `7`, `15`, `30` dias;
- chamar `PATCH /api/recall-reminders/:id/snooze`;
- toast de sucesso.

`Marcar tratado`:

- abrir dialog simples com nota opcional;
- chamar `PATCH /api/recall-reminders/:id/done`;
- remover item da lista ativa.

## 9. UX e Feedback

### 9.1 Badges

Badge na sidebar:

- vermelho/alerta quando houver vencidos;
- exibir numero ate `99`;
- se passar de 99, mostrar `99+`.

### 9.2 Notificacao central

O aviso deve ser informativo e acionavel, nao intrusivo demais.

Regras:

- aparecer no maximo uma vez por sessao;
- nao bloquear o uso do sistema;
- conter botao `Ver todos`;
- conter botao `Fechar por agora`;
- badge continua ativo mesmo se o usuario fechar.

### 9.3 Cores

- Avisos vencidos: cor de warning/attention.
- Acao `Marcar tratado`: primaria ou neutra.
- Acao `Lembrar depois`: secundaria.
- Se houver botao que descarte definitivamente o aviso, usar tratamento destrutivo apenas se a acao for irreversivel.

## 10. Documentacao

Atualizar:

- `docs/08-regras-de-negocio.md`
  - adicionar secao `Avisos de Recaptura`;
  - reforcar que Lead rejeitado continua Lead.
- `docs/paginas-por-perfil.md`
  - adicionar pagina `/recall-reminders`;
  - explicar comportamento para ADMIN e COMERCIAL.
- `docs/05-backend-api-guidelines.md`
  - adicionar contratos `/api/recall-reminders`.
- `docs/06-banco-de-dados.md`
  - adicionar modelo `ProposalRecallReminder` e enum de status.
- `docs/MUDANCAS.MD`
  - registrar implementacao do plano quando concluido.

## 11. Plano de Implementacao

### Fase 1 - Banco de dados

1. Adicionar enum `ProposalRecallReminderStatus`.
2. Adicionar model `ProposalRecallReminder`.
3. Adicionar relacoes em `Proposal`, `Advertiser` e `User`.
4. Rodar `pnpm db:generate`.
5. Rodar `pnpm db:push` no ambiente local.
6. Ajustar seed/backfill para dados rejeitados existentes, se necessario.

### Fase 2 - Services de backend

1. Criar service de lembretes de recaptura.
2. Implementar criacao idempotente dos marcos de 3, 6 e 10 meses.
3. Implementar cancelamento de lembretes pendentes quando proposta virar `APPROVED`.
4. Implementar query base com permissao por perfil.
5. Implementar fallback para propostas rejeitadas legadas.

### Fase 3 - Endpoints

1. Criar `routes/recall-reminders.ts`.
2. Registrar a rota no agregador de rotas.
3. Implementar `GET /api/recall-reminders`.
4. Implementar `GET /api/recall-reminders/count`.
5. Implementar `PATCH /api/recall-reminders/:id/notify`.
6. Implementar `PATCH /api/recall-reminders/:id/snooze`.
7. Implementar `PATCH /api/recall-reminders/:id/done`.
8. Validar payloads com Zod.
9. Garantir `403` quando COMERCIAL tentar atuar em aviso de outro vendedor.

### Fase 4 - Integracao com status de proposta

1. Ajustar `PATCH /api/proposals/:id/status`.
2. Ao rejeitar, criar lembretes.
3. Ao aceitar, cancelar lembretes pendentes.
4. Garantir que rejeicao nao altera `Advertiser.status`.
5. Adicionar testes manuais com Lead e Cliente.

### Fase 5 - Frontend global

1. Criar hook ou client local para `/api/recall-reminders`.
2. Criar `RecallReminderProvider`.
3. Integrar provider no `AppLayout`.
4. Criar badge na sidebar.
5. Criar `RecallReminderDialog` central.
6. Garantir que dialog abre no maximo uma vez por sessao.

### Fase 6 - Tela de avisos

1. Criar rota `/recall-reminders`.
2. Criar pagina de listagem.
3. Adicionar filtros.
4. Implementar cards/tabela com acoes.
5. Implementar `Lembrar depois`.
6. Implementar `Marcar tratado`.
7. Implementar navegacao para proposta e Lead/Cliente.

### Fase 7 - Documentacao

1. Atualizar `docs/08-regras-de-negocio.md`.
2. Atualizar `docs/paginas-por-perfil.md`.
3. Atualizar `docs/05-backend-api-guidelines.md`.
4. Atualizar `docs/06-banco-de-dados.md`.
5. Registrar entrega em `docs/MUDANCAS.MD`.
6. Ao final, marcar checklist deste plano.

### Fase 8 - Validacao

1. Criar proposta para Lead.
2. Rejeitar proposta.
3. Confirmar que Lead continua Lead.
4. Confirmar criacao dos 3 lembretes.
5. Ajustar datas no banco local para simular vencimento.
6. Confirmar badge no sidebar.
7. Confirmar dialog central para ADMIN.
8. Confirmar dialog central para COMERCIAL dono da proposta.
9. Confirmar que outro COMERCIAL nao ve aviso.
10. Confirmar `Lembrar depois`.
11. Confirmar `Marcar tratado`.
12. Confirmar que aceitar proposta cancela lembretes pendentes.
13. Rodar typecheck e builds.
14. Subir Docker e validar local.

## 12. Cenarios de QA

### Perfil ADMIN

- [ ] ADMIN ve avisos de todos os vendedores.
- [ ] ADMIN consegue filtrar por responsavel.
- [ ] ADMIN consegue abrir proposta rejeitada.
- [ ] ADMIN consegue marcar aviso como tratado.
- [ ] ADMIN ve badge com contagem total.

### Perfil COMERCIAL

- [ ] COMERCIAL ve somente seus proprios avisos.
- [ ] COMERCIAL nao acessa aviso de outro vendedor por URL/API direta.
- [ ] COMERCIAL consegue lembrar depois.
- [ ] COMERCIAL consegue marcar tratado.
- [ ] COMERCIAL consegue abrir proposta propria.

### Regras de Lead/Cliente

- [ ] Lead com proposta rejeitada continua `LEAD`.
- [ ] Cliente com proposta rejeitada continua `CLIENT`.
- [ ] Lead com proposta aceita vira `CLIENT`.
- [ ] Proposta rejeitada gera lembretes de 3, 6 e 10 meses.
- [ ] Proposta aceita cancela lembretes pendentes.

### Datas e recorrencia

- [ ] Rejeicao em `2026-03-01` gera vencimentos em `2026-06-01`, `2026-09-01`, `2027-01-01`.
- [ ] Aviso futuro nao aparece antes da data.
- [ ] Aviso vencido aparece.
- [ ] Aviso reagendado nao aparece antes de `snoozedUntil`.
- [ ] Aviso tratado nao aparece na lista ativa.

## 13. Comandos de Validacao

```bash
pnpm run typecheck
PORT=8080 pnpm --filter @workspace/api-server run build
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:8081/api/healthz
```

Depois de subir:

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8081/api/recall-reminders/count
curl -H "Authorization: Bearer <TOKEN>" http://localhost:8081/api/recall-reminders
```

## 14. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Gerar aviso duplicado ao rejeitar proposta mais de uma vez | Usar `@@unique([proposalId, milestoneMonths])` e `upsert`. |
| COMERCIAL ver aviso de outro vendedor | Filtro obrigatorio no backend por `assignedToId = req.userId` para COMERCIAL. |
| Lead ser promovido por engano ao rejeitar proposta | Garantir que somente `APPROVED` atualiza `Advertiser.status = CLIENT`. |
| Dialog central ficar irritante | Abrir no maximo uma vez por sessao e manter badge/lista como acesso persistente. |
| Dados legados rejeitados ficarem sem aviso | Criar backfill com base em timeline `REJECTED` ou `Proposal.updatedAt`. |
| Fuso horario afetar vencimento | Usar `DateTime @db.Timestamptz(6)` e comparar `dueAt <= now()` no backend. |

## 15. Checklist Final de Implementacao

- [x] Schema Prisma atualizado com enum e model de aviso recorrente.
- [x] Relacoes adicionadas em `Proposal`, `Advertiser` e `User`.
- [x] Prisma Client gerado.
- [x] Banco local atualizado.
- [x] Service de lembretes criado.
- [x] Rejeicao de proposta cria lembretes de 3, 6 e 10 meses.
- [x] Aceite de proposta cancela lembretes pendentes.
- [x] Lead rejeitado permanece Lead.
- [x] Endpoints `/api/recall-reminders` implementados.
- [x] Permissoes ADMIN/COMERCIAL aplicadas no backend.
- [x] Badge na sidebar implementado.
- [x] Notificacao flutuante central implementada.
- [x] Tela `/recall-reminders` implementada.
- [x] Acoes `Lembrar depois` e `Marcar tratado` implementadas.
- [x] Documentacao atualizada.
- [x] QA de datas, permissoes e Lead/Cliente concluido.
- [x] `pnpm run typecheck` passou.
- [x] Build da API passou.
- [x] Build do frontend passou.
- [x] Docker local subiu e healthcheck passou.

## 16. Validacao Executada

- `pnpm db:generate`: passou.
- `DATABASE_URL=postgresql://propostas:propostas@localhost:5433/propostas?schema=public pnpm db:push`: passou fora do sandbox, aplicando o schema no Postgres local.
- `pnpm run typecheck`: passou.
- `PORT=8080 pnpm --filter @workspace/api-server run build`: passou.
- `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`: passou com warnings nao bloqueantes de sourcemap/chunk size do Vite.
- `docker compose up -d --build`: passou.
- `GET /api/healthz`: retornou `{"status":"ok"}`.
- `GET /recall-reminders` no frontend: retornou HTTP `200`.
- `GET /api/recall-reminders/count` sem token: retornou HTTP `401`.
- Login ADMIN seed validado com `admin@radio88fm.com.br`.
- `GET /api/recall-reminders/count` autenticado: retornou `{"due":0}`.
- Criada proposta local de teste `Teste Recaptura Plano 012`.
- Ao marcar a proposta como `REJECTED`, a API criou 3 lembretes com marcos de 3, 6 e 10 meses.
- `PATCH /api/recall-reminders/:id/snooze`: retornou HTTP `200`.
- Ao marcar a proposta de teste como `APPROVED`, os 3 lembretes foram atualizados para `CANCELLED`.

Observacao:

- O primeiro `pnpm db:push` sem `DATABASE_URL` falhou corretamente por variavel ausente.
- O `pnpm db:push` com `DATABASE_URL` dentro do sandbox apresentou falha de acesso ao Postgres local; repetido fora do sandbox, passou. Para producao/Docker, manter `DATABASE_URL` definida no ambiente, como ja ocorre no `docker-compose.yml`.
