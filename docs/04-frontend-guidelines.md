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

## Clientes e Leads

- A rota tecnica de Clientes continua em `/advertisers`.
- A UI deve chamar `Advertiser.status = CLIENT` de Cliente.
- A UI deve chamar `Advertiser.status = LEAD` de Lead.
- A tela de Leads usa a mesma entidade, filtrada por `status=LEAD`.
