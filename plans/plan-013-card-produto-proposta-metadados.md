# Plano 013 - Card de Produto da Proposta com Metadados Reordenados

- Projeto: Sistema de Propostas
- Tipo: WEB - Frontend only, sem mudanca de API ou banco
- Stack: TypeScript, React, Vite, Tailwind CSS
- Data: 2026-07-13
- Status: Implementado
- Escopo: Layout dos cards de produto exibidos na proposta, preview e PDF/print

## 1. Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`
- `artifacts/proposta/src/components/proposal/ProposalPrint.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- Imagens de referencia enviadas pelo usuario neste pedido

## 2. Agentes Recomendados

| Agente | Papel nesta tarefa |
|---|---|
| Frontend Engineer | Implementar a reorganizacao visual dos cards em React/Tailwind e manter o contrato atual de dados. |
| UX/UI Designer | Garantir hierarquia visual parecida com a referencia: nome, linha de metadados, descricao e programa. |
| QA Engineer | Validar preview, PDF/print, cards com dados completos e cards com campos ausentes. |
| Technical Writer | Registrar a mudanca no checklist final do plano, caso seja implementada. |

## 3. Objetivo

Reorganizar o card de produto dentro da proposta para que as informacoes aparecam em uma hierarquia mais clara e parecida com a segunda referencia enviada.

Layout esperado dentro do card:

```text
00  QUANTIDADE
    DE INSERCOES

