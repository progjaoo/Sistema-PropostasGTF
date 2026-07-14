# Plano 011 - Andamento de Propostas, Aceite de Lead e Guia de Producao

- Projeto: Sistema de Propostas
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces
- Data: 2026-07-11
- Status: Implementado
- Escopo: Frontend, Backend/API, documentacao e validacao

## 1. Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-product-manager.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-backend-api-engineer.md`
- `.agents/agent-devops-engineer.md`
- `.agents/agent-qa-engineer.md`
- `.agents/agent-technical-writer.md`
- `.agents/agent-ux-ui-designer.md`
- `lib/db/prisma/schema.prisma`
- `artifacts/api-server/src/routes/proposals.ts`
- `artifacts/proposta/src/components/proposal/ProposalTimeline.tsx`
- `artifacts/proposta/src/components/layout/AppLayout.tsx`
- `artifacts/proposta/src/pages/proposals/index.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/App.tsx`

## 2. Agentes Recomendados

| Agente | Papel nesta tarefa |
|---|---|
| Product Manager | Definir a regra de negocio: Lead so vira Cliente quando a proposta for aceita. |
| Frontend Engineer | Criar a pagina `Andamento de Propostas`, ajustar sidebar, textos de timeline e remover o campo de texto de periodo personalizado. |
| Backend API Engineer | Validar e reforcar o contrato de aceite/status, permissao do COMERCIAL e promocao Lead -> Cliente. |
| UX/UI Designer | Definir layout operacional com timeline horizontal clara, agrupada por programa. |
| QA Engineer | Validar aceite, permissao, transicao Lead/Cliente e regressao em propostas. |
| Technical Writer | Atualizar docs funcionais e manter o novo guia de producao indexado. |
| DevOps Engineer | Documentar passos de publicacao em VPS, Docker, variaveis e backups. |

## 3. Diagnostico Atual

### 3.1 Status e aceite

O sistema ja possui `ProposalStatus.APPROVED` no Prisma e no backend. A regra de promocao ja aparece em `PATCH /api/proposals/:id/status`: quando a proposta recebe status `APPROVED` e tem `advertiserId`, o backend atualiza o anunciante para `AdvertiserStatus.CLIENT`.

Decisao: manter `APPROVED` como valor tecnico no banco/API e usar o rotulo de negocio **Aceita** no frontend. Isso evita migration desnecessaria e preserva compatibilidade com dados ja existentes.

### 3.2 Timeline atual

O componente `ProposalTimeline.tsx` permite registrar etapas manuais:

- `IN_CONVERSATION`
- `PROPOSAL_SENT`
- `CLIENT_REVIEWING`
- `NEGOTIATION`

As etapas finais `APPROVED` e `REJECTED` existem no schema e sao registradas automaticamente pelo backend quando o status muda, mas a UI atual chama isso de "Timeline" e nao oferece uma pagina operacional dedicada para o COMERCIAL acompanhar e aceitar propostas por programa.

### 3.3 Periodo personalizado

Em `proposals/edit.tsx`, o acordeao `Periodo` ainda exibe o campo `periodDesc` com placeholder `Ex: Julho a Setembro de 2026`. O pedido atual e remover esse campo da tela de criacao/edicao. O campo pode continuar no schema/API para compatibilidade historica, mas nao deve aparecer mais no formulario.

## 4. Regras de Negocio

### RN-011.1 - Lead so vira Cliente por proposta aceita

Um registro com `Advertiser.status = LEAD` continua sendo Lead ate que uma proposta vinculada a ele seja marcada como **Aceita**.

Implementacao tecnica:

- UI mostra **Aceita**.
- API envia `status: "APPROVED"`.
- Backend persiste `Proposal.status = APPROVED`.
- Backend atualiza `Advertiser.status = CLIENT`.
- Backend registra timeline com step `APPROVED`.

### RN-011.2 - Quem pode aceitar uma proposta

- ADMIN pode aceitar qualquer proposta.
- COMERCIAL pode aceitar apenas propostas proprias, seguindo a regra ja aplicada no endpoint de status.
- COMERCIAL nao deve ver acao de aceite para proposta que nao pode editar.
- O backend continua sendo a fonte de verdade e deve retornar `403` se alguem tentar aceitar proposta sem permissao.

### RN-011.3 - Nomenclatura no frontend

Trocar textos visiveis:

- `Timeline` -> `Andamento da Proposta`
- `Timeline da proposta` -> `Andamento da Proposta`
- `Aprovada` -> `Aceita`
- `Aprovadas` -> `Aceitas`
- Mensagem automatica de aceite: `Proposta aceita pelo cliente.`

Observacao: nomes internos de componente, model e enum podem continuar como `ProposalTimeline` e `APPROVED`, para evitar refatoracao ampla sem ganho funcional.

### RN-011.4 - Periodo personalizado

O campo `Texto de periodo personalizado` deve sair do formulario de proposta. Para MVP:

- Nao remover `periodDesc` do schema.
- Nao quebrar propostas antigas que ja tenham `periodDesc`.
- Em novas propostas, nao preencher `periodDesc` pela UI.

## 5. Nova Pagina: Andamento de Propostas

### 5.1 Rota e sidebar

- Criar rota: `/proposal-progress`
- Criar pagina: `artifacts/proposta/src/pages/proposals/progress.tsx`
- Adicionar item no sidebar:
  - Label: `Andamento de Propostas`
  - Icone sugerido: `GitBranch`, `Activity`, `Clock3` ou `ListChecks` do Lucide
  - Roles: `COMERCIAL` e `ADMIN`
  - Posicao: abaixo de `Propostas`

### 5.2 Layout esperado

A tela deve seguir o padrao operacional ja criado para Propostas/Produtos por Programa:

- Header:
  - Titulo: `Andamento de Propostas`
  - Subtitulo: `Acompanhe o andamento das propostas por programa e marque propostas aceitas.`
- Filtros:
  - Busca por cliente, proposta, produto ou responsavel
  - Empresa
  - Programa
  - Status
- Corpo:
  - Coluna esquerda: lista de programas filtrados
  - Painel direito: propostas vinculadas ao programa selecionado
  - Cada proposta aparece em card com:
    - Cliente
    - Tipo de proposta
    - Empresa
    - Responsavel
    - Status atual
    - Valor
    - Produtos resumidos
    - Timeline horizontal
    - Acoes permitidas

### 5.3 Timeline horizontal

Etapas visuais sugeridas:

1. Lead criado
2. Em conversa
3. Proposta enviada
4. Cliente analisando
5. Negociacao
6. Aceita ou Rejeitada

Comportamento:

- Usar linha horizontal com pontos/steps.
- Etapas concluidas recebem destaque com `primary`.
- Etapa atual recebe destaque visual e label.
- Etapas futuras ficam neutras.
- Se proposta estiver `REJECTED`, a ultima etapa deve aparecer como `Rejeitada`.
- Se proposta estiver `APPROVED`, a ultima etapa deve aparecer como `Aceita`.

### 5.4 Acoes na pagina

Para proposta editavel pelo usuario:

- `Registrar andamento`: abre dialog ou area inline com select de etapa manual e observacao.
- `Aceitar proposta`: acao primaria, com `AlertDialog` de confirmacao.
- `Rejeitar proposta`: acao secundaria/destrutiva, com `AlertDialog`.
- `Abrir proposta`: navega para `/proposals/:id/edit`.

Para proposta nao editavel:

- Mostrar andamento em modo somente leitura.
- Ocultar botoes de aceite/rejeicao/registro.
- Manter botao de abrir apenas se a API permitir acesso.

## 6. Backend/API

### 6.1 Validar endpoint de status existente

Arquivo: `artifacts/api-server/src/routes/proposals.ts`

O endpoint `PATCH /api/proposals/:id/status` deve continuar:

- Validando status via Zod.
- Buscando proposta.
- Aplicando permissao: ADMIN ou dono da proposta.
- Atualizando `Proposal.status`.
- Se status for `APPROVED`, atualizando `Advertiser.status = CLIENT`.
- Registrando timeline `APPROVED` ou `REJECTED`.
- Retornando a proposta completa atualizada.

Ajustes previstos:

- Alterar mensagens/labels de `APPROVED` de `Aprovada` para `Aceita` nos formatadores de timeline.
- Alterar nota automatica de `Proposta aprovada pelo cliente.` para `Proposta aceita pelo cliente.`
- Garantir que a promocao Lead -> Cliente seja idempotente: se o anunciante ja for `CLIENT`, manter sem erro.

### 6.2 Endpoint para board de andamento

Criar ou estender endpoint para evitar waterfall de chamadas no frontend.

Opcao recomendada:

`GET /api/proposals/progress-board`

Query params:

- `q`
- `stationId`
- `programId`
- `status`

Resposta sugerida:

```json
{
  "programs": [
    {
      "id": "program_id",
      "name": "Jornal da Manha",
      "stationName": "Radio 88 FM",
      "proposalCount": 3,
      "proposals": [
        {
          "id": "proposal_id",
          "title": "Pacote Promocional",
          "advertiserName": "Supermercado Bom Preco",
          "advertiserStatus": "LEAD",
          "proposalTypeName": "Comercial",
          "stationName": "Radio 88 FM",
          "status": "APPROVED",
          "statusLabel": "Aceita",
          "investValue": "7650.00",
          "createdByName": "Carlos Silva",
          "viewerCanEdit": true,
          "products": [
            { "title": "Spot 30 segundos", "quantity": 10 }
          ],
          "timeline": [
            {
              "id": "timeline_id",
              "step": "PROPOSAL_SENT",
              "label": "Proposta enviada",
              "note": null,
              "createdAt": "2026-07-11T12:00:00.000Z",
              "createdByName": "Carlos Silva"
            }
          ]
        }
      ]
    }
  ]
}
```

Permissoes:

- ADMIN recebe todas as propostas.
- COMERCIAL recebe propostas proprias ou, se a regra atual de visibilidade por anunciante for reaproveitada, propostas redigidas de terceiros. Para esta pagina de andamento, recomendacao MVP: listar apenas propostas que o COMERCIAL pode editar, pois a pagina tem acoes de andamento.

### 6.3 Registro manual de andamento

Manter `POST /api/proposals/:id/timeline` para etapas manuais nao finais. Nao permitir `APPROVED` por esse endpoint manual para evitar burlar a regra de conversao Lead -> Cliente.

Aceite e rejeicao devem ocorrer pelo endpoint de status.

## 7. Frontend

### 7.1 Novo componente horizontal

Criar:

- `artifacts/proposta/src/components/proposal/ProposalProgressTimeline.tsx`

Responsabilidades:

- Receber `timeline`, `status` e `statusLabel`.
- Normalizar etapas em ordem fixa.
- Renderizar linha horizontal com pontos, labels e datas.
- Exibir observacao curta da etapa atual.
- Ser responsivo: em telas menores, permitir scroll horizontal sem quebrar o card.

### 7.2 Nova pagina

Criar:

- `artifacts/proposta/src/pages/proposals/progress.tsx`

Responsabilidades:

- Buscar `GET /api/proposals/progress-board`.
- Renderizar filtros.
- Renderizar programas na coluna esquerda.
- Renderizar cards de propostas do programa selecionado.
- Executar `PATCH /api/proposals/:id/status` para aceitar/rejeitar.
- Executar `POST /api/proposals/:id/timeline` para etapas manuais.
- Atualizar estado local apos retorno da API.
- Usar `AlertDialog` para confirmar aceite e rejeicao.
- Usar `sonner` apenas para feedback de sucesso/erro.

### 7.3 Sidebar e rotas

Arquivos:

- `artifacts/proposta/src/components/layout/AppLayout.tsx`
- `artifacts/proposta/src/App.tsx`

Ajustes:

- Adicionar item `Andamento de Propostas`.
- Adicionar `ProtectedRoute path="/proposal-progress"`.
- Garantir acesso para ADMIN e COMERCIAL.

### 7.4 Renomear timeline existente

Arquivos:

- `artifacts/proposta/src/components/proposal/ProposalTimeline.tsx`
- `artifacts/proposta/src/pages/proposals/index.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`

Ajustes:

- Trocar textos visiveis de `Timeline` para `Andamento da Proposta`.
- No dialog da listagem, trocar titulo para `Andamento da Proposta`.
- No acordeao do editor, trocar trigger para `Andamento da Proposta`.
- Mensagens de carregamento podem passar para `Carregando andamento...`.

### 7.5 Labels de status

Arquivos:

- `artifacts/proposta/src/pages/proposals/index.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- Demais telas que exibem `APPROVED`

Ajustes:

- `APPROVED: 'Aceita'`
- Filtro `Aprovadas` -> `Aceitas`
- Select item `Aprovada` -> `Aceita`

### 7.6 Remover periodo personalizado

Arquivo:

- `artifacts/proposta/src/pages/proposals/edit.tsx`

Ajustes:

- Remover o input de `periodDesc` do acordeao `Periodo`.
- Remover label `Texto de periodo personalizado`.
- Nao remover `periodDesc` do payload agora, para preservar compatibilidade.
- Em `proposals/new.tsx`, garantir que a tela nao oferece campo equivalente.

## 8. Banco de Dados

Nenhuma migration obrigatoria.

O plano usa estruturas ja existentes:

- `ProposalStatus.APPROVED`
- `AdvertiserStatus.LEAD | CLIENT`
- `ProposalTimelineStep.APPROVED`
- `Proposal.periodDesc`

So criar migration se, durante a implementacao, for identificado que algum ambiente ainda nao tem esses campos/enums aplicados.

## 9. Documentacao

### 9.1 Arquivo novo de producao

Criado/planejado:

- `docs/SUBIR-PRODUÇÃO.md`

Conteudo esperado:

- Pre-requisitos da VPS.
- Instalar Docker e Compose.
- Configurar variaveis de ambiente.
- Subir Postgres, API e Frontend.
- Rodar Prisma generate/db push ou migration.
- Seed inicial com cautela.
- Configurar proxy reverso e HTTPS.
- Backup e restore do Postgres.
- Rotina de deploy/update.
- Checklist de validacao.

### 9.2 Docs a atualizar na implementacao

- `docs/README.md`: incluir link para `SUBIR-PRODUÇÃO.md`.
- `docs/paginas-por-perfil.md`: documentar `Andamento de Propostas`.
- `docs/MUDANCAS.MD`: registrar regra Lead -> Cliente por aceite.
- `docs/08-regras-de-negocio.md`: registrar regra `APPROVED` exibido como `Aceita`.

## 10. Plano de Execucao

### Fase 1 - Preparacao e contratos

1. Confirmar no schema Prisma os enums `ProposalStatus`, `AdvertiserStatus` e `ProposalTimelineStep`.
2. Confirmar comportamento de `PATCH /api/proposals/:id/status`.
3. Definir `APPROVED` como valor tecnico e `Aceita` como label de negocio.
4. Definir payload do endpoint `GET /api/proposals/progress-board`.

### Fase 2 - Backend

1. Ajustar labels de timeline no backend para `Aceita`.
2. Ajustar nota automatica para `Proposta aceita pelo cliente.`
3. Garantir que `APPROVED` promove anunciante para `CLIENT`.
4. Criar `GET /api/proposals/progress-board`.
5. Aplicar permissao por role/dono da proposta.
6. Retornar `viewerCanEdit` por proposta.
7. Garantir que o endpoint retorna timeline ordenada por data.

### Fase 3 - Frontend de andamento

1. Criar `ProposalProgressTimeline.tsx`.
2. Criar `pages/proposals/progress.tsx`.
3. Implementar filtros e estado de programa selecionado.
4. Renderizar cards de propostas por programa.
5. Integrar aceite com `PATCH /api/proposals/:id/status`.
6. Integrar rejeicao com `PATCH /api/proposals/:id/status`.
7. Integrar etapa manual com `POST /api/proposals/:id/timeline`.
8. Usar `AlertDialog` para aceite/rejeicao.
9. Usar toast para sucesso/erro.

### Fase 4 - Navegacao e textos

1. Adicionar `Andamento de Propostas` no sidebar.
2. Adicionar rota protegida em `App.tsx`.
3. Trocar labels `Timeline` -> `Andamento da Proposta`.
4. Trocar labels `Aprovada(s)` -> `Aceita(s)`.
5. Remover input de `periodDesc` do acordeao `Periodo`.

### Fase 5 - Documentacao

1. Criar/validar `docs/SUBIR-PRODUÇÃO.md`.
2. Atualizar `docs/README.md`.
3. Atualizar `docs/paginas-por-perfil.md`.
4. Atualizar `docs/08-regras-de-negocio.md`.
5. Registrar checklist final neste plano apos implementacao.

### Fase 6 - Validacao

1. Rodar `pnpm run typecheck`.
2. Rodar build do frontend: `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`.
3. Rodar build da API: `PORT=8080 pnpm --filter @workspace/api-server run build`.
4. Subir Docker: `docker compose up -d --build`.
5. Validar `curl http://localhost:8081/api/healthz`.
6. Validar UI em `http://localhost:21709`.
7. Testar como COMERCIAL.
8. Testar como ADMIN.

## 11. Checklist de QA

