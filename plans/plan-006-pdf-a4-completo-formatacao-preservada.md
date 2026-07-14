# Plano 006 - PDF A4 Completo com Formatacao Preservada

Status: Implementado.

Origem: Fase 6 do `plan-005-Hierarquia Programa-Emissora, Timeline de Lead.md`.

Agente principal recomendado: UX/UI Designer + Frontend Engineer.

Agentes de apoio:

- QA Engineer: validar impressao real no Chrome e PDF salvo.
- Software Architect: garantir que a solucao nao quebre o editor/preview existente.
- Technical Writer: atualizar docs apos validacao.

## Revisao de Completude

O planejamento ja cobre o ajuste principal do PDF A4: CSS de print, preservacao de fundos, remocao da sidebar e validacao no Chrome.

Pontos que estavam faltando e foram adicionados nesta revisao:

- Corrigir o campo `Descricao` da secao `Apresentacao` no acordeao do editor para aceitar espacos, texto livre e quebras de linha.
- Garantir que o preview/PDF preserva esses espacos/quebras de linha quando a descricao for exibida.
- Destacar em vermelho o botao de remover produto nos produtos adicionados ao plano da proposta.

## Objetivo

Corrigir a geracao/impressao da proposta para que o botao PDF produza uma folha A4 real, com fundos coloridos preservados, Montserrat aplicada, sidebar removida, blocos sem cortes indevidos e rodape/contato visiveis.

Tambem ajustar detalhes do editor que impactam diretamente o conteudo impresso: descricao da Apresentacao com texto livre/espacamento correto e botao de excluir produto com destaque vermelho.

## Escopo

Incluido:

- CSS de print.
- Classes auxiliares no preview e wrappers de impressao.
- Ajuste do botao PDF para aguardar renderizacao antes de `window.print()`.
- Ajuste do campo `Descricao` em `Apresentacao` para aceitar espacos e quebras de linha.
- Preservacao de espacos/quebras de linha da `Apresentacao` no preview/PDF.
- Destaque vermelho no botao de excluir produto dentro do acordeao de Produtos.
- Validacao visual no Chrome.
- Documentacao dos comandos e criterios de teste.

Fora do escopo:

- Mudancas de schema Prisma.
- Mudancas em regras de negocio de proposta.
- Redesign visual alem do necessario para preservar o layout atual no PDF.
- Substituir impressao nativa por gerador server-side.

## Diagnostico Inicial

1. Abrir proposta existente em `/proposals/:id/edit`.
2. Confirmar layout atual no preview dentro do editor.
3. Clicar em PDF e verificar no dialog de impressao:
   - Se a sidebar aparece indevidamente.
   - Se o hero perde o fundo azul.
   - Se investimento perde o fundo preto.
   - Se contato/rodape aparece.
   - Se cards sao cortados no meio.
   - Se tamanho esta em A4.
4. Capturar screenshot do preview e do dialog de impressao para comparar antes/depois.
5. No acordeao `Apresentacao`, testar o campo `Descricao`:
   - Digitar palavras com espacos entre elas.
   - Pressionar Enter para criar quebra de linha.
   - Confirmar se o valor permanece no campo e no preview.
6. No acordeao `Produtos`, verificar se o botao de remover produto adicionado esta visualmente vermelho e sempre perceptivel.

## Implementacao Passo a Passo

### 1. Mapear CSS atual de print

Arquivos provaveis:

- `artifacts/proposta/src/index.css`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`

Acoes:

- Localizar regras `@media print`.
- Identificar wrappers: `print-area`, `print-only-container`, `no-print`, `a4-preview`.
- Verificar se existe `transform: scale(0.8)` no wrapper impresso.
- Verificar se algum pai usa `overflow: hidden` ou altura fixa durante print.

### 2. Criar classes estaveis no preview

Adicionar classes sem alterar visual de tela:

- `proposal-preview-page` no container A4 principal.
- `proposal-hero-section` no hero.
- `proposal-product-card` em cada card.
- `proposal-investment-block` no bloco de investimento.
- `proposal-footer` no rodape.

Objetivo:

- Permitir CSS de print especifico sem depender de seletores frageis.

### 3. Ajustar regras globais de print

No CSS:

```css
@media print {
  @page {
    size: A4;
    margin: 0;
  }

  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  html,
  body,
  #root {
    width: 210mm !important;
    min-height: 297mm !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
  }

  .no-print {
    display: none !important;
  }

  .print-only-container {
    display: block !important;
    width: 210mm !important;
    min-height: 297mm !important;
    overflow: visible !important;
    background: #ffffff !important;
  }

  .print-area,
  .a4-preview,
  .proposal-preview-page {
    width: 210mm !important;
    min-height: 297mm !important;
    height: auto !important;
    transform: none !important;
    box-shadow: none !important;
    overflow: visible !important;
  }
}
```

Adaptar valores se o CSS atual ja tiver convencoes diferentes.

### 4. Preservar fundos e blocos criticos

Garantir que no print:

- Hero usa `backgroundColor` inline vindo da Empresa.
- Bloco de investimento usa `backgroundColor: '#000000'` inline ou classe preservada.
- Texto branco continua legivel sobre fundos.
- Cards de produto mantem borda lateral e fundo `#F8FBFF`.
- Footer fica no fluxo normal, sem `position: absolute`.

### 5. Evitar cortes de cards

No CSS de print:

```css
.proposal-product-card,
.proposal-investment-block,
.proposal-footer {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

Validar:

- Proposta com 1 a 4 produtos.
- Proposta com 6+ produtos.
- Produto com descricao longa.

### 6. Ajustar botao PDF

No `proposals/edit.tsx`, substituir chamada direta:

```ts
window.print();
```

por funcao:

```ts
const handlePrint = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.print());
  });
};
```

Se houver estado visual necessario antes da impressao, ativar estado e aguardar o proximo frame antes de imprimir.

### 7. Corrigir campo Descricao da Apresentacao

Arquivo principal:

- `artifacts/proposta/src/pages/proposals/edit.tsx`

Contexto:

- O acordeao `Apresentacao` possui ate 4 itens.
- Cada item tem campo de destaque (`num`) e descricao (`desc`).
- A descricao precisa aceitar espacos e quebras de linha digitadas pelo usuario.

Acoes:

1. Garantir que `desc` seja renderizado como `Textarea`, nao `Input`.
2. Remover qualquer normalizacao agressiva que elimine espacos internos enquanto o usuario digita.
3. Manter `trim()` apenas no momento de montar o payload final, se necessario, sem bloquear a digitacao no campo.
4. Confirmar que `updateStatItem(index, 'desc', value)` recebe o texto exatamente como digitado.
5. No `ProposalPreview.tsx`, usar `whitespace-pre-line` ou estilo equivalente no texto da descricao.
6. No CSS/print, preservar quebra de linha tambem no PDF.

Criterio visual:

- Usuario consegue escrever, por exemplo:

```text
Mais de 350 mil ouvintes
por mes na regiao
```

- O editor nao remove os espacos durante a digitacao.
- O preview exibe a quebra de linha de forma legivel.

### 8. Destacar botao Delete dos produtos adicionados

Arquivo principal:

- `artifacts/proposta/src/pages/proposals/edit.tsx`

Contexto:

- No acordeao `Produtos`, cada produto adicionado na proposta possui botao de remover.
- Esse botao precisa ter destaque vermelho para evitar confusao com acoes neutras.

Acoes:

1. Localizar o botao que chama `removeProduct(index)`.
2. Garantir que ele use cor de erro/destrutiva:
   - `text-error`
   - `hover:bg-error/10`
   - `hover:text-error`
   - ou `variant="destructive"` se o componente aceitar sem quebrar o layout.
3. Manter icone `Trash2`.
4. Adicionar `aria-label="Remover produto"` se ainda nao existir.
5. Confirmar que o botao fica sempre visivel no card do produto, nao apenas em hover.

Criterio visual:

- O botao de excluir produto deve ser imediatamente reconhecivel como acao destrutiva.
- O texto/icone nao pode ficar branco em fundo branco nem com contraste baixo.

### 9. Validacao Manual

Com Docker ligado:

```bash
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

