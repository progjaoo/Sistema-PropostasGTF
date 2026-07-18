# Plano 024 - Web Mobile First para Navegadores de Celular

- Projeto: GTF Propostas
- Data: 18/07/2026
- Tipo: WEB responsivo
- Stack: TypeScript, React, Vite, Tailwind CSS, shadcn/ui, Radix UI, TanStack Query, Wouter
- Escopo: frontend web autenticado e paginas publicas
- Status: Implementado - QA em aparelho fisico e perfil COMERCIAL pendentes
- Agente principal recomendado: Frontend Engineer
- Agentes de apoio: Product Manager, Software Architect, UX/UI Designer, QA Engineer e Technical Writer

## 1. Referencias Consultadas

- `docs/README.md`
- `docs/04-frontend-guidelines.md`
- `docs/paginas-por-perfil.md`
- `docs/10-qualidade-validacao-contribuicao.md`
- `.agents/README.md`
- `.agents/agent-product-manager.md`
- `.agents/agent-software-architect.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `.agents/agent-qa-engineer.md`
- `.agents/agent-technical-writer.md`
- `artifacts/proposta/src/App.tsx`
- `artifacts/proposta/src/index.css`
- `artifacts/proposta/src/components/layout/AppLayout.tsx`
- `artifacts/proposta/src/components/ui/dialog.tsx`
- `artifacts/proposta/src/components/ui/alert-dialog.tsx`
- `artifacts/proposta/src/components/proposal/ProposalProgressTimeline.tsx`
- Paginas em `artifacts/proposta/src/pages`

Guidelines complementares aplicadas ao planejamento:

- `frontend-design`: preservar a identidade operacional do GTF Propostas, priorizar hierarquia, legibilidade e controles adequados ao toque.
- `vercel-react-best-practices`: evitar duplicacao de requisicoes e arvores pesadas, aplicar divisao de bundle por rota e carregar recursos pesados apenas quando necessarios.

## 2. Objetivo

Tornar o sistema web integralmente utilizavel nos navegadores de celulares, adotando mobile first como criterio de composicao das telas sem remover ou simplificar regras funcionais existentes.

O resultado deve permitir que ADMIN e COMERCIAL realizem no celular os mesmos fluxos autorizados no desktop:

- autenticar e recuperar senha;
- navegar pelo sistema;
- consultar Dashboard;
- listar, filtrar, criar, editar e acompanhar propostas;
- consultar e tratar avisos de recaptura;
- gerenciar Clientes e Leads;
- editar o proprio perfil;
- executar os cadastros administrativos permitidos;
- visualizar o preview e gerar o PDF A4 sem regressao.

## 3. Agentes Selecionados

| Agente | Responsabilidade no plano |
|---|---|
| Frontend Engineer | Agente principal. Implementar shell responsivo, componentes compartilhados e adaptacao das paginas React. |
| Product Manager | Garantir paridade funcional entre desktop e celular para ADMIN e COMERCIAL. |
| Software Architect | Separar comportamento responsivo compartilhado de ajustes especificos por pagina e evitar duplicacao de dados. |
| UX/UI Designer | Definir navegacao mobile, hierarquia, controles de toque, filtros e densidade operacional. |
| QA Engineer | Validar rotas, perfis, viewports, navegadores, orientacao, teclado virtual e regressao do PDF. |
| Technical Writer | Atualizar guidelines e documentacao das paginas apos a implementacao. |

## 4. Decisoes de Produto e UX

### 4.1 Mobile first sem criar outro sistema

- O frontend web continuara sendo uma unica aplicacao React.
- Nao criar paginas ou endpoints exclusivos para celular.
- Componentes devem partir do layout de menor largura e evoluir com `sm`, `md`, `lg` e `xl`.
- Quando a interacao realmente mudar entre celular e desktop, compartilhar os mesmos dados, mutations e regras; somente a apresentacao deve variar.

### 4.2 Navegacao

- Desktop mantem sidebar lateral.
- Celular recebe cabecalho compacto e fixo com:
  - botao de menu;
  - logo/nome reduzido;
  - titulo ou contexto da rota;
  - badge de avisos de recaptura quando houver pendencias.
- O menu mobile abre em `Sheet` lateral, reutilizando os mesmos itens, permissoes e estado ativo da sidebar.
- Perfil e logout ficam no rodape do `Sheet`.
- O menu fecha automaticamente ao navegar.
- Nao adotar barra inferior neste plano: ADMIN possui muitos destinos e o `Sheet` preserva a arquitetura atual sem esconder funcoes administrativas.

### 4.3 Filtros

- Busca principal permanece visivel quando for essencial.
- Filtros secundarios abrem em `Sheet` ou `Drawer` pelo botao `Filtros`.
- O botao mostra a quantidade de filtros ativos.
- Filtros aplicados aparecem como chips removiveis com acao `Limpar filtros`.
- Desktop mantem a grade horizontal atual.

### 4.4 Tabelas e listas

- Rolagem horizontal nao deve ser o padrao de navegacao no celular.
- Tabelas densas devem ter:
  - tabela no desktop;
  - cards operacionais no celular, com labels explicitos e menu de acoes.
- Timeline e preview A4 podem ter rolagem horizontal intencional, mas devem indicar visualmente que o conteudo pode ser arrastado.

### 4.5 Acoes

- Alvos de toque devem ter no minimo `44px x 44px`.
- Acoes principais devem ocupar largura total quando estiverem isoladas no celular.
- Grupos grandes de acoes devem usar uma acao primaria visivel e menu de opcoes para as demais.
- Barras de salvar/status em formularios longos podem ficar fixas no rodape, respeitando `env(safe-area-inset-bottom)`.
- Exclusoes e rejeicoes continuam usando `AlertDialog`; toasts continuam passando por `src/lib/feedback.ts`.

### 4.6 Identidade visual

- Preservar cores, tipografia, nomes, badges e linguagem operacional atuais.
- Nao transformar paginas administrativas em landing pages ou composicoes decorativas.
- Reduzir apenas espacamentos e tamanhos de titulo em telas pequenas; nao reduzir texto a ponto de prejudicar leitura.

## 5. Diagnostico do Codigo Atual

### 5.1 Problemas transversais

1. `AppLayout.tsx` esconde a sidebar com `hidden md:flex`, mas nao oferece navegacao alternativa no celular.
2. O conteudo principal usa `p-6` fixo, consumindo largura excessiva em telas de 320px a 430px.
3. O layout usa `h-screen`, sem tratamento para barra dinamica dos navegadores mobile e safe areas.
4. `index.html` possui `maximum-scale=1`, impedindo zoom do usuario e prejudicando acessibilidade.
5. `DialogContent` e `AlertDialogContent` usam `w-full` centralizado sem margem lateral mobile e sem limite de altura padrao.
6. O `ToastContainer` fica sempre em `bottom-right`; no celular pode ocupar largura inadequada e conflitar com barras fixas.
7. Nao ha tokens/utilitarios globais para safe area, altura `dvh`, padding de pagina ou barra de acao mobile.

### 5.2 Telas de maior risco

#### Editor de Proposta

- `pages/proposals/edit.tsx` usa altura `calc(100vh - 6rem)`, margem negativa e painel fixo de `420px`.
- Editor e preview ficam lado a lado sem modo mobile.
- Preview aplica escala fixa `0.8`, maior que a largura util de celulares.
- Modais de Cliente/Lead e catalogo precisam respeitar teclado virtual e altura disponivel.

#### Propostas

- `pages/proposals/progress.tsx` usa mestre/detalhe em duas colunas apenas em `xl`.
- No celular, a lista de programas e todas as propostas ficam em uma unica pagina longa.
- Os filtros ocupam quatro blocos.
- Cards possuem muitas acoes e metadados.
- A timeline usa `min-w-[680px]`, exigindo uma experiencia de rolagem planejada.

#### Dashboard

- Filtros internos possuem ate sete colunas no desktop.
- Cards de status ja quebram em grade, mas precisam ficar compactos em `2 x 2`.
- Linhas de proposta devem priorizar cliente, status e acao no celular.

#### Clientes e Leads

- A listagem atual usa tabela e `overflow-x-auto`.
- Linhas expandidas de propostas vinculadas precisam virar blocos verticais no celular.
- Acoes e informacoes restritas por responsavel devem continuar respeitando `viewerCanEdit`.

#### Usuarios

- A tabela possui `min-w-[900px]`.
- A matriz de acesso por empresa possui tres colunas fixas.
- O modal de usuario deve transformar cada acesso de empresa em bloco vertical com switches identificados.

#### Produtos, Programas e Empresas

- Filtros administrativos possuem muitas colunas.
- Produtos usam mestre/detalhe por programa.
- Modal de Programa tem formulario, upload e lista de produtos em area alta.
- Itens de Apresentacao da Empresa usam grade fixa no desktop.

### 5.3 Telas com base responsiva parcial

- Login, recuperacao de senha, redefinicao, Nova Proposta, Perfil e Tipos de Proposta ja possuem estruturas de uma coluna ou breakpoints basicos.
- Essas telas ainda precisam da revisao transversal de viewport, safe area, teclado, dialogs, botoes e espacamento.

## 6. Escopo

### Incluido

- Navegacao mobile completa.
- Adaptacao de todas as rotas web publicas e autenticadas.
- Componentes compartilhados para filtros, listas, dialogs e acoes.
- Ajustes de acessibilidade para toque, zoom, foco e teclado.
- Otimizacao de bundle e renderizacao relevante para redes e aparelhos moveis.
- QA em viewports mobile, tablet e desktop.
- Atualizacao da documentacao.

### Fora do Escopo

- Alterar API, contratos ou endpoints.
- Alterar Prisma/PostgreSQL ou migrations.
- Alterar permissoes ADMIN/COMERCIAL.
- Alterar regras de propostas, recaptura, Leads ou Clientes.
- Redesenhar o PDF A4 ou sua paginacao.
- Alterar o aplicativo React Native + Expo.
- Criar PWA, suporte offline ou notificacao push.
- Substituir Wouter, TanStack Query, shadcn/ui ou Tailwind.

## 7. Arquitetura Recomendada

### 7.1 Componentes compartilhados

Criar ou consolidar:

```text
artifacts/proposta/src/components/layout/
  AppLayout.tsx
  MobileAppHeader.tsx
  MobileNavigationSheet.tsx

