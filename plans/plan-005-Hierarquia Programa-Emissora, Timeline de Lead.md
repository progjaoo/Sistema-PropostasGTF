# Plano 005 — Hierarquia Programa-Emissora, Timeline de Lead/Proposta, Campo de Apresentação e PDF A4 Completo

## Metadados

- Projeto: Sistema de Propostas
- Data: 2026-07-09
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces
- Agente principal recomendado: Software Architect
- Agentes de apoio: Database Engineer, Backend API Engineer, Frontend Engineer, UX/UI Designer, QA Engineer, Technical Writer
- Status: Planejado

## Referências Usadas

- `plans/plan-002-redesign-proposta-clientes-leads-cor-emissora.md`
- `plans/plan-003-produtos-duracao-horario-sazonalidade.md`
- `plans/plan-004-fluxo-propostas-programas-editor-pdf-a4.md`
- `lib/db/prisma/schema.prisma`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/pages/proposals/index.tsx`
- `artifacts/proposta/src/index.css`
- `artifacts/proposta/index.html`
- Referência visual: `Frame_3.svg` e foto da tela atual do preview

## Contexto e Diagnóstico

Este plano consolida 4 problemas identificados após os planos 002, 003 e 004:

1. **Programas não têm vínculo obrigatório com Emissora** — hoje `ProposalCategory.stationId` pode já existir no schema mas não é exigido nem exposto na UI de criação de Programas. Isso faz com que a tela de propostas por programas (`program-board`) misture programas de emissoras diferentes sem hierarquia.

2. **Fluxo de Lead → Cliente precisa de timeline** — o plan-002 criou o status `LEAD/CLIENT` em `Advertiser` e a promoção automática ao aprovar proposta, mas não criou um rastreamento do andamento da negociação. O comercial precisa registrar etapas ("em conversa", "conferindo", "aprovado") de forma visual.

3. **Campo Destaque/Descrição da Apresentação está travado** — no acordeão "Apresentação" do editor, o campo de descrição não aceita quebra de linha/espaço adequadamente, impedindo formatos como `"15,4% - 1° Lugar em audiência pesquisa Mar/2026"`.

4. **PDF gerado via `window.print()` perde formatação** — os fundos coloridos (hero azul, bloco de investimento preto), o contato do comercial e o layout geral somem na impressão. O preview visual na tela está correto, mas o CSS de `@media print` não preserva backgrounds, e o bloco de Investimento & Contato está cortado.

---

## Escopo

### Dentro do Escopo

- Vincular `ProposalCategory` (Programa) a `Station` (Emissora) obrigatoriamente.
- Expor `stationId` na criação e edição de Programa na UI ADMIN.
- Filtrar programas por emissora na tela `program-board` e no editor de proposta.
- Criar entidade `ProposalTimeline` para rastrear etapas da negociação.
- Criar UI de timeline no contexto de Lead/Cliente e de Proposta.
- Definir etapas fixas da timeline com possibilidade de nota opcional.
- Corrigir campo de descrição da Apresentação para aceitar texto livre multiline.
- Corrigir `@media print` para preservar backgrounds, fontes, layout completo.
- Garantir que Investimento e Contato apareçam no PDF.
- Garantir dimensões A4 reais no print sem corte.

### Fora do Escopo

- Renomear fisicamente `ProposalCategory` no banco.
- Criar notificações push ou e-mail para etapas da timeline.
- Criar geração de PDF server-side (manter `window.print()`).
- Alterar regras de permissão ADMIN/COMERCIAL além do necessário.
- Criar histórico de auditoria geral do sistema (fora da timeline de proposta/lead).

---

## FEATURE 1 — Hierarquia Programa → Emissora

### 1.1 Estado Atual

O schema atual do `ProposalCategory` (Programa) provavelmente já tem `stationId` como campo opcional ou ausente. A tela ADMIN de Programas (`/admin/proposal-categories`) não exibe seletor de emissora. A tela `program-board` em `/proposals` lista todos os programas independente de emissora.

### 1.2 Decisão de Modelagem

```prisma
model ProposalCategory {
  // campos existentes...
  stationId   String   @map("station_id")
  station     Station  @relation(fields: [stationId], references: [id])
  // ...
}
```

- `stationId` passa a ser **obrigatório** para novos programas.
- Programas existentes sem `stationId` devem receber a emissora padrão (Radio 88 FM) via migration/seed de correção.
- A relação inversa deve ser adicionada em `Station`:
  ```prisma
  proposalCategories ProposalCategory[]
  ```

### 1.3 Backend

**Endpoint `GET /api/proposal-categories`:**
- Adicionar filtro `?stationId=` opcional.
- Retornar `station` (id + name + primaryColor) no include de cada programa.

**Endpoint `POST /api/proposal-categories`:**
- Tornar `stationId` obrigatório no schema Zod de criação.
- Validar que a Station existe e está ativa.

**Endpoint `PATCH /api/proposal-categories/:id`:**
- Aceitar `stationId` na atualização.

**Endpoint `GET /api/proposals/program-board`:**
- Adicionar filtro `?stationId=` já existente nos filtros da tela.
- Retornar `station.primaryColor` de cada programa para colorir a board por emissora quando necessário.

### 1.4 Frontend — Tela ADMIN de Programas

Arquivo: `artifacts/proposta/src/pages/admin/proposal-categories.tsx`

- Adicionar select de **Emissora** no formulário de criação e edição de Programa (antes dos demais campos).
- Select deve listar emissoras ativas ordenadas (Radio 88 FM primeiro, padrão já estabelecido no plan-002).
- Campo obrigatório — sem emissora, não cria programa.
- Na listagem de programas, exibir badge/chip com o nome da emissora vinculada.
- Filtro de listagem: adicionar select de emissora para filtrar programas por emissora.

### 1.5 Frontend — Tela Program Board (`/proposals`)

Arquivo: `artifacts/proposta/src/pages/proposals/index.tsx`

- Select de Empresa/Emissora já existe nos filtros (plan-004). Garantir que ao selecionar emissora, os programas exibidos sejam apenas os vinculados àquela emissora.
- Exibir badge de emissora nos cards de programa quando filtro de emissora estiver em "Todas".

### 1.6 Frontend — Editor de Proposta

Arquivo: `artifacts/proposta/src/pages/proposals/edit.tsx`

- No acordeão **Empresa**, ao selecionar uma emissora, o seletor de produtos do catálogo deve filtrar apenas produtos cujos programas estejam vinculados àquela emissora.
- Lógica: `produto.programId` → `programa.stationId` === `proposta.stationId`.
- Se o usuário trocar de emissora em uma proposta já com produtos, exibir aviso: _"Ao trocar a empresa, produtos vinculados a programas de outra emissora serão mantidos mas podem não pertencer a esta emissora."_

### 1.7 Seed de Correção

No `scripts/src/seed.ts`:
- Buscar a Station padrão (Radio 88 FM).
- Para todos os `ProposalCategory` sem `stationId`, atribuir o ID da Radio 88 FM.
- Novos programas de seed devem ter `stationId` explícito.

---

## FEATURE 2 — Timeline de Negociação (Lead/Proposta)

### 2.1 Contexto e Fluxo

O comercial precisa registrar o progresso da negociação de forma visual. O fluxo natural é:

```
LEAD criado
  └─ Em conversa
        └─ Material enviado / Proposta enviada
              └─ Cliente conferindo
                    └─ Negociação / Ajustes
                          └─ Aprovado → vira CLIENTE
                                └─ (Rejeitado — encerrado)
