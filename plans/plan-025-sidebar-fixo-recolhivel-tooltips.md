# Plano 025 - Sidebar Fixo, Recolhivel e Tooltips

- Projeto: Sistema de Propostas
- Data: 18/07/2026
- Tipo: WEB - Frontend
- Stack: TypeScript, React, Vite, Tailwind CSS, shadcn/ui, Lucide React
- Status: Implementado - QA visual em navegador pendente
- Agente principal: Frontend Engineer
- Agentes de apoio: UX/UI Designer, QA Engineer

## 1. Referencias Usadas

- `docs/README.md`
- `docs/04-frontend-guidelines.md`
- `.agents/README.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `.agents/agent-qa-engineer.md`
- `artifacts/proposta/src/components/layout/AppLayout.tsx`
- `artifacts/proposta/src/components/layout/navigation.ts`
- `artifacts/proposta/src/components/layout/MobileNavigationSheet.tsx`

## 2. Agente Definido

### Frontend Engineer

Agente principal porque a tarefa altera o shell autenticado do sistema, especificamente o componente de layout, sidebar, navegacao, responsividade e comportamento visual.

### UX/UI Designer

Agente de apoio para garantir que a sidebar recolhida continue clara, com hover/tooltip legivel, sem comprometer leitura operacional.

### QA Engineer

Agente de apoio para validar regressao por perfil ADMIN/COMERCIAL, navegacao desktop/mobile, scroll longo e persistencia visual.

## 3. Contexto

Hoje a sidebar desktop fica dentro do fluxo normal da tela. Quando o conteudo principal e muito alto, a area inferior da sidebar, onde aparecem usuario logado, `Meu Perfil` e `Sair`, pode ser empurrada visualmente ou ficar desconfortavel em relacao ao scroll da pagina.

O sistema tambem nao possui uma forma de recolher a sidebar no desktop. Em telas menores, a navegacao mobile ja e resolvida pelo `MobileNavigationSheet`; portanto esta task deve afetar principalmente o breakpoint `lg+`.

## 4. Objetivo

1. Tornar a sidebar desktop fixa em relacao ao viewport.
2. Garantir que o bloco inferior da sidebar fique sempre visivel no fim da lateral.
3. Adicionar opcao para recolher/expandir a sidebar no desktop.
4. Exibir nome dos botoes no hover quando a sidebar estiver recolhida.
5. Preservar totalmente o menu mobile existente.

## 5. Fora de Escopo

- Nao alterar permissoes de menu.
- Nao alterar rotas.
- Nao alterar o `MobileNavigationSheet`, exceto se alguma classe compartilhada exigir ajuste minimo.
- Nao mudar regras ADMIN/COMERCIAL.
- Nao alterar conteudo das paginas internas.
- Nao mexer no PDF/print.

## 6. Diagnostico Tecnico

Arquivo principal:

```text
artifacts/proposta/src/components/layout/AppLayout.tsx
```

Estado atual relevante:

- `aside` desktop usa `hidden w-64 shrink-0 flex-col border-r bg-card lg:flex`.
- O conteudo principal usa `flex min-w-0 flex-1 flex-col overflow-hidden`.
- A navegacao interna usa `ScrollArea className="flex-1 px-4"`.
- O rodape do usuario fica apos o `ScrollArea`, com `mt-auto`.
- Nao existe estado de sidebar recolhida.
- Links de navegacao renderizam texto sempre visivel.

Risco atual:

- Se o layout pai ou a area principal criarem contextos de scroll concorrentes, a sidebar pode parecer acompanhar ou ser afetada pelo conteudo longo.
- Em desktop, o usuario nao consegue ganhar largura horizontal recolhendo a navegacao.

## 7. Decisoes de UX

### Sidebar expandida

- Largura atual mantida: `w-64`.
- Logo horizontal e texto `Sistema Comercial GTF` continuam visiveis.
- Labels dos menus continuam visiveis.
- Bloco de usuario continua completo.

### Sidebar recolhida

- Largura recomendada: `w-20`.
- Mostrar apenas icones nos itens de navegacao.
- Ocultar textos, subtitulos e labels longas visualmente.
- Manter badges de recaptura em formato compacto.
- Mostrar avatar/inicial do usuario.
- Mostrar botoes `Meu Perfil` e `Sair` como icones.
- Exibir tooltip/hover com nome completo da acao.

### Botao de recolher

- Usar icone Lucide adequado, como `PanelLeftClose` e `PanelLeftOpen`.
- Posicionar no topo da sidebar, proximo da marca.
- Ter `aria-label` claro:
  - `Recolher menu lateral`
  - `Expandir menu lateral`
- Usar `Button` shadcn variant `ghost` ou `outline` discreto.

### Hover com nome dos botoes

- Preferir componente `Tooltip` shadcn/ui se ja estiver disponivel.
- Aplicar tooltip nos itens de navegacao quando a sidebar estiver recolhida.
- Em sidebar expandida, o texto ja aparece; tooltip pode ser omitido para evitar ruido.
- O tooltip deve aparecer para:
  - Dashboard
  - Propostas
  - Avisos de Recaptura
  - Clientes
  - Leads
  - Usuarios
  - Empresas
  - Produtos
  - Programas
  - Tipos de Proposta
  - Meu Perfil
  - Sair
  - Botao recolher/expandir

## 8. Plano de Implementacao

### Fase 1 - Preparar estado da sidebar

1. Em `AppLayout.tsx`, criar estado local:

```tsx
const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
```

2. Avaliar se deve persistir no `localStorage`.
3. Recomendacao: persistir, pois e preferencia do usuario:

```tsx
localStorage.setItem('gtf-sidebar-collapsed', String(isSidebarCollapsed));
```

4. Ler o valor inicial com protecao para SSR/build:

```tsx
const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem('gtf-sidebar-collapsed') === 'true';
});
```

### Fase 2 - Tornar sidebar fixa no desktop

1. Alterar `aside` desktop para usar altura do viewport:

```tsx
className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-card lg:flex"
```

2. Ajustar largura condicional:

```tsx
isSidebarCollapsed ? 'w-20' : 'w-64'
```

3. Garantir que o bloco interno use:

```tsx
min-h-0
```

4. Manter o scroll apenas no miolo de navegacao:

```tsx
<ScrollArea className="min-h-0 flex-1 px-...">
```

5. Garantir que o rodape do usuario fique fora do `ScrollArea`, com `shrink-0 border-t`.

### Fase 3 - Refatorar renderizacao dos links

1. Ajustar `renderLink` para receber `isSidebarCollapsed`.
2. Quando recolhida:
   - centralizar icone;
   - esconder label com `sr-only` ou condicional visual;
   - manter `aria-label={item.label}`;
   - ajustar badge para posicao absoluta pequena.
3. Quando expandida:
   - manter layout atual.
4. Criar helper local para renderizar item com tooltip somente quando recolhido.

### Fase 4 - Adicionar Tooltip shadcn

1. Verificar se `components/ui/tooltip.tsx` ja existe.
2. Usar:

```tsx
TooltipProvider
Tooltip
TooltipTrigger
TooltipContent
```

3. Envolver cada item recolhido:

```tsx
<Tooltip>
  <TooltipTrigger asChild>{link}</TooltipTrigger>
  <TooltipContent side="right">{item.label}</TooltipContent>
