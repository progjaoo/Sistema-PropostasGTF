# Plano 014 - Propostas usando a Tela Completa de Andamento

- Projeto: Sistema de Propostas
- Tipo: WEB - Frontend only, sem mudanca de API ou banco
- Stack: TypeScript, React, Vite, Tailwind CSS, Wouter
- Data: 2026-07-13
- Status: Implementado
- Escopo: Rotas, sidebar, titulo da tela e documentacao funcional

## 1. Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `artifacts/proposta/src/App.tsx`
- `artifacts/proposta/src/components/layout/AppLayout.tsx`
- `artifacts/proposta/src/pages/proposals/index.tsx`
- `artifacts/proposta/src/pages/proposals/progress.tsx`
- `artifacts/proposta/src/pages/proposals/new.tsx`
- `docs/paginas-por-perfil.md`

## 2. Agentes Recomendados

| Agente | Papel nesta tarefa |
|---|---|
| Product Manager | Confirmar a decisao funcional: uma unica tela de Propostas, sem redundancia com Andamento. |
| Frontend Engineer | Ajustar rotas, sidebar e titulo da tela em React/Wouter. |
| UX/UI Designer | Garantir que a navegacao fique clara: menu unico "Propostas" com a tela mais completa. |
| QA Engineer | Validar acesso por ADMIN/COMERCIAL, redirects, rotas antigas e fluxo de nova proposta/edicao. |
| Technical Writer | Atualizar documentacao de paginas por perfil e registrar a decisao. |

## 3. Contexto

Hoje existem duas entradas relacionadas:

- Sidebar `Propostas` apontando para `/proposals`, renderizando `pages/proposals/index.tsx`.
- Sidebar `Andamento de Propostas` apontando para `/proposal-progress`, renderizando `pages/proposals/progress.tsx`.

A tela `Andamento de Propostas` ficou mais completa porque:

- organiza propostas por programas;
- mostra timeline/andamento;
- permite registrar etapas;
- permite aprovar/rejeitar;
- exibe produtos vinculados e investimento;
- atende melhor o fluxo comercial.

Por isso, as duas telas ficaram redundantes. A decisao de produto agora e:

- a tela principal `Propostas` deve ser a tela completa que hoje esta em `pages/proposals/progress.tsx`;
- a entrada `Andamento de Propostas` deve sumir da sidebar;
- `/proposals` deve abrir a tela completa;
- `/proposal-progress` deve ser mantida apenas como rota legada/redirecionamento, se necessario.

## 4. Objetivo

Transformar a tela de `Andamento de Propostas` na nova tela oficial de `Propostas`.

Comportamento esperado:

- Sidebar mostra apenas um item: `Propostas`.
- Ao clicar em `Propostas`, abrir a tela completa hoje chamada de `Andamento de Propostas`.
- O titulo da pagina deve ser `Propostas`.
- O texto de apoio deve explicar acompanhamento e gestao do fluxo comercial, sem chamar a tela de "Andamento" no menu.
- A tela antiga de `/proposals` baseada em `pages/proposals/index.tsx` deve deixar de ser usada.

## 5. Decisao Tecnica Recomendada

### 5.1 Rota principal

Alterar `App.tsx`:

```tsx
// Antes
<ProtectedRoute path="/proposals" component={ProposalsList} />
<ProtectedRoute path="/proposal-progress" component={ProposalProgress} />

// Depois recomendado
<ProtectedRoute path="/proposals" component={ProposalProgress} />
<Route path="/proposal-progress">
  {() => {
    window.location.href = '/proposals';
    return null;
  }}
</Route>
```

Observacao:

- Manter `/proposal-progress` como redirect evita quebrar favoritos, links antigos ou abas abertas.
- Se preferir uma limpeza mais agressiva depois, a rota legada pode ser removida em um segundo momento.

### 5.2 Tela antiga

Nao apagar imediatamente `pages/proposals/index.tsx`.

Opcao recomendada:

