# Plano 003 - Produtos com Duracao, Horario e Sazonalidade na Proposta

## Metadados

- Projeto: Sistema de Propostas
- Data: 2026-07-09
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces
- Agente principal recomendado: Software Architect
- Agentes de apoio: Product Manager, Database Engineer, Backend API Engineer, Frontend Engineer, UX/UI Designer, QA Engineer e Technical Writer
- Status: Implementado em 2026-07-09

## Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-software-architect.md`
- `.agents/agent-product-manager.md`
- `.agents/agent-database-engineer.md`
- `.agents/agent-backend-api-engineer.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `.agents/agent-qa-engineer.md`
- `docs/06-banco-de-dados.md`
- `docs/MUDANCAS.MD`
- `plans/plan-002-redesign-proposta-clientes-leads-cor-emissora.md`
- `lib/db/prisma/schema.prisma`
- `artifacts/proposta/src/pages/admin/product-templates.tsx`
- `artifacts/api-server/src/routes/product-templates.ts`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`
- Referencia visual externa: `/Users/joaomvalente/Downloads/Frame 3.svg`

## Escolha do Agente

O melhor agente principal para esta tarefa e o **Software Architect**, porque a mudanca toca o modelo de dados, contratos de API, formulario ADMIN de Produtos, editor de Propostas, calculo de investimento sugerido e preview/PDF da proposta.

Agentes de apoio:

- **Product Manager**: consolidar regra de produto, limites do escopo e criterios de aceite.
- **Database Engineer**: evoluir Prisma schema sem quebrar dados existentes.
- **Backend API Engineer**: ajustar rotas, validacoes Zod e normalizacao dos novos campos.
- **Frontend Engineer**: alterar formularios, seletores e editor da proposta.
- **UX/UI Designer**: manter consistencia com o redesign do `plan-002` e com o SVG do designer.
- **QA Engineer**: validar regressao ADMIN/COMERCIAL, catalogo, proposta e preview.
- **Technical Writer**: atualizar documentacao funcional apos implementacao.

## Objetivo

Reestruturar o cadastro de Produtos para refletir o novo fluxo:

1. Produto de catalogo deixa de ter quantidade no cadastro ADMIN.
2. Produto de catalogo passa a ter duracao/tempo de reproducao.
3. Produto de catalogo passa a ter apenas um valor sugerido.
4. Produto de catalogo passa a ser vinculado diretamente a um Programa no lugar do campo visivel "Nome interno".
5. Na proposta, cada item selecionado passa a permitir horario e sazonalidade.
6. Preview/PDF mostra horario, sazonalidade e duracao somente quando houver dados preenchidos.

## Escopo

### Dentro do Escopo

- Alterar formulario ADMIN de Produtos.
- Adicionar suporte a duracoes de produto.
- Permitir criacao de duracao pelo ADMIN durante o fluxo de produto.
- Remover "Quantidade" do cadastro de Produto.
- Remover "Valor sugerido maximo" do formulario de Produto.
- Renomear "Titulo da proposta" para "Nome do Produto".
- Substituir "Nome interno" por select de Programa.
- Manter Produto vinculado a Programa via `ProductTemplate.programId`.
- Adicionar campos de horario e sazonalidade no item da Proposta.
- Ajustar API para aceitar/retornar novos campos.
- Ajustar preview da proposta sem quebrar o layout do `plan-002`.
- Ajustar calculo de sugestao de investimento para usar um unico valor sugerido.
- Atualizar seed com duracoes basicas.
- Atualizar documentacao funcional apos a implementacao.

### Fora do Escopo

- Redesenhar novamente a proposta alem dos campos desta tarefa.
- Remover fisicamente campos legados do banco se isso criar risco de migracao desnecessario.
- Renomear entidade `ProductTemplate` no codigo ou banco.
- Alterar permissao ADMIN/COMERCIAL fora das regras ja existentes.
- Criar um modulo completo de gestao de duracoes separado do cadastro de Produtos.
- Alterar a regra visual de Clientes/Leads do `plan-002`.
- Remover quantidade dos itens da proposta, salvo se houver nova decisao de produto. A quantidade continua sendo informacao operacional do plano de acoes da proposta.

