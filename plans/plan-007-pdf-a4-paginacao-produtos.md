# Plano 007 - PDF A4 Completo: Corte, Responsividade e Paginacao por Produtos

Status: Implementado tecnicamente; validacao visual manual do PDF salvo ainda pendente.

Projeto: Sistema de Propostas.

Data: 2026-07-10.

Tipo: WEB - Frontend only, sem mudanca de API ou banco.

Stack: TypeScript, React, Vite, Tailwind CSS.

## Agentes Definidos

Agente principal:

- Frontend Engineer: responsavel por criar o componente de print, integrar no editor e ajustar CSS.

Agentes de apoio:

- UX/UI Designer: responsavel por manter fidelidade visual, hierarquia A4 e legibilidade do PDF.
- QA Engineer: responsavel por validar cenarios com 0, 1, 2, 3, 4, 5, 8 e 9 produtos.
- Technical Writer: responsavel por atualizar `docs/rodar-local.md`, `docs/paginas-por-perfil.md`, `docs/MUDANCAS.MD` e este plano apos a execucao.

Referencias base:

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `.agents/agent-qa-engineer.md`
- `.agents/agent-technical-writer.md`
- `plans/plan-004-fluxo-propostas-programas-editor-pdf.md`
- `plans/plan-005-Hierarquia Programa-Emissora, Timeline de Lead.md`
- `plans/plan-006-pdf-a4-completo-formatacao-preservada.md`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/index.css`

## 1. Objetivo

Criar uma solucao robusta para gerar PDF A4 completo da proposta, sem cortes em Investimento, Assinatura ou Contato, independente da quantidade de produtos.

A solucao deve separar o preview de tela, que pode continuar usando escala visual, da renderizacao de impressao, que deve usar A4 real, sem `transform: scale(...)`, com paginacao por produtos e controle de que secoes aparecem em cada pagina.

## 2. Escopo

Incluido:

- Criar componente exclusivo para impressao: `ProposalPrint.tsx`.
- Renderizar o print via `ReactDOM.createPortal` em `document.body`.
- Paginar produtos em grupos de 4 por pagina.
- Manter Hero e Apresentacao apenas na primeira pagina.
- Manter Investimento e Rodape de Contato apenas na ultima pagina.
- Repetir cabecalho em todas as paginas.
- Esconder completamente sidebar, editor e botoes no PDF.
- Forcar fundos e cores criticas por `style` inline.
- Ajustar `handlePrint` em `proposals/edit.tsx`.
- Atualizar CSS de print em `index.css`.
- Verificar carregamento da fonte Montserrat.
- Atualizar documentacao operacional e funcional.

Fora do escopo:

- Alterar API.
- Alterar Prisma ou banco.
- Alterar regras de permissao.
- Alterar schema de proposta.
- Substituir a impressao do navegador por gerador server-side.
- Mudar o visual do preview de tela alem do necessario para desacoplar o print.

## 3. Diagnostico

### 3.1 Causa raiz do corte

O preview atual usa dimensoes fixas e escala:

```tsx
style={{
  width: `${a4Width}px`,
  minHeight: `${a4Height}px`,
  transform: `scale(${scale})`,
  transformOrigin: 'top left',
}}
```

No editor, o preview fica dentro de container com scroll/overflow. Isso funciona visualmente para a tela, mas e fragil para impressao.

Pontos tecnicos:

- `transform: scale(0.8)` reduz apenas o desenho visual, mas nao reduz o bounding box que o navegador usa no fluxo.
- O `scale` e aplicado inline dentro de `ProposalPreview`, entao classes `print:!transform-none` no wrapper nao garantem remover a transformacao no filho.
- Produtos variaveis fazem o conteudo ultrapassar a altura esperada.
- Sem paginacao explicita, cards e secoes finais podem ser cortados ou empurrados para fora da area imprimivel.

### 3.2 Problemas mapeados

| Codigo | Problema | Causa |
|---|---|---|
| P1 | Investimento e contato cortados | Conteudo variavel dentro de folha unica sem paginacao |
| P2 | `scale(0.8)` interfere no print | Transform inline no `ProposalPreview` |
| P3 | 5+ produtos sem comportamento previsivel | Ausencia de chunking por pagina |
| P4 | Fundos podem sumir | Dependencia do dialog do navegador e classes CSS |
| P5 | Layout do editor interfere na impressao | Print reaproveita DOM do preview de tela |

## 4. Decisao Tecnica

Criar renderizacao separada para impressao:

- `ProposalPreview`: continua sendo preview de tela, com `scale={0.8}`.
- `ProposalPrint`: novo componente exclusivo de print, sem escala, com paginas A4 reais.
- `ProposalPrint` sera renderizado via portal em `document.body` apenas durante a impressao.

Essa separacao evita que transform, overflow, scroll e layout do editor afetem a geracao do PDF.

## 5. Arquivos Afetados

| Arquivo | Acao |
|---|---|
| `artifacts/proposta/src/components/proposal/ProposalPrint.tsx` | Criar novo componente de print |
| `artifacts/proposta/src/pages/proposals/edit.tsx` | Adicionar estado de impressao, portal e novo `handlePrint` |
| `artifacts/proposta/src/index.css` | Reescrever regras de print para usar `#proposal-print-root` |
| `artifacts/proposta/index.html` | Verificar/adicionar Montserrat |
| `docs/rodar-local.md` | Atualizar comandos de rebuild/validacao se necessario |
| `docs/paginas-por-perfil.md` | Documentar comportamento do PDF |
| `docs/MUDANCAS.MD` | Registrar implementacao |
| `plans/plan-007-pdf-a4-paginacao-produtos.md` | Marcar checklist final apos execucao |