```

Este rastreamento deve ficar **vinculado à Proposta** (não ao Advertiser diretamente), porque um Lead pode ter múltiplas propostas em negociação simultaneamente — cada uma com seu próprio andamento.

### 2.2 Modelagem de Dados

```prisma
enum ProposalTimelineStep {
  LEAD_CREATED        // Lead cadastrado
  IN_CONVERSATION     // Em conversa
  PROPOSAL_SENT       // Proposta enviada
  CLIENT_REVIEWING    // Cliente conferindo
  NEGOTIATION         // Em negociação / ajustes
  APPROVED            // Aprovado (espelho de status APPROVED)
  REJECTED            // Rejeitado (espelho de status REJECTED)

  @@map("proposal_timeline_step")
}

model ProposalTimeline {
  id          String                @id @default(cuid())
  proposalId  String                @map("proposal_id")
  proposal    Proposal              @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  step        ProposalTimelineStep
  note        String?               @db.Text         // Anotação livre e opcional
  createdById String                @map("created_by_id")
  createdBy   User                  @relation(fields: [createdById], references: [id])
  createdAt   DateTime              @default(now()) @map("created_at") @db.Timestamptz(6)

  @@map("proposal_timelines")
}
```

Relação adicionada em `Proposal`:
```prisma
timeline ProposalTimeline[]
```

Relação adicionada em `User`:
```prisma
proposalTimelines ProposalTimeline[]
```

### 2.3 Regras de Negócio da Timeline

| Regra | Descrição |
|---|---|
| TL-01 | Qualquer usuário autenticado com acesso à proposta pode adicionar etapa. |
| TL-02 | COMERCIAL só adiciona etapa em propostas que ele criou (RN existente). |
| TL-03 | ADMIN pode adicionar em qualquer proposta. |
| TL-04 | Etapas `APPROVED` e `REJECTED` são adicionadas **automaticamente** pelo backend ao mudar `Proposal.status` para `APPROVED`/`REJECTED`. |
| TL-05 | Etapa `LEAD_CREATED` é adicionada automaticamente ao criar uma proposta cujo `advertiserId` aponta para um `Advertiser.status = LEAD`. |
| TL-06 | Etapas manuais podem ser adicionadas fora de ordem — a timeline é um log append-only, não um estado de máquina rígido. |
| TL-07 | Não é possível deletar etapas — apenas visualizar. |
| TL-08 | Nota é opcional (máximo 500 caracteres). |

### 2.4 Backend

**Novos endpoints:**

```
GET  /api/proposals/:id/timeline         → lista etapas em ordem cronológica
POST /api/proposals/:id/timeline         → adiciona etapa manual (step + note opcional)
```

**Validação Zod para POST:**
```typescript
z.object({
  step: z.enum([
    'IN_CONVERSATION',
    'PROPOSAL_SENT',
    'CLIENT_REVIEWING',
    'NEGOTIATION',
    // APPROVED e REJECTED não são enviáveis manualmente — vêm do status
    // LEAD_CREATED não é enviável manualmente — vem da criação
  ]),
  note: z.string().max(500).optional(),
})
```

**Trigger automático na rota de status:**
- Quando `Proposal.status` muda para `APPROVED`:
  1. Adicionar etapa `APPROVED` na timeline.
  2. Promover `Advertiser.status = CLIENT` (já existe do plan-002).
- Quando muda para `REJECTED`:
  1. Adicionar etapa `REJECTED` na timeline.
- Quando proposta é criada com `advertiserId` de um `LEAD`:
  1. Adicionar etapa `LEAD_CREATED` automaticamente.

**Payload de resposta `GET /api/proposals/:id/timeline`:**
```jsonc
[
  {
    "id": "cuid",
    "step": "LEAD_CREATED",
    "stepLabel": "Lead cadastrado",
    "note": null,
    "createdBy": { "name": "Carlos Silva" },
    "createdAt": "2026-07-09T10:00:00.000Z"
  },
  {
    "id": "cuid",
    "step": "IN_CONVERSATION",
    "stepLabel": "Em conversa",
    "note": "Ligação realizada, cliente interessado em pacote trimestral.",
    "createdBy": { "name": "Carlos Silva" },
    "createdAt": "2026-07-09T14:30:00.000Z"
  }
]
```

**Incluir timeline no payload de detalhe da proposta (`GET /api/proposals/:id`):**
```jsonc
{
  // ...campos existentes...
  "timeline": [ /* array de etapas */ ]
}
```

### 2.5 Frontend — Componente de Timeline

Criar componente reutilizável: `artifacts/proposta/src/components/proposal/ProposalTimeline.tsx`

**Visual:**
```
● Lead cadastrado               10/07/2026 10:00 · Carlos Silva
│
● Em conversa                   10/07/2026 14:30 · Carlos Silva
│  └ Ligação realizada, cliente interessado em pacote trimestral.
│
● Proposta enviada              11/07/2026 09:00 · Carlos Silva
│
○ [+ Registrar próxima etapa]
```

- Linha vertical conectando os nós.
- Nó preenchido (●) = etapa concluída.
- Nó vazio (○) = próxima ação disponível / botão de adicionar.
- Etapas `APPROVED` e `REJECTED` têm cor diferente (verde e vermelho respectivamente).
- Clicar em `[+ Registrar próxima etapa]` abre um **dropdown** ou **modal** com:
  - Select das etapas disponíveis (as que ainda não foram registradas ou que podem ser repetidas como `NEGOTIATION`).
  - Campo de nota (textarea, opcional, max 500 chars).
  - Botão "Registrar".

**Labels das etapas na UI:**

| Enum | Label |
|---|---|
| `LEAD_CREATED` | Lead cadastrado |
| `IN_CONVERSATION` | Em conversa |
| `PROPOSAL_SENT` | Proposta enviada |
| `CLIENT_REVIEWING` | Cliente conferindo |
| `NEGOTIATION` | Em negociação |
| `APPROVED` | Aprovado ✓ |
| `REJECTED` | Rejeitado ✗ |

### 2.6 Onde a Timeline Aparece

**No editor de proposta (`/proposals/:id/edit`):**
- Adicionar aba ou seção colapsável **"Histórico da Negociação"** no painel esquerdo do editor, abaixo do acordeão de Investimento & Contato.
- Exibir o componente `ProposalTimeline`.
- Botão para registrar etapa fica dentro desta seção.

**Na tela de Leads (`/leads`):**
- Ao expandir/clicar em um Lead, exibir um painel lateral ou modal com:
  - Dados do Lead.
  - Lista de propostas vinculadas a ele.
  - Para cada proposta: status + última etapa da timeline + botão para abrir editor.
- Isso dá ao comercial uma visão rápida de onde cada Lead está na negociação sem precisar abrir o editor completo.

**Na tela de Clientes (`/advertisers`):**
- O bloco "Propostas Vinculadas" já exibido pode mostrar a **última etapa da timeline** ao lado do status da proposta.
- Isso é visualmente útil para o gestor ver o andamento sem entrar em cada proposta.

---

## FEATURE 3 — Campo Descrição da Apresentação (Destaque + Texto Livre)

### 3.1 Problema Atual

No acordeão "Apresentação" do editor, o campo de descrição de cada item de stat está renderizado como `<Input>` (campo de linha única). Isso impede:
- Quebra de linha no texto.
- Espaços entre partes de texto como `"15,4% - 1° Lugar em audiência pesquisa Mar/2026"`.
- Caracteres especiais como `°`, `%`, `-` que precisam de espaço correto.

Adicionalmente, o campo de **destaque** (número/valor grande, ex: `"15,4%"`) deve permanecer como está — destacado visualmente. É apenas o campo de **descrição** que precisa de mais liberdade.

### 3.2 Solução

**No editor (`edit.tsx`), para cada item de stat:**

Trocar o `<Input>` do campo `desc` por `<Textarea>`:
```tsx
// Antes:
<Input value={item.desc} onChange={...} placeholder="Descrição do dado" />

