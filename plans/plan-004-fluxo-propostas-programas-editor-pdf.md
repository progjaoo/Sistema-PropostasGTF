# Plano 004 - Fluxo de Propostas por Programas, Editor Simplificado e PDF A4

## Metadados

- Projeto: Sistema de Propostas
- Data: 2026-07-09
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces
- Agente principal recomendado: Frontend Engineer
- Agentes de apoio: Software Architect, UX/UI Designer, Backend API Engineer, QA Engineer e Technical Writer
- Status: Implementado

## Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-software-architect.md`
- `.agents/agent-ux-ui-designer.md`
- `docs/04-frontend-guidelines.md`
- `docs/08-regras-de-negocio.md`
- `docs/10-qualidade-validacao-contribuicao.md`
- `docs/MUDANCAS.MD`
- `plans/plan-002-redesign-proposta-clientes-leads-cor-emissora.md`
- `plans/plan-003-produtos-duracao-horario-sazonalidade.md`
- `artifacts/proposta/src/pages/proposals/index.tsx`
- `artifacts/proposta/src/pages/proposals/new.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`
- `artifacts/proposta/src/index.css`
- `artifacts/proposta/src/App.tsx`

## Escolha do Agente

O melhor agente principal para esta tarefa e o **Frontend Engineer**, porque o pedido altera principalmente experiencia, navegacao, tela de Propostas, editor, seletores, comportamento de botoes e impressao/PDF.

Agentes de apoio:

- **Software Architect**: definir fronteira entre nova tela de Propostas, rotas existentes e API sem duplicar regra.
- **UX/UI Designer**: organizar hierarquia visual de programas, produtos e propostas vinculadas.
- **Backend API Engineer**: criar ou ajustar endpoint para retorno hierarquico por programa quando o frontend nao tiver dados suficientes.
- **QA Engineer**: validar fluxo ADMIN/COMERCIAL, filtros, editor e impressao.
- **Technical Writer**: atualizar documentacao funcional e checklist pos-implementacao.

## Objetivo

Reestruturar o fluxo de Propostas para que a rota `/proposals` deixe de ser apenas uma tabela simples e passe a ser uma tela operacional com:

1. Programas com seus produtos.
2. Filtros por texto, empresa/emissora, programa e status.
3. Visualizacao hierarquica das propostas vinculadas a cada programa.
4. Editor de proposta mais direto para cliente e produtos.
5. PDF/print em A4 correto, completo e com tipografia Montserrat.

## Escopo

### Dentro do Escopo

- Transformar `/proposals` na tela principal de trabalho de propostas por programas.
- Remover a experiencia de "pre-proposta" de `/proposals/new`.
- Manter `/proposals/new` apenas como compatibilidade/atalho, sem tela intermediaria confusa.
- Adicionar filtros:
  - Busca por texto.
  - Empresa/emissora.
  - Programa.
  - Status da proposta.
- Exibir programas com produtos de forma hierarquica.
- Ao clicar em um programa, mostrar propostas vinculadas a esse programa.
- Manter permissao:
  - ADMIN ve todas as propostas.
  - COMERCIAL ve apenas suas propostas no endpoint de propostas, seguindo regra atual.
- Ajustar area de Cliente no editor:
  - Nao deixar sugestoes/lista aberta depois de selecionar cliente.
  - Usar botao `Novo Lead`.
- Ajustar area de Produtos no editor:
  - Remover botao `Adicionar produto do catalogo`.
  - Produto selecionado no combobox entra automaticamente na proposta.
  - Renomear `Adicionar produto avulso` para `Criar Produto Novo`.
  - Botao de excluir produto sempre visivel e vermelho.
  - Remover campo `Tags` da UI.
- Ajustar PDF/print:
  - Tipografia Montserrat.
  - Folha A4 real.
  - Impressao completa ao clicar no botao PDF.
  - Sem cortar conteudo ou imprimir sidebar/editor.
- Atualizar documentacao e checklist final no plano.

### Fora do Escopo

- Refazer o layout visual da proposta alem dos ajustes de fonte, A4 e print.
- Criar geracao server-side de PDF.
- Adicionar biblioteca pesada de PDF se `window.print()` puder ser corrigido com CSS e DOM.
- Remover fisicamente campos `tags` do banco.
- Remover fisicamente a rota `/proposals/new`; ela deve continuar existindo como compatibilidade.
- Alterar regras de permissao ADMIN/COMERCIAL fora do necessario para manter consistencia.