## 6. Especificacao do `ProposalPrint.tsx`

### 6.1 Responsabilidade

`ProposalPrint.tsx` deve ser o unico componente usado para impressao/PDF.

Ele deve:

- Renderizar paginas A4 reais: `210mm x 297mm`.
- Nao usar `transform`.
- Nao depender de largura/altura em pixels do preview.
- Paginar produtos por grupos de 4.
- Usar estilos inline para cores criticas.
- Usar `break-inside: avoid` nos blocos sensiveis.
- Renderizar em portal apenas quando o usuario clicar em PDF.

### 6.2 Tipagem

Reaproveitar o tipo aceito por `ProposalPreview`, ou extrair um tipo compartilhado local se necessario.

Evitar criar dependencia de API nova.

Sugestao:

```ts
type ProposalPrintData = ProposalPreviewProps['proposal'];
```

Se `ProposalPreviewProps` nao for exportado, exportar o tipo ou duplicar uma interface local minima em `ProposalPrint.tsx`, mantendo os mesmos campos ja usados no preview.

### 6.3 Helper de paginacao

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

### 6.4 Estrutura das paginas

Pagina 1:

- Header completo.
- Hero.
- Apresentacao, se houver stats.
- Plano de Acoes com produtos 1 a 4.
- Se tambem for a ultima pagina: spacer, Investimento e Rodape de Contato.

Paginas 2+:

- Header resumido com label `continuacao`.
- Plano de Acoes com produtos da pagina.
- Se for a ultima pagina: spacer, Investimento e Rodape de Contato.

Regras:

- Hero aparece apenas na pagina 1.
- Apresentacao aparece apenas na pagina 1.
- Investimento aparece apenas na ultima pagina.
- Rodape de contato aparece apenas na ultima pagina.
- Header aparece em todas as paginas.
- Cabecalho de continuacao deve deixar claro que a proposta continua, sem parecer uma nova proposta.

### 6.5 Estrutura JSX esperada

