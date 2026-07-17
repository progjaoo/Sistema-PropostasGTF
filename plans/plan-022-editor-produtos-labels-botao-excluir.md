# Plano 022 - Editor de Proposta: Labels de Produto e Botao Excluir

- Projeto: GTF Propostas
- Data: 15/07/2026
- Tipo: WEB
- Stack: TypeScript, React, Vite, Tailwind CSS, shadcn/ui
- Escopo: ajuste visual e textual no acordeao `Produtos` da criacao/edicao de proposta
- Status: Implementado

## 1. Referencias Consultadas

- `docs/README.md`
- `docs/04-frontend-guidelines.md`
- `.agents/README.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `.agents/agent-qa-engineer.md`
- `artifacts/proposta/src/pages/proposals/edit.tsx`

## 2. Agentes Recomendados

| Agente | Responsabilidade |
|---|---|
| Frontend Engineer | Implementar ajuste no JSX/classes do acordeao de Produtos. |
| UX/UI Designer | Garantir que o botao destrutivo nao sobreponha campos e que os labels fiquem claros. |
| QA Engineer | Validar regressao visual no editor, em larguras menores e com produtos adicionados. |

Agente principal: **Frontend Engineer**.  
Agentes de apoio: **UX/UI Designer** e **QA Engineer**.

## 3. Objetivo

Corrigir dois problemas no acordeao `Produtos` do editor de propostas:

1. Renomear labels solicitados pelo produto.
2. Reposicionar o botao vermelho de excluir produto para nao sobrepor o campo `Nome do Produto`.

## 4. Arquivo Afetado

```text
artifacts/proposta/src/pages/proposals/edit.tsx
```

## 5. Mudancas Funcionais

### 5.1 Labels

No card de cada produto dentro do acordeao `Produtos`:

| Campo atual | Novo label |
|---|---|
| `Programa (opcional)` | `Descrição` |
| `Descrição` | `Informação` |

Observacao:

- Esta mudanca e apenas visual/textual.
- Nao alterar nomes de propriedades no payload neste plano.
- O campo que hoje grava em `prod.program` continua gravando no mesmo lugar.
- O campo que hoje grava em `prod.description` continua gravando no mesmo lugar.
- Nao alterar preview/PDF nesta tarefa.

### 5.2 Botao Excluir Produto

Problema atual:

- O botao vermelho de excluir fica absoluto no canto superior direito do card.
- Em cards estreitos, ele invade/sobrepoe a area do campo `Nome do Produto`.

Comportamento esperado:

- O botao deve continuar visivel e vermelho.
- O botao nao pode sobrepor o campo `Nome do Produto`.
- O layout deve funcionar em desktop e em larguras menores.

Implementacao recomendada:

1. Remover posicionamento `absolute` do botao.
2. Criar cabecalho flex no card:

```tsx
<div className="flex items-start justify-between gap-3">
  <div className="min-w-0 flex-1 grid ...">
    campos Qtd + Nome do Produto
  </div>
  <Button ... />
</div>
```

3. Garantir que o bloco dos campos use `min-w-0 flex-1`.
4. Garantir que o botao use `shrink-0`.
5. Em mobile, permitir quebrar linha se necessario com `flex-col sm:flex-row` ou grid responsivo.

## 6. Fora do Escopo

- Alterar schema Prisma.
- Alterar API.
- Alterar preview/PDF da proposta.
- Alterar regra de catalogo de produtos.
- Alterar comportamento de produtos vinculados a programas.
- Alterar textos fora do acordeao `Produtos`.

## 7. Passo a Passo de Implementacao

1. Abrir `artifacts/proposta/src/pages/proposals/edit.tsx`.
2. Localizar o bloco:

```tsx
{localData.products?.map((prod: any, i: number) => (
```

3. Remover o wrapper:

```tsx
<div className="absolute top-3 right-3">
```

4. Reestruturar o topo do card para que `Qtd`, `Nome do Produto` e botao excluir convivam sem sobreposicao.
5. Trocar label `Programa (opcional)` para `Descrição`.
6. Trocar label `Descrição` para `Informação`.
7. Manter o botao com:

```tsx
variant="destructive"
size="icon"
aria-label="Remover produto"
```

8. Rodar validacoes.

## 8. Validacao

Comandos:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build api frontend
curl http://localhost:21709/api/healthz
```

Cenarios manuais:

- [ ] Criar proposta nova e chegar no acordeao `Produtos`.
- [ ] Adicionar produto do catalogo.
- [ ] Criar produto novo.
- [ ] Conferir label `Descrição` no campo que antes era `Programa (opcional)`.
- [ ] Conferir label `Informação` no campo que antes era `Descrição`.
- [ ] Conferir que o botao vermelho de excluir nao sobrepoe `Nome do Produto`.
- [ ] Conferir que o botao de excluir remove o item corretamente.
- [ ] Testar em largura desktop.
- [ ] Testar em largura menor/mobile.

## 9. Criterios de Aceite

- [x] Labels alterados exatamente conforme pedido.
- [x] Botao de excluir produto continua vermelho e sempre visivel.
- [x] Botao de excluir nao invade o campo `Nome do Produto`.
- [x] Nenhuma propriedade de payload foi alterada.
- [x] Typecheck passa.
- [x] Build passa.
- [x] Docker sobe e healthcheck responde `ok`.

## 10. Checklist Final de Implementacao

- [x] `Programa (opcional)` alterado para `Descrição`.
- [x] `Descrição` alterado para `Informação`.
- [x] Botao de remover produto saiu de `absolute top-3 right-3`.
- [x] Topo do card de produto reorganizado com flex/grid responsivo.
- [x] Campo `Nome do Produto` usa `min-w-0` e nao e mais sobreposto pelo botao.
- [x] Botao de excluir permanece `variant="destructive"`, `size="icon"` e `aria-label="Remover produto"`.
- [x] Validado com `pnpm run typecheck`.
- [x] Validado com `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`.
- [x] Validado com `docker compose up -d --build api frontend`.
- [x] Validado com healthcheck `http://localhost:21709/api/healthz`.