## Estado Atual Identificado

### Rota `/proposals`

Hoje `artifacts/proposta/src/pages/proposals/index.tsx` mostra:

- Lista tabular de propostas.
- Busca por texto.
- Filtro por status.
- Botao `Nova Proposta` que navega para `/proposals/new`.
- Acoes em menu por linha.

Limitacoes atuais:

- Nao exibe programas/produtos.
- Nao filtra por empresa/emissora.
- Nao filtra por programa.
- Nao mostra propostas hierarquicamente por programa.

### Rota `/proposals/new`

Hoje `artifacts/proposta/src/pages/proposals/new.tsx` mostra:

- Tela intermediaria de nova proposta.
- Card informando que templates foram removidos.
- Seletor de empresa.
- Lista de programas com produtos.
- Botao `Criar Rascunho`.

Limitacao:

- Esta e a "pre-proposta" citada no pedido. O fluxo deve deixar de cair nessa tela como etapa visual separada.

### Editor `/proposals/:id/edit`

Hoje `artifacts/proposta/src/pages/proposals/edit.tsx`:

- Exibe busca de cliente/lead com lista de sugestoes sempre visivel.
- Tem botao `Novo Cliente`.
- Area de produtos tem select + botao `Adicionar produto do catalogo`.
- Produto so entra na proposta depois de clicar no botao.
- Botao de remover produto aparece apenas no hover.
- Ainda existe campo `Tags`.
- Botao PDF chama `window.print()`.

### Preview/PDF

Hoje `ProposalPreview.tsx`:

- Usa `DM Sans`.
- Usa largura aproximada A4 em pixels (`794px`) e altura minima (`1123px`).
- No editor, o preview e renderizado em escala `0.8`.
- CSS de print atual e pequeno e nao garante pagina A4 completa.
- O botao PDF imprime a pagina, mas pode incluir layout incorreto/corte.

## Decisoes de Produto e Arquitetura

### 1. `/proposals` sera a tela principal de programas e propostas

A sidebar deve continuar apontando para `/proposals`, mas essa rota passa a ser a nova tela operacional:

- Topo com filtros.
- Area principal com programas.
- Cada programa mostra produtos vinculados.
- Ao selecionar/clicar programa, exibe propostas vinculadas ao programa em hierarquia.

### 2. `/proposals/new` vira rota de compatibilidade

Nao remover fisicamente a rota.

Comportamento recomendado:

- Se acessada diretamente, redirecionar para `/proposals`.
- Opcionalmente aceitar query futura `?create=1`, mas nao criar novo fluxo agora.

Motivo:

- Evita quebrar links existentes.
- Remove a tela intermediaria que confunde o usuario.

### 3. Criacao de proposta deve sair da tela `/proposals`

Na nova tela `/proposals`, o botao `Nova Proposta` deve:

- Criar um rascunho com a primeira empresa ativa, priorizando Radio 88 FM; ou
- Abrir um dialog compacto para escolher empresa e tipo antes de criar.

Recomendacao: usar dialog compacto.

Motivo:

- A proposta sempre precisa de empresa.
- Evita criar rascunho em empresa errada.
- Mantem o fluxo mais explicito sem voltar a criar uma tela de pre-proposta.

### 4. Propostas vinculadas a programa devem vir da API

Criar um endpoint especifico para a tela hierarquica:

```http
GET /api/proposals/program-board?search=&stationId=&programId=&status=
```

Resposta sugerida:

```jsonc
{
  "programs": [
    {
      "id": "program_id",
      "name": "Rotativo Comercial",
      "description": "Insercoes comerciais distribuidas na grade",
      "products": [
        {
          "id": "product_id",
          "title": "SPOT 30 SEGUNDOS",
          "durationLabel": "30s",
          "suggestedValueMin": "R$ 1.500,00"
        }
      ],
      "proposals": [
        {
          "id": "proposal_id",
          "status": "SENT",
          "advertiserName": "Cliente X",
          "stationName": "Radio 88 FM",
          "proposalTypeName": "Proposta Comercial",
          "createdByName": "Carlos Silva",
          "investValue": "R$ 3.000,00",
          "updatedAt": "2026-07-09T00:00:00.000Z",
          "products": [
            {
              "title": "SPOT 30 SEGUNDOS",
              "qty": "08",
              "airTime": "13H AS 15H",
              "seasonality": "MONTHLY"
            }
          ]
        }
      ]
    }
  ]
}
```