```tsx
export function ProposalPrint({ proposal }: { proposal: ProposalPrintData }) {
  const products = (proposal.products || []) as any[];
  const productPages = paginateProducts(products);
  const primaryColor = getPrimaryColor(proposal);
  const stats = normalizeStats(proposal.stats);

  return createPortal(
    <div id="proposal-print-root" className="proposal-print-root">
      {productPages.map((pageProducts, pageIndex) => {
        const firstPage = pageIndex === 0;
        const lastPage = pageIndex === productPages.length - 1;

        return (
          <div
            key={pageIndex}
            className="proposal-print-page"
            style={{
              width: '210mm',
              minHeight: '297mm',
              padding: '18mm 16mm 16mm',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
              pageBreakAfter: lastPage ? 'auto' : 'always',
              breakAfter: lastPage ? 'auto' : 'page',
              fontFamily: "'Montserrat', Arial, sans-serif",
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <PrintHeader proposal={proposal} primaryColor={primaryColor} isContinuation={!firstPage} />
            {firstPage && <PrintHero proposal={proposal} primaryColor={primaryColor} />}
            {firstPage && stats.length > 0 && <PrintStats stats={stats} primaryColor={primaryColor} />}
            <PrintProducts products={pageProducts} primaryColor={primaryColor} />
            {lastPage && <div className="proposal-print-spacer" style={{ flex: 1 }} />}
            {lastPage && <PrintInvestment proposal={proposal} />}
            {lastPage && <PrintFooter proposal={proposal} primaryColor={primaryColor} />}
          </div>
        );
      })}
    </div>,
    document.body
  );
}
```

## 7. Subcomponentes de Print

### 7.1 `PrintHeader`

Conteudo:

- Logo base64 da emissora, quando existir.
- Monograma como fallback.
- Nome da emissora em uppercase.
- Slogan.
- Label `continuacao` quando `isContinuation === true`.

Regras visuais:

- Altura aproximada: 18 a 22mm.
- Margem inferior: 8mm.
- Logo com fundo `primaryColor` inline.

### 7.2 `PrintHero`

Conteudo:

- Tipo da proposta.
- Nome do cliente.
- Periodo.
- Descricao de periodo, se houver.

Regras visuais:

- Fundo `primaryColor` via inline.
- Texto branco.
- Border radius aproximado de 20px.
- Nome do cliente com no maximo 2 linhas.
- Nao deixar texto escapar do bloco.

### 7.3 `PrintStats`

Conteudo:

- Ate 4 indicadores de Apresentacao.
- Barras superiores alternadas: `primaryColor`, `#727272`, `primaryColor`, `#727272`.

Regras:

- Renderizar apenas se houver pelo menos 1 stat.
- Preservar quebras de linha em descricao com `white-space: pre-line`.
- Fundo `#F8FBFF` inline.

### 7.4 `PrintProducts`

Conteudo:

- Grid 2 colunas.
- Ate 4 cards por pagina.
- Cada card exibe quantidade, titulo, descricao, programa, duracao, horario e sazonalidade quando preenchidos.

Regras:

- Produto impar na pagina ocupa apenas a coluna esquerda.
- Nao usar `grid-column: span 2`.
- `break-inside: avoid`.
- Borda lateral sempre na cor da empresa selecionada (`primaryColor`).
- Fundo `#F8FBFF` inline.
- Se nao houver produto, exibir placeholder `Nenhum produto adicionado.`

### 7.5 `PrintInvestment`

Conteudo:

- Label `Investimento`.
- `investDesc`, se houver.
- `investValue` ou fallback `R$ 0,00`.

Regras:

- Renderizar apenas na ultima pagina.
- Fundo preto `#000000` inline.
- Valor branco, grande e alinhado a direita.
- `break-inside: avoid`.

### 7.6 `PrintFooter`

Conteudo:

- Nome do vendedor.
- Cargo.
- Emissora.
- Label `Contato Direto`.
- Telefone na cor `primaryColor`.

Regras:

- Renderizar apenas na ultima pagina.
- Ser o ultimo bloco da ultima pagina.
- Usar linha divisoria superior.
- `break-inside: avoid`.

## 8. Ajustes em `proposals/edit.tsx`

### 8.1 Import

```tsx
import { ProposalPrint } from '@/components/proposal/ProposalPrint';
```

### 8.2 Estado de impressao

```tsx
const [isPrinting, setIsPrinting] = useState(false);
```

### 8.3 Handler de PDF

```tsx
const handlePrint = () => {
  setIsPrinting(true);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
      window.setTimeout(() => setIsPrinting(false), 3000);
    });
  });
};
```

### 8.4 Limpeza apos impressao

```tsx
useEffect(() => {
  const afterPrint = () => setIsPrinting(false);
  window.addEventListener('afterprint', afterPrint);
  return () => window.removeEventListener('afterprint', afterPrint);
}, []);
```

