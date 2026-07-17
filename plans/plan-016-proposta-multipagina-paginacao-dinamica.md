# Plano 016 - Proposta Multipagina com Paginacao Dinamica por Altura

- Projeto: Sistema de Propostas
- Tipo: WEB frontend
- Stack: TypeScript, React, Vite, Tailwind CSS, CSS print A4
- Data: 2026-07-14
- Status: Implementado
- Escopo: refatoracao da geracao/impressao da proposta para layout multipagina controlado pelo sistema

## 1. Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `artifacts/proposta/src/components/proposal/ProposalPrint.tsx`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/index.css`
- Planos anteriores de PDF/print: `plan-006`, `plan-007` e `plan-008`

## 2. Agentes Recomendados

| Agente | Papel nesta tarefa |
|---|---|
| Product Manager | Confirmar que o escopo e somente paginacao, sem alterar identidade visual, cores, hero, indicadores ou card. |
| Software Architect | Definir a arquitetura do paginador, separando medicao, calculo de paginas e renderizacao. |
| Frontend Engineer | Implementar componentes React, hooks de medicao e integracao com o fluxo atual de `ProposalPrint`. |
| UX/UI Designer | Validar consistencia visual entre pagina 1, paginas intermediarias e pagina final. |
| QA Engineer | Validar cenarios com 0, 1, 2, 4, 5, 12, 20, 50 e 100 produtos, garantindo que nenhum card quebre. |
| Technical Writer | Atualizar documentacao funcional e registrar mudancas de comportamento no fluxo de PDF. |

Observacao: nao ha necessidade de Backend API Engineer, Database Engineer ou DevOps Engineer nesta tarefa, pois nao ha mudanca de API, banco, schema ou infraestrutura.

## 3. Contexto Tecnico Atual

O componente atual de impressao esta em:

- `artifacts/proposta/src/components/proposal/ProposalPrint.tsx`

Hoje ele usa:

```ts
const PRODUCTS_PER_PAGE = 4;

function paginateProducts<T>(products: T[]): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < products.length; i += PRODUCTS_PER_PAGE) {
    pages.push(products.slice(i, i + PRODUCTS_PER_PAGE));
  }
  return pages.length > 0 ? pages : [[]];
}
```

Problema:

- a capacidade por pagina e fixa em 4 produtos;
- o tamanho real dos cards nao e considerado;
- cards com descricoes longas podem ocupar mais espaco;
- cards pequenos poderiam permitir mais itens por pagina;
- investimento e rodape ficam dependentes de uma distribuicao fixa, nao da altura real disponivel.

O fluxo atual de impressao em `proposals/edit.tsx` ja usa `ProposalPrint` via portal e intercepta o botao `PDF` e `Ctrl/Cmd + P`. Isso deve ser preservado.

## 4. Objetivo da Implementacao

Refatorar a geracao da proposta impressa para que o sistema controle as paginas antes da impressao final.

Objetivos:

- remover `PRODUCTS_PER_PAGE = 4` como regra principal;
- criar paginacao por altura real dos cards;
- renderizar paginas A4 independentes;
- impedir que o navegador decida onde quebrar a proposta;
- manter investimento e rodape sempre juntos na ultima pagina;
- permitir qualquer quantidade de produtos;
- manter a identidade visual atual.

Nao objetivos:

- nao mudar cores;
- nao mudar tipografia;
- nao mudar layout do hero;
- nao mudar layout dos indicadores;
- nao mudar conteudo interno dos cards, exceto ajustes tecnicos necessarios para medicao consistente;
- nao trocar `window.print` por Puppeteer neste ciclo.

## 5. Arquitetura Proposta

Separar o fluxo em tres camadas:

```text
Dados da proposta
  ↓
Medicao e paginacao
  ↓
Renderizacao de paginas prontas
```

Componentes/arquivos sugeridos:

```text
artifacts/proposta/src/components/proposal/print/
├── ProposalPrintLayout.tsx
├── ProposalPrintPage.tsx
├── ProposalPrintSections.tsx
├── ProposalPrintMeasure.tsx
├── proposal-print-pagination.ts
└── proposal-print-types.ts
```

Ou, caso o time prefira menor fragmentacao, manter no diretorio atual mas separar no minimo:

- `ProposalPrint.tsx`: componente orquestrador;
- `proposal-print-pagination.ts`: algoritmo puro;
- `ProposalPrintMeasure.tsx`: medicao offscreen;
- `ProposalPrintSections.tsx`: subcomponentes visuais.

## 6. Modelo de Dados Interno do Print

Criar tipos internos para a pagina impressa:

```ts
type PrintProduct = {
  id: string;
  title: string;
  description?: string | null;
  qty?: string | null;
  program?: string | null;
  durationLabel?: string | null;
  airTime?: string | null;
  seasonality?: string | null;
};

type ProductMeasurement = {
  productId: string;
  heightPx: number;
};

type PrintPageKind = 'first' | 'continuation' | 'last' | 'single';

type PrintPage = {
  kind: PrintPageKind;
  products: PrintProduct[];
  showHero: boolean;
  showStats: boolean;
  showInvestment: boolean;
  showFooter: boolean;
};
```

## 7. Estrategia de Medicao

### 7.1 Por que medir

O PRD exige que a quantidade de cards por pagina seja orientada por espaco vertical real, nao por numero fixo.

Para isso, o sistema deve medir:

- altura real de cada card de produto;
- altura das secoes fixas da pagina 1;
- altura do cabecalho de continuacao;
- altura do investimento;
- altura do rodape;
- gaps verticais do grid.

### 7.2 Como medir

Criar um componente `ProposalPrintMeasure` renderizado fora da area visivel:

```tsx
<div
  aria-hidden
  style={{
    position: 'absolute',
    left: '-10000px',
    top: 0,
    width: '210mm',
    visibility: 'hidden',
    pointerEvents: 'none',
  }}
>
  ...
</div>
```

Esse componente renderiza:

- uma pagina base A4 com as mesmas classes e larguras do print;
- um card por produto para medir `getBoundingClientRect().height`;
- blocos fixos para medir hero, stats, header, investment e footer.

Depois de medir, retorna um objeto com as alturas para o algoritmo puro.

### 7.3 Fluxo em React

```text
1. Usuario clica em PDF ou Ctrl/Cmd + P
2. `ProposalPrint` entra em modo "measuring"
3. Renderiza `ProposalPrintMeasure` offscreen
4. Mede alturas com `requestAnimationFrame`
5. Executa `paginateByHeight`
6. Renderiza `ProposalPrintLayout` com paginas prontas
7. Chama `window.print`
8. Limpa estado apos `afterprint`
```

O print final so deve ser chamado depois que `pages.length > 0`.

## 8. Algoritmo de Paginacao

Criar funcao pura:

```ts
function paginateProposalProducts(input: {
  products: PrintProduct[];
  measurements: ProductMeasurement[];
  pageHeightPx: number;
  firstPageReservedHeightPx: number;
  continuationPageReservedHeightPx: number;
  lastPageReservedHeightPx: number;
  gridGapPx: number;
}): PrintPage[] {
  // retorna paginas prontas para renderizacao
}
```

### 8.1 Regras do algoritmo

1. Pagina 1:
   - sempre contem header, hero e, se existir, apresentacao;
   - recebe o maximo de produtos que couberem no espaco restante;
   - se todos os produtos couberem, vira `single` e tambem renderiza investimento + rodape.

2. Paginas intermediarias:
   - contem header compacto;
   - contem label `Plano de Acoes - Continuacao`;
   - recebem o maximo de produtos que couberem;
   - nao renderizam hero, indicadores, investimento ou rodape.

3. Pagina final:
   - contem header compacto;
   - contem label `Plano de Acoes - Continuacao`, exceto se for tambem a pagina unica;
   - recebe os produtos finais;
   - reserva espaco obrigatorio para investimento + rodape;
   - investimento e rodape nunca podem ficar sozinhos sem pelo menos um produto, salvo proposta sem produtos.