## Estado Atual Identificado

### Banco

O modelo `ProductTemplate` hoje possui:

- `programId`
- `programRef`
- `name`
- `qty`
- `title`
- `suggestedValueMin`
- `suggestedValueMax`
- `tags`
- `color`

O modelo `ProposalProduct` hoje possui:

- `productTemplateId`
- `qty`
- `title`
- `description`
- `detail`
- `program`
- `tags`
- `color`

O banco ainda nao possui:

- Tabela ou enum de duracao de produto.
- Campo de duracao no produto de catalogo.
- Campo de duracao congelado no item da proposta.
- Campo de horario no item da proposta.
- Campo de sazonalidade no item da proposta.

### Frontend

A tela ADMIN de Produtos ainda exibe:

- `Nome interno`
- `Quantidade`
- `Titulo na proposta`
- `Valor sugerido minimo`
- `Valor sugerido maximo`
- `Programa`

O editor de Proposta ainda:

- Copia `qty`, `title`, `suggestedValueMin` e `suggestedValueMax` do produto selecionado.
- Calcula sugestao de investimento usando media entre minimo e maximo.
- Nao tem campo de horario por item.
- Nao tem campo de sazonalidade por item.
- Nao tem campo de duracao por item.

O preview da proposta ainda:

- Exibe quantidade e titulo do produto.
- Exibe tag de programa quando existe.
- Nao exibe horario, sazonalidade ou duracao.

## Decisoes de Produto e Arquitetura

### 1. Duracao sera um cadastro reutilizavel simples

Criar uma tabela de duracoes para evitar texto solto repetido em cada produto.

Motivo:

- O ADMIN precisa criar duracoes no fluxo de Produto.
- Duracoes como `15s`, `30s`, `60s`, `120s` tendem a ser reutilizadas.
- Um select com opcao de adicionar nova duracao e mais consistente que input livre em todos os produtos.

Modelo recomendado:

```prisma
model ProductDuration {
  id        String   @id @default(cuid())
  label     String   @unique
  seconds   Int?
  active    Boolean  @default(true)
  order     Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  productTemplates ProductTemplate[]

  @@map("product_durations")
}
```

Observacao:

- `label` e o texto mostrado na UI: `15s`, `30s`, `120s`, `4s`.
- `seconds` e opcional para manter flexibilidade caso a equipe use labels como `Ao vivo` no futuro.
- `order` permite ordenar os presets.

### 2. Produto de catalogo referencia duracao, proposta congela o texto

Adicionar em `ProductTemplate`:

```prisma
durationId String?          @map("duration_id")
duration   ProductDuration? @relation(fields: [durationId], references: [id], onDelete: SetNull)
```

Adicionar em `ProposalProduct`:

```prisma
durationLabel String? @map("duration_label")
```

Motivo:

- O catalogo guarda a duracao atual do produto.
- A proposta deve preservar o texto impresso no momento da criacao/edicao.
- Se um ADMIN renomear uma duracao depois, propostas antigas nao devem mudar silenciosamente.

### 3. Quantidade sai do cadastro de Produto, mas permanece na Proposta

Remover `Quantidade` da UI ADMIN de Produto.

Nao remover `ProductTemplate.qty` fisicamente nesta entrega.

Motivo:

- O pedido se refere ao cadastro de Produto.
- A proposta ainda usa quantidade para "Quantidade de insercoes" no preview atual.
- Remover a coluna agora aumentaria risco de quebrar seed, templates antigos e copias de produto.
- O backend deve parar de depender de `qty` em novos produtos e usar default interno `01` quando for necessario copiar para uma proposta.

### 4. Valor sugerido passa a ser unico

Na UI:

- Remover campo `Valor sugerido maximo`.
- Renomear `Valor sugerido minimo` para `Valor sugerido`.
- Manter mascara em R$.

No banco:

- Manter `suggestedValueMin` como campo usado.
- Manter `suggestedValueMax` por compatibilidade historica, mas nao exibir nem preencher em novos fluxos.