### 8.5 Renderizacao do portal

Adicionar no JSX da pagina:

```tsx
{isPrinting && (
  <ProposalPrint proposal={{ ...localData, station, advertiser: selectedAdvertiser }} />
)}
```

### 8.6 Preview de tela

Manter:

```tsx
<ProposalPreview proposal={{ ...localData, station, advertiser: selectedAdvertiser }} scale={0.8} />
```

O preview de tela nao deve ser usado como fonte de impressao.

## 9. CSS de Print

Reescrever a secao de print em `artifacts/proposta/src/index.css` para trabalhar com `#proposal-print-root`.

Base esperada:

```css
@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  body > *:not(#proposal-print-root) {
    display: none !important;
    visibility: hidden !important;
  }

  #proposal-print-root {
    display: block !important;
    visibility: visible !important;
    position: fixed !important;
    inset: 0 auto auto 0 !important;
    width: 210mm !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    z-index: 99999 !important;
    background: #ffffff !important;
  }

  #proposal-print-root,
  #proposal-print-root * {
    visibility: visible !important;
  }

  .proposal-print-page {
    display: flex !important;
    flex-direction: column !important;
    width: 210mm !important;
    min-height: 297mm !important;
    overflow: visible !important;
    box-shadow: none !important;
  }

  .proposal-product-card,
  .proposal-investment-block,
  .proposal-footer {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }

  .proposal-print-page,
  .proposal-print-page * {
    font-family: 'Montserrat', Arial, sans-serif !important;
  }
}
```

Observacao:

- Ao migrar para `ProposalPrint`, remover ou neutralizar regras antigas que imprimem `.print-area`, `.a4-preview` e `.proposal-preview-page`, para evitar dois previews no PDF.
- Manter classes antigas apenas se ainda forem necessarias para compatibilidade, mas garantir que no print o unico root visivel seja `#proposal-print-root`.

## 10. Fonte Montserrat

Verificar `artifacts/proposta/index.html`.

Se nao existir Montserrat, adicionar:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap"
  rel="stylesheet"
>
```

Risco:

- Em ambiente sem internet, Google Fonts pode nao carregar.

Mitigacao:

- Manter fallback `Arial, sans-serif`.
- Se o sistema for rodar em rede fechada, criar task futura para empacotar `.woff2` local.

## 11. Regras de Conteudo por Pagina

### 11.1 Uma pagina

Quando houver 0 a 4 produtos:

- 1 pagina.
- Header, Hero, Apresentacao, Produtos, Investimento e Rodape na mesma pagina.
- Investimento e Rodape devem aparecer completos.

### 11.2 Duas paginas

Quando houver 5 a 8 produtos:

- Pagina 1: Header, Hero, Apresentacao, produtos 1 a 4.
- Pagina 2: Header resumido, produtos 5 a 8, Investimento e Rodape.

### 11.3 Tres ou mais paginas

Quando houver 9+ produtos:

- Pagina 1: Header, Hero, Apresentacao, produtos 1 a 4.
- Paginas intermediarias: Header resumido, proximos 4 produtos.
- Ultima pagina: Header resumido, produtos restantes, Investimento e Rodape.

## 12. Regras Visuais Criticas

- Todos os backgrounds criticos devem usar `style={{ backgroundColor: ... }}`.
- Hero usa cor da emissora selecionada.
- Investimento usa `#000000`.
- Cards usam fundo `#F8FBFF`.
- Borda lateral dos cards usa cor da emissora selecionada.
- Telefone do contato usa cor da emissora selecionada.
- Cards nao podem quebrar no meio.
- Sidebar, botoes, acordeoes e editor nunca aparecem no PDF.
- O PDF deve ser legivel em A4 sem depender do zoom do navegador.

## 13. Plano de Implementacao

### Fase 1 - Preparacao

1. Ler `ProposalPreview.tsx`, `edit.tsx` e `index.css`.
2. Mapear helpers ja existentes: cor primaria, datas, periodicidade, stats, monograma e labels.
3. Decidir se helpers serao duplicados em `ProposalPrint.tsx` ou extraidos para arquivo compartilhado.
4. Preferencia: extrair helpers apenas se reduzir duplicacao real sem ampliar escopo.

