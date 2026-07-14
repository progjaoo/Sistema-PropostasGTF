# Plano 008 - PDF Enxuto, Ctrl+P e Borda dos Produtos

Status: Implementado tecnicamente; validacao visual manual no Chrome ainda pendente.

Projeto: Sistema de Propostas.

Data: 2026-07-10.

Tipo: WEB - Frontend only, sem mudanca de API ou banco.

Stack: TypeScript, React, Vite, Tailwind CSS.

## Agentes Definidos

Agente principal:

- Frontend Engineer: ajustar `ProposalPrint`, fluxo do botao `PDF`, comportamento de `Ctrl+P` e CSS de print/exportacao.

Agentes de apoio:

- UX/UI Designer: ajustar proporcao visual para ficar enxuto como a referencia enviada, com 4 produtos na mesma pagina.
- QA Engineer: validar visualmente PDF com 4 produtos, Ctrl+P, botao PDF, bordas dos cards e healthcheck.
- Technical Writer: atualizar documentacao funcional e registrar mudancas no plano.

Referencias usadas:

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `.agents/agent-qa-engineer.md`
- `.agents/agent-technical-writer.md`
- `plans/plan-007-pdf-a4-paginacao-produtos.md`
- `artifacts/proposta/src/components/proposal/ProposalPrint.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/index.css`
- Imagem enviada: `Captura de Tela 2026-07-10 às 15.33.18.png`

## 1. Contexto

O plano 007 separou o print do preview de tela usando `ProposalPrint`. Tecnicamente isso resolveu o conflito com `scale(0.8)`, mas o resultado visual atual ainda nao atende:

- O dialog de impressao mostra 2 paginas para uma proposta com 4 produtos.
- A proposta ficou grande demais verticalmente.
- O bloco de investimento e contato foi para uma segunda pagina.
- A borda azul lateral dos cards de produto sumiu/ficou imperceptivel.
- O comportamento de `Ctrl+P` precisa abrir impressao de forma previsivel.
- O botao `PDF` deve ser para baixar e gerar o pdf no formato visual enxuto da referencia esperada, com tudo na mesma pagina quando houver ate 4 produtos, se tiver mais de 4 produtos, reconstruir todo o conteúdo da 1ª pagina na 2ª pagina com os outros produtos...

## 2. Diagnostico Tecnico

### 2.1 Por que 4 produtos estao indo para 2 paginas

Mesmo com `ProposalPrint`, a soma vertical atual ainda estoura a area imprimivel:

- Header alto.
- Hero alto.
- Stats com altura grande.
- Labels com margens generosas.
- Cards de produto com `min-height` alto.
- Gap vertical entre as duas linhas de produtos alto.
- Investimento e rodape com tamanho final grande.

O navegador pagina o documento quando a soma ultrapassa a pagina definida. Entao, mesmo sem corte, o resultado vira 2 paginas.

### 2.2 Por que a borda azul lateral sumiu

O card usa:

```tsx
style={{ backgroundColor: '#F8FBFF', borderLeft: `10px solid ${primaryColor}` }}
```

Mas o CSS atual tambem aplica:

```css
.proposal-print-product-card {
  border: 1px solid #DCE7F6 !important;
}
```

Como o CSS usa `!important`, ele pode sobrescrever o `borderLeft` inline normal. Resultado: a borda azul lateral fica anulada ou enfraquecida.

### 2.3 Gargalo entre Ctrl+P e botao PDF

Hoje o CSS de print torna `#proposal-print-root` a unica area visivel. Se o usuario apertar `Ctrl+P` sem o root renderizado, a impressao pode sair vazia ou inconsistente.

O botao `PDF`, por outro lado, precisa renderizar o layout comercial correto antes de imprimir/gerar.

## 3. Decisao de Produto

Separar claramente os fluxos:

### 3.1 Ctrl+P

Comportamento esperado:

- Ao apertar `Ctrl+P` ou `Cmd+P`, o sistema intercepta o atalho.
- Renderiza o `ProposalPrint` com o mesmo layout enxuto.
- Abre o dialog de impressao nativo do navegador.
- Nao deve imprimir sidebar/editor.

Justificativa:

- O navegador sempre abre impressao no Ctrl+P, mas no nosso caso precisamos preparar o portal de print antes.
- Interceptar o atalho evita PDF vazio e garante consistencia.

### 3.2 Botao PDF

Comportamento esperado:

- O botao `PDF` usa o layout enxuto de exportacao.
- Para ate 4 produtos, tudo deve caber em uma pagina: header, hero, apresentacao, 4 cards, investimento e contato.
- A pagina deve parecer com a terceira referencia enviada: mais longa/compacta visualmente, com conteudo completo.
- No MVP, o botao pode continuar abrindo o dialog `Salvar como PDF` do navegador, mas deve usar uma pagina compacta e controlada.