Na proposta:

- Calculo de sugestao de investimento deve usar `suggestedValueMin` como valor unitario.
- Se houver produto legado sem `suggestedValueMin` e com `suggestedValueMax`, usar `suggestedValueMax` como fallback para nao zerar dados antigos.

### 5. "Nome interno" deixa de ser campo do usuario

Na UI:

- Remover campo visivel `Nome interno`.
- Colocar select de `Programa` no lugar dele.
- Tornar Programa obrigatorio para novo Produto.

No backend:

- Manter `ProductTemplate.name` como campo tecnico interno.
- Gerar `name` automaticamente quando nao vier do frontend.
- Sugestao de composicao: slug de `programa + nome do produto + duracao`.
- Garantir unicidade respeitando a constraint existente por `stationId + name`.

Motivo:

- Evita migracao grande.
- Preserva compatibilidade com filtros e dados existentes.
- Atende ao fluxo desejado: usuario escolhe Programa, nao digita nome interno.

### 6. "Titulo da proposta" vira "Nome do Produto"

Na UI:

- Trocar label `Titulo da proposta` por `Nome do Produto`.
- O campo continua gravando em `ProductTemplate.title`.

Motivo:

- Evita renomear coluna e quebrar integracoes.
- Alinha a terminologia para ADMIN.

### 7. Horario e sazonalidade pertencem ao item da Proposta

Nao adicionar horario nem sazonalidade em `ProductTemplate`.

Adicionar em `ProposalProduct`:

```prisma
airTime     String?                    @map("air_time")
seasonality ProposalProductSeasonality?
```

Adicionar enum:

```prisma
enum ProposalProductSeasonality {
  MONTHLY
  SEMIANNUAL
  ANNUAL

  @@map("proposal_product_seasonality")
}
```

Labels na UI:

- `MONTHLY` -> `Mensal`
- `SEMIANNUAL` -> `Semestral`
- `ANNUAL` -> `Anual`

Motivo:

- Horario depende da negociacao daquela proposta, nao do produto de catalogo.
- Sazonalidade pode variar por cliente/proposta.
- Quando vazio, nao aparece no preview.

## Impacto por Camada

### Banco / Prisma

Arquivos:

- `lib/db/prisma/schema.prisma`
- `scripts/src/seed.ts`

Tarefas:

1. Criar enum `ProposalProductSeasonality`.
2. Criar model `ProductDuration`.
3. Adicionar `durationId` e relacao em `ProductTemplate`.
4. Adicionar `durationLabel`, `airTime` e `seasonality` em `ProposalProduct`.
5. Avaliar se `ProposalTemplateProduct` ainda precisa receber `durationLabel`, `airTime` e `seasonality`.
   - Como templates de proposta foram removidos do fluxo principal, recomendacao: nao mexer agora, salvo se o codigo ainda copiar de `ProposalTemplateProduct` para `ProposalProduct`.
6. Atualizar seed com duracoes padrao:
   - `4s`
   - `15s`
   - `30s`
   - `60s`
   - `120s`
7. Se possivel, atribuir duracao a produtos existentes por heuristica simples:
   - titulo contem `30` -> `30s`
   - titulo contem `60` -> `60s`
   - titulo contem `120` -> `120s`
   - caso contrario, manter vazio.
8. Rodar `pnpm db:generate`.
9. Rodar `pnpm db:push`.
10. Rodar `pnpm seed`.

### Backend / API

Arquivos provaveis:

- `artifacts/api-server/src/routes/product-templates.ts`
- `artifacts/api-server/src/routes/proposals.ts`
- `artifacts/api-server/src/routes/index.ts`
- Novo arquivo: `artifacts/api-server/src/routes/product-durations.ts`
- Arquivos gerados/contratos, caso o projeto exija regeneracao do client.

Tarefas:

1. Criar rota `GET /api/product-durations`.
   - Retorna duracoes ativas ordenadas por `order`, `seconds`, `label`.
2. Criar rota `POST /api/product-durations`.
   - ADMIN only.
   - Recebe `label` e `seconds` opcional.
   - Normaliza label (`15s`, `30s`) sem duplicar.