### Fase 2 - Criar `ProposalPrint.tsx`

1. Criar o arquivo em `artifacts/proposta/src/components/proposal/ProposalPrint.tsx`.
2. Implementar `paginateProducts`.
3. Implementar helpers de formatacao necessarios.
4. Implementar `PrintHeader`.
5. Implementar `PrintHero`.
6. Implementar `PrintStats`.
7. Implementar `PrintProducts`.
8. Implementar `PrintInvestment`.
9. Implementar `PrintFooter`.
10. Implementar `ProposalPrint` com `createPortal`.

### Fase 3 - Integrar no editor

1. Importar `ProposalPrint`.
2. Criar `isPrinting`.
3. Ajustar `handlePrint`.
4. Adicionar listener `afterprint`.
5. Renderizar `ProposalPrint` condicionalmente.
6. Garantir que o botao `PDF` chama o novo handler.
7. Manter `ProposalPreview` inalterado para tela.

### Fase 4 - Ajustar CSS

1. Criar regras de print para `#proposal-print-root`.
2. Esconder todo o restante do app no print.
3. Garantir `@page A4 portrait`.
4. Garantir `print-color-adjust`.
5. Garantir `break-inside: avoid`.
6. Neutralizar regras antigas que imprimiam `.print-area` se causarem duplicidade.

### Fase 5 - Fonte

1. Verificar `index.html`.
2. Adicionar Montserrat se ausente.
3. Manter fallback.

### Fase 6 - Validacao tecnica

Rodar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Se o Docker reutilizar camada corrompida:

```bash
docker compose build --no-cache
docker compose up -d --force-recreate
curl http://localhost:21709/api/healthz
```

### Fase 7 - Validacao visual

1. Abrir `http://localhost:21709`.
2. Login ADMIN: `admin@radio88fm.com.br` / `Admin@123`.
3. Abrir proposta existente.
4. Clicar em `PDF`.
5. Salvar como PDF em A4.
6. Validar cenarios de produtos conforme checklist de QA.
7. Confirmar que nao ha corte de Investimento, Assinatura e Contato.

### Fase 8 - Documentacao

1. Atualizar `docs/paginas-por-perfil.md` com comportamento de PDF multipagina.
2. Atualizar `docs/04-frontend-guidelines.md` com regra de print desacoplado do preview.
3. Atualizar `docs/MUDANCAS.MD`.
4. Atualizar `docs/rodar-local.md` se algum comando mudar.
5. Atualizar checklist final deste plano.

## 14. Checklist de QA

### Estrutura

- [ ] PDF de 0 produtos: 1 pagina com hero, investimento e contato.
- [ ] PDF de 1 produto: 1 pagina, grid com 1 card.
- [ ] PDF de 2 produtos: 1 pagina, grid 2x1.
- [ ] PDF de 3 produtos: 1 pagina, grid 2x1 + 1 card em meia largura.
- [ ] PDF de 4 produtos: 1 pagina, grid 2x2 completo.
- [ ] PDF de 5 produtos: 2 paginas; pagina 2 com 1 produto + investimento + contato.
- [ ] PDF de 8 produtos: 2 paginas; investimento e contato apenas na pagina 2.
- [ ] PDF de 9 produtos: 3 paginas; pagina 3 com 1 produto + investimento + contato.
- [ ] Header aparece em todas as paginas.
- [ ] Hero aparece apenas na primeira pagina.
- [ ] Apresentacao aparece apenas na primeira pagina.
- [ ] Investimento aparece apenas na ultima pagina.
- [ ] Rodape de contato aparece apenas na ultima pagina.

### Visual

- [ ] Fundo azul do Hero aparece no PDF.
- [ ] Fundo preto do Investimento aparece no PDF.
- [ ] Borda lateral dos produtos aparece na cor da emissora.
- [ ] Barras dos stats aparecem.
- [ ] Fonte Montserrat ou fallback consistente aparece.
- [ ] Sidebar/editor/botoes nao aparecem.
- [ ] Nenhum card e cortado no meio.
- [ ] Nome, cargo e telefone do vendedor aparecem no rodape.
- [ ] Telefone aparece na cor da emissora.
- [ ] Valor do investimento aparece branco sobre preto.