</Tooltip>
```

4. Garantir que `TooltipProvider` envolva somente a sidebar desktop para nao interferir no app todo.

### Fase 5 - Ajustar topo da sidebar

1. Em modo expandido:
   - logo horizontal visivel;
   - texto `Sistema Comercial GTF` visivel;
   - botao de recolher alinhado a direita.
2. Em modo recolhido:
   - usar logo completa ou marca compacta, se couber;
   - se a logo completa ficar ilegivel, mostrar apenas um icone/monograma ou manter avatar/logo centralizado.
3. O botao de expandir deve ficar acessivel, com tooltip.

### Fase 6 - Ajustar rodape de usuario

1. Em modo expandido:
   - manter avatar, nome e role.
   - manter `Meu Perfil` e `Sair` com texto.
2. Em modo recolhido:
   - mostrar apenas avatar/inicial.
   - mostrar `Meu Perfil` como icone.
   - mostrar `Sair` como icone.
   - tooltip lateral identifica cada acao.
3. Confirmar que o `AlertDialog` de logout continua funcionando.

### Fase 7 - Preservar comportamento mobile

1. Confirmar que `lg:hidden` do header mobile permanece inalterado.
2. Confirmar que `MobileNavigationSheet` continua usando a configuracao compartilhada de menu.
3. Nenhum comportamento de recolher deve aparecer abaixo de `lg`.

### Fase 8 - Atualizar documentacao

1. Atualizar `docs/04-frontend-guidelines.md` em `Layout` e `Mobile First`, registrando:
   - sidebar desktop fixa;
   - sidebar recolhivel;
   - tooltips em modo recolhido;
   - mobile segue via `MobileNavigationSheet`.
2. Atualizar `docs/paginas-por-perfil.md` apenas se houver trecho descrevendo navegacao/sidebar.

## 9. Arquivos Afetados

Obrigatorios:

```text
artifacts/proposta/src/components/layout/AppLayout.tsx
docs/04-frontend-guidelines.md
```

Possiveis:

```text
docs/paginas-por-perfil.md
artifacts/proposta/src/components/ui/tooltip.tsx
```

Nao previstos:

```text
artifacts/proposta/src/components/layout/MobileNavigationSheet.tsx
artifacts/proposta/src/components/layout/navigation.ts
```

## 10. Criterios de Aceite

1. Em desktop `lg+`, a sidebar permanece fixa durante o scroll de paginas longas.
2. O bloco com usuario logado, `Meu Perfil` e `Sair` fica sempre visivel no fim da sidebar.
3. Existe botao para recolher e expandir a sidebar.
4. A preferencia recolhida/expandida persiste ao recarregar a pagina.
5. Em modo recolhido, todos os itens continuam acessiveis por icone.
6. Em modo recolhido, hover mostra o nome do item/botao em tooltip.
7. O badge de `Avisos de Recaptura` continua visivel e legivel.
8. Logout continua usando `AlertDialog`.
9. A navegacao mobile continua funcionando como antes.
10. Nenhuma pagina passa a ter overflow horizontal.
11. `typecheck` passa.
12. `build` passa.

## 11. QA Planejado

### Desktop

- Validar em `1440 x 900`.
- Validar em `1280 x 720`.
- Validar uma pagina com conteudo longo, como Propostas, Produtos ou Usuarios.
- Rolar a pagina ate o final e confirmar que o rodape da sidebar nao se move para fora do viewport.
- Recolher sidebar e navegar por todos os itens principais.
- Expandir sidebar e confirmar layout original.

### Mobile

- Validar em `390 x 844`.
- Confirmar que nao aparece botao de recolher sidebar.
- Confirmar que o menu mobile continua abrindo e navegando.

### Perfis

- ADMIN:
  - menus principais e administracao aparecem corretamente.
  - tooltips aparecem para todos os itens.
- COMERCIAL:
  - somente menus permitidos aparecem.
  - sidebar recolhida nao revela item proibido.

## 12. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Tooltip quebrar sem provider | Envolver sidebar em `TooltipProvider` e validar render. |
| Sidebar recolhida perder badge | Usar badge absoluto no item recolhido. |
| Logo ficar ilegivel em `w-20` | Usar versao compacta ou ocultar texto, mantendo `alt` acessivel. |
| Rodape sobrepor menu em telas baixas | Manter menu em `ScrollArea` com `min-h-0 flex-1` e rodape `shrink-0`. |
| Preferencia localStorage quebrar build | Checar `typeof window !== 'undefined'`. |
| Mobile ser afetado | Manter sidebar apenas em `lg:flex`; header mobile independente. |

## 13. Checklist de Implementacao

- [x] Criar estado `isSidebarCollapsed`.
- [x] Persistir preferencia em `localStorage`.
- [x] Tornar sidebar desktop `sticky top-0 h-dvh`.
- [x] Ajustar largura condicional `w-64`/`w-20`.
- [x] Garantir menu com scroll interno e rodape fixo.
- [x] Adicionar botao recolher/expandir.
- [x] Adicionar tooltips em modo recolhido.
- [x] Ajustar render dos badges em modo recolhido.
- [x] Ajustar bloco de usuario/perfil/logout em modo recolhido.
- [x] Validar AlertDialog de logout por typecheck.
- [ ] Validar ADMIN e COMERCIAL em navegador.
- [ ] Validar mobile sem regressao em navegador.
- [x] Atualizar documentacao.
- [x] Rodar typecheck.
- [x] Rodar build.

## 14. Comandos de Validacao

```bash
pnpm --filter @workspace/proposta run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
```

Validacao local opcional:

```bash
docker compose build --pull=false
docker compose up -d
curl -i http://localhost:8081/api/healthz
curl -I http://localhost:21709
```

## 15. Registro da Implementacao

Implementado em 18/07/2026:

- `AppLayout.tsx` recebeu estado `isSidebarCollapsed` com persistencia em `localStorage`.
- Sidebar desktop passou a usar `sticky top-0 h-dvh`, largura condicional `w-64`/`w-20` e transicao de largura.
- Menu da sidebar usa scroll interno via `ScrollArea` com `min-h-0 flex-1`.
- Rodape com usuario, `Meu Perfil` e `Sair` ficou fora do scroll, com `shrink-0`, mantendo-se no fim da lateral.
- Botao de recolher/expandir foi adicionado no topo com icones `PanelLeftClose`/`PanelLeftOpen`.
- Itens da sidebar recolhida mostram apenas icones, mantem `aria-label` e exibem tooltip lateral.
- Badge de `Avisos de Recaptura` foi adaptado para posicao compacta no modo recolhido.
- Logout continua usando `AlertDialog`.
- Documentacao atualizada em `docs/04-frontend-guidelines.md` e `docs/paginas-por-perfil.md`.

Validacao executada:

- `pnpm --filter @workspace/proposta run typecheck`
- `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`

Pendente:

- validar visualmente ADMIN/COMERCIAL em desktop;
- validar que o menu mobile segue sem regressao.
