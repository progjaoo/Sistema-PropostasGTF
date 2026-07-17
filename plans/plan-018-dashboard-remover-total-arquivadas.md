# Plano 018 - Dashboard sem Total e Arquivadas

- Projeto: Sistema de Propostas
- Data: 14/07/2026
- Tipo: WEB
- Stack: TypeScript, React, Vite, TanStack Query, shadcn/ui
- Escopo: tela de Dashboard (`/dashboard`)
- Status: Planejado

## 1. Referencias Consultadas

- `docs/README.md`
- `.agents/README.md`
- `docs/04-frontend-guidelines.md`
- `docs/10-qualidade-validacao-contribuicao.md`
- `artifacts/proposta/src/pages/dashboard.tsx`

## 2. Agentes Recomendados

| Agente | Motivo |
|---|---|
| Frontend Engineer | Alterar a tela `dashboard.tsx`, estados, cards clicaveis e filtros de propostas por status. |
| UX/UI Designer | Garantir que a remocao de cards deixe a leitura mais limpa e preserve hierarquia visual. |
| QA Engineer | Validar clique em cada status, filtros internos, paginacao e regressao visual. |
| Technical Writer | Atualizar documentacao funcional da Dashboard e registrar mudancas. |

Agente principal recomendado: **Frontend Engineer**.

## 3. Contexto

A Dashboard atual exibe cards de resumo clicaveis para:

- Total
- Rascunhos
- Enviadas
- Aceitas
- Rejeitadas
- Arquivadas

O pedido atual e remover o card `Total` e tambem remover `Arquivadas`, pois o sistema ainda nao possui fluxo funcional de arquivamento de propostas. A Dashboard deve ficar focada nos estados reais usados hoje no fluxo comercial:

- Rascunho
- Enviadas
- Aceitas
- Rejeitadas

## 4. Diagnostico Tecnico Atual

Arquivo principal:

```text
artifacts/proposta/src/pages/dashboard.tsx
```

Pontos identificados:

- `DashboardStatus` inclui `all` e `ARCHIVED`.
- `STATUS_CONFIG` possui configuracao visual para `all` e `ARCHIVED`.
- `STATUS_ORDER` renderiza `['all', 'DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'ARCHIVED']`.
- `selectedStatus` inicia como `all`.
- `proposalParams.status` usa `undefined` quando `selectedStatus === 'all'`.
- `getStatValue` retorna `stats.total` para `all` e `stats.archived` para `ARCHIVED`.
- A grid usa `lg:grid-cols-6`, adequada para 6 cards, mas excessiva depois da remocao.

## 5. Objetivo

Remover da Dashboard os cards `Total` e `Arquivadas`, mantendo somente os cards clicaveis:

1. Rascunhos
2. Enviadas
3. Aceitas
4. Rejeitadas

Ao carregar a Dashboard, a lista de propostas deve iniciar em `Rascunhos` ou no primeiro status disponivel da nova ordem.

## 6. Fora do Escopo

- Nao alterar schema Prisma.
- Nao alterar endpoints da API.
- Nao remover `ARCHIVED` do backend, client gerado ou enums globais.
- Nao implementar fluxo de arquivamento.
- Nao alterar regras de proposta aceita/rejeitada.
- Nao mexer na tela `/proposals`.

## 7. Decisoes de Implementacao

### 7.1 Status disponiveis na Dashboard

Criar um tipo local especifico para a Dashboard sem `all` e sem `ARCHIVED`:

```ts
type DashboardStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
```

### 7.2 Ordem dos cards

Atualizar:

```ts
const STATUS_ORDER: DashboardStatus[] = ['DRAFT', 'SENT', 'APPROVED', 'REJECTED'];
```

### 7.3 Estado inicial

Trocar:

```ts
const [selectedStatus, setSelectedStatus] = React.useState<DashboardStatus>('all');
```

por:

```ts
const [selectedStatus, setSelectedStatus] = React.useState<DashboardStatus>('DRAFT');
```

### 7.4 Parametros da listagem

Como `selectedStatus` sempre sera um status real, simplificar:

```ts
status: selectedStatus,
```

Nao ha mais necessidade de tratar `all`.

### 7.5 Valores dos cards

Atualizar `getStatValue` para usar apenas:

- `stats.draft`
- `stats.sent`
- `stats.approved`
- `stats.rejected`

Manter o backend retornando `total` e `archived`; apenas nao usar esses campos na Dashboard.

### 7.6 Grid