// Depois:
<Textarea
  value={item.desc}
  onChange={...}
  placeholder="Ex: 1° Lugar em audiência pesquisa Mar/2026"
  rows={2}
  className="resize-none text-sm min-h-[56px]"
/>
```

**Regras:**
- Máximo recomendado: 120 caracteres (sem hard limit no banco — campo é `String?` no JSON).
- O preview deve renderizar o texto com `white-space: pre-line` ou `whitespace-pre-line` (Tailwind) para preservar quebras de linha digitadas.
- O campo de **destaque** (`num`) permanece como `<Input>` de linha única — não muda.

**No preview (`ProposalPreview.tsx`), seção "APRESENTAÇÃO":**

```tsx
// Descrição do stat com preservação de quebras:
<p
  className="text-sm text-gray-500 mt-1"
  style={{ whiteSpace: 'pre-line' }}
>
  {item.desc}
</p>
```

**Exemplo funcionando:**
- Destaque: `15,4%`
- Descrição: `1° Lugar em audiência\npesquisa Mar/2026`
- Resultado no preview: duas linhas visualmente dentro do card de stat.

---

## FEATURE 4 — PDF A4 Completo com Formatação Preservada

### 4.1 Diagnóstico dos Problemas Atuais

Com base no relato e na análise dos planos anteriores (plan-004 implementou Montserrat e `@page`), os problemas persistentes são:

| Problema | Causa Provável |
|---|---|
| Fundo azul do hero some no PDF | `@media print` não imprime `background-color`/`background-image` por padrão nos navegadores |
| Fundo preto do investimento some | Mesma causa — backgrounds são suprimidos no print sem flag `-webkit-print-color-adjust` |
| Bloco de Contato/Investimento cortado | Elemento está fora do viewport ou do container `.print-area` no momento do print |
| Preview perde escala/posição no print | `transform: scale(0.8)` aplicado ao container não é removido no `@media print` |
| Conteúdo cortado no meio da página | Falta de `page-break-inside: avoid` / `break-inside: avoid` nos cards |

### 4.2 Solução Completa — CSS de Print

**Arquivo: `artifacts/proposta/src/index.css`**

```css
/* ── PRINT / PDF ─────────────────────────────────────────── */