3. Registrar a rota no index de rotas da API.
4. Atualizar schema Zod de `product-templates`.
   - Aceitar `programId` obrigatorio para novos produtos.
   - Aceitar `durationId` opcional.
   - Aceitar `suggestedValueMin` opcional.
   - Continuar aceitando `suggestedValueMax` apenas por compatibilidade, sem depender dele.
   - Nao exigir `qty`.
   - Nao exigir `name` vindo do frontend.
5. No create/update de Produto:
   - Gerar `name` automaticamente quando nao informado.
   - Setar `qty` como default interno `01` se a coluna continuar obrigatoria.
   - Persistir `durationId`.
   - Gravar `suggestedValueMax` como `null` quando o novo formulario nao enviar esse campo.
6. No list/detail de Produtos:
   - Incluir `duration`.
   - Retornar `durationLabel` derivado para facilitar UI.
   - Manter `programRef`/programa.
7. Atualizar rotas de Propostas para aceitar nos produtos:
   - `durationLabel`
   - `airTime`
   - `seasonality`
8. Ao adicionar produto do catalogo numa proposta pelo frontend, o backend deve aceitar o snapshot resultante.
9. Validar `seasonality` contra enum.
10. Garantir que campos vazios sejam salvos como `null`, nao string vazia, quando fizer sentido.

### Frontend ADMIN - Produtos

Arquivo principal:

- `artifacts/proposta/src/pages/admin/product-templates.tsx`

Arquivos relacionados:

- `artifacts/proposta/src/pages/admin/proposal-categories.tsx`, se existir criacao/edicao de produtos dentro da tela de Programas.

Tarefas:

1. Remover campo `Nome interno` da UI.
2. Mover o select de `Programa` para o lugar do antigo `Nome interno`.
3. Tornar `Programa` obrigatorio para criacao de Produto.
4. Trocar label `Titulo da proposta` para `Nome do Produto`.
5. Remover campo `Quantidade` do formulario.
6. Remover campo `Valor sugerido maximo`.
7. Trocar label `Valor sugerido minimo` para `Valor sugerido`.
8. Adicionar campo `Duracao`.
   - Select com duracoes existentes.
   - Placeholder: `Selecione a duracao`.
   - Opcoes iniciais via API: `4s`, `15s`, `30s`, `60s`, `120s`.
9. Adicionar acao no proprio campo de duracao:
   - Botao ou item `+ Nova duracao`.
   - Abre dialog shadcn.
   - Campos: `Label` e `Segundos` opcional.
   - Ao salvar, cria via API e seleciona automaticamente a nova duracao.
10. Ajustar payload enviado ao backend:
   - Enviar `programId`.
   - Enviar `title`.
   - Enviar `durationId`.
   - Enviar `suggestedValueMin`.
   - Nao enviar `qty`.
   - Nao enviar `suggestedValueMax`.
   - Nao enviar `name`, salvo se houver compatibilidade temporaria necessaria.
11. Ajustar listagem/cards de produto:
   - Mostrar `Nome do Produto`.
   - Mostrar Programa.
   - Mostrar Duracao quando houver.
   - Mostrar `Valor sugerido`.
   - Remover exibicao de faixa `min a max`.
   - Remover badge de quantidade do produto.

### Frontend Proposta - Editor

Arquivo principal:

- `artifacts/proposta/src/pages/proposals/edit.tsx`

Tambem verificar:

- `artifacts/proposta/src/pages/proposals/new.tsx`

Tarefas:

1. Ao carregar produtos do catalogo, consumir `duration`/`durationLabel`.
2. Ao adicionar produto do catalogo ao plano de acoes:
   - Copiar `title`.
   - Copiar `program`.
   - Copiar `durationLabel`.
   - Copiar `suggestedValueMin`.
   - Nao copiar `suggestedValueMax` como base nova.
   - Inicializar `airTime` como vazio.
   - Inicializar `seasonality` como vazio/null.
   - Manter `qty` default `01`, pois quantidade ainda pertence ao item da proposta.