artifacts/proposta/src/components/responsive/
  PageHeader.tsx
  ResponsiveFilters.tsx
  ActiveFilterChips.tsx
  MobileEntityCard.tsx
  MobileStickyActions.tsx
  ResponsiveMasterDetail.tsx
```

Os nomes podem ser ajustados durante a implementacao, desde que as responsabilidades permaneçam separadas.

### 7.2 Regras de implementacao

- Definir dados de navegacao uma unica vez e renderiza-los na sidebar e no `Sheet`.
- Nao disparar uma segunda query para renderizar a versao mobile.
- Evitar manter simultaneamente arvores completas de tabela e cards para listas muito grandes.
- Usar `useIsMobile` apenas quando o comportamento/interacao for diferente; preferir CSS responsivo para mudancas apenas visuais.
- Extrair componentes fora do corpo das paginas para evitar recriacao por render.
- Usar `content-visibility: auto` somente em listas longas onde nao prejudique foco, medicao ou acessibilidade.
- Preservar query keys, mutations e invalidacoes atuais.

### 7.3 Breakpoints e viewports de referencia

| Faixa | Uso |
|---|---|
| 320px a 479px | Celular compacto, composicao de uma coluna |
| 480px a 767px | Celular grande, uma coluna com grupos `2 x 2` quando couber |
| 768px a 1023px | Tablet, sidebar/drawer conforme espaco e ate duas colunas |
| 1024px ou mais | Layout desktop operacional atual |

O breakpoint exato da sidebar deve ser validado visualmente. A recomendacao inicial e manter sidebar somente a partir de `lg`, liberando mais espaco em tablets.

## 8. Plano de Implementacao

### Fase 1 - Baseline e inventario visual

1. Registrar screenshots das rotas principais antes da alteracao em 390px, 768px e 1440px.
2. Mapear estados com dados, vazio, loading, erro e dialog aberto.
3. Confirmar rotas por perfil:
   - ADMIN;
   - COMERCIAL.
4. Registrar problemas de:
   - rolagem horizontal do documento;
   - texto cortado;
   - botoes sobrepostos;
   - teclado cobrindo campos;
   - dialogs fora da tela;
   - acoes inacessiveis sem hover.

### Fase 2 - Fundacao mobile global

Arquivos principais:

- `artifacts/proposta/index.html`
- `artifacts/proposta/src/index.css`
- `artifacts/proposta/src/components/layout/AppLayout.tsx`

Tarefas:

1. Remover `maximum-scale=1` da meta viewport.
2. Adicionar suporte a safe areas:
   - `env(safe-area-inset-top)`;
   - `env(safe-area-inset-right)`;
   - `env(safe-area-inset-bottom)`;
   - `env(safe-area-inset-left)`.
3. Usar `min-height: 100dvh` com fallback para `100vh`.
4. Ajustar padding principal para `px-4 py-4 sm:px-6 sm:py-6`.
5. Impedir overflow horizontal acidental no shell, sem esconder overflow legitimo de componentes.
6. Padronizar tamanho minimo de controles de toque.
7. Ajustar Toastify no celular:
   - largura `calc(100vw - 24px)`;
   - margem segura;
   - posicao que nao cubra a barra de acoes;
   - desktop continua em `bottom-right`.
8. Manter CSS de `@media print` isolado e inalterado funcionalmente.

### Fase 3 - Navegacao mobile

1. Extrair configuracao de `navItems` e `adminItems`.
2. Criar `MobileAppHeader`.
3. Criar `MobileNavigationSheet` com:
   - logo GTF;
   - itens filtrados por role;
   - secao Administracao para ADMIN;
   - badge de recaptura;
   - usuario, Meu Perfil e Sair.
4. Fechar o menu ao mudar de rota.
5. Manter foco no gatilho ao fechar.
6. Garantir `aria-label` no botao de menu.
7. Validar que logout continua usando `AlertDialog`.

### Fase 4 - Primitivos responsivos

#### Dialog e AlertDialog

1. Alterar defaults compartilhados para:
   - `w-[calc(100vw-2rem)]`;
   - `max-h-[calc(100dvh-2rem)]`;
   - `overflow-y-auto` quando aplicavel;
   - cantos e padding consistentes em mobile.
2. Garantir que o botao fechar tenha alvo de toque adequado.
3. Avaliar `Drawer` no celular somente para fluxos longos; confirmacoes continuam como `AlertDialog`.
4. Testar foco, `Esc`, scroll interno e teclado virtual.

#### Cabecalho de pagina

1. Criar padrao de titulo, descricao e acao.
2. Mobile:
   - titulo menor;
   - acao abaixo ou largura total;
   - sem sobreposicao.
3. Desktop preserva alinhamento horizontal.

#### Filtros

1. Criar botao `Filtros` com contador.
2. Renderizar filtros secundarios em `Sheet`/`Drawer` no celular.
3. Mostrar chips de filtros ativos.
4. Manter filtros desktop inline.
5. Preservar debounce, query params e chamadas existentes.

#### Listas

1. Criar padrao de card mobile com:
   - titulo;
   - status;
   - metadados com label;
   - acao primaria;
   - menu de acoes.
2. Nao depender de tooltip para informacao essencial no toque.
3. Preservar tabelas no desktop quando forem mais eficientes.

### Fase 5 - Paginas publicas e conta

Arquivos:

- `pages/login.tsx`
- `pages/forgot-password.tsx`
- `pages/reset-password.tsx`
- `pages/profile.tsx`
- `pages/not-found.tsx`

Tarefas:

1. Usar altura dinamica e safe area.
2. Garantir inputs com fonte minima de `16px` no mobile para evitar zoom automatico do iOS.
3. Evitar que teclado virtual esconda botao principal.
4. Fazer tabs de login/cadastro caberem em 320px.
5. Ajustar upload/avatar e formulario de Perfil para uma coluna.
6. Validar mensagens de erro, loading e link de recuperacao.

### Fase 6 - Dashboard mobile

Arquivo:

- `pages/dashboard.tsx`

Tarefas:

1. Exibir os quatro status em grade compacta `2 x 2` no celular.
2. Manter estado selecionado evidente sem depender de hover.
3. Deixar busca visivel e mover filtros secundarios para `ResponsiveFilters`.
4. Exibir propostas como cards no celular.
5. Priorizar no card:
   - Cliente/Lead;
   - status;
   - empresa;
   - responsavel;
   - atualizacao;
   - investimento;
   - botao Abrir proposta.
6. Ajustar paginacao para botoes de toque e resumo compacto.
7. Preservar paginacao server-side e filtro por status.

### Fase 7 - Propostas e andamento mobile

Arquivos:

- `pages/proposals/progress.tsx`
- `components/proposal/ProposalProgressTimeline.tsx`
- dialogs de andamento relacionados

Tarefas:

1. Busca permanece no topo; Empresa, Programa e Status vao para filtros mobile.
2. Substituir mestre/detalhe empilhado por fluxo compacto:
   - seletor/lista horizontal de Programas;
   - resumo do Programa selecionado;
   - propostas daquele Programa abaixo.
3. Nao renderizar uma longa coluna de Programas antes das propostas.
4. Cards de proposta:
   - cabecalho com cliente e status;
   - metadados em grade `2 x 2`;
   - acoes com largura adequada;
   - investimento separado e legivel;
   - produtos em chips com quebra de linha.
5. Timeline:
   - manter etapas horizontais;
   - usar scroll por toque com `scroll-snap`;
   - posicionar etapa atual no viewport;
   - manter labels legiveis;
   - fornecer alternativa textual da ultima etapa.
6. Dialog `Registrar andamento` deve caber com teclado aberto.
7. Botoes `Aprovada` e `Rejeitar` preservam cores e confirmacoes atuais.
8. ADMIN e COMERCIAL mantem exatamente as permissoes existentes.

### Fase 8 - Criacao e editor de proposta mobile

Arquivos:

- `pages/proposals/new.tsx`
- `pages/proposals/edit.tsx`
- `components/proposal/ProposalPreview.tsx`
- componentes de print apenas para garantir regressao zero

#### Nova Proposta

1. Compactar cabecalho e card.
2. Manter selects com altura de toque.
3. Empilhar botoes em 320px.
4. Garantir mensagens de permissao por empresa legiveis.

#### Editor

1. Criar modo mobile com controle segmentado:
   - `Editar`;
   - `Preview`.
2. Em `Editar`, painel ocupa toda a largura.
3. Em `Preview`, esconder formulario e mostrar preview centralizado.
4. Desktop continua com formulario e preview lado a lado.
5. Substituir `100vh` por altura dinamica e retirar dependencia de `-m-6` no mobile.
6. Rodape de status/salvar/PDF fica fixo e respeita safe area.
7. Accordions e cards de produto partem de uma coluna.
8. Cliente e Novo Lead:
   - dialogs responsivos;
   - resultados com altura calculada;
   - foco no campo de busca;
   - teclado nao cobre confirmacao.
9. Catalogo de produtos deve ter area rolavel com itens de toque.
10. Preview em tela:
    - calcular escala pela largura disponivel;
    - usar `ResizeObserver` ou wrapper equivalente;
    - corrigir altura visual do wrapper apos `transform`;
    - nunca alterar dimensoes do `ProposalPrint`.
11. `PDF`, `Ctrl+P`/`Cmd+P`, portal de print e A4 devem permanecer sem mudanca funcional.
12. Autosave e aviso `beforeunload` devem continuar funcionando ao trocar entre Editar e Preview.

### Fase 9 - Clientes, Leads e recaptura

Arquivos:

- `pages/advertisers/index.tsx`
- `pages/advertisers/new.tsx`
- `pages/advertisers/edit.tsx`
- `pages/recall-reminders/index.tsx`
- `components/notifications/RecallReminderDialog.tsx`

#### Clientes e Leads

1. Criar cards mobile em vez da tabela.
2. Exibir Nome, contato, status e quantidade de propostas.
3. Manter expandir/recolher propostas vinculadas.
4. Propostas vinculadas de outro COMERCIAL continuam:
   - sem titulo/valor sensivel;
   - sem clique;
   - com Programa, status e responsavel.
5. Acoes de editar/excluir devem ficar em menu ou barra clara.
6. Formularios Novo/Editar usam uma coluna e barra de acoes acessivel.

#### Avisos de Recaptura

1. Busca principal visivel; filtros secundarios em painel mobile.
2. Cards mostram marco, Lead/Cliente, proposta, responsavel e vencimento em ordem clara.
3. Acoes Abrir, Reagendar e Tratado devem caber sem largura fixa de `420px`.
4. Opcoes 7/15/30 dias devem empilhar ou usar Select no celular.
5. Dialog inicial de avisos deve usar quase toda a largura, scroll interno e rodape fixo.

### Fase 10 - Administracao mobile

#### Usuarios

Arquivo:

- `pages/admin/users.tsx`

Tarefas:

1. Trocar tabela `min-w-[900px]` por cards no celular.
2. Mostrar role, status, empresas e acoes sem truncar informacoes essenciais.
3. No modal de usuario, cada Empresa vira bloco com:
   - checkbox de acesso;
   - switch Criar proposta;
   - switch Ver catalogo.
4. Manter labels visiveis em vez de cabecalho de grade fixo.
5. Redefinicao de senha deve respeitar teclado e safe area.

#### Empresas

Arquivo:

- `pages/admin/station.tsx`

Tarefas:

1. Ajustar cabecalho, filtros e cards.
2. Modal de Empresa em uma coluna no celular.
3. Color picker ocupa largura disponivel.
4. Itens de Apresentacao ficam empilhados com excluir ao lado do titulo, sem sobreposicao.
5. Rodape de salvar permanece acessivel.

#### Produtos

Arquivo:

- `pages/admin/product-templates.tsx`

Tarefas:

1. Busca visivel; filtros secundarios no painel mobile.
2. Programas em seletor ou faixa horizontal compacta.
3. Produtos do programa selecionado abaixo.
4. Modal de Produto em uma coluna.
5. Dialog de duracao com teclado e botao acessiveis.

#### Programas

Arquivo:

- `pages/admin/proposal-categories.tsx`

Tarefas:

1. Filtros secundarios em painel mobile.
2. Cards de Programa em uma coluna.
3. Modal principal ocupa viewport util no celular.
4. Upload de icone, dados e produtos vinculados ficam empilhados.
5. Lista de produtos vinculados preserva checkbox, duracao e descricao sem corte.
6. Modal de produto inline segue o mesmo padrao responsivo.

#### Tipos de Proposta

Arquivo:

- `pages/admin/proposal-types.tsx`

Tarefas:

1. Manter cards de uma coluna.
2. Acao Novo Tipo em largura adequada.
3. Dialog com largura e teclado corrigidos pelos primitivos globais.

### Fase 11 - Desempenho em dispositivos moveis

1. Aplicar divisao de bundle por rota com `React.lazy`/`Suspense` para paginas pesadas:
   - editor;
   - Propostas;
   - cadastros administrativos.
2. Carregar componentes de print somente no fluxo de preview/impressao quando tecnicamente seguro.
3. Evitar imports amplos e duplicacao de arvores desktop/mobile.
4. Garantir que filtros nao disparem requisicoes duplicadas ao abrir/fechar Drawer.
5. Revisar memoizacao apenas em listas ou calculos realmente custosos.
6. Validar tamanho do bundle antes/depois e registrar chunks principais.
7. Manter o refresh automatico de autenticacao e retry de requisicoes funcionando apos code splitting.

### Fase 12 - Acessibilidade e comportamento mobile

1. Zoom do navegador permitido.
2. Navegacao completa por teclado.
3. Foco visivel em menu, dialogs, filtros e acoes.
4. `aria-label` em botoes somente com icone.
5. Sem informacao essencial apenas em hover/tooltip.
6. Labels associados aos campos.
7. Contraste preservado para status, alertas e botoes.
8. Respeitar `prefers-reduced-motion`.
9. Testar orientacao retrato e paisagem.
10. Testar teclado virtual em login, filtros e formularios longos.

### Fase 13 - Documentacao

Atualizar:

- `docs/04-frontend-guidelines.md`
- `docs/paginas-por-perfil.md`
- `docs/10-qualidade-validacao-contribuicao.md`
- `docs/README.md`, somente se for criado documento adicional

Registrar:

- estrategia mobile first;
- breakpoints;
- padrao de navegacao;
- padrao de filtros;
- tabela desktop x cards mobile;
- checklist minimo de QA responsivo.

## 9. Matriz de QA

### 9.1 Viewports obrigatorios

| Viewport | Objetivo |
|---|---|
| 320 x 568 | Menor largura suportada |
| 360 x 800 | Android compacto |
| 390 x 844 | iPhone moderno |
| 430 x 932 | Celular grande |
| 768 x 1024 | Tablet retrato |
| 1024 x 768 | Tablet paisagem |
| 1440 x 900 | Regressao desktop |

### 9.2 Navegadores

- Chrome Android.
- Safari iOS.
- Chrome desktop com emulacao mobile.
- Safari desktop/responsive mode, quando disponivel.

### 9.3 Fluxos ADMIN

- [ ] Login e recuperacao de senha.
- [ ] Abrir menu mobile e navegar por todas as rotas ADMIN.
- [ ] Dashboard: selecionar status, filtrar, paginar e abrir proposta.
- [ ] Propostas: selecionar Programa, registrar andamento, aprovar e rejeitar.
- [ ] Criar e editar proposta.
- [ ] Visualizar preview e gerar PDF.
- [ ] Tratar aviso de recaptura.
- [ ] Criar/editar Cliente e Lead.
- [ ] Gerenciar Usuario e acessos por Empresa.
- [ ] Criar/editar Empresa, Produto, Programa e Tipo de Proposta.
- [ ] Editar Meu Perfil e sair.

### 9.4 Fluxos COMERCIAL

- [ ] Login e menu sem itens exclusivos de ADMIN.
- [ ] Listar apenas propostas autorizadas.
- [ ] Criar proposta apenas para Empresa permitida.
- [ ] Registrar andamento, aprovar e rejeitar proposta propria.
- [ ] Ver catalogo conforme permissao.
- [ ] Ver proposta de outro responsavel em Cliente sem acessar dados redigidos.
- [ ] Tratar apenas os proprios avisos de recaptura.
- [ ] Editar Meu Perfil e sair.

### 9.5 Criterios visuais globais

- [ ] Nenhuma rota causa overflow horizontal no documento.
- [ ] Timeline e preview usam overflow apenas dentro do proprio componente.
- [ ] Nenhum texto sobrepoe botao, badge, label ou outro texto.
- [ ] Nenhum botao fica fora da viewport.
- [ ] Dialogs cabem no viewport e possuem scroll interno.
- [ ] Teclado virtual nao bloqueia campo ou confirmacao.
- [ ] Alvos de toque possuem no minimo 44px.
- [ ] Toasts nao cobrem navegacao ou barra de acoes.
- [ ] Safe areas sao respeitadas.
- [ ] Rotacao do aparelho nao quebra o layout.

### 9.6 Regressao tecnica

- [ ] Refresh automatico do token continua evitando `401` apos expirar o access token.
- [ ] TanStack Query nao duplica requisicoes por existir layout mobile.
- [ ] Autosave do editor continua funcionando.
- [ ] PDF A4 mantem paginacao, investimento e contato.
- [ ] `Ctrl+P`/`Cmd+P` continua preparando o print.
- [ ] AlertDialogs e toasts mantem padroes de cor.
- [ ] Permissoes permanecem protegidas pela API.

## 10. Validacao Tecnica

Comandos:

```bash
pnpm --filter @workspace/proposta run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Validacao visual:

1. Rodar a aplicacao local.
2. Validar todas as rotas com ADMIN e COMERCIAL.
3. Capturar screenshots nos viewports da matriz.
4. Comparar desktop antes/depois.
5. Gerar PDF com 0, 1, 4 e mais de 4 produtos.
6. Repetir os fluxos criticos em pelo menos um aparelho fisico iOS ou Android.

## 11. Criterios de Aceite

1. Todas as rotas acessiveis ao perfil podem ser usadas em navegador mobile a partir de 320px.
2. Existe navegacao mobile completa; nenhum item fica inacessivel porque a sidebar foi escondida.
3. Nenhuma tela depende de rolagem horizontal da pagina.
4. Tabelas densas possuem representacao adequada em cards no celular.
5. Filtros continuam completos e nao ocupam toda a primeira viewport.
6. O editor permite alternar entre formulario e preview no celular.
7. Salvar, alterar status e gerar PDF continuam acessiveis no editor.
8. Dialogs, AlertDialogs, selects e toasts cabem no viewport.
9. Teclado virtual nao impede envio de formularios.
10. Regras ADMIN/COMERCIAL permanecem inalteradas.
11. PDF A4 e impressao nao sofrem regressao.
12. Typecheck e build passam sem erros.
13. QA passa nos viewports, navegadores e fluxos definidos.
14. Documentacao de frontend e paginas por perfil e atualizada.

