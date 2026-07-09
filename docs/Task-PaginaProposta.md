# Especificação de Mudanças — Sprint de Ajustes (Propostas, Programas, Produtos)
**Versão:** 1.1
**Data:** 30/06/2026
**Baseado em:** `paginas-por-perfil.md` (estado atual do sistema) + print da tela `/proposals/:id/edit` + print dos 8 acordeões do Editor (mobile)

> **Changelog v1.1:** Adicionada tabela explícita "O que muda e o que permanece" por acordeão (Task 3), confirmando contra o print real dos 8 acordeões atuais (Empresa, Proposta, Campanha & Cliente, Período, Capa/Banner, Estatísticas, Plano de Ações, Investimento & Contato). Reforça que qualquer campo/acordeão não citado nas tasks permanece inalterado — em especial os acordeões **Empresa** e **Período**, que não sofrem nenhuma mudança nesta sprint.

---

## 0. Contexto

O sistema evoluiu do PRD original: `Station` virou **Empresas**, `ProductTemplate` virou **Produtos**, `ProposalCategory` virou **Programas**, e `ProposalTemplate` foi descontinuado (existe um arquivo legado em `artifacts/proposta/src/pages/admin/proposal-templates.tsx`, sem rota ativa). Esta especificação assume essa arquitetura atual como base e detalha as 8 tarefas solicitadas, todas compatíveis com o que já existe.

---

## TASK 1 — Criar Produtos durante a criação de um Programa

### Problema atual
Na tela `/admin/proposal-categories` (Programas), o admin só pode **vincular produtos já existentes** ao programa. Para criar um produto novo específico daquele programa, é preciso sair, ir em `/admin/product-templates`, criar o produto, voltar e vincular.

### Solução
Adicionar a opção **"+ Criar novo produto"** dentro do próprio formulário/modal de criação e edição de Programa, junto ao seletor de produtos vinculados.

### Comportamento
- No formulário de Programa (criação ou edição), ao lado do multi-select de "Produtos vinculados", incluir um botão **"+ Novo Produto"**.
- Ao clicar, abre um modal (ou painel expansível inline) com os mesmos campos do formulário de Produto (`/admin/product-templates`):
  - Nome interno
  - Título na proposta
  - Quantidade
  - Programa (pré-selecionado automaticamente com o programa que está sendo criado/editado — campo desabilitado/oculto nesse contexto)
  - Valor sugerido mínimo
  - Valor sugerido máximo
  - Descrição
  - Detalhe
  - Tags
  - Cor
- Ao salvar o produto no modal:
  - Se o **Programa pai ainda não existe** (fluxo de criação): o produto é mantido em memória local (estado do formulário) e só é persistido via API quando o Programa for salvo — nesse momento o `programId` é resolvido e os produtos pendentes são criados em sequência (`POST /api/product-templates` × N, depois vinculados).
  - Se o **Programa já existe** (fluxo de edição): o produto é criado imediatamente via `POST /api/product-templates` com o `programId` já preenchido, e a lista de produtos vinculados do programa é atualizada (refetch ou inserção otimista).
- Toast de sucesso: `"Produto criado e vinculado ao programa"`.
- O produto criado aparece automaticamente marcado/selecionado na lista de produtos vinculados do programa.

### Impacto técnico
- Reaproveitar o componente de formulário de Produto como subcomponente (`ProductFormFields`), usado tanto em `/admin/product-templates` quanto dentro do modal do Programa — evitar duplicar campos.
- Nenhuma mudança de schema necessária; `programId` em `ProductTemplate` já existe conforme documentado (RN de vínculo: "um produto fica vinculado a um único programa via `programId`").

---

## TASK 2 — Toastify em todos os alerts + confirmação ao sair

### Problema atual
O sistema já usa `sonner` para toasts em várias ações (login, CRUD de entidades, status de proposta, etc — listado na seção "Alertas e Feedbacks" do documento atual). O que falta:
- Padronizar **todas** as ações destrutivas/críticas para usar confirmação + toast.
- Adicionar especificamente uma confirmação ao **sair de uma proposta com alterações não salvas**.

### Comportamento a implementar

