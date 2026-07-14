# Plano 009 - Propostas por Programa sem Coluna Intermediaria

Status: Planejado.

Projeto: Sistema de Propostas.

Data: 2026-07-10.

Tipo: WEB - Frontend only, sem mudanca prevista de API ou banco.

Stack: TypeScript, React, Vite, Tailwind CSS, shadcn/ui.

## Agentes Definidos

Agente principal:

- Frontend Engineer: ajustar `artifacts/proposta/src/pages/proposals/index.tsx`, mantendo o fluxo de filtros, selecao de programa, cards de propostas e acoes existentes.

Agentes de apoio:

- UX/UI Designer: reorganizar a hierarquia visual da tela, remover a coluna redundante e deixar os cards de propostas legiveis.
- QA Engineer: validar filtros, selecao de programas, acoes dos cards e ausencia de regressao para ADMIN e COMERCIAL.
- Technical Writer: atualizar documentacao funcional caso o comportamento da tela seja alterado.

Referencias usadas:

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `.agents/agent-qa-engineer.md`
- `docs/04-frontend-guidelines.md`
- `docs/paginas-por-perfil.md`
- `artifacts/proposta/src/pages/proposals/index.tsx`
- Print enviado da tela `/proposals`

## 1. Contexto

A tela `/proposals` ja esta no caminho correto: ao clicar em `Propostas` no sidebar, o usuario chega em uma visao por programas, com filtros no topo e lista de programas no lado esquerdo.

O ajuste solicitado e pontual:

- Manter a lista lateral de programas.
- Ao clicar em um programa, exibir apenas as propostas vinculadas a esse programa.
- Remover a coluna intermediaria que mostra o nome do programa e os produtos disponiveis.
- Corrigir o card de proposta, onde nome da proposta/cliente, empresa, responsavel e data estao visualmente embolados.

## 2. Diagnostico do Codigo Atual

Arquivo principal:

```text
artifacts/proposta/src/pages/proposals/index.tsx
```

O codigo atual usa:

- `GET /api/proposals/program-board` para carregar programas, produtos e propostas.
- `selectedProgramId` para definir o programa selecionado.
- `selectedProgram` para renderizar a area principal.
- Layout externo em duas colunas:

```tsx
xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.4fr)]
```

Dentro do card da direita, existe uma segunda divisao:

```tsx
lg:grid-cols-[0.9fr_1.1fr]
```

Essa divisao interna cria:

1. Coluna esquerda dentro do card: detalhe do programa + produtos do programa.
2. Coluna direita dentro do card: propostas vinculadas.

O pedido atual remove a necessidade do item 1. Com isso, a area de propostas deve ocupar toda a largura disponivel do card direito.

## 3. Decisao de Produto

### 3.1 O que fica

- Sidebar e item `Propostas`.
- Titulo e descricao da pagina.
- Botao `Nova Proposta`.
- Filtros do topo:
  - busca por texto;
  - empresa;
  - programa;
  - status.
- Lista lateral de programas.
- Clique no programa para definir o contexto.
- Listagem de propostas vinculadas ao programa selecionado.
- Acoes por proposta:
  - abrir editor ao clicar no card/conteudo principal;
  - `Timeline`;
  - `Duplicar`;
  - rejeitar/excluir visualmente com acao destrutiva existente.

### 3.2 O que sai

- Coluna intermediaria com:
  - icone/nome do programa repetido;
  - texto "produtos disponiveis para montar propostas deste programa";
  - cards/lista dos produtos do programa.

Motivo: essa informacao ja aparece resumida na lista lateral de programas e volta a aparecer dentro de cada proposta pelos produtos efetivamente usados.

### 3.3 O que melhora

- Cards de propostas ganham largura horizontal.
- Metadados deixam de competir no mesmo bloco apertado.
- A leitura passa a seguir esta ordem:
  1. programa selecionado;
  2. quantidade de propostas vinculadas;
  3. cards de propostas;
  4. produtos usados em cada proposta;
  5. acoes.