## 12. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Regressao no PDF ao alterar o editor | Isolar `ProposalPrint` e CSS `@media print`; validar PDF em fase propria. |
| Duplicar queries ao criar versoes mobile/desktop | Compartilhar hooks e dados; nao montar duas paginas completas em paralelo. |
| Menu mobile divergir da sidebar | Usar uma unica configuracao de navegacao e permissoes. |
| Teclado iOS esconder acoes | Usar `dvh`, scroll interno e barras que respeitam safe area. |
| Tabelas perderem informacao nos cards | Definir mapeamento explicito de colunas para labels e manter acoes completas. |
| Timeline ficar dificil de usar | Aplicar scroll-snap, etapa atual centralizada e resumo textual. |
| Bundle continuar pesado no 4G | Dividir por rota e medir chunks antes/depois. |
| Ajuste global de dialog quebrar modal especifico | Validar todos os dialogs e permitir override local apenas quando necessario. |
| Tablet ficar apertado com sidebar | Validar sidebar a partir de `lg` e usar menu mobile em larguras intermediarias. |

## 13. Checklist Final de Implementacao

> Preencher durante a implementacao. Nao marcar antecipadamente.

### Fundacao

- [x] Meta viewport permite zoom.
- [x] `100dvh` e safe areas configurados.
- [x] Padding mobile global aplicado.
- [x] Controles de toque revisados.
- [x] Toastify responsivo.

