# Plano 015 - Dashboard com Cards Clicaveis e Lista de Propostas por Status

- Projeto: Sistema de Propostas
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL e PNPM Workspaces
- Data: 2026-07-13
- Status: Implementado
- Escopo: Dashboard, filtros de propostas, API de listagem e documentacao

## 1. Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `artifacts/proposta/src/pages/dashboard.tsx`
- `artifacts/api-server/src/routes/dashboard.ts`
- `artifacts/api-server/src/routes/proposals.ts`
- `lib/api-spec/openapi.yaml`
- `lib/api-client-react/src/generated/api.ts`
- `docs/paginas-por-perfil.md`

## 2. Agentes Recomendados

| Agente | Papel nesta tarefa |
|---|---|
| Product Manager | Definir o comportamento da nova Dashboard e preservar a regra de status das propostas. |
| Frontend Engineer | Implementar cards clicaveis, estado selecionado, lista filtrada, filtros internos e paginacao. |
| Backend API Engineer | Ajustar filtros do endpoint `GET /api/proposals`, se os filtros internos exigirem campos alem dos atuais. |
| UX/UI Designer | Garantir hierarquia clara entre resumo, status selecionado, filtros e lista de propostas. |
| QA Engineer | Validar contagens, filtros, navegacao para edicao e regressao dos status. |
| Technical Writer | Atualizar documentacao da Dashboard e registrar mudancas. |

## 3. Contexto

A Dashboard atual exibe cards com contagens:

- Total
- Rascunhos
- Enviadas
- Aceitas
- Rejeitadas
- Arquivadas

Ela tambem exibe uma lista fixa de `Propostas Recentes`.

Problema atual:

- os cards sao apenas informativos;
- nao e possivel clicar em `Enviadas`, `Aceitas`, `Rascunhos`, etc. para ver as propostas daquele status;
- a lista de recentes nao responde ao status selecionado;
- nao existem filtros internos dentro da secao selecionada.

Objetivo do pedido:

- transformar a Dashboard em uma tela operacional;
- cada card de status deve ser clicavel;
- ao clicar em um status, a dashboard lista as propostas daquele status;
- dentro da lista filtrada deve haver filtros proprios.

Exemplo esperado:

```text
Usuario clica em "Enviadas"
→ a secao abaixo muda para "Propostas Enviadas"
→ lista somente propostas com status SENT
→ usuario pode filtrar dentro das Enviadas por busca, cliente, responsavel, empresa, periodo etc.
```

## 4. Regras de Produto

### 4.1 Cards clicaveis

Todos os cards devem ser clicaveis:

| Card | Status aplicado |
|---|---|
| Total | todos os status |
| Rascunhos | `DRAFT` |
| Enviadas | `SENT` |
| Aceitas | `APPROVED` |
| Rejeitadas | `REJECTED` |
| Arquivadas | `ARCHIVED` |

Comportamento:

- card selecionado deve ter destaque visual claro;
- clicar novamente no mesmo card mantem o filtro;
- `Total` limpa o filtro de status;
- a URL pode continuar sem query string no MVP, mas recomendacao e sincronizar com query params em fase futura.

### 4.2 Lista abaixo dos cards

A secao abaixo dos cards deixa de ser apenas `Propostas Recentes` e passa a ser uma lista contextual:

- `Todas as propostas`, quando o card Total estiver ativo;
- `Propostas Rascunho`;
- `Propostas Enviadas`;
- `Propostas Aceitas`;
- `Propostas Rejeitadas`;
- `Propostas Arquivadas`.

Cada item deve exibir no minimo:

- cliente/anunciante;
- tipo de proposta;
- empresa, se disponivel;
- responsavel;
- status em badge;
- data de atualizacao;
- investimento, se disponivel;
- acao para abrir a proposta.

### 4.3 Filtros internos

Dentro da secao de listagem deve haver filtros proprios, aplicados sobre o status selecionado:

- busca textual;
- cliente/anunciante;
- responsavel;
- empresa;
- tipo de proposta;
- periodo de atualizacao/criacao;
- ordenacao.

MVP recomendado:

- busca textual;
- responsavel;
- empresa;
- tipo de proposta;
- periodo;
- paginacao.

Se algum filtro ainda nao tiver endpoint/lista auxiliar disponivel, implementar em duas etapas:

1. entregar busca textual + status + paginacao usando `GET /api/proposals`;
2. ampliar API para filtros adicionais.

### 4.4 Acesso

Dashboard permanece ADMIN-only no MVP, conforme estado atual:

- rota `/dashboard` exige `adminOnly`;
- sidebar mostra `Dashboard` apenas para ADMIN.

Se no futuro COMERCIAL precisar dessa dashboard, a API deve respeitar escopo por `createdById = req.userId`.

## 5. Diagnostico Tecnico Atual

### 5.1 Frontend

Arquivo:

- `artifacts/proposta/src/pages/dashboard.tsx`

Hoje usa:

- `useGetDashboardStats()`;
- `useGetRecentProposals()`;
- cards estaticos;
- lista `recent` fixa.

### 5.2 Backend Dashboard

Arquivo:

- `artifacts/api-server/src/routes/dashboard.ts`

Endpoints existentes:

- `GET /api/dashboard/stats`
- `GET /api/dashboard/recent-proposals`
- `GET /api/dashboard/template-usage`

`/dashboard/stats` ja retorna:

- `total`
- `draft`
- `sent`
- `approved`
- `rejected`
- `archived`

### 5.3 Backend Propostas

Arquivo:

- `artifacts/api-server/src/routes/proposals.ts`

Endpoint existente:

- `GET /api/proposals`

Parametros atuais:

- `page`
- `limit`
- `status`
- `advertiserId`
- `search`

Limites atuais:

- nao filtra por `createdById` explicitamente para ADMIN;
- nao filtra por `stationId`;
- nao filtra por `proposalTypeId`;
- nao filtra por periodo;
- `search` busca apenas `propType`, `clientLine1` e `campTag`.

## 6. Decisao Tecnica Recomendada

### 6.1 Reutilizar `GET /api/proposals`

Para a lista da Dashboard, usar o endpoint de listagem de propostas como fonte principal.

Motivos:

- ja tem paginacao;
- ja tem filtro por status;
- ja respeita COMERCIAL vs ADMIN quando necessario;
- evita criar um endpoint duplicado de listagem apenas para Dashboard.

### 6.2 Ampliar filtros do endpoint de propostas

Se a Dashboard precisar dos filtros internos completos, ampliar `GET /api/proposals` para aceitar:

- `stationId`
- `proposalTypeId`
- `createdById`
- `dateFrom`
- `dateTo`
- `sortBy`
- `sortDir`

Tambem ampliar o `search` para considerar:

- `advertiser.tradeName`;
- `createdBy.name`;
- `station.name`;
- `proposalType.name`;
- `products.title`, se viavel sem custo excessivo.

### 6.3 Frontend pode usar client gerado ou fetch direto

Opcoes:

1. Atualizar OpenAPI e regenerar client:
   - abordagem mais correta para contrato formal.
2. Usar `fetch` direto na Dashboard para filtros novos:
   - abordagem rapida, mas menos alinhada ao padrao do projeto.

Recomendacao:

- Se for ampliar parametros oficiais, atualizar `lib/api-spec/openapi.yaml` e regenerar os clients.
- Se usar apenas `status`, `search`, `page`, `limit`, pode usar `useListProposals` existente.

## 7. UX Esperada

Estrutura sugerida:

```text
Dashboard
Visao geral e acompanhamento por status.

[Total] [Rascunhos] [Enviadas] [Aceitas] [Rejeitadas] [Arquivadas]

Propostas Enviadas                          [Nova Proposta]
[Buscar...] [Responsavel] [Empresa] [Tipo] [Periodo] [Ordenacao]

┌ proposta 1 ┐
┌ proposta 2 ┐
┌ proposta 3 ┐

[Anterior] Pagina 1 de N [Proxima]
```