3. No card de cada produto dentro da proposta, adicionar:
   - Campo `Horario`.
   - Placeholder: `Ex: 13H AS 15H`.
   - Select `Sazonalidade`.
   - Opcoes: `Nao informar`, `Mensal`, `Semestral`, `Anual`.
   - Exibir `Duracao` como campo informativo ou editavel simples.
4. Se a duracao precisar ser editavel na proposta:
   - Permitir editar `durationLabel` no item, sem alterar o Produto de catalogo.
   - Preferencia inicial: manter como informativo para reduzir risco, a menos que o usuario peça edicao por proposta.
5. Atualizar `cleanProposalPayload` para preservar:
   - `durationLabel`
   - `airTime`
   - `seasonality`
6. Ajustar calculo de sugestao de investimento:
   - Usar `suggestedValueMin` como valor unitario.
   - Multiplicar por quantidade do item da proposta.
   - Se `suggestedValueMin` estiver vazio e houver `suggestedValueMax` legado, usar max como fallback.
   - Se ambos vazios, item nao entra no calculo.
7. Manter comportamento manual do campo de investimento:
   - Sugestao nao sobrescreve valor final automaticamente.
   - Botao `Usar valor sugerido` continua opcional.

### Frontend Proposta - Preview/PDF

Arquivo:

- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`

Tarefas:

1. Preservar layout do `plan-002` e referencia visual do `Frame 3.svg`.
2. Nos cards do Plano de Acoes, incluir informacoes opcionais:
   - Duracao, se `durationLabel` existir.
   - Horario, se `airTime` existir.
   - Sazonalidade, se `seasonality` existir.
3. Omitir completamente os campos vazios.
4. Manter tag de Programa opcional.
5. Garantir que textos nao estourem o card.
6. Manter cor lateral dos cards padronizada pela cor da Empresa selecionada, conforme decisao do `plan-002`.
7. Evitar alterar as demais secoes da proposta.

Sugestao visual nos cards:

```text
NOME DO PRODUTO
Descricao do produto

[PROGRAMA]   Duracao: 30s
Horario: 13H AS 15H
Sazonalidade: Mensal
```

Se horario e sazonalidade estiverem vazios:

```text
NOME DO PRODUTO
Descricao do produto