### Navegacao e componentes

- [x] Cabecalho mobile criado.
- [x] Menu mobile com permissoes e badge criado.
- [x] Dialog e AlertDialog responsivos.
- [x] Padrao de filtros mobile criado.
- [x] Padrao de cards mobile criado.
- [x] Barra de acoes mobile criada.

### Paginas

- [x] Login, Esqueci a senha e Redefinir senha.
- [x] Dashboard.
- [x] Propostas e timeline.
- [x] Nova Proposta.
- [x] Editor e preview.
- [x] Clientes.
- [x] Leads.
- [x] Avisos de Recaptura.
- [x] Meu Perfil.
- [x] Usuarios.
- [x] Empresas.
- [x] Produtos.
- [x] Programas.
- [x] Tipos de Proposta.
- [x] Pagina nao encontrada.

### Qualidade

- [x] Sem overflow horizontal acidental.
- [x] Sem sobreposicao de texto/acoes.
- [ ] Teclado virtual validado.
- [ ] Retrato e paisagem validados.
- [x] ADMIN validado.
- [ ] COMERCIAL validado.
- [ ] Refresh de sessao validado.
- [ ] Autosave validado.
- [ ] PDF A4 validado.
- [x] Bundle revisado.
- [x] Typecheck passou.
- [x] Build passou.
- [x] Docker e healthcheck passaram.
- [x] Documentacao atualizada.