## 4. Layout Alvo

### 4.1 Estrutura geral

```text
┌──────────────────────────────────────────────────────────────┐
│ Filtros                                                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────┬───────────────────────────────────────┐
│ Programas            │ Propostas vinculadas                  │
│                      │ Jornal da Manha                       │
│ [Jornal da Manha]    │ 4 propostas com produtos deste programa│
│ [Veicular]           │                                       │
│ [Show da Manha]      │ [Card proposta]                       │
│ [Varejo]             │ [Card proposta]                       │
└──────────────────────┴───────────────────────────────────────┘
```

### 4.2 Grid recomendado

Substituir a area atual por duas colunas principais:

```tsx
<div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(340px,420px)_minmax(0,1fr)]">
  <div>{/* lista de programas */}</div>
  <Card>{/* somente propostas vinculadas */}</Card>
</div>
```

Regras:

- Em desktop, lista de programas fica entre `340px` e `420px`.
- Area de propostas ocupa todo o restante.
- Em telas menores, empilhar: programas primeiro, propostas depois.

## 5. Card de Proposta Alvo

### 5.1 Problema visual atual

O card atual junta em pouco espaco:

- nome do cliente/proposta;
- status;
- valor;
- botoes;
- tipo de proposta;
- empresa;
- responsavel;
- data;
- lista de produtos.

Como a coluna esta estreita, os textos quebram sem hierarquia clara.

### 5.2 Nova hierarquia visual

Cada card deve ter tres areas:

1. Cabecalho.
2. Metadados.
3. Produtos da proposta.

Exemplo:

```text
┌──────────────────────────────────────────────────────────────┐
│ Supermercado Bom Preco                         R$ 1.000,00   │
│ [Rascunho]  Pacote Promocional                               │
│                                                              │
│ Empresa: Radio 88 FM       Responsavel: Administrador        │
│ Atualizada em: 10 jul 2026, 16:00                            │
│                                                              │
│ Produtos                                                     │
│ 01x Testemunhal 60 segundos                                  │
│ 01x Patrocinio de Quadro                                     │
│ 01x Live Commerce  120s                                      │
│ 01x Spot Juridico  Horario: 14hrs                            │
│                                                              │
│                         [Timeline] [Duplicar] [icone lixeira]│
└──────────────────────────────────────────────────────────────┘
```

### 5.3 Regras de composicao

- Titulo principal: usar `proposal.advertiserName` ou o nome exibido hoje, com `line-clamp-1` ou `line-clamp-2`.
- Valor: manter no canto superior direito, sem apertar o titulo.
- Status: badge logo abaixo do titulo ou ao lado do tipo, sem empurrar o titulo.
- Tipo de proposta: linha secundaria, por exemplo `Pacote Promocional`.
- Empresa, responsavel e data: renderizar em grid proprio, com labels curtos.
- Produtos: manter no bloco inferior separado por `border-t`.
- Acoes: agrupar em uma linha propria, preferencialmente no fim do card ou no canto superior direito em desktop.
- Botao destrutivo: lixeira vermelha, mantendo o padrao de erro/destrutivo ja usado no projeto.
- Usar `min-w-0`, `truncate` e `line-clamp` nos textos longos.
- Evitar que botoes fiquem dentro de area clicavel que abre o editor.

## 6. Comportamento Esperado

### 6.1 Clique no programa

Ao clicar em um item da lista esquerda:

- `selectedProgramId` recebe o ID do programa.
- A direita mostra somente `selectedProgram.proposals`.
- Nao renderiza lista de produtos disponiveis.
- Header da direita exibe:
  - nome do programa selecionado;
  - empresa/emissora, se existir;
  - contagem de propostas vinculadas.

### 6.2 Programa sem propostas

Se o programa selecionado nao tiver propostas:

- Mostrar estado vazio dentro do painel da direita.
- Manter CTA `Nova Proposta`.
- Texto sugerido:

```text
Nenhuma proposta vinculada a este programa
Crie um rascunho e adicione produtos deste programa no editor.
```

### 6.3 Filtros

Manter comportamento atual:

- Busca por texto.
- Filtro por empresa.
- Filtro por programa.
- Filtro por status.

Regra de selecao:

- Se os filtros removerem o programa selecionado da lista, selecionar automaticamente o primeiro programa retornado.
- Se nao houver programas, manter o estado vazio atual.

### 6.4 Permissoes

Nao alterar regra de permissao:

- ADMIN continua vendo as propostas retornadas pela API.
- COMERCIAL continua vendo apenas o que a API ja permite para o perfil.
- Este plano nao muda endpoint, schema ou regra de visibilidade.

## 7. Arquivos Afetados

| Arquivo | Acao |
|---|---|
| `artifacts/proposta/src/pages/proposals/index.tsx` | Remover coluna intermediaria e reorganizar cards de propostas |
| `docs/paginas-por-perfil.md` | Atualizar descricao da tela `/proposals` apos implementacao |
| `docs/MUDANCAS.MD` | Registrar mudanca visual/funcional da tela de propostas |
| `plans/plan-009-propostas-programas-lista-vinculada.md` | Atualizar checklist final apos implementacao |

Sem mudanca prevista:

- Prisma schema.
- Seeds.
- Endpoints Express.
- Docker Compose.

## 8. Plano de Implementacao

### Fase 1 - Preparacao

1. Abrir `artifacts/proposta/src/pages/proposals/index.tsx`.
2. Identificar o bloco renderizado quando `programs.length > 0`.
3. Confirmar que `selectedProgram.proposals` ja contem as propostas filtradas por programa.
4. Confirmar que as acoes atuais (`Timeline`, `Duplicar`, rejeicao e abrir editor) estao no card de proposta.

### Fase 2 - Remover coluna intermediaria

1. Remover o grid interno:

```tsx
<div className="grid h-full grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
```

2. Remover o bloco que renderiza:
   - icone/nome do programa dentro do painel direito;
   - descricao "produtos disponiveis";
   - lista `selectedProgram.products.map(...)`.
3. Manter um header simples no painel direito com:
   - `selectedProgram.name`;
   - `selectedProgram.stationName`, se existir;
   - `${selectedProgram.proposals.length} proposta(s) vinculada(s)`.

### Fase 3 - Reorganizar cards de propostas

1. Trocar o layout do card para `flex`/`grid` responsivo em duas areas:
   - conteudo principal;
   - acoes/valor.
2. Separar metadados em um grid proprio:

```tsx
<div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
```

3. Garantir que cada metadado tenha label ou icone claro:
   - Tipo;
   - Empresa;
   - Responsavel;
   - Atualizacao.
4. Mover a lista de produtos para bloco inferior com `border-t`.
5. Manter produtos com `flex flex-wrap`, mas sem comprimir o cabecalho.
6. Garantir que o botao de lixeira continue vermelho/destrutivo.
7. Garantir que clicar em botoes nao dispare abertura do editor.

### Fase 4 - Refinar responsividade

1. Validar em largura desktop similar ao print enviado.
2. Validar em largura intermediaria, onde a coluna direita ainda precisa manter cards legiveis.
3. Validar em mobile/estreito:
   - filtros empilhados;
   - lista de programas antes das propostas;
   - card de proposta sem sobreposicao.

### Fase 5 - Documentacao

1. Atualizar `docs/paginas-por-perfil.md` na secao `/proposals`:
   - explicar que a tela exibe programas na esquerda e propostas vinculadas na direita;
   - registrar que os produtos disponiveis nao aparecem mais como coluna intermediaria.
2. Atualizar `docs/MUDANCAS.MD` com a alteracao.
3. Ao final da implementacao, adicionar checklist executado no fim deste plano.

### Fase 6 - Validacao

Executar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
```

Se for necessario validar no Docker:

```bash
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Validacao manual:

1. Login ADMIN.
2. Abrir `/proposals`.
3. Clicar em `Jornal da Manha`.
4. Confirmar que a direita mostra apenas propostas vinculadas a esse programa.
5. Confirmar que a coluna de produtos do programa nao aparece.
6. Confirmar que os cards nao embolam nome, empresa, responsavel e data.
7. Clicar em `Timeline` e confirmar que abre o dialog correto.
8. Clicar em `Duplicar` e confirmar que cria rascunho/abre editor como hoje.
9. Clicar na area principal do card e confirmar abertura do editor.
10. Testar filtro por status.
11. Testar filtro por empresa.
12. Testar filtro por programa.
13. Testar busca por texto.
14. Login COMERCIAL.
15. Confirmar que as propostas visiveis respeitam o retorno da API para o perfil.

## 9. Criterios de Aceite

- Ao abrir `/proposals`, a tela continua mostrando a lista de programas no lado esquerdo.
- Ao clicar em um programa, a area direita mostra somente propostas vinculadas a ele.
- A coluna intermediaria com nome do programa e produtos disponiveis nao existe mais.
- O header da area direita deixa claro qual programa esta selecionado.
- Os cards de propostas exibem de forma legivel:
  - cliente/proposta;
  - valor;
  - status;
  - tipo de proposta;
  - empresa;
  - responsavel;
  - data;
  - produtos usados.
- Nome, empresa, responsavel e data nao ficam sobrepostos nem embolados.
- Acoes `Timeline`, `Duplicar` e rejeitar continuam funcionando.
- Clicar no card continua abrindo `/proposals/:id/edit`.
- `typecheck` e build passam.

## 10. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Remover a coluna de produtos dificultar ver catalogo do programa | Manter resumo de produtos no card lateral do programa, como ja existe hoje |
| Botoes dentro do card abrirem o editor por propagacao de clique | Manter abertura do editor apenas no botao/area principal e parar propagacao quando necessario |
| Cards ficarem largos demais e pouco escaneaveis | Usar grid de metadados com labels e separadores visuais discretos |
| Filtros deixarem `selectedProgramId` apontando para programa inexistente | Manter efeito atual que seleciona o primeiro programa disponivel |
| Mudanca afetar permissoes | Nao alterar endpoint nem regra de API; confiar no payload retornado |

## 11. Checklist de Implementacao

- [x] `index.tsx` ajustado para duas colunas principais.
- [x] Coluna intermediaria de produtos removida.
- [x] Header do painel direito simplificado para programa selecionado + contagem.
- [x] Card de proposta reorganizado com hierarquia clara.
- [x] Metadados separados e legiveis.
- [x] Acoes preservadas.
- [x] Estado vazio preservado.
- [x] Responsividade ajustada por classes responsivas (`grid`, `min-w-0`, `truncate`, `line-clamp`).
- [x] `docs/paginas-por-perfil.md` atualizado.
- [x] `docs/MUDANCAS.MD` atualizado.
- [x] `pnpm run typecheck` executado com sucesso.
- [x] Build frontend executado com sucesso.
- [x] Docker Compose reconstruido e iniciado com sucesso.
- [x] Healthcheck `GET /api/healthz` validado com `{"status":"ok"}`.
- [ ] Validacao visual manual feita em `/proposals`.

## 12. Resultado da Implementacao

Implementado em 2026-07-10.

Arquivos alterados:

- `artifacts/proposta/src/pages/proposals/index.tsx`
- `docs/paginas-por-perfil.md`
- `docs/MUDANCAS.MD`
- `plans/plan-009-propostas-programas-lista-vinculada.md`

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
- `docker compose up -d --build`: passou; containers `sistema-propostas-api` e `sistema-propostas-frontend` reiniciados.
- `healthcheck`: passou com `{"status":"ok"}`.
- Observacao: o build manteve apenas avisos conhecidos de sourcemap/chunk size do Vite, sem erro de compilacao.

Pendente:

- Validacao visual manual no navegador em `/proposals`, conferindo clique por programa, cards e responsividade.