[PROGRAMA]   Duracao: 30s
```

## Plano de Implementacao Passo a Passo

### Fase 1 - Preparacao

1. Confirmar branch/status do git.
2. Revisar arquivos afetados com `rg` e `sed`.
3. Conferir se `plan-002` ja esta aplicado no preview e editor.
4. Abrir o SVG `/Users/joaomvalente/Downloads/Frame 3.svg` apenas como referencia visual para encaixe dos novos textos.

### Fase 2 - Banco

1. Alterar `schema.prisma`.
2. Adicionar `ProductDuration`.
3. Adicionar `ProposalProductSeasonality`.
4. Adicionar `ProductTemplate.durationId`.
5. Adicionar `ProposalProduct.durationLabel`.
6. Adicionar `ProposalProduct.airTime`.
7. Adicionar `ProposalProduct.seasonality`.
8. Rodar `pnpm db:generate`.
9. Rodar `pnpm db:push`.
10. Atualizar seed.
11. Rodar `pnpm seed`.

### Fase 3 - API

1. Criar rota `product-durations`.
2. Registrar rota no servidor.
3. Atualizar `product-templates` para novo contrato.
4. Implementar geracao automatica de `ProductTemplate.name`.
5. Incluir duracao na listagem de Produtos.
6. Atualizar `proposals` para aceitar campos novos em produtos.
7. Garantir que serializacao retorne campos novos no detalhe da proposta.

### Fase 4 - Frontend ADMIN Produtos

1. Atualizar schema Zod do formulario.
2. Remover campos antigos da UI.
3. Reposicionar select de Programa.
4. Adicionar select de Duracao.
5. Adicionar dialog de nova Duracao.
6. Atualizar payload de create/update.
7. Atualizar cards/listagem.
8. Testar criar, editar, inativar/excluir produto.

### Fase 5 - Frontend Editor de Proposta

1. Atualizar tipos locais dos produtos.
2. Atualizar funcao de adicionar produto do catalogo.
3. Adicionar campos de horario e sazonalidade no card do produto.
4. Atualizar limpeza/persistencia do payload.
5. Atualizar sugestao de investimento.
6. Testar salvar e reabrir proposta.

### Fase 6 - Preview/PDF

1. Adicionar renderizacao opcional de duracao.
2. Adicionar renderizacao opcional de horario.
3. Adicionar renderizacao opcional de sazonalidade.
4. Validar responsividade do card dentro da folha.
5. Garantir que campos vazios nao deixam espacos estranhos.

### Fase 7 - Documentacao

1. Atualizar `docs/paginas-por-perfil.md`.
2. Atualizar `docs/06-banco-de-dados.md` com novos modelos/campos.
3. Atualizar `docs/08-regras-de-negocio.md` se houver regra especifica de Produto/Proposta.
4. Atualizar `docs/MUDANCAS.MD` marcando esta tarefa como planejada/implementada.
5. Se necessario, atualizar `docs/rodar-local.md` apenas se houver novo comando.

### Fase 8 - Validacao Final

1. Rodar `pnpm run typecheck`.
2. Rodar `pnpm run build`.
3. Subir com Docker/compose se a alteracao de banco exigir validacao integrada.
4. Testar manualmente como ADMIN.
5. Testar manualmente como COMERCIAL.

## Checklist de QA

### ADMIN - Produtos

- [ ] Campo `Nome interno` nao aparece.
- [ ] Campo `Programa` aparece no lugar do antigo `Nome interno`.
- [ ] Campo `Programa` e obrigatorio para criar Produto.
- [ ] Campo `Quantidade` nao aparece no cadastro de Produto.
- [ ] Campo `Valor sugerido maximo` nao aparece.
- [ ] Campo `Valor sugerido` aceita mascara em R$.
- [ ] Campo `Nome do Produto` aparece no lugar de `Titulo da proposta`.
- [ ] Campo `Duracao` lista duracoes existentes.
- [ ] ADMIN consegue criar nova duracao pelo formulario de Produto.
- [ ] Nova duracao criada fica selecionada automaticamente.
- [ ] Produto criado aparece na lista com Programa, Duracao e Valor sugerido.
- [ ] Produto editado preserva Programa, Duracao e Valor sugerido.

### COMERCIAL/ADMIN - Proposta

- [ ] Produto do catalogo aparece no seletor da proposta.
- [ ] Ao adicionar produto, nome, programa, duracao e valor sugerido entram corretamente.
- [ ] Campo `Horario` aparece no item da proposta.
- [ ] Campo `Horario` aceita texto como `13H AS 15H`.
- [ ] Campo `Sazonalidade` permite vazio, Mensal, Semestral e Anual.
- [ ] Se sazonalidade ficar vazia, nao aparece no preview.
- [ ] Se horario ficar vazio, nao aparece no preview.
- [ ] Se duracao existir, aparece no preview.
- [ ] Ao salvar e reabrir a proposta, horario e sazonalidade permanecem.
- [ ] Sugestao de investimento usa o valor sugerido unico.
- [ ] O investimento final continua editavel manualmente.

### Regressao

- [ ] Produtos antigos continuam carregando.
- [ ] Propostas antigas continuam abrindo.
- [ ] Itens antigos sem duracao/horario/sazonalidade nao quebram o preview.
- [ ] Tela de Programas continua exibindo produtos vinculados.
- [ ] Preview do `plan-002` nao perde hero, apresentacao, plano de acoes, investimento e rodape.
- [ ] Dialogs e alertas seguem o padrao shadcn/ui ja definido.
- [ ] Permissoes ADMIN/COMERCIAL continuam intactas.

## Criterios de Aceite

1. ADMIN consegue criar Produto selecionando Programa, Nome do Produto, Duracao e Valor sugerido.
2. ADMIN nao ve mais `Nome interno`, `Quantidade` nem `Valor sugerido maximo` no formulario de Produto.
3. ADMIN consegue criar uma nova Duracao durante o cadastro de Produto.
4. COMERCIAL consegue adicionar Produto a uma Proposta e informar Horario e Sazonalidade no item.
5. Horario e Sazonalidade aparecem no preview somente quando preenchidos.
6. Duracao aparece no preview quando o produto tiver duracao.
7. Sugestao de investimento usa somente o valor sugerido unico do produto.
8. Propostas antigas continuam abrindo sem erro.
9. Build/typecheck passam.
10. Documentacao afetada e atualizada.

## Riscos e Cuidados

- **Risco de quebrar propostas antigas:** mitigar mantendo campos legados como opcionais e tratando `null`.
- **Risco de duplicar duracoes:** normalizar label no backend antes de criar.
- **Risco de conflito com `ProductTemplate.name`:** gerar nome tecnico unico no backend.
- **Risco de preview poluido:** renderizar horario/sazonalidade apenas quando preenchidos.
- **Risco de migracao agressiva:** nao remover colunas legadas nesta entrega.
- **Risco de inconsistência de valor sugerido:** atualizar calculo para valor unico e manter fallback para legado.

## Arquivos Provavelmente Afetados

- `lib/db/prisma/schema.prisma`
- `scripts/src/seed.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/src/routes/product-durations.ts`
- `artifacts/api-server/src/routes/product-templates.ts`
- `artifacts/api-server/src/routes/proposals.ts`
- `artifacts/proposta/src/pages/admin/product-templates.tsx`
- `artifacts/proposta/src/pages/admin/proposal-categories.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/pages/proposals/new.tsx`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`
- `docs/paginas-por-perfil.md`
- `docs/06-banco-de-dados.md`
- `docs/08-regras-de-negocio.md`
- `docs/MUDANCAS.MD`