No Chrome:

1. Abrir `http://localhost:21709`.
2. Login ADMIN: `admin@radio88fm.com.br` / `Admin@123`.
3. Abrir uma proposta.
4. Clicar em `PDF`.
5. No dialog de impressao:
   - Destino: Salvar como PDF.
   - Papel: A4.
   - Margens: Nenhuma ou Padrao, conforme melhor resultado.
   - Graficos de fundo: ativo, se o navegador exibir essa opcao.
6. Voltar ao editor e validar:
   - Campo `Descricao` da `Apresentacao` aceita espacos e Enter.
   - Preview exibe o texto com quebras de linha.
   - Botao delete dos produtos adicionados esta vermelho e visivel.

### 10. Validacao Tecnica

Rodar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
PORT=8080 pnpm --filter @workspace/api-server run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

### 11. Documentacao

Atualizar:

- `docs/paginas-por-perfil.md`: fluxo do botao PDF e limitacoes conhecidas.
- `docs/04-frontend-guidelines.md`: convencoes de print/A4.
- `docs/MUDANCAS.MD`: registrar implementacao do plano 006.
- `docs/rodar-local.md`: comandos para rebuild Docker apos ajuste visual.
- `plans/plan-006-pdf-a4-completo-formatacao-preservada.md`: marcar checklist final ao concluir.

## Checklist de Aceite

- [ ] Botao PDF abre o dialog de impressao do navegador.
- [ ] Sidebar/editor nao aparecem no PDF.
- [ ] Folha usa A4 real.
- [ ] Fonte Montserrat aparece no preview e no PDF.
- [ ] Hero preserva fundo colorido da Empresa.
- [ ] Bloco de investimento preserva fundo preto.
- [ ] Valor do investimento aparece no PDF.
- [ ] Rodape de contato aparece no PDF.
- [ ] Cards de produto nao sao cortados no meio.
- [ ] Proposta com muitos produtos quebra em multiplas paginas sem perder conteudo.
- [ ] Campo `Descricao` da `Apresentacao` permite digitar espacos entre palavras.
- [ ] Campo `Descricao` da `Apresentacao` permite quebra de linha com Enter.
- [ ] Preview/PDF preservam as quebras de linha da descricao.
- [ ] Botao de remover produto no acordeao `Produtos` fica vermelho e sempre visivel.
- [ ] Botao de remover produto possui contraste suficiente e acao clara.
- [ ] `pnpm run typecheck` passa.
- [ ] Build frontend passa.
- [ ] Build API passa.
- [ ] Docker Compose sobe com healthcheck OK.

## Riscos

| Risco | Mitigacao |
|---|---|
| Chrome omitir fundos por configuracao de usuario | Usar `print-color-adjust: exact` e orientar habilitar graficos de fundo quando necessario |
| `transform: scale()` afetar dimensao A4 | Forcar `transform: none !important` no print |
| Cards longos quebrarem no meio | Usar `break-inside: avoid`, reduzir alturas fixas e validar com produtos longos |
| Ajuste de print afetar preview em tela | Restringir alteracoes visuais a `@media print` |

## Resultado Esperado

Ao final, o usuario deve conseguir clicar em PDF e salvar/imprimir uma proposta A4 legivel, completa e fiel ao preview comercial, sem elementos do editor.

## Checklist Final de Implementacao

