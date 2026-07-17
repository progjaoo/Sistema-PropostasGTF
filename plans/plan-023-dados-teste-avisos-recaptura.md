# Plano 023 — Dados de Teste para Avisos de Recaptura

- Projeto: Sistema de Propostas
- Tipo: WEB + API
- Stack: TypeScript, Express, Prisma, PostgreSQL, Docker, PNPM Workspaces
- Data: 2026-07-15
- Status: Planejado
- Agente principal recomendado: Database Engineer
- Agentes de apoio: Backend API Engineer, QA Engineer, Technical Writer

## 1. Referências Usadas

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-database-engineer.md`
- `.agents/agent-backend-api-engineer.md`
- `.agents/agent-qa-engineer.md`
- `docs/06-banco-de-dados.md`
- `docs/08-regras-de-negocio.md`
- `scripts/src/seed.ts`
- `lib/db/prisma/schema.prisma`
- `artifacts/api-server/src/services/recall-reminders.ts`
- `artifacts/api-server/src/routes/recall-reminders.ts`

> Observação operacional: o MCP PostgreSQL do projeto não deve ser usado nesta etapa. Conforme definido na documentação dos MCPs, ele será usado apenas para documentação final do banco de dados após o encerramento das tasks.

## 2. Objetivo

Adicionar dados locais de teste no banco para validar a funcionalidade **Avisos de Recaptura**, incluindo:

- Leads com propostas rejeitadas há mais de 3 meses.
- Geração de avisos vencidos para os marcos de 3, 6 e 10 meses.
- Teste do badge da sidebar em `Avisos de Recaptura`.
- Teste do dialog central exibido ao logar no sistema.
- Garantia de que Lead rejeitado continua como `LEAD`, sem virar Cliente.

## 3. Diagnóstico Atual

O sistema já possui a estrutura funcional:

- `ProposalRecallReminder` guarda os avisos de recaptura.
- Ao marcar proposta como `REJECTED`, a API cria automaticamente avisos para 3, 6 e 10 meses.
- A tela `/recall-reminders` lista avisos vencidos.
- O provider de notificações abre dialog central uma vez por sessão quando há avisos vencidos.
- ADMIN visualiza todos os avisos vencidos.
- COMERCIAL visualiza apenas avisos atribuídos a ele (`assignedToId`).

O que falta para teste local previsível é ter dados seedados com datas antigas, sem depender de o usuário criar propostas manualmente e esperar os marcos de tempo.

## 4. Agentes Selecionados

## 4.1 Database Engineer

Responsável principal porque a tarefa envolve seed e consistência dos registros:

- Criar dados idempotentes em `scripts/src/seed.ts`.
- Garantir relacionamentos corretos entre `Advertiser`, `Proposal`, `ProposalTimeline` e `ProposalRecallReminder`.
- Preservar `Advertiser.status = LEAD` para leads rejeitados.
- Não alterar schema sem necessidade.

## 4.2 Backend API Engineer

Apoio para garantir aderência às regras já implementadas:

- Validar que os registros criados pelo seed respeitam o contrato dos endpoints.
- Garantir que os avisos aparecem para ADMIN e para o COMERCIAL responsável.
- Evitar bypass de regra de permissão.

## 4.3 QA Engineer

Apoio para definir cenários de validação:

- Login ADMIN.
- Login COMERCIAL.
- Badge na sidebar.
- Dialog ao entrar no sistema.
- Lista `/recall-reminders`.
- Filtros por marco de 3, 6 e 10 meses.

## 5. Escopo

### Incluído

- Ajustar `scripts/src/seed.ts`.
- Criar leads de teste com propostas rejeitadas em datas passadas.
- Criar timeline `REJECTED` para essas propostas.
- Criar ou reaproveitar avisos de recaptura com `status = PENDING`.
- Garantir avisos já vencidos para abrir imediatamente ao login.
- Atualizar documentação operacional se necessário.
- Rodar seed/build/validação local.

### Fora do Escopo

- Alterar schema Prisma.
- Alterar regra de criação automática de avisos.
- Alterar UI de Avisos de Recaptura.
- Alterar permissões de ADMIN/COMERCIAL.
- Usar MCP PostgreSQL para inspeção durante a implementação.

## 6. Estratégia de Dados

Adicionar um bloco no fim do seed com dados identificáveis e idempotentes.

### 6.1 Usuário Responsável

Usar o comercial já existente no seed:

- `carlos@radio88fm.com.br`
- Nome: `Carlos Silva`
- Role: `COMERCIAL`

Isso permite validar:

- ADMIN vê todos.
- Carlos vê os próprios avisos.

### 6.2 Empresa

Usar a primeira empresa do seed:

- `Radio 88 FM`

### 6.3 Leads de Teste

Criar pelo menos 3 leads:

1. `Lead Recaptura 3 Meses`
2. `Lead Recaptura 6 Meses`
3. `Lead Recaptura 10 Meses`

Todos devem ter:

- `status = LEAD`
- `active = true`
- contato simples para facilitar identificação
- CNPJ único fictício ou `null`, conforme constraint atual permitir

### 6.4 Propostas Rejeitadas

Criar uma proposta rejeitada para cada lead:

1. Proposta rejeitada há aproximadamente 4 meses.
2. Proposta rejeitada há aproximadamente 7 meses.
3. Proposta rejeitada há aproximadamente 11 meses.

Motivo das datas:

- A de 4 meses vence o marco de 3 meses.
- A de 7 meses vence os marcos de 3 e 6 meses.
- A de 11 meses vence os marcos de 3, 6 e 10 meses.

Isso permite testar diferentes quantidades de avisos vencidos no mesmo login.

### 6.5 Datas

Usar cálculo relativo à data atual em runtime do seed:

```ts
function monthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}
```

Datas sugeridas:

- `monthsAgo(4)`
- `monthsAgo(7)`
- `monthsAgo(11)`

Usar o mesmo `rejectedAt` para:

- `Proposal.updatedAt` se necessário
- `ProposalTimeline.createdAt`
- `ProposalRecallReminder.rejectedAt`

### 6.6 Avisos de Recaptura

Preferir reaproveitar a função existente:

- `createRecallRemindersForRejectedProposal`

Alternativa se o import gerar dependência circular/ruído no script:

- Recriar os `upsert` diretamente no seed usando a mesma regra:
  - `milestoneMonths`: `3`, `6`, `10`
  - `dueAt`: `rejectedAt + milestoneMonths`
  - `status`: `PENDING`
  - `lastNotifiedAt`: `null`
  - `handledAt`: `null`
  - `snoozedUntil`: `null`

Critério: manter idempotência via unique `proposalId + milestoneMonths`.

## 7. Implementação Passo a Passo

### Fase 1 — Preparação

1. Abrir `scripts/src/seed.ts`.
2. Verificar se já existem dados de recaptura para evitar duplicidade conceitual.
3. Confirmar nomes dos modelos em `schema.prisma`:
   - `Advertiser`
   - `Proposal`
   - `ProposalProduct`
   - `ProposalTimeline`
   - `ProposalRecallReminder`

### Fase 2 — Helpers no Seed

Adicionar helpers locais no `seed()` ou fora dele:

```ts
function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const originalDay = next.getDate();
  next.setMonth(next.getMonth() + months);
  if (next.getDate() !== originalDay) next.setDate(0);
  return next;
}

function monthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}
```

### Fase 3 — Buscar Dependências Base

1. Buscar `stationId`.
2. Buscar usuário comercial `carlos@radio88fm.com.br`.
3. Buscar tipo de proposta `Pacote Promocional` ou fallback para qualquer tipo ativo.
4. Buscar produtos do catálogo para popular pelo menos 1 item em cada proposta.

### Fase 4 — Criar Leads

Para cada cenário:

1. `upsert` de `Advertiser`.
2. Garantir `status = LEAD`.
3. Garantir `active = true`.

Identificação sugerida:

- CNPJ fictício ou contato único.
- `tradeName` com prefixo `Lead Recaptura`.

### Fase 5 — Criar Propostas Rejeitadas

Para cada lead:

1. `upsert` de `Proposal` usando um identificador estável disponível.
2. Definir:
   - `status = REJECTED`
   - `stationId`
   - `advertiserId`
   - `createdById = Carlos`
   - `propType = Pacote Promocional`
   - `clientLine1 = nome do lead`
   - `investValue` simples, ex: `R$ 3.000,00`
3. Criar ou substituir produtos da proposta para manter consistência visual.

> Se não houver constraint natural para `Proposal.upsert`, usar `findFirst` por `advertiserId + clientLine1 + createdById` e então `update`/`create`.

### Fase 6 — Criar Timeline Rejeitada

Para cada proposta:

1. Remover timeline seedada anterior específica, se necessário.
2. Criar uma entrada:
   - `step = REJECTED`
   - `note = "Proposta rejeitada para teste de recaptura."`
   - `createdById = Carlos`
   - `createdAt = rejectedAt`

### Fase 7 — Criar Avisos de Recaptura

Para cada proposta:

1. Fazer `upsert` de `ProposalRecallReminder` para `3`, `6`, `10`.
2. Definir:
   - `advertiserId`
   - `assignedToId = Carlos`
   - `rejectedAt`
   - `dueAt = addMonths(rejectedAt, milestoneMonths)`
   - `status = PENDING`
   - `lastNotifiedAt = null`
   - `snoozedUntil = null`
   - `handledAt = null`
   - `handledById = null`
   - `note = null`

Resultado esperado:

- Lead de 4 meses: 1 aviso vencido.
- Lead de 7 meses: 2 avisos vencidos.
- Lead de 11 meses: 3 avisos vencidos.

Total mínimo esperado no ambiente local: 6 avisos vencidos.

### Fase 8 — Logs do Seed

Adicionar log claro:

```ts
console.log("Recall reminder test data OK");
```

Opcionalmente listar:

- nomes dos leads
- quantidade de avisos gerados

### Fase 9 — Validação Técnica

Rodar:

```bash
pnpm run typecheck
pnpm seed
curl http://localhost:21709/api/healthz
```

Se o Docker estiver ativo:

```bash
docker compose up -d --build api frontend
```

Validar endpoint autenticado via UI, porque `/api/recall-reminders/count` exige token.

## 8. QA — Cenários de Teste

### 8.1 Login ADMIN

1. Entrar com `admin@radio88fm.com.br`.
2. Verificar badge no menu `Avisos de Recaptura`.
3. Confirmar que dialog central abre após login.
4. Abrir `/recall-reminders`.
5. Confirmar que os leads de teste aparecem.
6. Filtrar por:
   - `3 meses`
   - `6 meses`
   - `10 meses`

### 8.2 Login COMERCIAL

1. Entrar com `carlos@radio88fm.com.br`.
2. Confirmar badge no menu.
3. Confirmar dialog central após login.
4. Abrir `/recall-reminders`.
5. Confirmar que aparecem apenas avisos atribuídos ao Carlos.
6. Abrir uma proposta pelo aviso.

### 8.3 Lead Permanece Lead

1. Abrir a tela de Leads.
2. Confirmar que:
   - `Lead Recaptura 3 Meses`
   - `Lead Recaptura 6 Meses`
   - `Lead Recaptura 10 Meses`
   continuam em `LEAD`.

### 8.4 Ações do Aviso

1. Usar `Lembrar depois` em um aviso.
2. Confirmar que ele sai da lista ativa.
3. Usar `Marcar tratado` em outro aviso.
4. Confirmar atualização do badge.

## 9. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Seed duplicar propostas a cada execução | Usar `findFirst`/`upsert` com identificadores estáveis |
| Avisos tratados voltarem a pendentes após novo seed | Aceitável em ambiente local de teste; documentar que o seed reseta esses avisos para teste |
| CNPJ único bloquear criação de leads | Usar CNPJs fictícios únicos ou `null` se o schema permitir |
| Datas relativas mudarem contagem com o tempo | Usar 4, 7 e 11 meses para garantir margem além dos marcos |
| COMERCIAL não enxergar aviso por falta de `assignedToId` | Definir `assignedToId` sempre como o usuário Carlos |
| Dialog não abrir por sessionStorage já marcado | Limpar sessionStorage ou fazer logout/login em aba nova |

## 10. Critérios de Aceite

- `pnpm seed` roda sem erro e é idempotente.
- Existem leads de teste com status `LEAD`.
- Existem propostas com status `REJECTED` vinculadas aos leads.
- Existem avisos vencidos em `ProposalRecallReminder` para 3, 6 e 10 meses.
- ADMIN vê todos os avisos vencidos.
- COMERCIAL responsável vê os próprios avisos vencidos.
- Badge da sidebar exibe contagem maior que zero.
- Dialog central de recaptura aparece ao logar quando há avisos vencidos.
- Lead rejeitado não vira Cliente.

## 11. Arquivos Afetados

| Arquivo | Ação |
|---|---|
| `scripts/src/seed.ts` | Adicionar dados de teste idempotentes para recaptura |
| `docs/rodar-local.md` | Opcional: documentar que o seed cria leads para testar recaptura |
| `docs/paginas-por-perfil.md` | Opcional: mencionar dados locais de teste na seção de Avisos de Recaptura |

## 12. Checklist de Implementação

- [ ] Ler `schema.prisma` para confirmar campos obrigatórios de `Proposal`.
- [ ] Adicionar helpers de data ao seed.
- [ ] Buscar usuário comercial e empresa base.
- [ ] Criar leads de teste com `status = LEAD`.
- [ ] Criar propostas rejeitadas com datas antigas.
- [ ] Criar timeline `REJECTED` para cada proposta.
- [ ] Criar avisos de recaptura `PENDING` para 3, 6 e 10 meses.
- [ ] Garantir idempotência do seed.
- [ ] Rodar `pnpm run typecheck`.
- [ ] Rodar `pnpm seed`.
- [ ] Subir Docker se necessário.
- [ ] Testar login ADMIN.
- [ ] Testar login COMERCIAL.
- [ ] Validar badge e dialog central de recaptura.
- [ ] Atualizar documentação operacional se o comportamento de seed for exposto ao usuário.

## 13. Checklist Final Pós-Implementação

> Preencher ao concluir a implementação.

- [ ] Seed atualizado.
- [ ] Dados de teste criados no banco local.
- [ ] Avisos vencidos aparecem no login.
- [ ] Badge da sidebar validado.
- [ ] `/recall-reminders` validado.
- [ ] Leads permanecem como `LEAD`.
- [ ] Typecheck executado.
- [ ] Docker validado, se aplicável.
- [ ] Documentação atualizada, se necessário.