@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  /* Forçar backgrounds coloridos no print */
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }

  /* Ocultar tudo exceto a área de impressão */
  body > *:not(.print-root) {
    display: none !important;
  }

  /* Layout geral do body no print */
  body {
    margin: 0;
    padding: 0;
    background: white !important;
  }

  /* Remover transformações de escala */
  .print-scale-wrapper {
    transform: none !important;
    width: 210mm !important;
    height: auto !important;
  }

  /* Área de impressão */
  .print-area {
    display: block !important;
    width: 210mm;
    min-height: 297mm;
    margin: 0;
    padding: 0;
    box-shadow: none !important;
    overflow: visible !important;
  }

  /* Evitar corte dentro de cards de produto */
  .proposal-product-card {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Evitar corte dentro do bloco de investimento e contato */
  .proposal-investment-block,
  .proposal-contact-block,
  .proposal-footer {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Ocultar elementos de UI (editor, sidebar, botões) */
  .no-print {
    display: none !important;
  }

  /* Garantir que o container de preview não tenha scroll */
  .print-only-container {
    overflow: visible !important;
    height: auto !important;
    position: static !important;
  }
}
```

### 4.3 Solução — Estrutura do DOM para Print

**Arquivo: `artifacts/proposta/src/pages/proposals/edit.tsx`**

O container que envolve o `ProposalPreview` no editor precisa de uma estrutura específica para o print funcionar:

```tsx
{/* Container de preview — visível apenas no editor */}
<div className="flex-1 bg-[#F4F4F5] relative overflow-y-auto print-only-container no-print-padding">
  <div className="absolute top-4 right-4 text-xs font-bold text-muted-foreground/30 uppercase tracking-widest no-print">
    Preview
  </div>

  {/* Wrapper de escala — removida no print */}
  <div
    className="print-scale-wrapper origin-top"
    style={{ transform: 'scale(0.8)', transformOrigin: 'top center' }}
  >
    {/* Área real de impressão */}
    <div className="print-area shadow-2xl">
      <ProposalPreview
        proposal={{ ...localData, station, advertiser: selectedAdvertiser }}
      />
    </div>
  </div>
</div>
```

**Adicionalmente**, criar um portal de print fora do layout do editor. A estratégia mais robusta para garantir que apenas o preview seja impresso:

```tsx
// No edit.tsx — antes do return principal:
useEffect(() => {
  const handleBeforePrint = () => {
    // Mover .print-area para body diretamente (portal de print)
    document.body.classList.add('is-printing');
  };
  const handleAfterPrint = () => {
    document.body.classList.remove('is-printing');
  };
  window.addEventListener('beforeprint', handleBeforePrint);
  window.addEventListener('afterprint', handleAfterPrint);
  return () => {
    window.removeEventListener('beforeprint', handleBeforePrint);
    window.removeEventListener('afterprint', handleAfterPrint);
  };
}, []);
```

Alternativamente (mais simples e recomendado como primeira tentativa): usar `ReactDOM.createPortal` para renderizar o `ProposalPreview` diretamente em `document.body` durante o print, via estado `isPrinting`.

### 4.4 Solução — Botão PDF com Renderização Garantida

```tsx
const handlePrint = () => {
  // Garantir que o DOM está atualizado antes de imprimir
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
};

// Botão:
<Button className="flex-1" onClick={handlePrint}>
  <Printer className="w-4 h-4 mr-2" /> PDF
</Button>
```

### 4.5 Solução — Classes nos Elementos do ProposalPreview

**Arquivo: `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`**

Adicionar classes de controle de print aos elementos críticos:

```tsx
{/* Hero — fundo colorido */}
<div
  className="px-10 py-12"
  style={{ backgroundColor: primaryColor }}
  // backgroundColor inline é mais confiável que classe Tailwind no print
>

{/* Cards de produto */}
<div className="proposal-product-card ...">

{/* Bloco de investimento */}
<div
  className="proposal-investment-block rounded-xl px-8 py-6"
  style={{ backgroundColor: '#000000' }}
  // backgroundColor inline é crítico aqui
>

{/* Rodapé/contato */}
<div className="proposal-footer proposal-contact-block flex justify-between items-end pt-6 border-t border-gray-200">
```

**Regra crítica:** todos os `background-color` que precisam aparecer no PDF devem estar como **`style={{ backgroundColor: '...' }}`** (inline), não como classes Tailwind (`bg-black`, `bg-blue-500`). O Tailwind gera classes CSS que podem ser suprimidas por `@media print` de reset de browsers; estilos inline sobrevivem ao print com `-webkit-print-color-adjust: exact`.

### 4.6 Garantir Investimento e Contato no PDF

**Problema específico:** o bloco de Investimento e Contato está "fora" quando o PDF é gerado. Isso indica que o elemento está sendo cortado porque:
- O container `.print-only-container` tem `overflow: hidden` ou `height: calc(...)` fixo.
- O `transform: scale(0.8)` no wrapper cria um bounding box menor que o conteúdo real.

**Solução específica:**
1. Garantir que o `ProposalPreview` tem `min-height` sem corte — não usar `overflow: hidden` no wrapper de escala.
2. No `@media print`, remover qualquer `height` fixo do container pai.
3. O bloco de rodapé deve ter `margin-top: auto` ou estar sempre ao final do fluxo, não posicionado absolutamente.

```tsx
// ProposalPreview — estrutura do wrapper principal:
<div
  style={{
    width: '794px',      // A4 em 96dpi para tela
    fontFamily: "'Montserrat', Arial, sans-serif",
    backgroundColor: '#ffffff',
    // SEM height fixo — deixar crescer conforme conteúdo
  }}
>
  {/* seções... */}
  {/* Rodapé sempre ao final do fluxo normal, sem position absolute */}
  <div className="proposal-footer ...">
    {/* contato do vendedor */}
  </div>
</div>
```

---

## Impacto por Camada — Resumo

### Banco / Prisma

| Mudança | Arquivo |
|---|---|
| `ProposalCategory.stationId` obrigatório (se não existir) | `schema.prisma` |
| Novo enum `ProposalTimelineStep` | `schema.prisma` |
| Novo model `ProposalTimeline` | `schema.prisma` |
| Relação `Proposal.timeline` | `schema.prisma` |
| Relação `User.proposalTimelines` | `schema.prisma` |
| Seed: atribuir stationId aos programas existentes | `seed.ts` |
| Seed: criar dados de exemplo de timeline | `seed.ts` |

### Backend / API

| Mudança | Arquivo |
|---|---|
| `GET /api/proposal-categories`: aceitar `?stationId=`, retornar `station` | `routes/proposal-categories.ts` |
| `POST/PATCH /api/proposal-categories`: exigir `stationId` | `routes/proposal-categories.ts` |
| `GET /api/proposals/program-board`: filtrar programas por emissora | `routes/proposals.ts` |
| `GET /api/proposals/:id/timeline` | `routes/proposals.ts` ou novo `routes/proposal-timeline.ts` |
| `POST /api/proposals/:id/timeline` | `routes/proposals.ts` ou novo arquivo |
| Trigger automático de timeline em mudança de status | `routes/proposals.ts` |
| Trigger automático `LEAD_CREATED` na criação de proposta | `routes/proposals.ts` |
| `GET /api/proposals/:id`: incluir `timeline` | `routes/proposals.ts` |

### Frontend

| Mudança | Arquivo |
|---|---|
| Select de emissora no form de Programa | `pages/admin/proposal-categories.tsx` |
| Badge de emissora na listagem de Programas | `pages/admin/proposal-categories.tsx` |
| Filtro de emissora na tela program-board | `pages/proposals/index.tsx` |
| Filtro de produtos por emissora no editor | `pages/proposals/edit.tsx` |
| Novo componente `ProposalTimeline.tsx` | `components/proposal/ProposalTimeline.tsx` |
| Seção de timeline no editor de proposta | `pages/proposals/edit.tsx` |
| Painel de timeline na tela de Leads | `pages/leads/index.tsx` |
| Última etapa da timeline em Clientes | `pages/advertisers/index.tsx` |
| Trocar `<Input>` por `<Textarea>` no campo desc da Apresentação | `pages/proposals/edit.tsx` |
| `white-space: pre-line` na descrição da Apresentação no preview | `components/proposal/ProposalPreview.tsx` |
| CSS de print completo com `-webkit-print-color-adjust` | `index.css` |
| Classes `proposal-product-card`, `proposal-investment-block`, `proposal-footer` | `ProposalPreview.tsx` |
| `backgroundColor` inline nos elementos com fundo colorido | `ProposalPreview.tsx` |
| Botão PDF com `requestAnimationFrame` | `pages/proposals/edit.tsx` |
| Remover `transform: scale` no print via CSS | `index.css` |

---

## Plano de Implementação Passo a Passo

### Fase 1 — Banco e Seed

1. Verificar se `ProposalCategory.stationId` já existe no schema atual.
2. Se não existir: adicionar campo, torná-lo obrigatório com migration segura (nullable → preencher → not null).
3. Adicionar enum `ProposalTimelineStep`.
4. Adicionar model `ProposalTimeline`.
5. Adicionar relações em `Proposal` e `User`.
6. Atualizar seed: `stationId` em todos os programas existentes.
7. Rodar `pnpm db:generate && pnpm db:push && pnpm seed`.

### Fase 2 — Backend

1. Atualizar rota de `proposal-categories` (filtro + stationId obrigatório).
2. Criar endpoints de timeline (`GET` e `POST`).
3. Adicionar triggers automáticos de timeline na rota de status de proposta.
4. Adicionar trigger de `LEAD_CREATED` na criação de proposta.
5. Incluir `timeline` no payload de detalhe da proposta.
6. Incluir `station` no payload de listagem de programas.
7. Garantir `station.primaryColor` disponível no program-board.
8. Atualizar `GET /api/proposals/program-board` com filtro por emissora.

### Fase 3 — Feature: Hierarquia Programa-Emissora (Frontend)

1. Adicionar select de emissora no form de Programa (admin).
2. Adicionar badge de emissora na listagem de Programas.
3. Conectar filtro de emissora no program-board.
4. Filtrar produtos por emissora no editor.

### Fase 4 — Feature: Timeline (Frontend)

1. Criar componente `ProposalTimeline.tsx`.
2. Integrar no acordeão do editor de proposta.
3. Adicionar visualização de última etapa na tela de Leads.
4. Adicionar visualização de última etapa em Clientes (nas propostas vinculadas).

### Fase 5 — Feature: Campo Descrição da Apresentação

1. Trocar `<Input>` por `<Textarea>` no campo `desc` dos stats no editor.
2. Adicionar `white-space: pre-line` na renderização do preview.
3. Validar que o PDF preserva a quebra de linha.

### Fase 6 — Feature: PDF A4 Completo

1. Revisar e reescrever CSS de print em `index.css` conforme especificação da seção 4.2.
2. Adicionar classes de controle (`proposal-product-card`, `proposal-investment-block`, `proposal-footer`) no `ProposalPreview.tsx`.
3. Migrar todos os `background-color` críticos para `style={{ backgroundColor: '...' }}` inline.
4. Garantir que o rodapé de contato está no fluxo normal do documento (sem `position: absolute`).
5. Ajustar botão PDF com `requestAnimationFrame`.
6. Testar no Chrome: Cmd+P, salvar como PDF, botão PDF da UI.
7. Validar que hero azul, investimento preto e contato aparecem no PDF.

### Fase 7 — Documentação

1. Atualizar `docs/06-banco-de-dados.md` com `ProposalTimeline` e `ProposalCategory.stationId`.
2. Atualizar `docs/08-regras-de-negocio.md` com regras TL-01 a TL-08.
3. Atualizar `docs/paginas-por-perfil.md` com a seção de timeline.
4. Atualizar `docs/MUDANCAS.MD`.
5. Marcar este plano como `Implementado`.

### Fase 8 — Validação

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
PORT=8080 pnpm --filter @workspace/api-server run build
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

---

## Checklist de QA

### Hierarquia Programa-Emissora

- [ ] Criar Programa sem emissora falha com erro de validação.
- [ ] Criar Programa com emissora salva corretamente.
- [ ] Listagem de Programas exibe badge de emissora.
- [ ] Filtro por emissora na listagem de Programas funciona.
- [ ] Program-board filtra programas pela emissora selecionada.
- [ ] Editor de proposta filtra produtos pelo `stationId` da proposta.
- [ ] Programas existentes sem emissora receberam a Radio 88 FM via seed.

### Timeline

- [ ] Criar proposta com Lead adiciona etapa `LEAD_CREATED` automaticamente.
- [ ] COMERCIAL consegue registrar etapa `IN_CONVERSATION` com nota.
- [ ] COMERCIAL consegue registrar etapa `CLIENT_REVIEWING` sem nota.
- [ ] Ao mudar status para `APPROVED`, etapa `APPROVED` é adicionada automaticamente.
- [ ] Ao mudar status para `REJECTED`, etapa `REJECTED` é adicionada automaticamente.
- [ ] COMERCIAL não vê timeline de proposta de outro vendedor.
- [ ] ADMIN vê timeline de qualquer proposta.
- [ ] Timeline exibe etapas em ordem cronológica.
- [ ] Etapas `APPROVED` e `REJECTED` têm cor diferenciada.
- [ ] Nota opcional aparece abaixo da etapa quando preenchida.
- [ ] Última etapa aparece na tela de Leads ao expandir Lead.
- [ ] Última etapa aparece nas propostas vinculadas na tela de Clientes.

### Campo Descrição da Apresentação

- [ ] Campo `desc` aceita texto com espaços e caracteres especiais (`°`, `%`, `-`).
- [ ] Campo `desc` aceita quebra de linha (Enter).
- [ ] Preview exibe a quebra de linha corretamente.
- [ ] PDF preserva a quebra de linha.
- [ ] Campo `num` (destaque) continua como linha única.

### PDF A4

- [ ] Clicar em PDF abre diálogo de impressão do navegador.
- [ ] Fundo azul do hero aparece no PDF.
- [ ] Fundo preto do bloco de investimento aparece no PDF.
- [ ] Valor do investimento aparece no PDF.
- [ ] Bloco de contato (nome, cargo, telefone do vendedor) aparece no PDF.
- [ ] Sidebar/editor não aparecem no PDF.
- [ ] Cards de produto não são cortados no meio de uma página.
- [ ] Fonte Montserrat é usada no PDF.
- [ ] Folha tem dimensão A4 real ao salvar como PDF.
- [ ] Proposta com poucos produtos ocupa apenas 1 página.
- [ ] Proposta com muitos produtos quebra em múltiplas páginas sem cortar conteúdo.

---

## Critérios de Aceite

1. Todo novo Programa criado exige emissora — sem emissora, a criação falha.
2. Programas existentes sem emissora receberam a emissora padrão via seed.
3. A tela de program-board e o editor filtram programas/produtos pela emissora da proposta.
4. Proposta com Lead cadastrado como anunciante registra automaticamente `LEAD_CREATED` na timeline.
5. COMERCIAL consegue adicionar etapas manuais na timeline de suas propostas.
6. Mudar status para `APPROVED` ou `REJECTED` gera etapa automática na timeline.
7. Campo de descrição da Apresentação aceita texto livre com quebras de linha.
8. Preview renderiza a quebra de linha na descrição da Apresentação.
9. PDF gerado via botão inclui: hero com fundo colorido, investimento com fundo preto, contato do vendedor.
10. PDF não exibe sidebar, editor ou qualquer elemento da UI do sistema.
11. Typecheck e builds passam sem erros.
12. Documentação atualizada.

---

## Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| `ProposalCategory.stationId` já existir no schema como opcional | Verificar schema atual antes de criar migration; se existir, apenas tornar obrigatório com seed de correção |
| Programas existentes ficarem sem emissora | Seed de correção atribui Radio 88 FM como padrão a todos os programas sem `stationId` |
| Timeline crescer muito rápido no banco | Máximo de 50 entradas por proposta com purge automático (mesma regra de `ProposalVersion`) |
| `-webkit-print-color-adjust` não funcionar em todos os browsers | Declarar as três variantes (`-webkit-print-color-adjust`, `print-color-adjust`, `color-adjust`); testar especificamente no Chrome (principal browser do time comercial) |
| `transform: scale(0.8)` não ser removido no print apesar do CSS | Usar `!important` no CSS de print; adicionar classe específica `print-scale-wrapper` no wrapper |
| Bloco de investimento continuar cortado | Garantir que não há `overflow: hidden` e `height` fixo no container pai no print |

## Ordem Recomendada de Commits

1. `db: add stationId to programs and proposal timeline model`
2. `api: require stationId for programs, add timeline endpoints and triggers`
3. `frontend: program-station hierarchy in admin and program board`
4. `frontend: proposal negotiation timeline component`
5. `frontend: fix presentation description field to textarea`
6. `print: fix A4 PDF with backgrounds, footer and no-transform`
7. `docs: update rules, database and changelog for plan-005`

---

## Checklist Final de Implementacao

Status: Implementado parcialmente conforme solicitado, com a Fase 6 removida do escopo de execucao e planejada separadamente no `plans/plan-006-pdf-a4-completo-formatacao-preservada.md`.

- [x] Agente principal definido: Software Architect, com apoio de Database Engineer, Backend API Engineer, Frontend Engineer, UX/UI Designer, QA Engineer e Technical Writer.
- [x] Banco: adicionado enum `ProposalTimelineStep`.
- [x] Banco: adicionado model `ProposalTimeline`.
- [x] Banco: adicionado relacionamento `Proposal.timeline`.
- [x] Banco: adicionado relacionamento `User.proposalTimelines`.
- [x] Banco: adicionado relacionamento `Station.proposalCategories`.
- [x] Banco: adicionado `ProposalCategory.stationId` como nullable para preservar dados legados em `db push`; novas criacoes/edicoes exigem Empresa pela API/UI.
- [x] Seed: programas padrao recebem a Empresa Radio 88 FM.
- [x] API Programas: `GET /api/proposal-categories` aceita filtro `stationId`.
- [x] API Programas: `POST /api/proposal-categories` exige `stationId`.
- [x] API Programas: `PATCH /api/proposal-categories/:id` valida Empresa e produtos vinculados.
- [x] API Produtos: criacao/edicao valida que Produto e Programa pertencem a mesma Empresa.
- [x] API Product Templates: payload de produto retorna `programStationId`/`programStationName`.
- [x] API Program-board: filtra Programas pela Empresa selecionada.
- [x] API Program-board: evita agrupar proposta em programa de outra Empresa quando ha filtro ativo.
- [x] API Propostas: criado `GET /api/proposals/:id/timeline`.
- [x] API Propostas: criado `POST /api/proposals/:id/timeline` para etapas manuais.
- [x] API Propostas: criacao com Lead registra `LEAD_CREATED` automaticamente.
- [x] API Propostas: status `APPROVED` registra etapa automatica e continua promovendo Lead para Cliente.
- [x] API Propostas: status `REJECTED` registra etapa automatica.
- [x] API Propostas: detalhe (`GET /api/proposals/:id`) retorna `timeline`.
- [x] API Clientes/Leads: propostas vinculadas retornam `lastTimelineStep`.
- [x] Frontend Programas: cadastro/edicao exige Empresa.
- [x] Frontend Programas: listagem exibe badge da Empresa.
- [x] Frontend Programas: filtro por Empresa adicionado.
- [x] Frontend Programas: produtos vinculaveis sao filtrados pela Empresa do Programa.
- [x] Frontend Propostas: painel mostra Empresa do Programa.
- [x] Frontend Editor: catalogo de Produtos e filtrado pela Empresa da proposta.
- [x] Frontend Editor: troca de Empresa com produtos existentes alerta para revisao.
- [x] Frontend Editor: criada UI de Timeline.
- [x] Frontend Editor: campo Descricao da Apresentacao virou textarea.
- [x] Preview: descricao da Apresentacao preserva quebra de linha.
- [x] Frontend Clientes/Leads: ultima etapa da timeline aparece nas propostas vinculadas.
- [x] Documentacao: `docs/05-backend-api-guidelines.md` atualizado.
- [x] Documentacao: `docs/06-banco-de-dados.md` atualizado.
- [x] Documentacao: `docs/08-regras-de-negocio.md` atualizado.
- [x] Documentacao: `docs/paginas-por-perfil.md` atualizado.
- [x] Documentacao: `docs/MUDANCAS.MD` atualizado.
- [x] Plano 006 criado para a Fase 6 de PDF A4 completo.
- [x] Validacao: `pnpm run db:generate`.
- [x] Validacao: `pnpm run typecheck`.
- [x] Validacao: `PORT=8080 pnpm --filter @workspace/api-server run build`.
- [x] Validacao: `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`.
- [x] Validacao: `docker compose up -d --build`.
- [x] Validacao: `curl http://localhost:21709/api/healthz` retornou `{"status":"ok"}`.
- [ ] Nao executado por solicitacao: Fase 6 de PDF A4 completo.

Observacoes:

- O `db:push` local fora do Docker continua retornando erro generico de schema engine quando executado com `DATABASE_URL` local, comportamento ja registrado nos planos 002/003.
- No Docker Compose, o `db push` executou corretamente dentro do container da API e o banco ficou sincronizado.

## Ajuste Posterior - Timeline por Proposta na Tela de Propostas

Status: Implementado.

Motivo:

- A timeline precisava ficar mais visivel no fluxo operacional.
- A timeline deve ser sempre contextual por proposta, nao uma timeline geral de cliente/programa.

Decisao de UX:

- A timeline continua disponivel no sidebar do editor da proposta, no acordeao `Timeline`.
- A tela `/proposals` agora tambem exibe um botao `Timeline` em cada proposta vinculada ao programa selecionado.
- Ao clicar em `Timeline`, abre um dialog com a timeline daquela proposta especifica.
- O componente `ProposalTimeline` foi ajustado para carregar as etapas via `GET /api/proposals/:id/timeline` quando usado fora do editor.
- Ao adicionar uma etapa manual pelo dialog, a listagem de propostas e atualizada por invalidacao do React Query.

Arquivos alterados neste ajuste:

- `artifacts/proposta/src/components/proposal/ProposalTimeline.tsx`
- `artifacts/proposta/src/pages/proposals/index.tsx`

Validacao deste ajuste:

- [x] `pnpm run typecheck`
- [x] `PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build`

*Fim do Plano 005*