Regras do endpoint:

- ADMIN recebe propostas de todos.
- COMERCIAL recebe apenas propostas criadas por ele, mantendo RN atual.
- Programa e determinado por `ProposalProduct.productTemplate.programId`.
- Quando o item nao tem `productTemplateId`, usar `ProposalProduct.program` apenas como fallback textual.
- Propostas sem produtos podem aparecer em grupo `Sem programa` somente se o time decidir manter visibilidade desses rascunhos.

### 5. Editor de cliente deve usar selecao explicita

Substituir a lista de sugestoes sempre visivel por:

- Card do cliente/lead selecionado.
- Botao `Selecionar Cliente/Lead`.
- Botao `Novo Lead`.
- Dialog de selecao com busca, que fecha ao escolher um cliente/lead.

Motivo:

- Atende ao pedido de nao deixar sugestoes aparecendo ao setar cliente.
- Reduz ruido visual no editor.
- Reforca o fluxo comercial: se ainda nao existe cliente, cria Lead.

### 6. Produto do catalogo entra na proposta ao selecionar

Trocar select + botao por combobox pesquisavel:

- Label: `Selecionar produto`.
- Ao clicar em um produto no combobox, adicionar imediatamente ao plano.
- Depois de adicionar, limpar busca/selecionado.
- Manter agrupamento por programa.
- Exibir titulo, programa, duracao e valor sugerido no resultado.

O botao antigo `Adicionar produto do catalogo` deve sair.

### 7. `Criar Produto Novo` nao cria catalogo

Renomear o botao `Adicionar produto avulso` para `Criar Produto Novo`, mas manter comportamento como item manual da proposta (`productTemplateId = null`).

Motivo:

- O cadastro de produto de catalogo continua sendo responsabilidade ADMIN.
- COMERCIAL pode montar item manual na proposta sem contaminar catalogo.

### 8. Tags saem da UI, nao do banco

Remover campo `Tags` do editor de proposta.

No payload:

- Preservar `tags` existentes se vierem no item.
- Para item novo, usar `[]`.

Motivo:

- Evita perder dados legados.
- Reduz complexidade visual do editor.

### 9. PDF usa Montserrat e A4 real

Alterar `ProposalPreview` para usar:

```css
font-family: 'Montserrat', Arial, sans-serif;
```

Implementacao recomendada:

- Adicionar import/link da fonte Montserrat no frontend.
- Definir classe/variavel especifica para preview/PDF, sem trocar toda a UI do sistema.
- Usar `@page { size: A4; margin: 0; }`.
- Criar estilos de print que mostram somente `.print-area`.
- Remover `transform: scale(0.8)` na impressao.
- Garantir `.proposal-page` com `width: 210mm`, `min-height: 297mm` e `page-break-after` quando necessario.

## Impacto por Camada

### Banco / Prisma

Mudanca de schema nao e obrigatoria.

Possiveis ajustes sem migration:

- Usar relacoes existentes:
  - `Proposal.products`
  - `ProposalProduct.productTemplateId`
  - `ProductTemplate.programId`
  - `Proposal.stationId`
  - `Proposal.status`
  - `Proposal.createdById`

### Backend / API

Arquivos provaveis:

- `artifacts/api-server/src/routes/proposals.ts`
- `artifacts/api-server/src/routes/proposal-categories.ts`, se reaproveitar formatacao de programas/produtos.
- `lib/api-zod/src/generated/api.ts`, se atualizar schemas gerados manualmente ou via gerador.
- `lib/api-client-react/src/generated/api.schemas.ts`, se o frontend usar client gerado.

Tarefas:

1. Criar endpoint `GET /api/proposals/program-board`.
2. Aceitar filtros:
   - `search`
   - `stationId`
   - `programId`
   - `status`
3. Aplicar permissao:
   - `createdById = req.userId` para COMERCIAL.
   - Sem filtro de dono para ADMIN.