**2.1 — Confirmação ao sair do editor de proposta**
- No editor (`/proposals/:id/edit`), se houver alterações pendentes (`localData` diferente do último estado salvo, ou auto-save com erro/pendente) e o usuário tentar:
  - Clicar no botão "Voltar"/seta de navegação do header.
  - Navegar para outra rota via menu lateral.
  - Fechar/recarregar a aba (`beforeunload`).
- Exibir modal de confirmação: **"Deseja realmente sair? Você tem alterações não salvas."** com botões `Cancelar` e `Sair sem salvar` (e idealmente um terceiro botão `Salvar e sair`).
- Se não houver alterações pendentes, sai direto sem perguntar.

**2.2 — Padronização geral de toasts via sonner**
Mapeamento de eventos que devem ter toast (consolidando o que já existe + preenchendo lacunas):

| Ação | Toast de sucesso | Toast de erro |
|---|---|---|
| Login | "Login realizado com sucesso" | "Credenciais inválidas" |
| Logout (após confirmação) | "Sessão encerrada" | — |
| Criar/editar/excluir Usuário | "Usuário salvo/removido" | "Erro ao salvar usuário" |
| Criar/editar/desativar Empresa | "Empresa salva/desativada" | "Erro ao salvar empresa" |
| Criar/editar/excluir Produto | "Produto salvo/removido" | "Erro ao salvar produto" |
| Criar/editar/excluir Programa | "Programa salvo/removido" | "Erro ao salvar programa" |
| Upload de logo/ícone (qualquer entidade) | "Imagem enviada" | "Erro ao enviar imagem / arquivo muito grande" |
| Criar/editar Anunciante | "Anunciante salvo" | "Erro ao salvar anunciante" |
| Criar rascunho de proposta | "Rascunho criado!" | "Erro ao criar proposta" |
| Auto-save da proposta | (indicador textual "Salvo às HH:MM", sem toast para não poluir) | Toast de erro "Erro ao salvar automaticamente" |
| Salvar manual (botão Salvar) | "Proposta salva" | "Erro ao salvar proposta" |
| Alterar status da proposta | "Status atualizado para {label legível}" | "Erro ao atualizar status" |
| Rejeitar proposta | Confirmação prévia + "Proposta rejeitada" | "Erro ao rejeitar proposta" |
| Sair sem salvar (Task 2.1) | — | — |

- **Correção específica:** hoje o toast de status pode exibir o valor técnico (`SENT`, `APPROVED`). Trocar por um mapa de labels: `DRAFT → Rascunho`, `SENT → Enviada`, `APPROVED → Aprovada`, `REJECTED → Rejeitada`.
- Toda ação de **exclusão/desativação** (Usuário, Empresa, Produto, Programa, Anunciante) deve abrir modal de confirmação antes de chamar a API — não apenas o toast de resultado. Texto padrão: `"Tem certeza que deseja excluir/desativar {nome da entidade}? Essa ação não poderá ser desfeita."`

---

## TASK 3 — Reformulação da Tela de Criação/Edição de Proposta

Esta é a mudança mais ampla. Reorganizando por subitem do pedido:

### 3.1 — Tipo de Proposta como dropdown gerenciável

**Problema atual:** `propType` é um campo de texto livre digitado manualmente.

**Solução:**
- Criar nova entidade **Tipo de Proposta** (`ProposalType`), com CRUD próprio.
- Tela nova: **`/admin/proposal-types`** (ADMIN cria/edita/exclui) — pode também ser liberada para COMERCIAL criar tipos conforme pedido ("login comercial criará tipos de propostas"), então:
  - ADMIN: acesso total (criar, editar, excluir).
  - COMERCIAL: pode criar novos tipos a partir do próprio editor de proposta (ver abaixo), sem precisar entrar na tela administrativa.
- Campos do tipo: `name` (ex: "Proposta Comercial", "Proposta Institucional", "Pacote Promocional"), `active`.
- No editor de proposta, o campo "Tipo" passa a ser um **dropdown** que lista os tipos cadastrados, com opção **"+ Criar novo tipo"** no próprio select (cria inline via modal pequeno: só pede o nome, salva e já seleciona).

**Backend:**
```
GET    /api/proposal-types
POST   /api/proposal-types
PATCH  /api/proposal-types/:id
DELETE /api/proposal-types/:id   (soft delete -> active=false)
```