- deixar o arquivo sem rota ativa;
- adicionar comentario no import/rota removida explicando que a tela foi substituida por `ProposalProgress`;
- evitar deletar arquivo enquanto ainda pode haver codigo util para consulta ou rollback.

Motivo:

- o usuario pediu "pode comentar o codigo dela para ela sumir";
- comentar/remover a rota e suficiente para a tela sumir sem destruir historico de implementacao.

### 5.3 Sidebar

Alterar `AppLayout.tsx`:

```tsx
// Antes
{ icon: FileText, label: 'Propostas', href: '/proposals', roles: ['COMERCIAL', 'ADMIN'] },
{ icon: Activity, label: 'Andamento de Propostas', href: '/proposal-progress', roles: ['COMERCIAL', 'ADMIN'] },

// Depois
{ icon: FileText, label: 'Propostas', href: '/proposals', roles: ['COMERCIAL', 'ADMIN'] },
```

Tambem remover import `Activity` se ele deixar de ser usado no layout.

### 5.4 Titulo da tela

Alterar `pages/proposals/progress.tsx`:

```tsx
// Antes
<h1>Andamento de Propostas</h1>

// Depois
<h1>Propostas</h1>
```

Texto de apoio sugerido:

```text
Acompanhe propostas por programa, registre etapas comerciais e gerencie aprovacoes.
```

O badge pequeno pode sair de `Comercial` para algo mais neutro:

```text
Gestao comercial
```

ou pode ser removido se gerar ruido.

## 6. Arquivos Afetados

| Arquivo | Acao |
|---|---|
| `artifacts/proposta/src/App.tsx` | Fazer `/proposals` renderizar `ProposalProgress`; transformar `/proposal-progress` em redirect ou remover rota. |
| `artifacts/proposta/src/components/layout/AppLayout.tsx` | Remover item `Andamento de Propostas` da sidebar; manter apenas `Propostas`. |
| `artifacts/proposta/src/pages/proposals/progress.tsx` | Renomear titulo visual para `Propostas` e ajustar subtitulo. |
| `artifacts/proposta/src/pages/proposals/index.tsx` | Deixar sem rota ativa; opcionalmente adicionar comentario indicando tela legada. |
| `docs/paginas-por-perfil.md` | Atualizar documentacao: `Propostas` agora e a tela completa de acompanhamento. |
| `docs/MUDANCAS.MD` | Registrar consolidacao das telas. |
| `plans/plan-014-propostas-usar-andamento-como-tela-principal.md` | Atualizar checklist final apos implementacao. |

## 7. Plano de Implementacao

### Fase 1 - Ajuste de Rotas

1. Abrir `App.tsx`.
2. Remover ou comentar import ativo de `ProposalsList`, se nao for mais usado.
3. Alterar rota `/proposals` para usar `ProposalProgress`.
4. Manter `/proposal-progress` como redirect para `/proposals`.
5. Confirmar que `/proposals/new` e `/proposals/:id/edit` continuam funcionando.

### Fase 2 - Ajuste da Sidebar

1. Abrir `AppLayout.tsx`.
2. Remover item `Andamento de Propostas`.
3. Manter item `Propostas` apontando para `/proposals`.
4. Remover import `Activity` se nao for mais usado.
5. Validar destaque ativo da sidebar quando estiver em:
   - `/proposals`;
   - `/proposals/new`;
   - `/proposals/:id/edit`.

### Fase 3 - Ajuste Visual da Tela

1. Abrir `pages/proposals/progress.tsx`.
2. Trocar titulo `Andamento de Propostas` para `Propostas`.
3. Ajustar subtitulo para refletir a tela completa.
4. Revisar botao `Nova Proposta`.
5. Manter a funcionalidade de timeline, aprovar, rejeitar e registrar andamento.

### Fase 4 - Tela Antiga

1. Confirmar que `pages/proposals/index.tsx` nao esta mais referenciado em `App.tsx`.
2. Opcionalmente adicionar comentario no topo:

```tsx
// Tela legada de Propostas. Substituida pela tela completa em `progress.tsx`,
// atualmente roteada em `/proposals`.
```