NOME DO PRODUTO
duracao - horario - sazonalidade
descricao
PROGRAMA
```

Regras de exibicao:

- A linha abaixo do nome do produto deve conter, nesta ordem:
  - duracao;
  - horario;
  - sazonalidade.
- Separar os itens existentes por ` - `.
- Nao exibir labels como `Horario:` ou `Sazonalidade:`.
- Sazonalidade deve mostrar somente o valor formatado, exemplo: `Mensal`, `Semestral`, `Anual`.
- Se algum campo estiver vazio, ele deve ser omitido da linha sem deixar separadores duplicados.
- A descricao vem abaixo da linha de metadados.
- O nome do programa continua como tag/pill escura, como esta hoje.

## 4. Diagnostico Atual

### 4.1 `ProposalPreview.tsx`

Hoje o card renderiza:

- quantidade;
- titulo;
- descricao;
- tag de programa e duracao no mesmo grupo;
- horario e sazonalidade em bloco abaixo;
- sazonalidade com label `Sazonalidade: Mensal`.

Problema visual:

- a duracao fica misturada com a tag de programa;
- horario e sazonalidade ficam separados da duracao;
- sazonalidade aparece com label desnecessaria;
- a ordem nao bate com a referencia desejada.

### 4.2 `ProposalPrint.tsx`

O componente de print/PDF possui estrutura propria para os cards.

Para manter consistencia entre preview e PDF, o mesmo ajuste deve ser replicado nele:

- titulo;
- linha compacta de metadados;
- descricao;
- tag de programa.

## 5. Decisao Tecnica

Nao alterar banco, API ou schema.

Os dados necessarios ja existem no payload do produto:

- `durationLabel`
- `airTime`
- `seasonality`
- `description`
- `program`

Criar helper local de exibicao em cada componente ou helper compartilhado simples, conforme ficar mais limpo:

```ts
function getProductMetaLine(product) {
  return [
    product.durationLabel,
    product.airTime,
    product.seasonality ? SEASONALITY_LABELS[String(product.seasonality)] || product.seasonality : null,
  ].filter(Boolean).join(' - ');
}
```

Preferencia:

- Se a tipagem de `ProposalPreview` e `ProposalPrint` estiver diferente, manter helper local em cada arquivo para evitar refatoracao maior.
- Se houver tipo comum simples e estavel, extrair helper para `artifacts/proposta/src/components/proposal/proposal-formatters.ts`.

## 6. Arquivos Afetados

| Arquivo | Acao |
|---|---|
| `artifacts/proposta/src/components/proposal/ProposalPreview.tsx` | Reordenar conteudo do card no preview da proposta. |
| `artifacts/proposta/src/components/proposal/ProposalPrint.tsx` | Reordenar conteudo do card no PDF/print. |
| `artifacts/proposta/src/index.css` | Ajustar classes de print, se o `ProposalPrint` depender de CSS externo para metadados. |
| `plans/plan-013-card-produto-proposta-metadados.md` | Atualizar checklist final apos implementacao. |

## 7. Plano de Implementacao

### Fase 1 - Ajustar Preview da Proposta

1. Abrir `ProposalPreview.tsx`.
2. Criar helper para montar a linha `duracao - horario - sazonalidade`.
3. Remover duracao do grupo de tags junto com programa.
4. Renderizar a linha de metadados logo abaixo do nome do produto.
5. Renderizar descricao abaixo da linha de metadados.
6. Manter o programa como pill escura abaixo da descricao.
7. Remover labels `Horario:` e `Sazonalidade:` deste card.
8. Garantir que, se a linha de metadados ficar vazia, ela nao renderize.

### Fase 2 - Ajustar PDF/Print

1. Abrir `ProposalPrint.tsx`.
2. Replicar a mesma ordem visual do preview:
   - titulo;
   - metadados;
   - descricao;
   - programa.
3. Remover a duracao da area de tags.
4. Remover labels `Horario:` e `Sazonalidade:`.
5. Ajustar classes CSS se necessario:
   - `proposal-print-product-meta`;
   - `proposal-print-product-description`;
   - `proposal-print-product-tags`.
6. Preservar a compacidade do PDF do plano 008, evitando aumentar altura do card.

### Fase 3 - Estados de Borda

Validar visualmente os casos:

1. Produto com duracao, horario e sazonalidade:
   - exemplo: `60 segundos - Diariamente - Mensal`.
2. Produto com apenas duracao:
   - exemplo: `30s`.
3. Produto com apenas horario:
   - exemplo: `13h as 15h`.
4. Produto com apenas sazonalidade:
   - exemplo: `Mensal`.
5. Produto sem metadados:
   - linha de metadados nao aparece.
6. Produto sem descricao:
   - programa sobe sem criar espaco em branco exagerado.
7. Produto sem programa:
   - pill de programa nao aparece.

### Fase 4 - Validacao Tecnica

Rodar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Validar no navegador:

- `/proposals/:id/edit`, no preview lateral.
- Botao `PDF`.
- `Cmd+P` / `Ctrl+P`, se aplicavel.

## 8. Critérios de Aceite

- [ ] Abaixo do nome do produto aparece a linha `duracao - horario - sazonalidade`.
- [ ] A linha nao mostra labels `Horario:` nem `Sazonalidade:`.
- [ ] Sazonalidade aparece como valor formatado: `Mensal`, `Semestral` ou `Anual`.
- [ ] Campos vazios sao omitidos sem separadores duplicados.
- [ ] A descricao aparece abaixo da linha de metadados.
- [ ] O nome do programa permanece como pill/tag escura abaixo da descricao.
- [ ] O preview e o PDF/print usam a mesma hierarquia visual.
- [ ] O card continua compacto e nao quebra o layout de 4 produtos na proposta.
- [ ] `pnpm run typecheck` passa.
- [ ] `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build` passa.

## 9. Checklist Final da Implementacao

- [x] `ProposalPreview.tsx` ajustado.
- [x] `ProposalPrint.tsx` ajustado.
- [x] CSS de print ajustado, se necessario.
- [x] Preview validado via codigo servido pelo Vite local.
- [x] PDF/print validado via codigo servido pelo Vite local.
- [x] Casos com campos ausentes cobertos por `filter(Boolean)` na linha de metadados.
- [x] Typecheck executado.
- [x] Build frontend executado.
- [x] Docker reconstruido.
- [x] Observacoes finais registradas neste plano.

## 10. Observacoes Finais da Implementacao

- A linha de metadados foi centralizada em helper local nos dois componentes:
  - `getProductMetaLine(product)` em `ProposalPreview.tsx`;
  - `getProductMetaLine(product)` em `ProposalPrint.tsx`.
- A ordem ficou: `durationLabel - airTime - seasonality`.
- Os labels `Horario:` e `Sazonalidade:` foram removidos do card de proposta e do PDF/print.
- A sazonalidade continua usando `SEASONALITY_LABELS` para exibir `Mensal`, `Semestral` ou `Anual`.
- A tag do programa permanece como pill escura abaixo da descricao.
- O Docker foi reconstruido com `docker compose up -d --build`.
- Healthcheck validado em `http://localhost:21709/api/healthz`.
