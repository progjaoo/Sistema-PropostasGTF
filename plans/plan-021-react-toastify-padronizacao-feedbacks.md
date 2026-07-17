# Plano 021 - Padronizacao de Feedbacks com React Toastify

- Projeto: GTF Propostas
- Data: 15/07/2026
- Tipo: WEB
- Stack: TypeScript, React, Vite, Tailwind CSS, React Toastify
- Escopo: migrar feedbacks nao bloqueantes de Sonner/shadcn toast para React Toastify
- Status: Implementado

## 1. Referencias Consultadas

- `docs/README.md`
- `docs/04-frontend-guidelines.md`
- `docs/10-qualidade-validacao-contribuicao.md`
- `.agents/README.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `.agents/agent-qa-engineer.md`
- `.agents/agent-technical-writer.md`
- `artifacts/proposta/src/App.tsx`
- `artifacts/proposta/src/components/ui/sonner.tsx`
- `artifacts/proposta/src/hooks/use-toast.ts`
- Documentacao React Toastify: https://fkhadra.github.io/react-toastify/introduction/
- NPM React Toastify: https://www.npmjs.com/package/react-toastify
- Context7 MCP instalado para consultas futuras de documentacao atualizada.

## 2. Agentes Recomendados

| Agente | Responsabilidade |
|---|---|
| Frontend Engineer | Migrar imports, provider global, chamadas `toast.*` e limpar componentes obsoletos. |
| UX/UI Designer | Definir padrao visual por severidade: sucesso verde, erro vermelho, warning amarelo e info neutro/azul. |
| QA Engineer | Validar todos os fluxos com feedback e garantir que dialogs destrutivos continuam como AlertDialog. |
| Technical Writer | Atualizar guidelines, paginas por perfil e comandos quando a mudanca for concluida. |

Agente principal: **Frontend Engineer**.  
Agentes de apoio: **UX/UI Designer**, **QA Engineer** e **Technical Writer**.

## 3. Objetivo

Substituir o uso de Sonner por React Toastify para todos os feedbacks nao bloqueantes do sistema, mantendo confirmacoes destrutivas e decisoes do usuario em dialogs shadcn/ui.

## 4. Regras de Produto

- Toast e para feedback informativo nao bloqueante.
- Confirmacoes com escolha do usuario continuam usando `AlertDialog`/dialogs shadcn.
- Sucesso deve usar toast verde.
- Erro deve usar toast vermelho.
- Warning deve usar toast amarelo/laranja.
- Info deve usar toast neutro/azul.
- Nao criar toast para substituir modal de confirmacao.
- Nao alterar regras de negocio fora do escopo.

## 5. Diagnostico Atual

O frontend usa Sonner em varios arquivos:

- `App.tsx` importa `Toaster` de `@/components/ui/sonner`;
- paginas ADMIN: empresas, produtos, programas, usuarios, tipos de proposta;
- propostas: criacao, edicao, listagem e andamento;
- clientes/leads;
- perfil;
- recuperacao de senha;
- avisos de recaptura;
- componente `ProposalTimeline`.

Tambem existem arquivos antigos do toast shadcn/Radix:

- `src/components/ui/toast.tsx`
- `src/components/ui/toaster.tsx`
- `src/hooks/use-toast.ts`

Esses arquivos devem ser avaliados para remocao apenas se nenhum import restante depender deles.

## 6. Plano de Implementacao

### Fase 1 - Dependencia e Provider Global

1. Adicionar `react-toastify` em `artifacts/proposta/package.json`.
2. Remover `sonner` somente depois da migracao completa.
3. Em `App.tsx`, trocar o provider:

```tsx
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
```

4. Configurar `ToastContainer` global com:

```tsx
<ToastContainer
  position="bottom-right"
  autoClose={3500}
  hideProgressBar={false}
  newestOnTop
  closeOnClick
  pauseOnHover
  draggable
  theme="colored"
/>
```

5. Validar se `theme="colored"` atende visualmente ao padrao verde/warning/vermelho. Se nao atender, criar CSS especifico em `index.css`.

### Fase 2 - Utilitario de Feedback

Criar um wrapper local para evitar espalhar detalhes da biblioteca:

`artifacts/proposta/src/lib/feedback.ts`

API sugerida:

```ts
import { toast } from 'react-toastify';