4. Proposta sem produtos:
   - renderiza uma pagina unica;
   - exibe estado vazio no plano de acoes;
   - renderiza investimento e rodape na mesma pagina.

5. Card maior que a area util:
   - nunca dividir o card;
   - renderizar o card sozinho em uma pagina;
   - aplicar clamp/limite visual existente para preservar layout profissional;
   - registrar comentario tecnico para futura estrategia de anexos se necessario.

### 8.2 Tratamento especial da ultima pagina

O algoritmo deve testar se a pagina atual consegue receber tambem investimento + rodape.

Exemplo:

```text
Produtos restantes: 1
Pagina atual tem espaco para produto + investimento + rodape
→ marcar como ultima pagina

Produtos restantes: 1
Pagina atual nao tem espaco para produto + investimento + rodape
→ criar nova pagina final
```

Isso evita investimento isolado.

## 9. Componentes Esperados

### 9.1 `ProposalPrint`

Responsavel por:

- receber `proposal`;
- normalizar produtos;
- controlar estado de medicao/paginas;
- renderizar `ProposalPrintMeasure`;
- renderizar `ProposalPrintLayout`;
- disparar callback de pronto para imprimir, se necessario.

Nao deve conter o algoritmo detalhado de paginacao.

### 9.2 `ProposalPrintLayout`

Responsavel por:

- receber `pages: PrintPage[]`;
- renderizar uma lista de `ProposalPrintPage`;
- garantir `break-after: page` em todas as paginas exceto a ultima.

### 9.3 `ProposalPrintPage`

Responsavel por:

- renderizar o container A4;
- decidir quais secoes aparecem com base no objeto `PrintPage`;
- aplicar `overflow: hidden` e dimensoes fixas.

### 9.4 `ProposalPrintSections`

Centralizar secoes visuais reutilizaveis:

- `PrintHeader`;
- `PrintHero`;
- `PrintStats`;
- `PrintProducts`;
- `PrintProductCard`;
- `PrintInvestment`;
- `PrintFooter`;
- `PrintSectionLabel`.

### 9.5 `ProposalPrintMeasure`

Responsavel por:

- renderizar elementos offscreen;
- medir alturas reais;
- retornar medidas via callback.

## 10. CSS Print

Arquivo:

- `artifacts/proposta/src/index.css`

Regras obrigatorias:

```css
@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  #proposal-print-root {
    display: block !important;
    visibility: visible !important;
    position: fixed !important;
    inset: 0 auto auto 0 !important;
    width: 210mm !important;
  }

  .proposal-print-page {
    width: 210mm !important;
    height: 297mm !important;
    min-height: 297mm !important;
    max-height: 297mm !important;
    overflow: hidden !important;
    break-after: page !important;
    page-break-after: always !important;
  }

  .proposal-print-page:last-child {
    break-after: auto !important;
    page-break-after: auto !important;
  }

  .proposal-print-product-card,
  .proposal-print-investment,
  .proposal-print-footer {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
}
```

Importante:

- `height: 297mm` deve substituir `min-height` como regra principal do container de pagina;
- manter `print-color-adjust: exact`;
- manter backgrounds criticos inline quando ja existentes;
- nao permitir scroll interno no print final.

## 11. Integracao com `proposals/edit.tsx`

O fluxo atual ja possui:

- `printIntent`;
- `startProposalPrint`;
- interceptacao de `Ctrl/Cmd + P`;
- renderizacao condicional de `<ProposalPrint proposal={proposalPrintData} />`.

Alteracao esperada:

- `ProposalPrint` deve aceitar uma prop opcional `onReadyToPrint`;
- ou controlar internamente o `window.print` somente depois da paginacao estar pronta;
- evitar chamar `window.print` antes da medicao terminar.

Decisao recomendada:

```tsx
<ProposalPrint
  proposal={proposalPrintData}
  onReady={() => window.print()}
/>
```

