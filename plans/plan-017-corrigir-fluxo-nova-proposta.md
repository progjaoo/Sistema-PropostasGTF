# Plano 017 - Corrigir Fluxo do Botao Nova Proposta

- Projeto: Sistema de Propostas
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces
- Data: 2026-07-14
- Status: Planejado
- Escopo: fluxo de criacao de nova proposta a partir dos botoes `Nova Proposta`

## 1. Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `artifacts/proposta/src/App.tsx`
- `artifacts/proposta/src/pages/dashboard.tsx`
- `artifacts/proposta/src/pages/proposals/progress.tsx`
- `artifacts/proposta/src/pages/proposals/new.tsx`
- `artifacts/proposta/src/pages/proposals/index.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/api-server/src/routes/proposals.ts`
- `docs/paginas-por-perfil.md`

## 2. Agentes Recomendados

| Agente | Papel nesta tarefa |
|---|---|
| Product Manager | Confirmar o fluxo esperado de criacao: selecionar empresa/tipo, criar rascunho e abrir editor. |
| Frontend Engineer | Corrigir rota `/proposals/new`, botoes `Nova Proposta`, formulario/dialog e redirecionamento para o editor. |
| Backend API Engineer | Validar contrato `POST /api/proposals` e mensagens de erro no caso de dados obrigatorios ausentes. |
| UX/UI Designer | Garantir que o fluxo seja claro, sem redirecionamento silencioso, com estados de loading e feedback. |
| QA Engineer | Validar o fluxo ADMIN e COMERCIAL, com e sem empresas/tipos cadastrados. |
| Technical Writer | Atualizar documentacao do fluxo de Propostas e registrar mudancas. |

Observacao: nao ha indicio inicial de mudanca de schema ou Docker. Database Engineer e DevOps Engineer ficam fora do escopo, salvo descoberta durante a implementacao.

## 3. Diagnostico Atual

### 3.1 Rota ativa

Em `artifacts/proposta/src/App.tsx`:

```tsx
<ProtectedRoute path="/proposals" component={ProposalProgress} />
<ProtectedRoute path="/proposals/new" component={ProposalNew} />
<ProtectedRoute path="/proposals/:id/edit" component={ProposalEdit} />
```

A tela principal atual de Propostas e `ProposalProgress`.

### 3.2 Botao atual

Em `artifacts/proposta/src/pages/proposals/progress.tsx`, o botao faz:

```tsx
setLocation('/proposals/new')
```

Tambem ha botao semelhante na Dashboard.

### 3.3 Problema principal

`artifacts/proposta/src/pages/proposals/new.tsx` esta assim:

```tsx
React.useEffect(() => {
  setLocation('/proposals');
}, [setLocation]);
```

Ou seja:

- o usuario clica em `Nova Proposta`;
- navega para `/proposals/new`;
- a pagina imediatamente redireciona para `/proposals`;
- nenhuma proposta e criada;
- nenhum dialog/formulario aparece;
- o fluxo fica com aparencia de botao quebrado.

### 3.4 Fluxo legado existente

O arquivo `artifacts/proposta/src/pages/proposals/index.tsx` ainda possui uma implementacao de criacao:

- usa `useCreateProposal`;
- abre dialog;
- exige selecionar empresa;
- permite selecionar tipo de proposta;
- cria rascunho via `POST /api/proposals`;
- redireciona para `/proposals/:id/edit`.

Porem esse arquivo nao e mais a tela principal, pois `/proposals` agora usa `ProposalProgress`.

## 4. Objetivo

Corrigir o fluxo de `Nova Proposta` para ficar 100% funcional.

Comportamento esperado:

1. Usuario clica em `Nova Proposta`.
2. Sistema abre a rota `/proposals/new` ou um dialog equivalente.
3. Usuario escolhe a Empresa/Emissora da proposta.
4. Usuario escolhe o Tipo de Proposta.
5. Sistema cria um rascunho.
6. Sistema redireciona automaticamente para `/proposals/:id/edit`.
7. Editor abre com a proposta criada, pronta para preencher cliente, produtos, periodo, investimento e demais campos.

## 5. Decisao Tecnica Recomendada

### Opcao escolhida: tornar `/proposals/new` a fonte unica de criacao

Em vez de duplicar dialog em Dashboard e Propostas, corrigir `ProposalNew` para ser uma tela/dialog funcional.

Motivos:

- todos os botoes podem continuar apontando para `/proposals/new`;
- evita duplicacao de logica entre Dashboard, Propostas e futuras telas;
- a rota fica compartilhavel e previsivel;
- preserva o fluxo atual de navegacao.

### Alternativa nao recomendada