Opcao futura se o usuario exigir download direto sem dialog:

- Adicionar biblioteca de geracao client-side (`html-to-image` + `jspdf` ou equivalente).
- Essa opcao exige dependencia nova e deve ser validada separadamente.

## 4. Resultado Visual Esperado

Para proposta com 4 produtos:

- 1 pagina.
- Header no topo.
- Hero grande, mas mais compacto que o atual.
- Apresentacao compacta.
- Plano de Acoes com grid 2x2.
- Cada card com borda azul lateral forte no canto esquerdo.
- Descricoes podem ser truncadas em 2 ou 3 linhas para caber.
- Investimento logo abaixo dos cards.
- Assinatura/contato no rodape da mesma pagina.
- Sem sidebar/editor/botoes.

Para 5+ produtos:

- Pode paginar.
- Primeira pagina deve conter ate 4 produtos.
- Ultima pagina deve conter produtos restantes + investimento + contato.
- Nenhum card deve ser cortado no meio.

## 5. Arquivos Afetados

| Arquivo | Acao |
|---|---|
| `artifacts/proposta/src/components/proposal/ProposalPrint.tsx` | Compactar estrutura e ajustar borda lateral dos produtos |
| `artifacts/proposta/src/pages/proposals/edit.tsx` | Interceptar Ctrl+P/Cmd+P e preparar print root |
| `artifacts/proposta/src/index.css` | Ajustar dimensoes compactas, page size, bordas e regras de print |
| `docs/paginas-por-perfil.md` | Documentar diferenca entre Ctrl+P e botao PDF |
| `docs/04-frontend-guidelines.md` | Atualizar guideline de PDF enxuto |
| `docs/MUDANCAS.MD` | Registrar correcao |
| `plans/plan-008-pdf-enxuto-ctrlp-borda-produtos.md` | Marcar checklist final |

## 6. Ajuste de Layout Enxuto

### 6.1 Nova meta de dimensoes para 1 pagina com 4 produtos

Distribuicao vertical alvo:

| Secao | Altura alvo |
|---|---:|
| Padding superior | 10mm |
| Header | 14mm |
| Espaco header/hero | 6mm |
| Hero | 48mm |
| Espaco hero/apresentacao | 6mm |
| Label + Apresentacao | 25mm |
| Espaco apresentacao/produtos | 5mm |
| Label Plano | 5mm |
| Grid de produtos 2x2 | 78mm a 84mm |
| Espaco produtos/investimento | 6mm |
| Investimento | 20mm |
| Espaco investimento/footer | 6mm |
| Footer contato | 14mm |
| Padding inferior | 8mm |
| Total aproximado | 239mm a 247mm |

Isso deixa folga dentro de A4 mesmo com dialog do Chrome usando margens padrao, mas o ideal e usar margem CSS `0`.

### 6.2 Regras de compactacao

- Reduzir padding da pagina para algo entre `10mm 14mm 8mm`.
- Reduzir logo para 13mm ou 14mm.
- Reduzir hero para no maximo 48mm a 52mm.
- Nome do cliente deve ter clamp de 2 linhas.
- Stats deve ter altura compacta, sem ocupar largura/altura desnecessaria quando houver apenas 1 indicador.
- Cards devem ter altura fixa compacta, por exemplo `38mm` a `40mm`.
- Descricao do produto no PDF deve usar `line-clamp: 2` ou `3`, aceitando reticencias.
- Tags de programa/duracao devem permanecer compactas.
- Investimento deve ter altura controlada, sem padding excessivo.
- Footer deve ser baixo e legivel.

## 7. Borda Azul dos Produtos

### 7.1 Problema atual

`border: 1px solid ... !important` no CSS anula o `borderLeft` inline.

### 7.2 Correcao recomendada

Usar variavel CSS inline no card:

```tsx
style={{
  backgroundColor: '#F8FBFF',
  '--proposal-primary': primaryColor,
} as React.CSSProperties}
```

E no CSS:

```css
.proposal-print-product-card {
  border: 1px solid #DCE7F6 !important;
  border-left: 10px solid var(--proposal-primary) !important;
}
```

Alternativa ainda mais robusta:

```tsx
style={{
  backgroundColor: '#F8FBFF',
  boxShadow: `inset 10px 0 0 ${primaryColor}`,
}}
```

Recomendacao:

- Usar `border-left` com variavel CSS e `!important`.
- Manter `overflow: hidden` e `border-radius` para a borda seguir o canto arredondado.

## 8. Ctrl+P / Cmd+P

### 8.1 Estado de print

Manter `isPrinting`, mas adicionar origem:

```ts
type PrintIntent = 'button' | 'keyboard' | null;
const [printIntent, setPrintIntent] = useState<PrintIntent>(null);
const isPrinting = printIntent !== null;
```

