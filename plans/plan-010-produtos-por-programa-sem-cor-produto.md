# Plano 010 - Produtos por Programa sem Cor do Produto

Status: Planejado.

Projeto: Sistema de Propostas.

Data: 2026-07-10.

Tipo: WEB + API pontual, sem mudanca prevista de schema.

Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Tailwind CSS, shadcn/ui.

## Agentes Definidos

Agente principal:

- Frontend Engineer: ajustar a tela `artifacts/proposta/src/pages/admin/product-templates.tsx`, criando a mesma logica visual de programas na esquerda e produtos do programa selecionado na direita.

Agentes de apoio:

- UX/UI Designer: garantir que a nova tela fique operacional, legivel e consistente com `/proposals`.
- Backend API Engineer: ajustar payload de `GET /api/product-templates` somente se for necessario expor `primaryColor` da empresa para pintar os cards pela cor da emissora.
- QA Engineer: validar filtros atuais, CRUD de produto, criacao de duracao e exclusao.
- Technical Writer: atualizar `docs/paginas-por-perfil.md`, `docs/MUDANCAS.MD` e este plano ao final.

Referencias usadas:

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `.agents/agent-backend-api-engineer.md`
- `.agents/agent-technical-writer.md`
- `artifacts/proposta/src/pages/admin/product-templates.tsx`
- `artifacts/api-server/src/routes/product-templates.ts`
- `plans/plan-009-propostas-programas-lista-vinculada.md`
- `docs/paginas-por-perfil.md`

## 1. Contexto

A tela de `Produtos` atualmente lista os produtos em cards soltos, usando filtros no topo:

- busca por nome/titulo/descricao;
- programa;
- ativo/inativo/todos;
- valor minimo;
- valor maximo;
- ordenacao.

Depois do ajuste da tela `/proposals`, o padrao desejado passa a ser:

- programas no lado esquerdo;
- ao clicar em um programa, listar todos os produtos daquele programa no painel direito;
- manter os filtros atuais;
- remover da modal de criacao/edicao o campo `Cor do destaque`, porque a cor do produto ficou obsoleta e o destaque visual deve seguir a cor da empresa/emissora.

## 2. Diagnostico Tecnico Atual

Arquivo principal:

```text
artifacts/proposta/src/pages/admin/product-templates.tsx
```

Endpoint usado pela tela:

```text
GET /api/product-templates
```

O endpoint ja aceita filtros:

- `programId`
- `search`
- `active`
- `sort`
- `minValue`
- `maxValue`

A tela ja carrega programas com:

```ts
useListProposalCategories()
```

O formulario atual ainda possui:

```ts
color: z.enum(['BLUE', 'YELLOW', 'RED', 'GREEN', 'DARK'])
```

E renderiza um campo:

```tsx
<FormLabel>Cor do destaque</FormLabel>
```

Os cards atuais usam:

```tsx
colorMap[product.color]
```

Isso deve sair da UI porque a cor do produto nao deve mais ser uma decisao cadastrada no produto.

## 3. Decisoes de Produto

### 3.1 O que fica

- Rota de Produtos: `/admin/product-templates`.
- Botao `Novo Produto`.
- Filtros atuais:
  - busca;
  - programa;
  - status ativo/inativo/todos;
  - valor minimo;
  - valor maximo;
  - ordenacao.
- CRUD de produto.
- Dialog de criacao/edicao.
- Criacao inline de duracao.
- Exclusao com `ConfirmActionDialog`.

### 3.2 O que muda

- A listagem passa a ter duas colunas principais:
  - esquerda: lista de programas;
  - direita: produtos do programa selecionado.
- O clique em programa seleciona o programa e atualiza o painel de produtos.
- O filtro `Programa` do topo continua existindo e deve sincronizar com a selecao lateral.
- O painel direito deve mostrar somente produtos vinculados ao programa selecionado, respeitando os demais filtros.
- A modal de produto deixa de exibir `Cor do destaque`.
- O payload enviado pela UI nao deve depender mais de `color`.

### 3.3 O que nao muda

- Nao remover `ProductTemplate.color` do schema neste plano.
- Nao criar migration para remover enum/campo de cor.
- Nao alterar comportamento de produtos ja existentes que possuem `color` legado.
- Nao alterar regras de permissao: somente ADMIN acessa administracao de produtos.

Motivo: remover campo do banco agora geraria risco e impacto transversal no preview/propostas legadas. A mudanca solicitada e de UI e comportamento atual.

## 4. Layout Alvo

### 4.1 Estrutura geral