Assim, `edit.tsx` continua orquestrando o momento da impressao, mas a impressao so acontece quando as paginas ja foram calculadas.

## 12. Plano de Implementacao

### Fase 1 - Preparacao

1. Ler `ProposalPrint.tsx`, `ProposalPreview.tsx`, `edit.tsx` e `index.css`.
2. Identificar todas as classes CSS usadas pelo print atual.
3. Garantir que o visual atual seja preservado como baseline.
4. Criar tipos internos de print.

### Fase 2 - Separar secoes visuais

1. Extrair `PrintHeader`, `PrintHero`, `PrintStats`, `PrintProducts`, `PrintProductCard`, `PrintInvestment`, `PrintFooter` para arquivo proprio.
2. Manter classes CSS atuais.
3. Nao alterar visual nesta fase.
4. Rodar typecheck.

### Fase 3 - Criar medidor offscreen

1. Criar `ProposalPrintMeasure`.
2. Renderizar pagina A4 invisivel com mesma largura util.
3. Medir alturas fixas e cards.
4. Retornar objeto de medidas.
5. Garantir que medicao rode novamente quando produtos ou dados visuais mudarem.

### Fase 4 - Criar algoritmo puro

1. Criar `proposal-print-pagination.ts`.
2. Implementar `paginateProposalProducts`.
3. Cobrir cenarios com produtos pequenos, medios, grandes e lista vazia.
4. Evitar numeros magicos de cards por pagina.
5. Manter constantes apenas para dimensoes/gaps/reservas tecnicas documentadas.

### Fase 5 - Renderizar paginas prontas

1. Criar `ProposalPrintLayout`.
2. Criar `ProposalPrintPage`.
3. Receber `pages` prontas do algoritmo.
4. Renderizar pagina 1, intermediarias e ultima conforme flags de cada `PrintPage`.
5. Garantir que investimento e rodape aparecem somente na ultima pagina.

### Fase 6 - Ajustar CSS A4

1. Trocar `min-height` por `height/max-height` no container final de pagina.
2. Garantir `overflow: hidden`.
3. Aplicar `break-after: page` por pagina.
4. Aplicar `break-inside: avoid` em cards, investimento e rodape.
5. Preservar `print-color-adjust`.

### Fase 7 - Integrar com botao PDF e Ctrl/Cmd + P

1. Ajustar `ProposalPrint` para sinalizar quando as paginas estiverem prontas.
2. Garantir que `window.print()` so rode depois da medicao e paginacao.
3. Validar que botao PDF e atalho usam o mesmo fluxo.
4. Garantir limpeza de estado apos `afterprint`.

### Fase 8 - Documentacao

1. Atualizar `docs/paginas-por-perfil.md`.
2. Atualizar `docs/MUDANCAS.MD`.
3. Marcar checklist final deste plano.

## 13. QA Obrigatorio

Validar propostas com:

- [ ] 0 produtos.
- [ ] 1 produto.
- [ ] 2 produtos.
- [ ] 4 produtos.
- [ ] 5 produtos.
- [ ] 12 produtos.
- [ ] 20 produtos.
- [ ] 50 produtos.
- [ ] 100 produtos.

Para cada caso:

- [ ] nenhuma pagina deve ter card cortado;
- [ ] nenhuma pagina deve depender de quebra automatica do navegador;
- [ ] investimento deve aparecer somente na ultima pagina;
- [ ] investimento e rodape devem aparecer juntos;
- [ ] hero e indicadores devem aparecer somente na primeira pagina;
- [ ] paginas intermediarias devem exibir cabecalho compacto e continuacao do plano de acoes;
- [ ] pagina final deve ficar visualmente profissional, sem investimento isolado;
- [ ] PDF salvo pelo Chrome deve preservar cores e pagina A4;
- [ ] impressao fisica deve respeitar A4.

## 14. Validacao Tecnica

Rodar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Validacao visual recomendada:

1. Abrir `http://localhost:21709`.
2. Entrar como ADMIN ou COMERCIAL.
3. Abrir uma proposta com diferentes quantidades de produtos.
4. Clicar em `PDF`.
5. Conferir pre-visualizacao de impressao.
6. Salvar como PDF.
7. Repetir com `Ctrl/Cmd + P`.

## 15. Criterios de Aceite

- [ ] `PRODUCTS_PER_PAGE = 4` deixa de ser a regra principal de paginacao.
- [ ] Produtos sao paginados por altura real medida.
- [ ] Proposta com ate poucos produtos continua podendo sair em uma unica pagina.
- [ ] Proposta com muitos produtos gera paginas independentes A4.
- [ ] Paginas intermediarias nao repetem hero nem indicadores.
- [ ] Ultima pagina sempre contem os ultimos produtos, investimento e rodape.
- [ ] Investimento nunca aparece sozinho.
- [ ] Nenhum card e dividido entre paginas.
- [ ] A identidade visual atual e preservada.
- [ ] Botao PDF e `Ctrl/Cmd + P` usam o novo fluxo.
- [ ] Typecheck passa.
- [ ] Build frontend passa.
- [ ] Docker rebuild e healthcheck passam, se Docker estiver disponivel.

## 16. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Medicao variar entre tela e print | Usar o mesmo CSS/classes e mesma largura A4 no medidor offscreen. |
| `window.print()` abrir antes do calculo terminar | Disparar impressao somente apos `pages` calculadas e renderizadas. |
| Card muito alto nao caber em nenhuma pagina | Renderizar sozinho com clamp/limite ja existente e documentar fallback. |
| Layout ficar instavel com fontes carregando depois | Aguardar `document.fonts.ready` quando disponivel antes de medir. |
| Regressao visual do PDF atual | Separar extracao de componentes da troca de algoritmo e validar visual a cada fase. |
| Muitos produtos causarem lentidao na medicao | Medir cada card uma vez por ciclo de print e usar arrays memoizados. |

## 17. Checklist Final da Implementacao

Implementado em 2026-07-14:

- [x] Agentes consultados e escopo confirmado.
- [x] Componentes de secoes extraidos em `components/proposal/print/ProposalPrintSections.tsx`.
- [x] `ProposalPrintMeasure` criado.
- [x] Algoritmo `paginateProposalProducts` criado.
- [x] `ProposalPrintLayout` criado.
- [x] `ProposalPrintPage` criado.
- [x] `ProposalPrint` integrado ao novo fluxo.
- [x] `edit.tsx` ajustado para imprimir apos paginas prontas.
- [x] CSS A4 atualizado com altura fixa e quebra controlada.
- [ ] Testes manuais com 0, 1, 2, 4, 5, 12, 20, 50 e 100 produtos.
- [x] Documentacao atualizada em `docs/paginas-por-perfil.md` e `docs/MUDANCAS.MD`.
- [x] `pnpm run typecheck` executado com sucesso.
- [x] Build frontend executado com sucesso.
- [x] Docker rebuild executado com sucesso.
- [x] Healthcheck validado com sucesso.

Resumo tecnico:

- A regra fixa `PRODUCTS_PER_PAGE = 4` foi removida.
- O print agora mede os cards em um root offscreen A4 antes de paginar.
- A paginacao considera altura real dos cards, cabecalho, hero, apresentacao, label de produtos, investimento, rodape e gaps do grid.
- O botao `PDF` e o atalho `Ctrl/Cmd + P` aguardam `ProposalPrint` sinalizar `onReady` antes de chamar `window.print()`.
- O CSS de print passou a tratar cada `.proposal-print-page` como folha A4 fechada, com `height/max-height: 297mm`, `overflow: hidden` e `break-after: page`.

Validacao tecnica executada:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Observacao de QA:

- A validacao manual com datasets de 0, 1, 2, 4, 5, 12, 20, 50 e 100 produtos ainda deve ser feita no navegador para confirmar visualmente a pre-visualizacao de impressao e o PDF salvo.