Ou manter `isPrinting` simples se nao precisar diferenciar visualmente.

### 8.2 Handler unificado

Criar funcao:

```ts
const startProposalPrint = (intent: 'button' | 'keyboard') => {
  setPrintIntent(intent);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
      window.setTimeout(() => setPrintIntent(null), 3000);
    });
  });
};
```

### 8.3 Interceptar teclado

Adicionar `useEffect`:

```ts
useEffect(() => {
  const onKeyDown = (event: KeyboardEvent) => {
    const isPrintShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p';
    if (!isPrintShortcut) return;
    event.preventDefault();
    startProposalPrint('keyboard');
  };

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}, [startProposalPrint]);
```

Observacao:

- Usar `useCallback` para `startProposalPrint`, evitando recriar listener de forma instavel.
- `Ctrl+P` e `Cmd+P` devem abrir o dialog nativo, mas com o portal renderizado antes.

## 9. Botao PDF

### 9.1 Curto prazo sem dependencia nova

O botao `PDF` chama:

```ts
startProposalPrint('button');
```

Com isso, ele abre o dialog de impressao/salvar como PDF, usando o layout enxuto.

### 9.2 Opcao futura com download direto

Se o objetivo for baixar PDF diretamente sem dialog:

- Avaliar dependencia `jspdf` + `html-to-image`, ou `html2canvas` + `jspdf`.
- Renderizar `ProposalPrint` em container offscreen.
- Capturar o layout como imagem em alta resolucao.
- Criar PDF com tamanho customizado do layout esperado.

Ponto de atencao:

- Hoje essas dependencias nao existem em `artifacts/proposta/package.json`.
- Adicionar dependencia nova muda lockfile e precisa validacao.
- Para este plano, recomendacao e corrigir primeiro usando browser print, sem dependencia.

## 10. Page Size e Margens

### 10.1 Opcao recomendada

Manter `@page size: A4 portrait; margin: 0;`, mas compactar o conteudo para caber de verdade em 1 pagina com 4 produtos.

Motivo:

- A4 e previsivel.
- Funciona melhor no dialog do Chrome.
- Evita PDF com tamanho estranho para impressao real.

### 10.2 Opcao alternativa

Criar modo `PDF comercial` com dimensao customizada parecida com a terceira referencia, por exemplo:

```css
@page {
  size: 1080px 1920px;
  margin: 0;
}
```

Risco:

- Nem todo navegador respeita `@page` customizado da mesma forma.
- Pode continuar aparecendo como A4 no dialog.

Decisao deste plano:

- Implementar A4 compacto primeiro.
- Se ainda houver corte no Chrome, criar segunda fase para PDF direto com biblioteca.

## 11. Ajuste de `ProposalPrint.tsx`

### 11.1 Alteracoes principais

- Reduzir alturas e espacamentos via classes CSS, nao com Tailwind inline espalhado.
- Remover dependencia visual de `min-height` alto nos cards.
- Adicionar variavel CSS da cor primaria no card.
- Garantir que o product card renderize borda lateral.
- Produtos com ate 4 continuam na primeira pagina.
- O spacer antes do investimento so deve existir quando a pagina tiver altura livre suficiente, sem empurrar para segunda pagina.

### 11.2 Regra de descricao do produto

Para caber 4 produtos em 1 pagina:

- Descricao no PDF pode ser truncada com reticencias.
- Usar `line-clamp: 2` ou `3`.
- Nao truncar titulo do produto antes de 2 linhas.

### 11.3 Regra de stats

Se houver apenas 1 stat:

- Nao deixar o bloco ocupar visualmente altura exagerada.
- Pode manter grid de 4 colunas se a identidade visual exigir, mas a altura deve ser compacta.

## 12. Ajuste de CSS

### 12.1 Classes alvo

Revisar:

- `.proposal-print-page`
- `.proposal-print-header`
- `.proposal-print-hero`
- `.proposal-print-stats-section`
- `.proposal-print-products-section`
- `.proposal-print-products-grid`
- `.proposal-print-product-card`
- `.proposal-print-investment`
- `.proposal-print-footer`

### 12.2 Valores iniciais sugeridos

```css
.proposal-print-page {
  padding: 10mm 14mm 8mm !important;
}

.proposal-print-header {
  min-height: 14mm !important;
  margin-bottom: 6mm !important;
}

.proposal-print-hero {
  min-height: 48mm !important;
  margin-bottom: 6mm !important;
  padding: 9mm 12mm !important;
}

.proposal-print-stats-section {
  margin-bottom: 6mm !important;
}

.proposal-print-stats-grid {
  min-height: 20mm !important;
}

.proposal-print-products-section {
  margin-bottom: 6mm !important;
}

.proposal-print-products-grid {
  gap: 4mm !important;
}

.proposal-print-product-card {
  min-height: 38mm !important;
  max-height: 40mm !important;
  border-left: 10px solid var(--proposal-primary) !important;
}

.proposal-print-investment {
  min-height: 20mm !important;
  margin-bottom: 5mm !important;
  padding: 5mm 8mm !important;
}

.proposal-print-footer {
  min-height: 12mm !important;
  padding-top: 5mm !important;
}
```