Mover o dialog legado de `proposals/index.tsx` para `progress.tsx` e deixar `/proposals/new` redirecionando.

Problema:

- Dashboard continuaria dependendo de comportamento lateral;
- a URL `/proposals/new` seguiria sem valor funcional;
- aumentaria risco de regressao quando outros botoes apontarem para a rota.

## 6. Especificacao Funcional

### 6.1 Tela `/proposals/new`

Deve exibir uma interface simples e objetiva:

- titulo: `Nova Proposta`;
- texto auxiliar: `Escolha a empresa e o tipo para iniciar um rascunho.`;
- campo `Empresa`;
- campo `Tipo de Proposta`;
- botao `Criar rascunho`;
- botao `Cancelar`.

### 6.2 Empresa

Regras:

- obrigatoria;
- carregar via `useListStations`;
- exibir apenas empresas ativas, se o campo `active` existir;
- ordenar com `Radio 88 FM`/`Rádio 88 FM` primeiro, mantendo padrao ja usado em outras telas;
- se houver uma empresa padrao, pre-selecionar a primeira da lista.

Estado vazio:

- se nao houver empresa cadastrada, exibir alerta claro;
- ADMIN pode receber atalho para `/admin/stations`;
- COMERCIAL deve receber mensagem para solicitar cadastro ao ADMIN.

### 6.3 Tipo de Proposta

Regras:

- carregar `/api/proposal-types?active=true`;
- se houver tipos ativos, pre-selecionar o primeiro;
- se nao houver tipo ativo, permitir criar com fallback `Proposta Comercial` ou bloquear com mensagem clara.

Recomendacao:

- manter fallback `Proposta Comercial` para nao travar o MVP.

### 6.4 Criacao

Payload esperado:

```ts
{
  stationId,
  proposalTypeId,
  periodicity: 'MONTHLY',
  propType: selectedType?.name || 'Proposta Comercial',
  propMonth: '',
  propYear: ''
}
```

Ao sucesso:

- toast/sinal visual: `Rascunho criado`;
- invalidar queries de propostas:
  - `proposal-progress-board`;
  - `proposal-program-board`;
  - `GET /api/proposals`;
  - `dashboard/stats`, se houver key acessivel;
- redirecionar para `/proposals/{id}/edit`.

Ao erro:

- mostrar erro vindo da API quando existir;
- manter usuario na tela;
- nao limpar selecoes.

### 6.5 Cancelamento

Botao `Cancelar`:

- volta para `/proposals`;
- nao cria nada;
- nao deve chamar API.

## 7. Impacto Tecnico

### 7.1 Frontend

Arquivos afetados:

| Arquivo | Mudanca |
|---|---|
| `artifacts/proposta/src/pages/proposals/new.tsx` | Substituir redirecionamento por tela/form funcional. |
| `artifacts/proposta/src/pages/proposals/progress.tsx` | Manter botao apontando para `/proposals/new`; opcionalmente validar label/icone. |
| `artifacts/proposta/src/pages/dashboard.tsx` | Manter botao apontando para `/proposals/new`. |
| `artifacts/proposta/src/pages/proposals/index.tsx` | Remover ou comentar logica legada de criacao, se ficar duplicada e sem uso. |
| `docs/paginas-por-perfil.md` | Documentar fluxo corrigido. |
| `docs/MUDANCAS.MD` | Registrar correcao. |

### 7.2 Backend

Endpoint envolvido:

- `POST /api/proposals`

Validar:

- exige auth;
- define `createdById` pelo token;
- usa primeira empresa como fallback se `stationId` vier vazio, mas o front deve enviar explicitamente;
- cria versao inicial;
- retorna proposta com `id`.

Mudanca backend esperada:

- nenhuma, salvo se a API estiver retornando erro sem mensagem clara.

### 7.3 Banco

Sem mudanca esperada.

## 8. Regras de Permissao

- ADMIN pode criar propostas.
- COMERCIAL pode criar propostas.
- `createdById` deve ser sempre o usuario autenticado.
- COMERCIAL nao deve conseguir criar proposta como outro usuario.
- Se no futuro existir regra de empresa por usuario, o filtro de empresas deve respeitar essa regra. Fora do escopo atual.

## 9. Plano de Implementacao

### Fase 1 - Diagnostico Confirmado

1. Confirmar que `/proposals/new` redireciona para `/proposals`.
2. Confirmar que `ProposalProgress` e a tela ativa de `/proposals`.
3. Confirmar que a logica funcional de criacao esta presa em `proposals/index.tsx`.

### Fase 2 - Implementar `/proposals/new`