```text
┌──────────────────────────────────────────────────────────────┐
│ Busca | Programa | Ativos | Valor min | Valor max | Ordenacao│
└──────────────────────────────────────────────────────────────┘

┌──────────────────────┬───────────────────────────────────────┐
│ Programas            │ Produtos do programa                  │
│                      │ Jornal da Manha                       │
│ [Jornal da Manha]    │ 4 produto(s) encontrado(s)            │
│ [Show da Manha]      │                                       │
│ [Rotativo Comercial] │ [Card produto] [Card produto]         │
│ [Digital 88 FM]      │ [Card produto] [Card produto]         │
└──────────────────────┴───────────────────────────────────────┘
```

### 4.2 Grid recomendado

Usar a mesma estrutura visual do plano 009:

```tsx
<div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
  <div>{/* programas */}</div>
  <Card>{/* produtos do programa selecionado */}</Card>
</div>
```

### 4.3 Lista lateral de programas

Cada item deve mostrar:

- icone/iniciais do programa;
- nome do programa;
- empresa/emissora, se existir;
- quantidade de produtos do programa, quando disponivel;
- descricao curta, se existir;
- estado selecionado.

Comportamento:

- Clicar no programa chama `setSelectedProgramId(program.id)`.
- Tambem deve sincronizar `filters.programId` com o programa selecionado.
- Se o usuario selecionar `Todos os programas` no filtro, a tela deve selecionar automaticamente o primeiro programa retornado ou exibir um estado inicial orientando a escolher um programa.

## 5. Painel Direito - Produtos do Programa

### 5.1 Header do painel

Mostrar:

- label `Produtos do programa`;
- nome do programa selecionado;
- empresa/emissora do programa, se existir;
- quantidade de produtos encontrada apos filtros.

### 5.2 Cards de produto

Cada card deve mostrar, de forma escaneavel:

- nome do produto (`title`);
- status ativo/inativo;
- programa/empresa;
- duracao, se existir;
- valor sugerido, se existir;
- descricao curta;
- acoes:
  - editar;
  - excluir.

Regras visuais:

- Nao usar mais `colorMap[product.color]`.
- O destaque lateral do card deve usar a cor da empresa quando disponivel.
- Se a API ainda nao fornecer `primaryColor`, usar fallback visual neutro/primario do sistema ate o backend ser ajustado.
- O botao de excluir deve continuar com estilo destrutivo vermelho.
- Evitar dropdown se o card tiver espaco suficiente: editar e excluir podem ser botoes de icone no topo direito, seguindo o padrao visual de cadastros ADMIN.

## 6. Filtros

Manter todos os filtros atuais.

### 6.1 Busca

Continua enviando:

```text
search
```

### 6.2 Programa

O filtro `programId` continua existindo, mas passa a funcionar em conjunto com a lista lateral.

Regras:

- Selecionar programa pela lista lateral atualiza `filters.programId`.
- Selecionar programa pelo select atualiza `selectedProgramId`.
- Selecionar `Todos os programas` permite a lista lateral mostrar todos os programas, mas o painel direito deve seguir o programa selecionado.
- Selecionar `Sem programa` deve mostrar um painel especifico `Produtos sem programa`, se essa opcao continuar disponivel.

### 6.3 Status

Continua enviando:

```text
active=true | false | all
```

### 6.4 Valores

Continuam enviando:

```text
minValue
maxValue
```

### 6.5 Ordenacao

Continua enviando:

```text
sort
```

## 7. Modal de Criacao/Edicao

### 7.1 Remover campo obsoleto

Remover da UI:

- campo `Cor do destaque`;
- `colorMap`;
- dependencias visuais baseadas em `product.color`.

### 7.2 Schema do formulario

Alterar schema da tela para remover:

```ts
color: z.enum(['BLUE', 'YELLOW', 'RED', 'GREEN', 'DARK'])
```

### 7.3 Default values

Remover `color` de:

- `defaultValues`;
- `openEdit`;
- `openCreate`.

### 7.4 Payload

Preferencia:

```ts
const data = {
  programId,
  title,
  durationId,
  description,
  detail,
  suggestedValueMin,
  suggestedValueMax: null,
  tags: [],
};
```

Nao enviar `color`.

O backend ja possui:

```ts
color: parsed.data.color ?? "BLUE"
```

Portanto, produtos novos continuam persistindo com default legado sem exigir input do usuario.

## 8. API / Backend

### 8.1 Mudanca obrigatoria

Nenhuma mudanca obrigatoria de backend para remover o campo de cor da modal.

