# Guidelines de Frontend

## Padrao Geral

- Usar React com TypeScript.
- Manter paginas em `artifacts/proposta/src/pages`.
- Manter componentes reutilizaveis em `components`.
- Reaproveitar componentes shadcn/ui antes de criar novos.
- Usar Lucide React para icones.
- Usar Sonner para feedback nao bloqueante.
- Usar AlertDialog/ConfirmActionDialog para confirmacoes destrutivas ou criticas.

## Rotas

As rotas sao configuradas em:

```text
artifacts/proposta/src/App.tsx
```

Padroes:

- Rotas publicas ficam fora de `ProtectedRoute`.
- Rotas autenticadas usam `ProtectedRoute`.
- Rotas exclusivas do ADMIN usam `adminOnly`.

## Estado e Dados

- Autenticacao: `useAuthStore` em `store/auth.ts`.
- Cache e chamadas: TanStack Query via hooks do `@workspace/api-client-react`.
- Para endpoints ainda nao cobertos pelo client gerado, chamadas `fetch` diretas devem enviar `Authorization: Bearer`.

## Formularios

- Usar `react-hook-form` quando a pagina ja segue esse padrao.
- Usar mascaras de `src/lib/masks.ts` para:
  - CPF/CNPJ
  - telefone
  - moeda BRL
  - e-mail
- Campos monetarios devem exibir `R$` e formatar casas decimais enquanto o usuario digita.

## Dialogs e Feedback

- Confirmacoes de exclusao, logout e acoes destrutivas devem usar AlertDialog/shadcn.
- Toasts devem ser usados para sucesso/erro informativo, sem pedir decisao do usuario.
- Acoes destrutivas devem usar cor visual de perigo/warning.

## Layout

- Layout autenticado fica em `components/layout/AppLayout.tsx`.
- Sidebar deve refletir permissoes por perfil.
- Evitar cards dentro de cards.
- Preferir UI densa, clara e operacional.
- Garantir que textos nao estourem botoes ou campos em telas menores.

## Propostas

- O editor principal fica em `pages/proposals/edit.tsx`.
- O preview fica em `components/proposal/ProposalPreview.tsx`.
- O contato exibido na proposta vem de `createdBy`, nao da empresa.
- A empresa da proposta deve ser selecionavel na criacao e no editor.
- O preview deve usar `station.primaryColor` como cor principal, com fallback `#427EFF`.
- O investimento sugerido e calculado no frontend a partir dos produtos de catalogo.
- Estatisticas da apresentacao devem aceitar ate 4 itens editaveis.
- A descricao da Apresentacao deve usar `Textarea`, preservar espacos/quebras durante a edicao e renderizar com `whitespace-pre-line`.
- Botoes de remover produtos adicionados na proposta devem usar tratamento destrutivo vermelho e ficar sempre visiveis.

## PDF e Impressao A4

- O botao `PDF` do editor usa impressao nativa do navegador.
- O preview de tela (`ProposalPreview`) nao deve ser a fonte do PDF, porque ele pode usar `scale`.
- A impressao deve usar `components/proposal/ProposalPrint.tsx`, renderizado por portal em `document.body`.
- O CSS de print deve tornar `#proposal-print-root` a unica area visivel.
- O CSS de print deve forcar A4 (`@page size: A4 portrait`) e remover sidebar/editor.
- O layout de print deve ser enxuto para que ate 4 produtos caibam em uma unica pagina com investimento e contato.
- O atalho `Ctrl+P`/`Cmd+P` no editor deve preparar `ProposalPrint` antes de abrir a impressao.
- Produtos devem ser paginados em grupos de 4 por pagina no print.
- Header aparece em todas as paginas; Hero e Apresentacao apenas na primeira; Investimento e Contato apenas na ultima.
- Cards de produto no PDF devem manter borda lateral na cor da empresa, usando variavel CSS ou regra com prioridade suficiente.
- Fundos criticos precisam ser preservados com `print-color-adjust: exact` e, quando necessario, `backgroundColor` inline.
- Blocos criticos devem evitar quebra interna: hero, cards de produto, investimento e rodape.
- Texto truncado em tela pode ter regra propria no print, mas nao pode cortar informacoes essenciais como investimento, assinatura e contato.

## Clientes e Leads

- A rota tecnica de Clientes continua em `/advertisers`.
- A UI deve chamar `Advertiser.status = CLIENT` de Cliente.
- A UI deve chamar `Advertiser.status = LEAD` de Lead.
- A tela de Leads usa a mesma entidade, filtrada por `status=LEAD`.