4. Buscar programas ativos com produtos.
5. Buscar propostas com include:
   - `station`
   - `advertiser`
   - `createdBy`
   - `proposalType`
   - `products.productTemplate.programRef`
6. Montar resposta hierarquica por programa.
7. Garantir que filtro de texto busque em:
   - Nome do programa.
   - Titulo do produto.
   - Nome do cliente/lead.
   - Tipo de proposta.
   - Nome do vendedor.
8. Garantir que filtros nao vazem proposta de outro vendedor para COMERCIAL.
9. Manter `GET /api/proposals` atual para compatibilidade, se outras telas usam.

### Frontend - Tela `/proposals`

Arquivo principal:

- `artifacts/proposta/src/pages/proposals/index.tsx`

Tarefas:

1. Substituir tabela simples por tela hierarquica.
2. Criar barra de filtros:
   - Busca por texto.
   - Select de Empresa.
   - Select de Programa.
   - Select de Status.
3. Criar botao `Nova Proposta`.
4. Botao `Nova Proposta` abre dialog compacto:
   - Empresa.
   - Tipo de proposta.
   - Botao `Criar rascunho`.
5. Criar rascunho via `useCreateProposal`.
6. Ao criar, navegar para `/proposals/:id/edit`.
7. Exibir programas em layout operacional:
   - Nome.
   - Descricao.
   - Quantidade de produtos.
   - Quantidade de propostas filtradas.
   - Lista curta de produtos.
8. Ao clicar em programa:
   - Destacar programa selecionado.
   - Mostrar painel com propostas vinculadas.
9. Propostas vinculadas devem aparecer hierarquicamente:
   - Programa.
   - Produtos do programa usados em propostas.
   - Cards/linhas de proposta.
10. Cada proposta deve exibir:
   - Cliente/lead.
   - Status.
   - Empresa.
   - Tipo de proposta.
   - Responsavel.
   - Investimento.
   - Ultima atualizacao.
   - Botao/acao para abrir editor.
11. Estados obrigatorios:
   - Loading.
   - Nenhum programa.
   - Nenhuma proposta para o filtro.
   - Erro de carregamento.

### Frontend - Rota `/proposals/new`

Arquivo:

- `artifacts/proposta/src/pages/proposals/new.tsx`

Tarefas:

1. Remover experiencia visual de pre-proposta.
2. Transformar rota em redirecionamento para `/proposals`.
3. Opcional: mostrar toast curto `Crie a proposta pela tela principal`.
4. Nao remover a rota do `App.tsx`, para preservar links antigos.

### Frontend - Editor de Proposta

Arquivo:

- `artifacts/proposta/src/pages/proposals/edit.tsx`

Tarefas Cliente:

1. Remover lista de sugestoes sempre visivel.
2. Criar card de cliente/lead selecionado.
3. Criar botao `Selecionar Cliente/Lead`.
4. Criar dialog de selecao com busca.
5. Ao selecionar, fechar dialog e exibir apenas o cliente selecionado.
6. Trocar botao `Novo Cliente` por `Novo Lead`.
7. Novo Lead deve criar `Advertiser` com `status = LEAD`.
8. Ao criar Lead, selecionar automaticamente na proposta.

Tarefas Produto:

1. Substituir select atual por combobox pesquisavel.
2. Remover botao `Adicionar produto do catalogo`.
3. Ao clicar em produto no combobox, adicionar imediatamente.
4. Renomear `Adicionar produto avulso` para `Criar Produto Novo`.
5. Manter item manual com `productTemplateId = null`.
6. Deixar botao excluir sempre visivel.
7. Botao excluir deve usar cor de perigo/vermelho.
8. Remover campo `Tags` da UI.
9. Preservar tags existentes no payload quando possivel.
10. Revisar microcopy:
   - `Selecionar produto`
   - `Criar Produto Novo`
   - `Remover produto`

### Frontend - PDF/Print

Arquivos:

- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`
- `artifacts/proposta/src/index.css`
- `artifacts/proposta/index.html`, se fonte for adicionada por link.
- `artifacts/proposta/src/pages/proposals/edit.tsx`

Tarefas:

1. Trocar fonte do preview/PDF para Montserrat.
2. Definir wrapper do preview como classe explicita, por exemplo `proposal-preview-page`.
3. Definir dimensoes A4 reais:
   - Tela: manter preview escalavel.
   - Print: `width: 210mm`, `min-height: 297mm`, sem scale.
4. Adicionar `@page { size: A4; margin: 0; }`.
5. Em `@media print`:
   - Esconder `.no-print`.
   - Esconder layout externo.
   - Mostrar somente `.print-area`.
   - Remover sombras.
   - Remover transform.
   - Evitar scroll containers no print.
6. Ajustar botao PDF:
   - Antes de `window.print()`, garantir que a area de preview esta renderizada.
   - Opcional: usar `requestAnimationFrame(() => window.print())`.
7. Validar que a proposta imprime completa.
8. Se o conteudo ultrapassar uma pagina A4:
   - Permitir quebra limpa entre secoes.
   - Evitar cortar cards no meio com `break-inside: avoid`.

## Plano de Implementacao Passo a Passo

### Fase 1 - Preparacao

1. Confirmar estado do git.
2. Ler novamente:
   - `proposals/index.tsx`
   - `proposals/new.tsx`
   - `proposals/edit.tsx`
   - `ProposalPreview.tsx`
   - `index.css`
3. Confirmar quais hooks gerados existem no client.
4. Definir se o endpoint novo sera consumido via `fetch` direto ou client gerado.

### Fase 2 - Backend

1. Criar rota `GET /api/proposals/program-board`.
2. Implementar filtros de query.
3. Implementar permissao ADMIN/COMERCIAL.
4. Montar resposta hierarquica por programa.
5. Adicionar fallback para propostas sem programa, se necessario.
6. Testar endpoint com ADMIN.
7. Testar endpoint com COMERCIAL.

### Fase 3 - Tela `/proposals`

1. Criar estado de filtros.
2. Buscar empresas com `useListStations`.
3. Buscar programas com `useListProposalCategories` ou pelo endpoint novo.
4. Buscar tipos de proposta para dialog de criacao.
5. Consumir endpoint hierarquico.
6. Criar componentes internos:
   - `ProposalFilters`
   - `ProgramBoardCard`
   - `ProgramProposalPanel`
   - `CreateProposalDialog`
7. Implementar visual operacional:
   - Sem hero marketing.
   - Cards densos.
   - Tabelas/cards claros.
   - Icones Lucide.
8. Preservar acoes existentes:
   - Abrir editor.
   - Rejeitar proposta com `ConfirmActionDialog`.
9. Validar responsividade.

### Fase 4 - Remover pre-proposta

1. Alterar `/proposals/new` para redirecionar para `/proposals`.
2. Remover tela visual de programas de `new.tsx`.
3. Garantir que `Nova Proposta` em `/proposals` cria rascunho via dialog.
4. Garantir que links antigos para `/proposals/new` nao quebram.

### Fase 5 - Cliente no editor

1. Substituir area atual de busca por card selecionado + botoes.
2. Criar dialog `Selecionar Cliente/Lead`.
3. Mover busca/lista para dentro do dialog.
4. Ao selecionar cliente/lead:
   - Atualizar `advertiserId`.
   - Atualizar `advertiser`.
   - Fechar dialog.
5. Trocar `Novo Cliente` para `Novo Lead`.
6. Criar Lead com `status = LEAD`.
7. Atualizar textos e toasts.

### Fase 6 - Produtos no editor

1. Criar combobox pesquisavel de produtos.
2. Remover botao de adicionar produto do catalogo.
3. Adicionar produto automaticamente no clique.
4. Renomear botao de item manual para `Criar Produto Novo`.
5. Deixar botao excluir sempre visivel.
6. Ajustar cor do botao excluir para vermelho/destructive.
7. Remover campo `Tags`.
8. Garantir que `cleanProposalPayload` nao quebre tags legadas.

### Fase 7 - PDF A4 e Montserrat

1. Adicionar Montserrat ao preview/PDF.
2. Ajustar `ProposalPreview` para classe e dimensoes A4.
3. Ajustar `index.css` com `@page` e `@media print`.
4. Ajustar wrapper `.print-area`.
5. Ajustar botao PDF para imprimir apos renderizacao.
6. Testar em Chrome:
   - Preview visual.
   - Cmd/Ctrl+P.
   - Botao PDF.
   - Salvar como PDF.
7. Conferir se sidebar/editor nao aparecem no PDF.

### Fase 8 - Documentacao

1. Atualizar `docs/paginas-por-perfil.md`.
2. Atualizar `docs/08-regras-de-negocio.md`, se algum comportamento virar regra.
3. Atualizar `docs/MUDANCAS.MD`.
4. Atualizar este plano com `Status: Implementado em ...`.
5. Adicionar `Checklist Final da Implementacao` ao final deste plano, seguindo o padrao do `plan-003`.

### Fase 9 - Validacao

1. Rodar `pnpm run typecheck`.
2. Rodar `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`.
3. Rodar build da API se houver endpoint novo.
4. Subir Docker:
   - `docker compose up -d --build`
5. Validar API:
   - `/api/healthz`
   - `/api/proposals/program-board`
6. Validar UI:
   - `/proposals`
   - Criar rascunho.
   - Selecionar cliente/lead.
   - Criar novo lead.
   - Selecionar produto e entrar automaticamente.
   - Criar produto novo manual.
   - Remover produto.
   - Imprimir PDF.

## Checklist de QA

### Tela `/proposals`

- [ ] Sidebar `Propostas` abre a nova tela principal.
- [ ] Tela exibe filtros de texto, empresa, programa e status.
- [ ] Tela exibe programas com produtos.
- [ ] Clicar em programa exibe propostas vinculadas.
- [ ] Informacoes aparecem hierarquicamente e sao faceis de ler.
- [ ] ADMIN ve propostas de todos.
- [ ] COMERCIAL ve somente propostas permitidas.
- [ ] Filtro por empresa funciona.
- [ ] Filtro por programa funciona.
- [ ] Filtro por status funciona.
- [ ] Busca por texto funciona.
- [ ] Estado vazio e claro.
- [ ] Botao `Nova Proposta` cria rascunho sem passar por `/proposals/new`.

### Editor - Cliente

- [ ] Cliente/lead selecionado aparece como card.
- [ ] Sugestoes nao ficam visiveis apos selecionar cliente.
- [ ] Botao `Selecionar Cliente/Lead` abre dialog.
- [ ] Dialog permite buscar e selecionar cliente/lead.
- [ ] Botao `Novo Lead` cria lead.
- [ ] Lead criado fica selecionado na proposta.

### Editor - Produtos

- [ ] Nao existe botao `Adicionar produto do catalogo`.
- [ ] Combobox de produto permite pesquisar.
- [ ] Clicar no produto adiciona automaticamente ao plano.
- [ ] Botao `Criar Produto Novo` cria item manual na proposta.
- [ ] Botao excluir produto esta sempre visivel.
- [ ] Botao excluir produto usa cor vermelha/destructive.
- [ ] Campo `Tags` nao aparece.
- [ ] Produtos antigos com tags continuam abrindo sem erro.

### PDF / Impressao

- [ ] Preview/PDF usa Montserrat.
- [ ] Folha imprime em A4.
- [ ] Botao PDF imprime somente a proposta.
- [ ] Sidebar/editor nao aparecem no PDF.
- [ ] Conteudo nao fica cortado.
- [ ] Cards de produto nao quebram no meio quando possivel.
- [ ] Proposta com muitos produtos continua legivel.
- [ ] Salvar como PDF no Chrome gera arquivo completo.

## Criterios de Aceite

1. `/proposals` substitui o fluxo antigo e mostra programas, produtos e propostas vinculadas.
2. Filtros de texto, empresa, programa e status funcionam.
3. `/proposals/new` nao exibe mais tela de pre-proposta.
4. Criacao de rascunho acontece pela tela `/proposals`.
5. Cliente/lead no editor nao deixa sugestoes visiveis depois da selecao.
6. Editor permite criar `Novo Lead`.
7. Produto do catalogo entra na proposta ao clicar no resultado pesquisado.
8. Botao `Adicionar produto do catalogo` foi removido.
9. Botao `Criar Produto Novo` substitui `Adicionar produto avulso`.
10. Excluir produto fica sempre visivel e vermelho.
11. Campo `Tags` saiu da UI do editor.
12. PDF usa Montserrat.
13. PDF imprime em A4 completo e sem sidebar/editor.
14. Typecheck e builds passam.
15. Documentacao e checklist final sao atualizados.

## Riscos e Cuidados

- **Consulta hierarquica pesada:** evitar montar tudo no frontend com muitas chamadas; preferir endpoint unico.
- **Vazamento de proposta de outro vendedor:** filtro de permissao deve ficar no backend.
- **Propostas sem produto:** definir exibicao em `Sem programa` ou manter apenas na busca/lista se necessario.
- **PDF cortado:** validar `@page`, `break-inside` e remocao de `transform` no print.
- **Fonte Montserrat indisponivel:** adicionar import/link ou fallback bem definido.
- **Rota antiga `/proposals/new`:** manter compatibilidade para nao quebrar links.
- **Tags legadas:** remover da UI sem apagar historico desnecessariamente.

## Arquivos Provavelmente Afetados

- `artifacts/api-server/src/routes/proposals.ts`
- `artifacts/proposta/src/pages/proposals/index.tsx`
- `artifacts/proposta/src/pages/proposals/new.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`
- `artifacts/proposta/src/index.css`
- `artifacts/proposta/index.html`
- `lib/api-zod/src/generated/api.ts`, se atualizar contratos.
- `lib/api-client-react/src/generated/api.schemas.ts`, se atualizar tipos.
- `docs/paginas-por-perfil.md`
- `docs/08-regras-de-negocio.md`
- `docs/MUDANCAS.MD`

## Ordem Recomendada de Commits

1. `api: add program board endpoint for proposals`
2. `frontend: redesign proposals program board`
3. `frontend: simplify proposal client and product editor`
4. `print: fix A4 proposal PDF with Montserrat`
5. `docs: document proposal flow and print changes`

## Checklist Final da Implementacao

Implementado em 2026-07-10.

- [x] Banco/API ajustados, sem migration nova: criado `GET /api/proposals/program-board`.
- [x] Nova tela `/proposals` implementada com programas, produtos, propostas vinculadas e filtros.
- [x] `/proposals/new` removida como tela intermediaria e transformada em redirecionamento para `/proposals`.
- [x] Criacao de rascunho movida para dialog `Nova Proposta` dentro de `/proposals`.
- [x] Editor de cliente ajustado para card de selecionado, dialog de busca e botao `Novo Lead`.
- [x] Editor de produtos ajustado: busca no catalogo, clique adiciona produto, `Criar Produto Novo`, remover sempre visivel e vermelho.
- [x] Campo `Tags` removido da UI do editor, preservando dados legados no payload.
- [x] PDF/print ajustado para Montserrat, A4, impressao somente da `.print-area` e remocao de escala no print.
- [x] Documentacao atualizada em `docs/paginas-por-perfil.md`.
- [x] `npm run typecheck` executado com sucesso.
- [x] Build API executado com sucesso: `pnpm --filter @workspace/api-server run build`.
- [x] Build frontend executado com sucesso usando envs exigidos pelo Vite: `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`.
- [x] Docker revalidado em 2026-07-10 com `docker compose up -d --build`.
- [x] Containers recriados: `sistema-propostas-api` e `sistema-propostas-frontend`.
- [x] Postgres validado como `healthy`.
- [x] Healthcheck validado: `curl http://localhost:21709/api/healthz` retornou `{"status":"ok"}`.
- [x] Codigo servido pelo container validado: `curl http://localhost:21709/src/pages/proposals/index.tsx` contem `program-board` e a nova tela por programas.
- [x] Endpoint novo validado autenticado: `GET /api/proposals/program-board` retornou programas e propostas.
- [ ] Rotas principais ainda precisam de QA visual/manual no navegador: `/proposals`, `/proposals/:id/edit` e impressao via botao `PDF`.

Observacao de validacao:

- `npm run build` completo do monorepo falhou antes dos builds por pacote porque `artifacts/mockup-sandbox` exige `PORT` no `vite.config`. Esse pacote nao faz parte do escopo funcional do Sistema de Propostas nesta task. A API e o frontend alterados foram buildados separadamente com sucesso.
- O motivo de o navegador ainda mostrar a versao antiga era operacional: o compose copia o codigo para a imagem no build e nao monta volume local. Foi necessario recriar a imagem para o container servir a implementacao do plan-004.