`Proposal.propType` deixa de ser `String` livre e passa a ser `proposalTypeId` (relação), mantendo um campo de exibição (`proposalType.name`) no preview.

### 3.2 — Remover Mês e Ano do formulário de proposta

- Remover os campos `Mês` e `Ano` do acordeão "Proposta".
- O acordeão "Proposta" passa a ter apenas: **Tipo de Proposta** (dropdown da 3.1) e **Periodicidade** (ver 3.4).
- No preview/PDF, o badge superior que hoje mostra `Tipo • Mês/Ano` passa a mostrar `Tipo • Periodicidade` (ex: "Proposta Comercial • Trimestral") ou, se houver datas de período preenchidas, `Tipo • dd/mm a dd/mm`.

### 3.3 — Bloco Campanha: remover tag, trocar Anunciante por busca + criação inline, remover Cliente Linha 1/2

**Remover:**
- Campo "Tag da Campanha" (`campTag`) — removido do formulário e do preview.
- Campos "Cliente (Linha 1)" e "Cliente (Linha 2)" (`clientLine1`, `clientLine2`) — removidos. O nome do cliente exibido no preview passa a vir diretamente do Anunciante selecionado (`advertiser.tradeName` ou `advertiser.legalName`).

**Trocar seletor de Anunciante por busca + criação inline:**
- O dropdown simples de Anunciante é substituído por um **campo de busca (combobox/autocomplete)**: o usuário digita e o sistema busca em `GET /api/advertisers?active=true&search=...` em tempo real (debounce ~300ms).
- Ao lado/abaixo do campo de busca, botão **"+ Novo Anunciante"**.
- Clicar nesse botão abre um **modal** com o mesmo formulário usado em `/advertisers/new` (reaproveitar componente `AdvertiserFormFields`), sem sair da tela de proposta.
- Ao salvar o anunciante no modal: `POST /api/advertisers`, e o anunciante recém-criado é automaticamente selecionado como `advertiserId` da proposta.
- **Correção do ponto de atenção documentado:** ao selecionar (ou criar) um anunciante, os campos de contato da proposta passam a ser **preenchidos automaticamente** a partir do cadastro do anunciante (nome do contato, telefone), eliminando a necessidade de digitar de novo. *(Nota: isso conecta diretamente com a Task 3.7, que torna o contato fixo vindo do cadastro da conta oficial — ver detalhamento lá.)*

Acordeão renomeado de "Campanha & Cliente" para apenas **"Cliente"**, contendo: busca de anunciante + botão de criação.

### 3.4 — Periodicidade: Mensal, Trimestral, Anual

- Novo campo obrigatório no acordeão "Proposta": **Periodicidade**, com três opções fixas via dropdown/radio:
  - `MONTHLY` — Mensal
  - `QUARTERLY` — Trimestral
  - `YEARLY` — Anual
- Substitui a lógica antiga de Mês/Ano (removida na 3.2).
- Os campos de período existentes (`dateStart`, `dateEnd`, `periodDesc`) continuam disponíveis para detalhar as datas reais da campanha dentro da periodicidade escolhida — por exemplo, periodicidade "Trimestral" com `dateStart = 01/07/2026` e `dateEnd = 30/09/2026`.

```prisma
enum ProposalPeriodicity {
  MONTHLY
  QUARTERLY
  YEARLY
}
```

### 3.5 — Plano de Ação: criar produto avulso OU usar dropdown de produtos prontos

**Problema atual:** hoje o Plano de Ações só permite adicionar itens manualmente digitando cada campo; não existe dropdown para puxar produtos já cadastrados (ponto já identificado em "Pontos Prováveis de Ajuste" do documento atual).

**Solução — duas formas de adicionar item ao Plano de Ação:**

1. **"+ Adicionar produto do catálogo"** — abre um dropdown/combobox com busca que lista os Produtos cadastrados (`GET /api/product-templates?active=true&search=...`), agrupados visualmente por Programa. Ao selecionar um produto, ele é inserido no Plano de Ações da proposta com todos os campos pré-preenchidos (quantidade, título, descrição, detalhe, programa, tags, cor), vindos do cadastro do produto. O usuário pode então editar livremente esses campos só dentro daquela proposta (não altera o produto original).
2. **"+ Adicionar produto avulso"** — mantém o comportamento atual: abre um card vazio para o usuário preencher manualmente todos os campos do zero, para casos que não têm produto correspondente no catálogo.