1. Importar `useCreateProposal`, `useListStations`, `getListProposalsQueryKey`.
2. Usar `useQuery` para carregar tipos ativos de proposta.
3. Criar estados:
   - `stationId`;
   - `proposalTypeId`;
   - `isSubmitting`, se nao usar mutation state.
4. Pre-selecionar primeira empresa ativa.
5. Pre-selecionar primeiro tipo ativo, se existir.
6. Renderizar formulario com shadcn/ui:
   - `Card`;
   - `Select`;
   - `Button`;
   - `Alert`/estado vazio se necessario.

### Fase 3 - Criar Rascunho

1. Validar empresa antes de enviar.
2. Montar payload com empresa, tipo e periodicidade mensal.
3. Chamar `useCreateProposal`.
4. Invalidar queries relacionadas.
5. Redirecionar para editor ao sucesso.
6. Exibir toast de sucesso/erro.

### Fase 4 - Limpar Duplicidade

1. Avaliar se a logica de criar rascunho em `proposals/index.tsx` ainda e usada.
2. Se nao for usada, deixar comentario de legado ou remover em task separada.
3. Evitar duplicar componentes de criacao em `progress.tsx`.

### Fase 5 - UX e Estados

1. Estado carregando empresas/tipos.
2. Estado sem empresa.
3. Estado sem tipo.
4. Botao desabilitado durante criacao.
5. Botao cancelar sempre disponivel.
6. Mensagens claras para ADMIN e COMERCIAL.

### Fase 6 - Documentacao

1. Atualizar `docs/paginas-por-perfil.md`.
2. Atualizar `docs/MUDANCAS.MD`.
3. Marcar checklist final deste plano.

### Fase 7 - Validacao

Rodar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Validar manualmente:

1. Login ADMIN.
2. Dashboard > `Nova Proposta`.
3. Selecionar empresa/tipo.
4. Criar rascunho.
5. Confirmar redirecionamento para `/proposals/:id/edit`.
6. Voltar para `/proposals` e repetir pelo botao `Nova Proposta`.
7. Login COMERCIAL.
8. Repetir fluxo.
9. Confirmar que a proposta criada aparece vinculada ao usuario logado.
10. Testar sem tipo ativo, se possivel.
11. Testar sem empresa, se possivel em ambiente controlado.

## 10. Criterios de Aceite

- [ ] Clicar em `Nova Proposta` nao redireciona silenciosamente para `/proposals`.
- [ ] `/proposals/new` exibe formulario funcional de criacao.
- [ ] Empresa e obrigatoria.
- [ ] Tipo de proposta e selecionavel.
- [ ] Criar rascunho chama `POST /api/proposals`.
- [ ] Ao sucesso, abre `/proposals/:id/edit`.
- [ ] Ao erro, exibe mensagem clara.
- [ ] Botao `Cancelar` volta para `/proposals`.
- [ ] Funciona para ADMIN.
- [ ] Funciona para COMERCIAL.
- [ ] Typecheck passa.
- [ ] Build frontend passa.
- [ ] Documentacao atualizada.

## 11. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Duplicar logica entre `/proposals/new` e tela legada | Centralizar fluxo na rota `/proposals/new`. |
| Empresa nao carregada travar criacao | Estado vazio claro e botao desabilitado. |
| Tipo de proposta vazio impedir uso | Fallback para `Proposta Comercial` ou mensagem clara. |
| Queries ficarem desatualizadas apos criar | Invalidar boards, lista de propostas e dashboard. |
| COMERCIAL ver opcoes administrativas demais | Manter formulario limitado a empresa/tipo e sem campos administrativos. |

## 12. Checklist Final da Implementacao

Implementacao em 14/07/2026:

- [x] `/proposals/new` deixou de redirecionar automaticamente.
- [x] Tela/form de nova proposta implementado.
- [x] Empresas carregadas e pre-selecionadas.
- [x] Tipos de proposta carregados e pre-selecionados.
- [x] Criacao de rascunho implementada.
- [x] Redirecionamento para editor implementado.
- [x] Feedback de sucesso/erro implementado.
- [x] Cancelamento implementado.
- [x] Queries invalidas apos criacao.
- [ ] Fluxo validado manualmente para ADMIN.
- [ ] Fluxo validado manualmente para COMERCIAL.
- [x] Documentacao atualizada.
- [x] `pnpm run typecheck` executado.
- [x] Build frontend executado.
- [x] Docker rebuild executado, se disponivel.
- [x] Healthcheck validado, se Docker estiver disponivel.

Observacao: as validacoes manuais por perfil seguem pendentes porque exigem login e criacao real no ambiente pelo usuario/testador. O ambiente local foi reconstruido e o healthcheck retornou `{"status":"ok"}`.