Esses valores devem ser calibrados visualmente.

## 13. QA Manual Obrigatorio

### 13.1 Cenario principal

Proposta com:

- 1 apresentacao preenchida.
- 4 produtos.
- investimento preenchido.
- contato do vendedor preenchido.

Esperado:

- O dialog mostra 1 pagina.
- Investimento aparece na mesma pagina.
- Contato aparece na mesma pagina.
- Cards tem borda azul lateral forte.
- Layout fica parecido com a terceira referencia enviada.

### 13.2 Atalhos

- Apertar `Ctrl+P` no Windows/Linux ou `Cmd+P` no macOS.
- Deve abrir o dialog de impressao com a proposta, nao a tela do sistema.
- Nao pode sair PDF vazio.

### 13.3 Botao PDF

- Clicar no botao `PDF`.
- Deve abrir o dialog usando o mesmo layout enxuto.
- Deve gerar/salvar PDF completo.

### 13.4 Regressao

Testar:

- 0 produtos.
- 1 produto.
- 2 produtos.
- 3 produtos.
- 4 produtos.
- 5 produtos.

Aceite:

- Ate 4 produtos: 1 pagina.
- 5 produtos: pode usar 2 paginas, mas sem cortar cards.

## 14. Validacao Tecnica

Rodar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

Se Docker reaproveitar cache corrompido:

```bash
docker compose build --no-cache
docker compose up -d --force-recreate
curl http://localhost:21709/api/healthz
```

## 15. Criterios de Aceite

- [ ] Com 4 produtos, o PDF fica em 1 pagina.
- [ ] Investimento aparece na mesma pagina dos 4 produtos.
- [ ] Assinatura/contato aparecem na mesma pagina dos 4 produtos.
- [ ] Borda azul lateral aparece em todos os produtos.
- [ ] `Ctrl+P` ou `Cmd+P` abre impressao da proposta, sem sidebar/editor.
- [ ] Botao `PDF` abre/salva PDF no layout enxuto da referencia.
- [ ] PDF nao fica em branco.
- [ ] Layout nao corta texto essencial.
- [ ] `pnpm run typecheck` passa.
- [ ] Build frontend passa.
- [ ] Docker + healthcheck passam.

## 16. Checklist de Implementacao

Preenchido apos executar:

- [x] Ajuste de compactacao em `ProposalPrint.tsx`.
- [x] Borda lateral dos produtos corrigida com variavel CSS e `border-left` prioritario.
- [x] `Ctrl+P`/`Cmd+P` interceptado no editor.
- [x] Botao `PDF` usa handler unificado.
- [x] CSS de print calibrado para 4 produtos em 1 pagina.
- [x] Documentacao atualizada.
- [x] Plano marcado como implementado tecnicamente.
- [ ] Validacao visual com 4 produtos concluida.

## 17. Observacao Importante

O objetivo deste plano nao e voltar para o layout multipagina do plano 007. O objetivo agora e:

- manter a separacao tecnica entre preview de tela e print;
- deixar o print enxuto;
- garantir que 4 produtos caibam em uma proposta completa;
- restaurar a borda azul lateral;
- tornar `Ctrl+P` e botao `PDF` previsiveis.

## 18. Resultado da Implementacao

Arquivos alterados:

- `artifacts/proposta/src/components/proposal/ProposalPrint.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/index.css`
- `docs/04-frontend-guidelines.md`
- `docs/paginas-por-perfil.md`
- `docs/MUDANCAS.MD`
- `plans/plan-008-pdf-enxuto-ctrlp-borda-produtos.md`

Mudancas aplicadas:

- `ProposalPrint` passou a usar padding A4 reduzido.
- Cards de produto passaram a receber `--proposal-primary`.
- CSS do card aplica `border-left: 10px solid var(--proposal-primary) !important`.
- Header, hero, stats, produtos, investimento e rodape foram compactados no `@media print`.
- Descricao do produto no PDF usa clamp de 3 linhas.
- `Ctrl+P`/`Cmd+P` e botao `PDF` usam `startProposalPrint`.
- Impressao e bloqueada se a proposta ainda nao terminou de carregar.

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

Pendente:

- Conferencia visual no Chrome com proposta de 4 produtos, validando 1 pagina, investimento, contato e borda azul.