## 14. Registro da Implementacao

Implementado em 18/07/2026:

- navegacao unica compartilhada entre sidebar desktop e menu mobile;
- cabecalho mobile com safe area, badge de recaptura, perfil e logout;
- primitivos responsivos para cabecalho, filtros, acoes, dialogs e preview A4;
- Dashboard `2 x 2`, listagens e filtros adaptados;
- Propostas com seletor compacto de Programa, cards, timeline rolavel e acoes responsivas;
- editor com modos `Editar`/`Preview`, escala calculada e barra de acoes mobile;
- cards mobile para Clientes, Leads e Usuarios;
- Recaptura, Empresas, Produtos, Programas, Tipos e Perfil adaptados;
- carregamento por rota com `React.lazy` e divisao dos principais vendors no Vite;
- reset do scroll interno ao navegar entre rotas;
- documentacao de frontend, paginas por perfil e QA atualizada.

Validacao executada:

- `pnpm --filter @workspace/proposta run typecheck`;
- `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`;
- `docker compose build --pull=false`;
- `docker compose up -d`;
- `curl -i http://localhost:8081/api/healthz`;
- `curl -I http://localhost:21709`;
- Chrome headless com viewport real `390 x 844` em Dashboard, Propostas, Usuarios, Clientes, Produtos, Programas, Empresas, Recaptura, Perfil, Nova Proposta e Editor;
- Chrome headless em `1440 x 900` para regressao do Dashboard desktop;
- em todas as rotas mobile medidas, `documentWidth` foi igual a `viewportWidth` (`390px`).

Validacao Docker concluida em 18/07/2026:

- imagem `sistema-propostas-app:latest` reconstruida com sucesso usando `--pull=false`;
- containers `sistema-propostas-api` e `sistema-propostas-frontend` recriados com a imagem nova;
- Postgres local mantido no volume `propostas_postgres_data`;
- API respondeu `200 OK` em `http://localhost:8081/api/healthz`;
- frontend respondeu `200 OK` em `http://localhost:21709`;
- logs confirmaram `prisma db push`, seed, build da API e Vite do frontend sem erro de inicializacao.

Pendencias de QA manual, sem bloquear a implementacao:

- testar teclado virtual em iOS/Android fisico;
- testar orientacao paisagem em aparelho;
- repetir matriz com usuario COMERCIAL;
- gerar e inspecionar PDF A4 a partir da imagem Docker atual.
