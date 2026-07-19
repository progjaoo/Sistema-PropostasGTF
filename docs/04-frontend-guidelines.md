# Guidelines de Frontend

## Padrao Geral

- Usar React com TypeScript.
- Manter paginas em `artifacts/proposta/src/pages`.
- Manter componentes reutilizaveis em `components`.
- Reaproveitar componentes shadcn/ui antes de criar novos.
- Usar Lucide React para icones.
- Usar React Toastify via `src/lib/feedback.ts` para feedback nao bloqueante.
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
- Toasts devem passar pelo wrapper `feedback`, evitando import direto de `react-toastify` nas paginas.
- Acoes de criar/cadastrar/adicionar devem usar `feedback.created(...)` e aparecer em verde.
- Acoes de atualizar/salvar/reagendar/tratar devem usar `feedback.updated(...)` e aparecer em verde.
- Acoes de excluir/desativar/rejeitar devem usar `feedback.deleted(...)` ou `feedback.destructive(...)` e aparecer em vermelho.
- `feedback.warning(...)` fica reservado para avisos nao destrutivos.
- `feedback.info(...)` fica reservado para informacoes neutras.

## Layout

- Layout autenticado fica em `components/layout/AppLayout.tsx`.
- Sidebar deve refletir permissoes por perfil.
- Em desktop (`lg+`), a sidebar deve ficar fixa no viewport, com navegacao rolando internamente e o bloco de usuario/perfil/logout sempre preso ao rodape.
- A sidebar desktop pode ser recolhida; em modo recolhido, itens devem manter `aria-label`, tooltip lateral e badge compacto quando houver notificacao.
- Evitar cards dentro de cards.
- Preferir UI densa, clara e operacional.
- Garantir que textos nao estourem botoes ou campos em telas menores.

## Mobile First

- Todas as rotas web devem funcionar a partir de `320px` de largura.
- O layout parte de uma coluna e evolui nos breakpoints `sm`, `md`, `lg` e `xl`.
- A sidebar aparece somente a partir de `lg`; abaixo disso, a navegacao usa o cabecalho e o `MobileNavigationSheet`.
- Sidebar e menu mobile devem consumir a mesma configuracao em `components/layout/navigation.ts`.
- O estado recolhido da sidebar desktop nao deve afetar o menu mobile.
- Use `min-h-dvh` e as classes de safe area do `index.css` em shells e barras fixas.
- A busca principal permanece visivel. Filtros secundarios devem usar `ResponsiveFilters`, com contador e acao para limpar.
- Tabelas densas devem manter tabela no desktop e cards operacionais no celular. As duas apresentacoes compartilham a mesma query, mutations e regras.
- Botoes e controles interativos devem ter alvo de toque minimo de `44px`.
- Dialogs e AlertDialogs devem caber em `calc(100vw - 2rem)` e ter scroll interno quando excederem o `dvh`.
- No editor de proposta, celular alterna entre `Editar` e `Preview`; desktop preserva os dois paineis.
- O preview A4 em tela deve usar `ResponsiveProposalPreview`. O componente de impressao/PDF nao deve ser escalado ou alterado por regras mobile.
- Timeline e preview podem rolar horizontalmente dentro do proprio componente; a pagina inteira nao pode ter overflow horizontal.
- Rotas autenticadas pesadas sao carregadas sob demanda por `React.lazy` e `Suspense` em `App.tsx`.

Viewports de referencia:

- `320 x 568`: celular compacto;
- `390 x 844`: celular moderno;
- `430 x 932`: celular grande;
- `768 x 1024`: tablet retrato;
- `1024 x 768`: tablet paisagem;
- `1440 x 900`: regressao desktop.

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