### 8.2 Mudanca recomendada para cor da empresa

Para que os cards de produtos usem a cor da empresa/emissora, ajustar `GET /api/product-templates` para incluir `primaryColor` da empresa do programa.

Hoje o include seleciona:

```ts
station: { select: { id: true, name: true } }
```

Recomendado:

```ts
station: { select: { id: true, name: true, primaryColor: true } }
```

E o `formatTemplate` pode retornar:

```ts
programStationPrimaryColor: t.programRef?.station?.primaryColor ?? null
```

Com isso, o card usa:

```tsx
style={{ borderLeftColor: product.programStationPrimaryColor || 'var(--primary)' }}
```

### 8.3 Schema

Nao alterar Prisma schema neste plano.

Motivo:

- `ProductTemplate.color` pode existir para compatibilidade.
- `ProposalProduct.color` ainda pode existir em propostas antigas.
- A feature atual pede remover o campo da modal, nao remover dado historico.

## 9. Arquivos Afetados

| Arquivo | Acao |
|---|---|
| `artifacts/proposta/src/pages/admin/product-templates.tsx` | Reorganizar tela em programas + produtos, remover campo de cor da modal e cards |
| `artifacts/api-server/src/routes/product-templates.ts` | Opcional/recomendado: retornar `programStationPrimaryColor` |
| `docs/paginas-por-perfil.md` | Atualizar funcionamento da tela Produtos e remover referencia a cor do produto quando aplicavel |
| `docs/MUDANCAS.MD` | Registrar ajuste do plano 010 |
| `plans/plan-010-produtos-por-programa-sem-cor-produto.md` | Atualizar checklist final apos implementacao |

## 10. Plano de Implementacao

### Fase 1 - Preparacao

1. Abrir `artifacts/proposta/src/pages/admin/product-templates.tsx`.
2. Confirmar todos os estados atuais:
   - `filters`;
   - `isOpen`;
   - `editingId`;
   - `deleteTarget`;
   - `durationDialogOpen`.
3. Confirmar que `useListProposalCategories()` retorna programas suficientes para montar a lista lateral.
4. Confirmar que `GET /api/product-templates?programId=...` retorna os produtos corretos.

### Fase 2 - Estado de programa selecionado

1. Criar `selectedProgramId`.
2. Derivar `selectedProgram` a partir de `programs`.
3. Quando `programs` carregar, selecionar o primeiro programa se nao houver selecao.
4. Ao clicar no programa lateral:
   - atualizar `selectedProgramId`;
   - atualizar `filters.programId`.
5. Ao mudar o select de programa:
   - atualizar `filters.programId`;
   - se for um ID de programa, atualizar `selectedProgramId`;
   - se for `all`, manter ou selecionar o primeiro programa visivel;
   - se for `none`, renderizar estado de produtos sem programa.

### Fase 3 - Layout da tela

1. Manter card de filtros no topo.
2. Abaixo dos filtros, criar grid de duas colunas.
3. Coluna esquerda:
   - listar programas;
   - indicar selecionado;
   - exibir contagem de produtos quando houver dado;
   - exibir empresa do programa.
4. Coluna direita:
   - header com programa selecionado e contagem;
   - grid de produtos filtrados;
   - estado vazio quando nao houver produto.

### Fase 4 - Cards de produto

1. Remover uso de `colorMap`.
2. Usar borda lateral em cor da empresa, se disponivel.
3. Mostrar metadados em estrutura clara:
   - status;
   - duracao;
   - valor sugerido;
   - empresa/programa.
4. Manter acoes `Editar` e `Excluir`.
5. Garantir `min-w-0`, `truncate` e `line-clamp` para textos longos.

### Fase 5 - Modal sem cor do produto

1. Remover `color` do schema Zod do formulario.
2. Remover `color` dos default values.
3. Remover `color` de `openEdit`.
4. Remover `color` de `openCreate`.
5. Remover bloco `FormField name="color"`.
6. Ajustar o grid do topo da modal para o campo `Programa` ocupar a largura necessaria.
7. Remover `color` do payload enviado pela UI.
8. Manter campos:
   - Programa;
   - Nome do Produto;
   - Duracao;
   - Valor sugerido;
   - Descricao principal.

### Fase 6 - API para cor da empresa

Executar somente se a UI precisar pintar cards com a cor real da empresa:

1. Ajustar include de `programRef.station` em `product-templates.ts` para trazer `primaryColor`.
2. Retornar `programStationPrimaryColor` no `formatTemplate`.
3. Usar esse campo na UI.
4. Validar que endpoints de create/update continuam retornando o novo campo.