### Conteudo

- [ ] Nome do cliente aparece no Hero.
- [ ] Tipo da proposta aparece no Hero.
- [ ] Periodo aparece na pill.
- [ ] `periodDesc` aparece quando preenchido.
- [ ] Stats aparecem quando preenchidos.
- [ ] `investDesc` aparece quando preenchido.
- [ ] `investValue` aparece, ou fallback `R$ 0,00`.
- [ ] Programa, duracao, horario e sazonalidade aparecem quando preenchidos.
- [ ] Tag de programa e omitida quando vazia.

## 15. Criterios de Aceite

1. O botao `PDF` gera uma proposta completa sem corte de Investimento, Assinatura ou Contato.
2. Propostas com ate 4 produtos geram 1 pagina A4.
3. Propostas com 5 a 8 produtos geram 2 paginas A4.
4. Propostas com mais de 8 produtos geram quantas paginas forem necessarias, com 4 produtos por pagina.
5. Investimento e Contato aparecem sempre na ultima pagina.
6. Header aparece em todas as paginas.
7. Hero e Apresentacao aparecem apenas na primeira pagina.
8. O PDF nao mostra elementos do sistema.
9. Typecheck passa.
10. Build frontend passa.
11. Docker sobe e `healthz` retorna OK.

## 16. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Portal nao renderizar antes do print | Usar `requestAnimationFrame` duplo |
| `afterprint` nao disparar | Usar timeout de seguranca apos `window.print()` |
| Safari ignorar fundos | Usar backgrounds inline e `print-color-adjust` |
| Fonte Montserrat nao carregar offline | Manter fallback e planejar fonte local |
| Texto longo no Hero quebrar layout | Limitar a 2 linhas e ajustar `line-height` |
| Cards com descricao longa ultrapassarem a pagina | Definir altura/overflow visual controlado no card de print |
| Regras antigas de print duplicarem conteudo | Tornar `#proposal-print-root` a unica area visivel no `@media print` |

## 17. Checklist Final de Implementacao

Preenchido apos executar o plano:

- [x] `ProposalPrint.tsx` criado.
- [x] `paginateProducts` implementado.
- [x] Header de print implementado.
- [x] Hero de print implementado.
- [x] Stats de print implementado.
- [x] Produtos de print implementado.
- [x] Investimento de print implementado.
- [x] Footer de print implementado.
- [x] Portal de print integrado em `edit.tsx`.
- [x] `handlePrint` usa `isPrinting` e `requestAnimationFrame` duplo.
- [x] `afterprint` limpa `isPrinting`.
- [x] CSS de print usa `#proposal-print-root`.
- [x] Preview de tela continua funcionando para visualizacao no editor.
- [x] Fonte Montserrat ja estava carregada em `artifacts/proposta/index.html`.
- [x] `pnpm run typecheck` passou.
- [x] Build frontend passou.
- [x] Docker/healthcheck passaram.
- [ ] QA visual de 0, 1, 2, 3, 4, 5, 8 e 9 produtos executado.
- [x] Documentacao atualizada.

## 18. Resultado da Implementacao

Arquivos alterados/criados:

- `artifacts/proposta/src/components/proposal/ProposalPrint.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/index.css`
- `docs/04-frontend-guidelines.md`
- `docs/paginas-por-perfil.md`
- `docs/MUDANCAS.MD`
- `plans/plan-007-pdf-a4-paginacao-produtos.md`

Validacao executada:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Resultado:

- `typecheck`: OK.
- Build frontend: OK.
- Docker Compose: OK.
- Healthcheck: `{"status":"ok"}`.

Decisao tecnica durante a implementacao:

- O planejamento inicial sugeria `position: fixed` em `#proposal-print-root`. A implementacao final usa `position: static` no modo print, porque todo o app ja e ocultado e um root estatico preserva melhor os `page-breaks` em PDFs multipagina.

Pendencia:

- A conferencia visual do PDF salvo no Chrome precisa ser feita manualmente, validando especialmente 4, 5, 8 e 9 produtos.