Ambas as ações inserem um item na mesma lista (`ProposalProduct[]`), sem distinção de schema — a única diferença é a origem do preenchimento inicial. Opcionalmente, registrar `productTemplateId` (nullable) em `ProposalProduct` apenas para rastreabilidade/analytics futura (qual produto do catálogo é mais usado em propostas), sem efeito funcional obrigatório no MVP desta task.

```prisma
model ProposalProduct {
  id               String       @id @default(cuid())
  proposalId       String
  proposal         Proposal     @relation(fields: [proposalId], references: [id], onDelete: Cascade)
  productTemplateId String?     // rastreabilidade opcional — origem do catálogo
  order            Int          @default(0)
  qty              String       @default("01")
  title            String
  description      String?      @db.Text
  detail           String?
  program           String?
  tags              String[]    @default([])
  color             ProductColor @default(BLUE)
}
```

### 3.6 — Remover capa/banner

- Remover por completo o acordeão "Capa / Banner" do editor: upload de imagem (`bannerBase64`) e controle de opacidade (`overlayOpacity`).
- No preview, a área superior (hero) deixa de usar imagem de fundo e passa a usar apenas a cor/identidade visual padrão da Empresa (sólida, sem banner), mantendo logo e nome.
- Os campos `bannerBase64` e `overlayOpacity` podem ser mantidos no schema como `nullable`/deprecated para não quebrar dados antigos, mas a UI não os expõe mais.

### 3.7 — Investimento: remover descrição, contato fixo vindo do cadastro oficial

**Remover:**
- Campo "Descrição do Investimento" (`investDesc`) — removido do formulário. O bloco de Investimento no preview passa a mostrar apenas o **Valor** (`investValue`), sem texto descritivo livre.

**Contato fixo vindo do cadastro:**
- Os campos `contactName`, `contactRole`, `contactPhone` deixam de ser digitados livremente em cada proposta.
- Criar (ou reaproveitar, se já existir) o conceito de **Conta Comercial Oficial** vinculada à Empresa — provavelmente os mesmos dados de contato já presentes no cadastro de Empresa (`/admin/station`, que já tem campos de Contato, Telefone, E-mail).
- No editor da proposta, o bloco "Contato" deixa de ser editável e passa a **exibir automaticamente** (read-only) os dados de contato cadastrados na Empresa vinculada à proposta (`station.contactName`, `station.contactPhone`, etc.) — semelhante ao acordeão "Empresa" atual, que já exibe dados em modo somente leitura.
- Se a Empresa tiver múltiplos usuários/executivos de conta, avaliar (fora do escopo imediato desta task, registrar como ponto futuro) permitir selecionar **qual responsável comercial** aparece na proposta, puxando de um cadastro de "Executivos de Conta" por Empresa. Para esta sprint, usar diretamente o contato único já cadastrado na Empresa.

### Resumo Acordeão a Acordeão — O que muda e o que permanece

A tela atual tem 8 acordeões: **Empresa, Proposta, Campanha & Cliente, Período, Capa (Banner), Estatísticas (4 blocos), Plano de Ações, Investimento & Contato**. Esta task não reescreve a tela do zero — apenas altera o que está explicitamente listado abaixo. Tudo que não é mencionado permanece exatamente como está hoje (mesmos campos, mesmo comportamento, mesma posição relativa).