### Fase 7 - Documentacao

1. Atualizar `docs/paginas-por-perfil.md`:
   - Produtos agora seguem navegacao por programas;
   - produtos aparecem no painel direito;
   - a cor do produto nao e mais editada na modal.
2. Atualizar `docs/MUDANCAS.MD`.
3. Atualizar o checklist final deste plano.

### Fase 8 - Validacao

Executar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
```

Se for necessario atualizar ambiente local:

```bash
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Validacao manual:

1. Login ADMIN.
2. Abrir `/admin/product-templates`.
3. Confirmar que a tela mostra programas na esquerda.
4. Clicar em um programa.
5. Confirmar que a direita mostra somente produtos daquele programa.
6. Testar busca por nome/titulo/descricao.
7. Testar filtro `Ativos`.
8. Testar filtro `Inativos`.
9. Testar filtro `Todos`.
10. Testar valor minimo e maximo.
11. Testar ordenacao.
12. Abrir `Novo Produto`.
13. Confirmar que nao existe campo `Cor do destaque`.
14. Criar produto.
15. Editar produto.
16. Excluir produto com confirmacao.
17. Criar duracao pela modal de produto.
18. Validar responsividade em largura menor.

## 11. Criterios de Aceite

- Tela `Produtos` usa estrutura semelhante a `/proposals`: programas na esquerda, conteudo vinculado na direita.
- Clicar em um programa lista somente os produtos desse programa.
- Filtros atuais continuam funcionando.
- Modal de criacao/edicao nao exibe mais `Cor do destaque`.
- Produtos novos podem ser criados sem enviar `color` pela UI.
- Cards nao usam mais `colorMap[product.color]`.
- Se implementado o ajuste de API, cards usam a cor da empresa/emissora como destaque visual.
- CRUD de produto continua funcionando.
- Criacao de duracao continua funcionando.
- `typecheck` e build passam.

## 12. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| A lista lateral de programas nao ter contagem precisa de produtos filtrados | Mostrar contagem geral quando disponivel e deixar a contagem filtrada no painel direito |
| Filtro `programId` e clique lateral ficarem dessincronizados | Centralizar mudanca de programa em helper/handler unico |
| Produtos sem programa ficarem inacessiveis | Manter opcao `Sem programa` no select e estado especifico no painel direito |
| Remover `color` do payload quebrar backend | Backend ja trata `color` como opcional e usa default `BLUE` |
| Cor da empresa nao estar no payload atual | Adicionar `programStationPrimaryColor` no endpoint sem mudar schema |
| Cards ficarem parecidos demais com propostas | Usar conteudo e labels especificos de produto: duracao, valor sugerido, status e descricao |

## 13. Checklist de Implementacao

- [x] Estado `selectedProgramId` criado.
- [x] Lista lateral de programas criada.
- [x] Clique no programa sincroniza painel direito.
- [x] Filtro de programa sincroniza com programa selecionado.
- [x] Painel direito lista produtos do programa selecionado.
- [x] Estados de loading/vazio preservados.
- [x] Cards de produto reorganizados.
- [x] `colorMap` removido da UI.
- [x] Campo `Cor do destaque` removido da modal.
- [x] `color` removido do schema/defaults/payload do formulario.
- [x] API ajustada para `programStationPrimaryColor`.
- [x] `docs/paginas-por-perfil.md` atualizado.
- [x] `docs/MUDANCAS.MD` atualizado.
- [x] `pnpm run typecheck` executado com sucesso.
- [x] Build frontend executado com sucesso.
- [x] Docker/healthcheck executados com sucesso.
- [ ] Validacao manual em `/admin/product-templates` concluida.

## 14. Resultado da Implementacao

Implementado em 2026-07-10.

Arquivos alterados:

- `artifacts/proposta/src/pages/admin/product-templates.tsx`
- `artifacts/api-server/src/routes/product-templates.ts`
- `docs/paginas-por-perfil.md`
- `docs/MUDANCAS.MD`
- `plans/plan-010-produtos-por-programa-sem-cor-produto.md`

Validacao tecnica executada:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Resultado:

- `typecheck`: passou.
- `build`: passou.
- `docker compose up -d --build`: passou; containers reiniciados.
- `healthcheck`: passou com `{"status":"ok"}`.
- Observacao: o build manteve apenas avisos conhecidos de sourcemap/chunk size do Vite, sem erro de compilacao.

Pendente:

- Validacao visual manual no navegador em `/admin/product-templates`.