3. Nao deletar o arquivo nesta fase para preservar rollback rapido.

### Fase 5 - Documentacao

1. Atualizar `docs/paginas-por-perfil.md`.
2. Registrar em `docs/MUDANCAS.MD`:
   - remocao da redundancia entre `Propostas` e `Andamento de Propostas`;
   - nova rota oficial `/proposals`;
   - `/proposal-progress` como legado/redirect.
3. Atualizar checklist final deste plano.

### Fase 6 - Validacao

Rodar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Validar no navegador:

1. Sidebar exibe apenas `Propostas`, nao exibe `Andamento de Propostas`.
2. `/proposals` abre a tela completa de acompanhamento.
3. `/proposal-progress` redireciona para `/proposals`.
4. Login COMERCIAL continua indo para `/proposals`.
5. Dashboard ADMIN > ver todas propostas continua levando para `/proposals`.
6. Nova proposta e edicao continuam funcionando.

## 8. Critérios de Aceite

- [ ] Sidebar nao exibe mais `Andamento de Propostas`.
- [ ] Sidebar exibe `Propostas` apontando para `/proposals`.
- [ ] `/proposals` renderiza a tela completa que hoje era `ProposalProgress`.
- [ ] Titulo da tela e `Propostas`.
- [ ] `/proposal-progress` nao mostra uma tela separada redundante.
- [ ] Fluxos `/proposals/new` e `/proposals/:id/edit` continuam funcionando.
- [ ] ADMIN e COMERCIAL conseguem acessar `Propostas`.
- [ ] `pnpm run typecheck` passa.
- [ ] Build frontend passa.
- [ ] Documentacao atualizada.

## 9. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Links antigos para `/proposal-progress` quebrarem | Manter redirect para `/proposals`. |
| Imports nao usados gerarem erro de lint/build | Remover `ProposalsList` e `Activity` se ficarem sem uso. |
| Ordem de rotas afetar `/proposals/new` ou `/proposals/:id/edit` | Validar Wouter apos ajuste; se necessario, colocar rotas especificas antes da rota base. |
| Usuario perder funcionalidade da tela antiga | Manter arquivo `index.tsx` como legado sem rota ativa para rollback rapido. |
| Documentacao ficar divergente | Atualizar `paginas-por-perfil.md` e `MUDANCAS.MD`. |

## 10. Checklist Final da Implementacao

- [x] `/proposals` aponta para `ProposalProgress`.
- [x] `/proposal-progress` redireciona para `/proposals` ou foi removida conscientemente.
- [x] Item `Andamento de Propostas` removido da sidebar.
- [x] Titulo da tela alterado para `Propostas`.
- [x] Arquivo legado `pages/proposals/index.tsx` deixou de ser usado pela rota principal.
- [x] `docs/paginas-por-perfil.md` atualizado.
- [x] `docs/MUDANCAS.MD` atualizado.
- [x] Typecheck executado.
- [x] Build frontend executado.
- [ ] Docker reconstruido.
- [ ] Healthcheck validado.

## 11. Observacoes Finais da Implementacao

- `App.tsx` agora usa `ProposalProgress` diretamente na rota `/proposals`.
- A rota `/proposal-progress` foi preservada apenas como redirect para `/proposals`.
- O menu lateral exibe somente `Propostas`; a entrada `Andamento de Propostas` foi removida.
- O titulo interno da tela consolidada passou de `Andamento de Propostas` para `Propostas`.
- `pnpm run typecheck` passou.
- `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build` passou.
- Docker nao foi concluido nesta execucao porque o Docker Desktop falhou ao exportar a imagem com erro interno de I/O e depois o daemon ficou indisponivel em `~/.docker/run/docker.sock`.
- Quando o Docker Desktop voltar, rodar `docker compose up -d --build` e validar `curl http://localhost:21709/api/healthz`.
- `pages/proposals/index.tsx` foi mantido como arquivo legado comentado, sem rota ativa principal.