| Acordeão atual | O que muda | O que permanece |
|---|---|---|
| **Empresa** | Nada. Não faz parte desta sprint. | Continua somente leitura, mostrando nome e slogan da Empresa vinculada (`station.name`, `station.slogan`), exatamente como hoje. |
| **Proposta** | Campos `Mês` e `Ano` são **removidos** (3.2). Campo `Tipo` deixa de ser texto livre e vira **dropdown gerenciável** com opção de criar novo tipo inline (3.1). É **adicionado** o campo `Periodicidade` (Mensal/Trimestral/Anual) (3.4). | O acordeão em si continua existindo, na mesma posição, só com o conteúdo interno alterado. |
| **Campanha & Cliente** | Renomeado para **"Cliente"**. Campo `Tag da Campanha` é **removido** (3.3). Campos `Cliente (Linha 1)` e `Cliente (Linha 2)` são **removidos** (3.3). O dropdown simples de Anunciante é **substituído** por busca/combobox + botão "+ Novo Anunciante" com modal inline (3.3). | Nenhum outro campo deste acordeão é afetado. |
| **Período** | **Nada muda.** Não foi mencionado em nenhuma task. | Continua com `Data início`, `Data fim` e `Descrição do período` (`periodDesc`), exatamente como hoje — incluindo a regra de que `periodDesc`, quando preenchido, tem prioridade sobre as datas no preview. |
| **Capa (Banner)** | Acordeão **removido por completo** (3.6) — upload de imagem e opacidade somem do formulário. | — |
| **Estatísticas (4 blocos)** | Acordeão **removido por completo** (3.3, item "remover estatísticas das propostas"). | — |
| **Plano de Ações** | **Adicionado** o fluxo de inserir item a partir de um produto do catálogo (dropdown com busca), mantido lado a lado com a criação manual de item avulso (3.5). | A lista de itens já adicionados, edição de cor, remoção de item e os campos de cada item (quantidade, título, programa, descrição, tags) continuam funcionando como hoje — a mudança é só na forma de *adicionar* um item novo, não na estrutura do item em si. |
| **Investimento & Contato** | Campo `Descrição do Investimento` é **removido** (3.7). Os campos de contato (`Nome do contato`, `Cargo`, `Telefone`) deixam de ser **editáveis** e passam a ser **somente leitura**, preenchidos automaticamente a partir do cadastro da Empresa (3.7). | O campo `Valor` (`investValue`) continua editável normalmente, na mesma posição. |

Resultado: a tela passa de **8 acordeões para 6** (remoção de "Capa (Banner)" e "Estatísticas (4 blocos)"), mantendo a mesma estrutura visual de acordeões empilhados, rodapé fixo com Status/Salvar/PDF e o painel de preview à direita — nada disso muda de layout, apenas o conteúdo interno dos acordeões listados na tabela acima.

```
┌─ Empresa ──────────────────────────────┐   [inalterado]
│ Nome e slogan (somente leitura)
└────────────────────────────────────────┘

┌─ Proposta ─────────────────────────────┐   [alterado]
│ Tipo: [Dropdown ▾]  [+ Criar novo tipo]
│ Periodicidade: ( ) Mensal ( ) Trimestral ( ) Anual
└────────────────────────────────────────┘

┌─ Cliente ──────────────────────────────┐   [renomeado + alterado]
│ [Buscar anunciante...]  [+ Novo Anunciante]
└────────────────────────────────────────┘

┌─ Período ──────────────────────────────┐   [inalterado]
│ Data início | Data fim | Descrição livre
└────────────────────────────────────────┘

┌─ Plano de Ações ───────────────────────┐   [alterado: nova forma de adicionar]
│ [+ Adicionar produto do catálogo ▾]
│ [+ Adicionar produto avulso]
│ [lista de itens já adicionados — inalterada]
└────────────────────────────────────────┘

┌─ Investimento & Contato ───────────────┐   [alterado]
│ Valor: [R$ ____]                          (inalterado)
│ Contato (somente leitura, vindo da Empresa)
└────────────────────────────────────────┘

[Status ▾]  [Salvar]  [PDF]                  [inalterado]
```

Removidos por completo do fluxo: acordeão **Capa (Banner)** e acordeão **Estatísticas (4 blocos)**. Todos os demais acordeões continuam existindo; apenas os campos explicitamente citados na tabela acima são alterados.

---

## TASK 4 — Filtros nas telas de Programas e Produtos

### Problema atual
`/admin/proposal-categories` (Programas) e `/admin/product-templates` (Produtos) hoje listam tudo sem busca, ordenação ou filtro — diferente de `/proposals` e `/advertisers`, que já têm busca.

### Solução — aplicar o mesmo padrão de filtros já usado em Propostas/Anunciantes