## Ordem Recomendada de Commits

1. `db: add product durations and proposal product metadata`
2. `api: support product duration and proposal item schedule`
3. `frontend: update admin product form`
4. `frontend: add proposal item schedule and seasonality`
5. `preview: render duration schedule and seasonality`
6. `docs: document product and proposal flow changes`

## Observacoes Finais

- A referencia visual `Frame 3.svg` deve orientar apenas o encaixe visual dos novos metadados no card de produto. A estrutura do preview ja redesenhada no `plan-002` deve ser preservada.
- A remocao de campos nesta tarefa e principalmente remocao de UI/fluxo. Remocao fisica de colunas antigas deve ser feita em plano separado depois de confirmar que nao ha dados historicos dependentes.
- A regra "Horario fica na Proposta, nao no Produto" deve ser preservada no schema e na UI para evitar que um horario fixo contamine todos os clientes.

## Checklist Final da Implementacao

### Banco e Seed

- [x] Criado enum `ProposalProductSeasonality`.
- [x] Criado model `ProductDuration`.
- [x] Adicionado `ProductTemplate.durationId`.
- [x] Adicionados `ProposalProduct.durationLabel`, `ProposalProduct.airTime` e `ProposalProduct.seasonality`.
- [x] Mantidos campos legados `ProductTemplate.qty`, `ProductTemplate.name` e `ProductTemplate.suggestedValueMax` para compatibilidade historica.
- [x] Seed atualizado com duracoes `4s`, `10s`, `15s`, `30s`, `60s` e `120s`.
- [x] Seed atualizado para produtos de exemplo usarem valor sugerido unico e duracao quando aplicavel.

### API

- [x] Criada rota `GET /api/product-durations`.
- [x] Criada rota `POST /api/product-durations` para ADMIN.
- [x] Registrada rota `/api/product-durations` no router principal.
- [x] `GET /api/product-templates` retorna `durationId`, `duration` e `durationLabel`.
- [x] `POST/PATCH /api/product-templates` aceita `durationId`.
- [x] `ProductTemplate.name` passa a ser gerado pela API quando nao vem no payload.
- [x] `POST/PATCH /api/proposals` aceita `durationLabel`, `airTime` e `seasonality` em produtos da proposta.
- [x] `GET /api/proposals/:id` retorna os novos campos do item de proposta.
- [x] Tela de Programas recebe produtos vinculados com `durationLabel`.