Pontos visuais:

- cards devem ter cursor pointer e foco acessivel;
- card ativo deve ter borda/realce pela cor do status;
- lista vazia deve explicar o filtro ativo;
- filtros devem ser compactos e escaneaveis;
- nao usar card dentro de card sem necessidade; manter blocos limpos.

## 8. Arquivos Afetados

| Arquivo | Acao |
|---|---|
| `artifacts/proposta/src/pages/dashboard.tsx` | Reestruturar Dashboard com cards clicaveis, filtros internos, lista e paginacao. |
| `artifacts/api-server/src/routes/proposals.ts` | Ampliar filtros de `GET /api/proposals`, se necessario. |
| `lib/api-spec/openapi.yaml` | Atualizar contrato caso novos params sejam adicionados. |
| `lib/api-zod/src/generated/*` | Regenerar se OpenAPI mudar. |
| `lib/api-client-react/src/generated/*` | Regenerar se OpenAPI mudar. |
| `docs/paginas-por-perfil.md` | Documentar nova Dashboard. |
| `docs/MUDANCAS.MD` | Registrar implementacao. |
| `plans/plan-015-dashboard-propostas-filtradas-por-status.md` | Atualizar checklist final apos implementacao. |

## 9. Plano de Implementacao

### Fase 1 - Definir filtros do MVP

1. Confirmar quais filtros internos entram na primeira entrega.
2. Recomendacao do MVP:
   - status pelo card selecionado;
   - busca textual;
   - periodo;
   - responsavel;
   - empresa;
   - tipo;
   - pagina.
3. Decidir se filtros extras exigem ampliacao do endpoint.

### Fase 2 - Backend/API

1. Abrir `artifacts/api-server/src/routes/proposals.ts`.
2. Ampliar `GET /api/proposals` para novos query params, se necessario.
3. Garantir que ADMIN possa filtrar por responsavel.
4. Garantir que COMERCIAL, se algum dia acessar, continue restrito as proprias propostas.
5. Incluir campos necessarios no `buildSummary`:
   - `stationName`;
   - `proposalTypeName`;
   - `investValue`, se desejado na lista;
   - `createdByName`;
   - `advertiserName`.
6. Atualizar OpenAPI se o contrato mudar.
7. Regenerar clients, se o projeto estiver usando geracao como fonte de verdade.

### Fase 3 - Frontend Dashboard

1. Abrir `artifacts/proposta/src/pages/dashboard.tsx`.
2. Criar estado:
   - `selectedStatus`;
   - `search`;
   - `stationId`;
   - `proposalTypeId`;
   - `createdById`;
   - `dateFrom`;
   - `dateTo`;
   - `page`;
   - `sort`.
3. Tornar os cards de status clicaveis.
4. Trocar `Propostas Recentes` por secao contextual baseada no status selecionado.
5. Consumir `GET /api/proposals` com os filtros internos.
6. Renderizar cards/linhas de proposta com:
   - cliente;
   - tipo;
   - empresa;
   - responsavel;
   - status;
   - atualizado em;
   - acao `Abrir`.
7. Adicionar paginacao.
8. Manter botao `Nova Proposta`.

### Fase 4 - Listas auxiliares

Se os filtros exigirem selects:

1. Empresas:
   - usar `useListStations`.
2. Tipos de proposta:
   - usar `/api/proposal-types?active=true` ou hook existente, se houver.
3. Responsaveis:
   - usar endpoint de usuarios existente se ADMIN, ou criar filtro simplificado por texto no MVP.

### Fase 5 - Estados e Acessibilidade

1. Card ativo deve ter `aria-pressed` ou equivalente.
2. Cards devem ser `button`, nao `div` clicavel sem semantica.
3. Filtros devem ter labels/placeholders claros.
4. Lista vazia deve mostrar mensagem especifica:
   - `Nenhuma proposta enviada encontrada com estes filtros.`