**Tela de Programas (`/admin/proposal-categories`):**
- Campo de busca por nome/slug (`search`).
- Filtro por status: Ativo / Inativo / Todos.
- Ordenação: Nome (A-Z / Z-A), Ordem manual (`order` ascendente, padrão atual), Mais recentes / Mais antigos, Qtd. de produtos vinculados (maior/menor).

**Tela de Produtos (`/admin/product-templates`):**
- Campo de busca por nome interno ou título na proposta (`search`).
- Filtro por Programa vinculado (dropdown com os programas existentes, incluindo opção "Sem programa").
- Filtro por status: Ativo / Inativo / Todos.
- Filtro por faixa de valor sugerido (mín/máx, opcional, range slider ou dois inputs).
- Ordenação: Nome (A-Z / Z-A), Mais recentes / Mais antigos, Valor sugerido (maior/menor).

### Backend
Estender os endpoints existentes para aceitar query params, no mesmo padrão já usado em `/api/proposals` (`page`, `limit`, `search`, `status`):

```
GET /api/proposal-categories?search=&active=&sort=name_asc|name_desc|order|newest|oldest|products_count
GET /api/product-templates?search=&programId=&active=&minValue=&maxValue=&sort=name_asc|name_desc|newest|oldest|value_asc|value_desc
```

### UI
Reaproveitar o componente de barra de filtros já existente em `/proposals` (campo de busca + selects de filtro lado a lado, com badge de contagem de resultados), aplicando-o nas duas telas.

---

## Resumo de Impacto por Camada

### Banco de dados (Prisma)
- Nova entidade `ProposalType` (substitui `propType: String` por relação).
- Novo enum `ProposalPeriodicity` em `Proposal`.
- Remoção de uso (não necessariamente do schema) de: `campTag`, `clientLine1`, `clientLine2`, `stats`, `bannerBase64`, `overlayOpacity`, `investDesc` — manter como `nullable`/deprecated por segurança de migração, sem exibir na UI.
- `Proposal.contactName/contactRole/contactPhone` passam a ser preenchidos automaticamente a partir da `Station` vinculada (deixam de ser inputs livres).
- `ProposalProduct.productTemplateId` (nullable) para rastreabilidade opcional.

### Backend (API)
- Novo módulo `proposal-types` (CRUD completo).
- Extensão de filtros em `proposal-categories` e `product-templates` (search, sort, filtros adicionais).
- Ajuste no payload de criação de produto a partir do contexto de Programa (Task 1).
- Endpoint de criação de Proposta deixa de exigir `propType`/`propMonth`/`propYear` como antes, passando a exigir `proposalTypeId` e `periodicity`.

### Frontend
- Componente reaproveitável `ProductFormFields` (Task 1).
- Componente reaproveitável `AdvertiserFormFields` em modal (Task 3.3).
- Combobox de busca de Anunciante e de Produto (Task 3.3 e 3.5).
- Hook/guarda de navegação com confirmação (`useUnsavedChangesGuard`) para Task 2.1, aplicado ao editor de proposta.
- Mapa de labels de status para toasts (Task 2.2).
- Barra de filtros reutilizável (`EntityFilterBar`) aplicada em Programas e Produtos (Task 4).
- Reformulação completa do `ProposalEditor` e `ProposalPreview` conforme layout da Task 3.

---

## Priorização Sugerida

| Ordem | Task | Complexidade | Dependência |
|---|---|---|---|
| 1 | Task 2 (Toastify + confirmação de saída) | Baixa | Nenhuma — pode entrar em paralelo |
| 2 | Task 4 (Filtros Programas/Produtos) | Baixa | Nenhuma |
| 3 | Task 1 (Criar produto dentro do Programa) | Média | Reaproveita form de Produto |
| 4 | Task 3.1 (Tipo de Proposta como dropdown) | Média | Nova entidade + migration |
| 5 | Task 3.3 (Busca/criação de Anunciante inline) | Média | Reaproveita form de Anunciante |
| 6 | Task 3.5 (Produto do catálogo no Plano de Ação) | Média | Depende do form de Produto existente |
| 7 | Task 3.2 + 3.4 + 3.6 + 3.7 (limpeza de campos + periodicidade + contato fixo) | Média/Alta | Pode ser feito junto, é o mesmo formulário sendo reescrito |

---

*Fim do documento*