### Frontend ADMIN

- [x] Tela `/admin/product-templates` removeu campo `Nome interno`.
- [x] Tela `/admin/product-templates` removeu campo `Quantidade`.
- [x] Tela `/admin/product-templates` removeu campo `Valor sugerido maximo`.
- [x] Campo `Programa` virou campo principal e obrigatorio na criacao de produto.
- [x] Campo `Titulo na proposta` foi renomeado para `Nome do Produto`.
- [x] Campo `Valor sugerido minimo` foi renomeado para `Valor sugerido`.
- [x] Campo `Duracao` foi adicionado no formulario de produto.
- [x] ADMIN consegue criar nova duracao pelo proprio formulario de produto.
- [x] Cards/listagem de produto mostram programa, duracao e valor sugerido unico.
- [x] Criacao inline de produto na tela de Programas foi ajustada para o mesmo formato simplificado.

### Frontend Proposta

- [x] Editor da proposta copia `durationLabel` ao inserir produto do catalogo.
- [x] Editor da proposta adiciona campo `Horario` no item do plano de acoes.
- [x] Editor da proposta adiciona campo `Sazonalidade` com opcoes `Mensal`, `Semestral` e `Anual`.
- [x] Campo `Horario` fica no item da proposta, nao no cadastro de Produto.
- [x] `cleanProposalPayload` preserva `durationLabel`, `airTime` e `seasonality`.
- [x] Sugestao de investimento usa valor sugerido unico multiplicado pela quantidade.
- [x] Sugestao mantem fallback para valor maximo antigo em dados legados.
- [x] Preview/PDF mostra duracao quando preenchida.
- [x] Preview/PDF mostra horario quando preenchido.
- [x] Preview/PDF mostra sazonalidade quando preenchida.
- [x] Preview/PDF omite horario e sazonalidade quando vazios.

### Documentacao

- [x] `docs/06-banco-de-dados.md` atualizado com `ProductDuration` e `ProposalProductSeasonality`.
- [x] `docs/08-regras-de-negocio.md` atualizado com regras de Produto, Proposta e sugestao de investimento.
- [x] `docs/paginas-por-perfil.md` atualizado com funcionamento atual das telas.
- [x] `docs/MUDANCAS.MD` atualizado com bloco `Implementado - Produtos com Duracao, Horario e Sazonalidade`.
- [x] Este plano foi marcado como `Implementado em 2026-07-09`.

### Validacao Executada

- [x] `pnpm db:generate` executado com sucesso.
- [x] `pnpm run typecheck` executado com sucesso.
- [x] Build da API executado com sucesso.
- [x] Build do frontend executado com sucesso usando `PORT=21709 BASE_PATH=/`.
- [x] `docker compose build --no-cache` executado para corrigir imagem com dependencias corrompidas.
- [x] `docker compose up -d` subiu Postgres, API e frontend.
- [x] API validada em `http://127.0.0.1:8081/api/healthz` com retorno `200`.
- [x] Frontend validado em `http://localhost:21709` com retorno `200`.
- [x] Login ADMIN validado com `admin@radio88fm.com.br / Admin@123`.
- [x] Rota `/api/product-durations` validada com retorno `200` e presets de duracao.
- [x] Rota `/api/product-templates?active=true` validada retornando `durationLabel` nos produtos aplicaveis.

### Observacoes Pos-Implementacao

- O `db:push` local sem Docker falhou inicialmente por ausencia de `DATABASE_URL`; com `DATABASE_URL` local retornou erro generico do schema engine, comportamento ja observado no `plan-002`.
- A validacao integrada foi feita pelo fluxo operacional do projeto via Docker Compose, onde `DATABASE_URL` interna esta configurada e a API executa `generate`, `db push` e `seed` no boot.
- A primeira imagem Docker estava com dependencias corrompidas em `node_modules`; a imagem foi reconstruida com `docker compose build --no-cache`.
- Os servicos ficaram ativos ao final da validacao:
  - Frontend: `http://localhost:21709`
  - API: `http://localhost:8081`
  - Postgres: `localhost:5433`