5. Loading deve diferenciar carregamento de contadores e carregamento da lista.

### Fase 6 - Documentacao

1. Atualizar `docs/paginas-por-perfil.md`.
2. Registrar em `docs/MUDANCAS.MD`.
3. Atualizar checklist final deste plano.

### Fase 7 - Validacao

Rodar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Validar manualmente:

1. Dashboard abre para ADMIN.
2. Cards mostram contagens corretas.
3. Clicar em `Enviadas` lista apenas `SENT`.
4. Clicar em `Rascunhos` lista apenas `DRAFT`.
5. Clicar em `Aceitas` lista apenas `APPROVED`.
6. Clicar em `Rejeitadas` lista apenas `REJECTED`.
7. Clicar em `Arquivadas` lista apenas `ARCHIVED`.
8. Clicar em `Total` lista todas.
9. Filtros internos reduzem a lista sem alterar o card selecionado.
10. Abrir proposta leva para `/proposals/:id/edit`.
11. Paginacao funciona.

## 10. Criterios de Aceite

- [ ] Cards de status da Dashboard sao clicaveis.
- [ ] Card ativo fica visualmente destacado.
- [ ] A lista abaixo muda conforme o status selecionado.
- [ ] A lista possui filtros internos.
- [ ] Filtros internos funcionam dentro do status selecionado.
- [ ] `Total` lista todas as propostas.
- [ ] `Arquivadas` usa status `ARCHIVED`.
- [ ] Lista tem estado vazio claro.
- [ ] Cada proposta listada abre o editor.
- [ ] Dashboard continua ADMIN-only.
- [ ] Typecheck passa.
- [ ] Build frontend passa.
- [ ] Documentacao atualizada.

## 11. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Contagem dos cards divergir da lista | Usar os mesmos status tecnicos (`DRAFT`, `SENT`, `APPROVED`, `REJECTED`, `ARCHIVED`) e validar total por filtro. |
| Filtros internos exigirem dados nao retornados | Ampliar `buildSummary` e o OpenAPI antes de montar UI final. |
| Dashboard ficar pesada com muitas propostas | Usar paginacao server-side via `GET /api/proposals`. |
| ADMIN-only bloquear fluxo futuro do Comercial | Preservar regra atual, mas manter API preparada para escopo por usuario. |
| Arquivadas nao possuir fluxo visivel de arquivamento | Mostrar contagem/lista se houver dados; se vazio, estado vazio claro. |

## 12. Checklist Final da Implementacao

Implementado em 2026-07-13:

- [x] Cards clicaveis implementados.
- [x] Estado `selectedStatus` implementado.
- [x] Lista filtrada por status implementada.
- [x] Filtros internos implementados.
- [x] Paginacao implementada.
- [x] Endpoint `GET /api/proposals` ajustado para filtros de Dashboard.
- [x] OpenAPI/client atualizados.
- [x] Documentacao atualizada em `docs/paginas-por-perfil.md` e `docs/MUDANCAS.MD`.
- [x] Typecheck executado com sucesso: `pnpm run typecheck`.
- [x] Build frontend executado com sucesso: `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`.
- [x] Docker reconstruido com sucesso: `docker compose up -d --build`.
- [x] Healthcheck validado: `curl http://localhost:21709/api/healthz` retornou `{"status":"ok"}`.

Resumo tecnico:

- A Dashboard substituiu `Propostas Recentes` por uma lista operacional baseada em `GET /api/proposals`.
- Os cards de Total, Rascunhos, Enviadas, Aceitas, Rejeitadas e Arquivadas agora filtram a lista abaixo.
- Os filtros internos incluem busca textual, empresa, responsavel, tipo de proposta, periodo e ordenacao.
- O endpoint de propostas passou a retornar metadados suficientes para a Dashboard: empresa, tipo, responsavel e investimento.