export const feedback = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
  info: (message: string) => toast.info(message),
};
```

Regras:

- novas telas importam `feedback`, nao `toast` diretamente;
- isso facilita trocar biblioteca novamente sem tocar em todas as paginas;
- manter mensagens atuais, ajustando apenas severidade incorreta.

### Fase 3 - Migrar Imports e Chamadas

Substituir:

```ts
import { toast } from 'sonner';
```

por:

```ts
import { feedback } from '@/lib/feedback';
```

Mapeamento:

| Sonner atual | Toastify novo |
|---|---|
| `toast.success(msg)` | `feedback.success(msg)` |
| `toast.error(msg)` | `feedback.error(msg)` |
| `toast.warning(msg)` | `feedback.warning(msg)` |
| `toast.info(msg)` | `feedback.info(msg)` |

Arquivos a migrar:

- `src/components/layout/AppLayout.tsx`
- `src/components/notifications/RecallReminderDialog.tsx`
- `src/components/proposal/ProposalTimeline.tsx`
- `src/pages/login.tsx`
- `src/pages/forgot-password.tsx`
- `src/pages/reset-password.tsx`
- `src/pages/profile.tsx`
- `src/pages/admin/station.tsx`
- `src/pages/admin/users.tsx`
- `src/pages/admin/product-templates.tsx`
- `src/pages/admin/proposal-categories.tsx`
- `src/pages/admin/proposal-types.tsx`
- `src/pages/admin/proposal-templates.tsx`
- `src/pages/advertisers/index.tsx`
- `src/pages/advertisers/new.tsx`
- `src/pages/advertisers/edit.tsx`
- `src/pages/proposals/new.tsx`
- `src/pages/proposals/edit.tsx`
- `src/pages/proposals/index.tsx`
- `src/pages/proposals/progress.tsx`
- `src/pages/recall-reminders/index.tsx`

### Fase 4 - Limpeza de Sonner e Toast Antigo

1. Remover `src/components/ui/sonner.tsx` se nenhum import restar.
2. Remover dependencia `sonner` do `package.json`.
3. Conferir se `src/components/ui/toast.tsx`, `src/components/ui/toaster.tsx` e `src/hooks/use-toast.ts` estao sem uso.
4. Se estiverem sem uso, remover para evitar dois sistemas paralelos.
5. Rodar `rg "sonner|use-toast|components/ui/toaster|components/ui/toast"` e garantir que nao ha import ativo.

### Fase 5 - Padrao Visual

Padrao recomendado:

| Tipo | Uso | Cor |
|---|---|---|
| `success` | criado, salvo, atualizado, aprovado, login realizado | verde |
| `error` | falha de API, permissao, validacao impeditiva | vermelho |
| `warning` | acao permitida com consequencia ou ajuste automatico | amarelo/laranja |
| `info` | informacao neutra, limpeza automatica, estado orientativo | azul/neutro |

Se o Toastify padrao nao ficar legivel:

1. adicionar classes em `index.css`;
2. manter contraste WCAG razoavel;
3. testar em fundo claro do sistema.

### Fase 6 - Validacao Funcional

Fluxos obrigatorios:

- login com sucesso e erro;
- logout com AlertDialog + toast de sucesso;
- cadastro comercial pendente;
- criar/editar/desativar empresa;
- criar/editar/desativar produto;
- criar/editar/desativar programa;
- criar/editar tipo de proposta;
- criar proposta;
- salvar proposta;
- criar lead no editor;
- aprovar/rejeitar proposta;
- registrar andamento;
- marcar aviso de recaptura como tratado;
- recuperar senha.

### Fase 7 - Documentacao

Atualizar:

- `docs/04-frontend-guidelines.md`: Sonner deixa de ser padrao; React Toastify vira padrao.
- `.agents/agent-frontend-engineer.md`: substituir orientacao "Usar Sonner" por "Usar React Toastify via `feedback`".
- `docs/paginas-por-perfil.md`: registrar apenas se houver mudanca perceptivel de comportamento.

## 7. Comandos de Validacao

```bash
pnpm install
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build api frontend
curl http://localhost:21709/api/healthz
```

## 8. Criterios de Aceite

- [x] `react-toastify` instalado no workspace do frontend.
- [x] `ToastContainer` configurado globalmente.
- [x] Todos os imports de `sonner` removidos.
- [x] Feedbacks de sucesso configurados em verde.
- [x] Feedbacks de erro configurados em vermelho.
- [x] Feedbacks de warning configurados em amarelo/laranja.
- [x] Dialogs de confirmacao continuam usando shadcn/ui, nao toast.
- [x] Arquivos obsoletos de toast removidos se nao houver uso.
- [x] Typecheck passa.
- [x] Build do frontend passa.
- [x] Docker sobe com as alteracoes.
- [x] Documentacao e agente Frontend atualizados.

## 9. Checklist de Implementacao

- [x] Fase 1 - Dependencia e provider global.
- [x] Fase 2 - Wrapper `feedback`.
- [x] Fase 3 - Migracao dos imports/chamadas.
- [x] Fase 4 - Limpeza de Sonner/toast antigo.
- [x] Fase 5 - Ajuste visual por severidade.
- [x] Fase 6 - QA tecnico dos fluxos principais via typecheck/build e healthcheck Docker.
- [x] Fase 7 - Documentacao atualizada.

## 10. Checklist Final de Implementacao

- [x] Adicionado `react-toastify` ao frontend.
- [x] Removido `sonner` do frontend.
- [x] Criado wrapper `artifacts/proposta/src/lib/feedback.ts`.
- [x] `App.tsx` agora usa `ToastContainer` do React Toastify.
- [x] Todas as chamadas `toast.success/error/warning/info` migradas para `feedback.success/error/warning/info`.
- [x] Removidos arquivos obsoletos `components/ui/sonner.tsx`, `components/ui/toast.tsx`, `components/ui/toaster.tsx` e `hooks/use-toast.ts`.
- [x] Adicionado CSS de severidade para Toastify em `index.css`.
- [x] Atualizado `docs/04-frontend-guidelines.md`.
- [x] Atualizado `.agents/agent-frontend-engineer.md`.
- [x] Atualizado `docs/paginas-por-perfil.md`.
- [x] Validado com `pnpm run typecheck`.
- [x] Validado com `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`.
- [x] Validado com `docker compose up -d --build api frontend`.
- [x] Validado healthcheck em `http://localhost:21709/api/healthz`.

## 11. Ajuste Posterior - Padrao Semantico de Cores

Solicitacao adicional implementada:

- [x] Acoes de criar/cadastrar/adicionar usam `feedback.created(...)` e toast verde.
- [x] Acoes de atualizar/salvar/reagendar/tratar usam `feedback.updated(...)` e toast verde.
- [x] Acoes de excluir/desativar/rejeitar usam `feedback.deleted(...)` ou `feedback.destructive(...)` e toast vermelho.
- [x] Login/logout e recuperacao de senha continuam usando `feedback.success(...)` quando nao representam CRUD de entidade.
- [x] Guidelines e agente Frontend atualizados com a regra semantica.