- [x] Agentes usados: Frontend Engineer, UX/UI Designer, QA Engineer e Technical Writer.
- [x] Skill de frontend aplicada para ajustes React/CSS.
- [x] Skill de PDF considerada para criterios de fidelidade visual e validacao de saida.
- [x] `ProposalPreview.tsx` recebeu classes estaveis de print: `proposal-preview-page`, `proposal-hero-section`, `proposal-product-card`, `proposal-investment-block`, `proposal-footer`.
- [x] Bloco de investimento passou a usar `backgroundColor: '#000000'` inline para preservar o fundo no PDF.
- [x] CSS de print foi reforcado com `print-color-adjust: exact`.
- [x] CSS de print remove `transform: scale(...)` no wrapper impresso.
- [x] CSS de print forca A4 e remove sidebar/editor da impressao.
- [x] Hero, cards de produto, investimento, estatisticas e rodape usam `break-inside: avoid`.
- [x] Descricoes de produto deixam de ser truncadas no PDF.
- [x] Botao `PDF` aguarda dois frames antes de chamar `window.print()`.
- [x] Campo `Descricao` da `Apresentacao` usa `Textarea`.
- [x] Normalizacao da `Apresentacao` nao remove espacos/quebras enquanto o usuario digita.
- [x] Payload salvo ainda faz trim no envio final para evitar lixo nas extremidades.
- [x] Preview preserva quebras de linha com `whitespace-pre-line`.
- [x] Botao de remover produto no acordeao `Produtos` usa variante destrutiva vermelha.
- [x] Botao de remover produto possui `aria-label`.
- [x] `docs/04-frontend-guidelines.md` atualizado.
- [x] `docs/paginas-por-perfil.md` atualizado.
- [x] `docs/MUDANCAS.MD` atualizado.
- [x] `docs/rodar-local.md` atualizado.
- [x] `pnpm run typecheck` passou.
- [x] `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build` passou.
- [x] `PORT=8080 pnpm --filter @workspace/api-server run build` passou.
- [x] `docker compose up -d --build` passou.
- [x] `curl http://localhost:21709/api/healthz` retornou `{"status":"ok"}`.

Observacao:

- A validacao automatica confirmou build e healthcheck. A conferencia visual final do PDF salvo ainda deve ser feita no Chrome, no dialog de impressao, verificando papel A4 e `Graficos de fundo` quando a opcao existir.

## Revisao Pos-Validacao - Assinatura e Contato Cortados

Problema encontrado:

- O PDF gerava a folha A4 com cores e estrutura corretas, mas o bloco final de assinatura/dados de contato ficava cortado abaixo do investimento quando a proposta tinha 4 produtos.
- A causa foi o conteudo interno da folha nao ter uma camada propria de compactacao para o modo `print`; o container A4 estava correto, mas os espacamentos verticais do preview de tela consumiam a area util da primeira pagina.

Correcao aplicada:

- `ProposalPreview.tsx`: adicionada a classe `proposal-preview-content` no wrapper interno da folha.
- `index.css`: adicionadas regras de `@media print` para:
  - transformar o conteudo interno em coluna flex dentro da area A4;
  - reduzir apenas no print os paddings/margens do header, hero, produtos e investimento;
  - reduzir levemente tamanhos grandes do hero/investimento no PDF;
  - manter `proposal-footer` com `margin-top: auto`, garantindo assinatura e contato no fim da folha quando houver espaco;
  - preservar as regras de fundos, A4 e `break-inside: avoid`.

Validacao da revisao:

- [x] `pnpm run typecheck` passou.
- [x] `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build` passou.
- [x] Docker recuperado apos falha de camada cacheada com `docker compose build --no-cache`.
- [x] `docker compose up -d --force-recreate` subiu frontend, API e Postgres.
- [x] `curl http://localhost:21709/api/healthz` retornou `{"status":"ok"}`.
- [ ] Reabrir no Chrome, clicar em `PDF` e confirmar visualmente que assinatura + contato aparecem no PDF A4 salvo.

Observacao tecnica:

- A falha posterior ao primeiro rebuild nao foi causada pelo ajuste de PDF. O container saiu com `Invalid package config /app/node_modules/.pnpm/prisma...`, indicando camada de `node_modules` corrompida apos erro interno do Docker Desktop/containerd. A recuperacao foi feita com rebuild sem cache.