- [ ] COMERCIAL ve item `Andamento de Propostas` no sidebar.
- [ ] ADMIN ve item `Andamento de Propostas` no sidebar.
- [ ] Pagina agrupa propostas por programa.
- [ ] Timeline horizontal renderiza etapas em ordem correta.
- [ ] Botao `Aceitar proposta` aparece apenas quando o usuario pode editar.
- [ ] Ao aceitar proposta de Lead, proposta vira `Aceita`.
- [ ] Ao aceitar proposta de Lead, anunciante sai de `Leads` e aparece em `Clientes`.
- [ ] Ao aceitar proposta de Cliente, cliente continua como `CLIENT`.
- [ ] Ao rejeitar proposta, status vira `Rejeitada` e nao promove Lead.
- [ ] Tentativa de aceitar proposta de outro vendedor retorna `403`.
- [ ] Textos visiveis nao mostram mais `Timeline`; mostram `Andamento da Proposta`.
- [ ] Textos visiveis nao mostram mais `Aprovada`; mostram `Aceita`.
- [ ] Campo `Texto de periodo personalizado` nao aparece no acordeao `Periodo`.
- [ ] Propostas antigas com `periodDesc` nao quebram ao abrir.
- [ ] `typecheck` passa.
- [ ] Build passa.
- [ ] Docker sobe com API, Frontend e Postgres.

## 12. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Confundir `Aceita` com novo enum | Manter `APPROVED` tecnico e documentar label de negocio. |
| Frontend tentar promover Lead diretamente | Promocao deve ocorrer apenas no backend ao mudar status para `APPROVED`. |
| Nova pagina carregar muitos dados | Criar endpoint agregado `progress-board` com filtros e retorno enxuto. |
| COMERCIAL acessar proposta de outro vendedor | Backend deve aplicar regra de dono e retornar `viewerCanEdit`. |
| Remover `periodDesc` apagar dados antigos | Remover apenas da UI; manter schema/API por compatibilidade. |

## 13. Checklist Final de Implementacao

- [x] Planejamento criado.
- [x] Backend ajustado com `GET /api/proposals/progress-board`.
- [x] Backend manteve aceite via `PATCH /api/proposals/:id/status` com `APPROVED`.
- [x] Backend registra `Aceita` e promove Lead para Cliente quando aplicavel.
- [x] Nova pagina `/proposal-progress` criada.
- [x] Componente `ProposalProgressTimeline` criado com timeline horizontal.
- [x] Sidebar atualizada com `Andamento de Propostas`.
- [x] Rota protegida adicionada em `App.tsx`.
- [x] Textos e labels atualizados: `Timeline` -> `Andamento da Proposta`, `Aprovada` -> `Aceita`.
- [x] Campo de periodo personalizado removido da UI do acordeao `Periodo`.
- [x] Documentacao atualizada em `docs/MUDANCAS.MD`, `docs/08-regras-de-negocio.md` e `docs/paginas-por-perfil.md`.
- [x] Guia `docs/SUBIR-PRODUÇÃO.md` criado e indexado em `docs/README.md`.
- [x] Typecheck validado com `pnpm run typecheck`.
- [x] Build da API validado com `PORT=8080 pnpm --filter @workspace/api-server run build`.
- [x] Build do frontend validado com `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`.
- [x] Docker validado com `docker compose up -d --build`.
- [x] Healthcheck validado com `curl http://localhost:8081/api/healthz` retornando `{"status":"ok"}`.
- [x] Rota protegida `GET /api/proposals/progress-board` validada sem token retornando `401`.
- [x] Rota protegida `GET /api/proposals/progress-board` validada com token ADMIN retornando `200` e programas com propostas.
- [x] Frontend validado com `curl http://localhost:21709/proposal-progress` retornando `200`.

## 14. Resultado da Validacao Local

- `pnpm run typecheck`: passou.
- `PORT=8080 pnpm --filter @workspace/api-server run build`: passou.
- `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`: passou com warnings nao bloqueantes de sourcemap/chunk grande.
- `docker compose up -d --build`: passou.
- API: `http://localhost:8081/api/healthz` respondeu `{"status":"ok"}`.
- API: `GET /api/proposals/progress-board` sem token respondeu `401`.
- API: `GET /api/proposals/progress-board` com token ADMIN respondeu `200`.
- Frontend: `http://localhost:21709/proposal-progress` respondeu HTTP `200`.