Trocar a grid de 6 colunas para uma configuracao adequada a 4 cards:

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
```

Objetivo: cards mais largos, melhor leitura e responsividade.

## 8. Arquivos Afetados

| Arquivo | Mudanca |
|---|---|
| `artifacts/proposta/src/pages/dashboard.tsx` | Remover `all` e `ARCHIVED` do tipo local, configuracao, ordem, estado inicial, grid e logica de valor. |
| `docs/paginas-por-perfil.md` | Atualizar descricao da Dashboard para listar apenas os 4 status exibidos. |
| `docs/MUDANCAS.MD` | Registrar a mudanca do Plano 018. |
| `plans/plan-018-dashboard-remover-total-arquivadas.md` | Atualizar checklist ao final da implementacao. |

## 9. Passo a Passo de Implementacao

### Fase 1 - Ajustar status da Dashboard

1. Abrir `artifacts/proposta/src/pages/dashboard.tsx`.
2. Remover imports de icones nao usados depois da alteracao:
   - `Archive`
   - `FileText` apenas se deixar de ser usado fora dos cards.
3. Remover `all` e `ARCHIVED` de `DashboardStatus`.
4. Remover as entradas `all` e `ARCHIVED` de `STATUS_CONFIG`.
5. Atualizar `STATUS_ORDER` para 4 status.
6. Alterar estado inicial para `DRAFT`.

### Fase 2 - Ajustar filtros e listagem

1. Atualizar `proposalParams.status` para sempre enviar `selectedStatus`.
2. Revisar `activeConfig` para garantir que sempre aponta para um status existente.
3. Atualizar `getStatValue` removendo caminhos de `all` e `ARCHIVED`.
4. Manter `clearInternalFilters` sem alterar `selectedStatus`, pois ele limpa filtros internos do status selecionado.

### Fase 3 - Ajustar layout visual

1. Alterar grid dos cards para 4 colunas em telas largas.
2. Confirmar que o card selecionado continua com `ring` e `aria-pressed`.
3. Garantir que os nomes dos cards continuem legiveis:
   - Rascunhos
   - Enviadas
   - Aceitas
   - Rejeitadas

### Fase 4 - Atualizar documentacao

1. Atualizar `docs/paginas-por-perfil.md` na secao da Dashboard.
2. Registrar em `docs/MUDANCAS.MD`:
   - remocao de `Total`;
   - remocao de `Arquivadas`;
   - Dashboard agora inicia em `Rascunhos`.
3. Atualizar o checklist final deste plano.

### Fase 5 - Validacao

Rodar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
```

Se a mudanca precisar aparecer no Docker local:

```bash
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

## 10. QA Funcional

Validar como ADMIN:

- [ ] Dashboard abre com `Rascunhos` selecionado.
- [ ] Nao aparece card `Total`.
- [ ] Nao aparece card `Arquivadas`.
- [ ] Card `Rascunhos` lista apenas propostas `DRAFT`.
- [ ] Card `Enviadas` lista apenas propostas `SENT`.
- [ ] Card `Aceitas` lista apenas propostas `APPROVED`.
- [ ] Card `Rejeitadas` lista apenas propostas `REJECTED`.
- [ ] Filtros internos continuam funcionando dentro de cada status.
- [ ] Paginacao continua funcionando.
- [ ] Botao `Nova Proposta` continua abrindo `/proposals/new`.

Validar responsividade:

- [ ] Desktop: 4 cards ficam alinhados e com boa largura.
- [ ] Tablet: grid quebra sem sobrepor textos.
- [ ] Mobile: cards empilham/organizam sem estouro.

## 11. Criterios de Aceite

- [ ] Dashboard exibe somente `Rascunhos`, `Enviadas`, `Aceitas` e `Rejeitadas`.
- [ ] `Total` nao aparece mais como card clicavel.
- [ ] `Arquivadas` nao aparece mais como card clicavel.
- [ ] A listagem continua filtrando pelo status selecionado.
- [ ] Filtros internos da lista continuam funcionando.
- [ ] Typecheck passa.
- [ ] Build frontend passa.
- [ ] Documentacao atualizada.

## 12. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Alguma logica depender de `selectedStatus = all` | Iniciar em `DRAFT` e manter filtros internos independentes. |
| Endpoint ainda retornar `archived` | Nao alterar backend; apenas deixar de exibir esse campo na UI. |
| Import nao usado quebrar lint/build futuro | Remover imports obsoletos no mesmo ajuste. |
| Usuario perder visao agregada total | O pedido remove o total; manter foco nos status operacionais atuais. |

## 13. Checklist Final da Implementacao

Implementacao em 14/07/2026:

- [x] `DashboardStatus` removido de `all` e `ARCHIVED`.
- [x] `STATUS_CONFIG` removido de `Total` e `Arquivadas`.
- [x] `STATUS_ORDER` atualizado para 4 status.
- [x] Estado inicial alterado para `DRAFT`.
- [x] `proposalParams.status` simplificado para status real.
- [x] `getStatValue` ajustado.
- [x] Grid dos cards ajustada para 4 cards.
- [x] Imports obsoletos removidos.
- [x] `docs/paginas-por-perfil.md` atualizado.
- [x] `docs/MUDANCAS.MD` atualizado.
- [x] `pnpm run typecheck` executado.
- [x] Build frontend executado.
- [ ] Docker rebuild executado, se necessario.
- [ ] Healthcheck validado, se Docker for reconstruido.

Observacao: `docker compose up -d --build` foi tentado em 14/07/2026, mas o Docker Desktop falhou ao exportar a imagem com `failed to commit snapshot ... input/output error`. Apos essa falha, `docker ps` ficou sem resposta e o healthcheck em `localhost:21709` retornou conexao resetada. O codigo passou em typecheck e build local; falta repetir o rebuild/healthcheck apos estabilizar ou reiniciar o Docker Desktop.
