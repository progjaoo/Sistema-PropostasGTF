# Plano 002 - Redesign da Proposta, Clientes, Leads e Cor da Emissora

## Metadados

- Projeto: Sistema de Propostas
- Data: 2026-07-09
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces
- Agente principal recomendado: Software Architect
- Agentes de apoio: Product Manager, UX/UI Designer, Frontend Engineer, Backend API Engineer, Database Engineer, QA Engineer e Technical Writer
- Status: Planejado

## Referencias Usadas

- `docs/README.md`
- `.agents/README.md`
- `.agents/agent-software-architect.md`
- `.agents/agent-product-manager.md`
- `.agents/agent-frontend-engineer.md`
- `.agents/agent-backend-api-engineer.md`
- `.agents/agent-database-engineer.md`
- `.agents/agent-qa-engineer.md`
- `.agents/agent-ux-ui-designer.md`
- `docs/03-arquitetura-e-pastas.md`
- `docs/04-frontend-guidelines.md`
- `docs/05-backend-api-guidelines.md`
- `docs/06-banco-de-dados.md`
- `docs/08-regras-de-negocio.md`
- `docs/10-qualidade-validacao-contribuicao.md`
- `lib/db/prisma/schema.prisma`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`

## Escolha do Agente

O melhor agente principal para esta tarefa e o **Software Architect**, porque o PRD cruza frontend, API, banco, regras de negocio, navegacao, preview/PDF e documentacao. A decisao de modelagem de Lead/Cliente tambem precisa preservar o dominio existente sem criar duplicacao desnecessaria.

Agentes de apoio:

- **Product Manager**: fechar regras de produto, criterios de aceite e limites de escopo.
- **UX/UI Designer**: traduzir o mockup do preview e simplificar formuladores sem quebrar usabilidade.
- **Frontend Engineer**: implementar `ProposalPreview`, sidebar, telas de Clientes/Leads e formularios.
- **Backend API Engineer**: ajustar contratos, filtros, validacoes e promocao de Lead para Cliente.
- **Database Engineer**: evoluir Prisma schema, seed e defaults.
- **QA Engineer**: validar ADMIN/COMERCIAL, proposta aprovada, leads/clientes e regressao do preview.
- **Technical Writer**: atualizar documentacao funcional e tecnica afetada.

## Escopo

Implementar planejamento para:

1. Redesign do layout visual da proposta conforme PRD v2.0.
2. Ajustes no editor de proposta para estatisticas editaveis em ate 4 itens.
3. Renomear "Anunciantes" para "Clientes" nas telas visiveis ao usuario.
4. Criar fluxo de "Leads" usando a mesma entidade `Advertiser` com status.
5. Simplificar formulario de Cliente.
6. Garantir cor padrao por Empresa/Emissora via `Station.primaryColor`.
7. Promover Lead para Cliente quando uma proposta vinculada for marcada como aprovada.

Fora de escopo:

- Renomear fisicamente a entidade `Advertiser` no codigo ou banco.
- Criar tabela separada de Leads.
- Remover `legalName` do schema.
- Alterar permissoes nao citadas no PRD.
- Refatorar arquitetura do monorepo fora dos arquivos necessarios.
- Criar color picker completo para Empresa, salvo se for decidido como extensao apos este PRD.

## Estado Atual Identificado

### Banco

O arquivo `lib/db/prisma/schema.prisma` ja possui:

- `Proposal.createdAt`
- `Proposal.updatedAt`
- `Advertiser.createdAt`
- `Advertiser.updatedAt`
- `Proposal.investDesc`

O schema ainda nao possui:

- `Station.primaryColor`
- `Advertiser.status`
- enum especifico para diferenciar Lead e Cliente

### Frontend

O `ProposalPreview.tsx` atual ainda usa estrutura visual antiga:

- Topo escuro ocupando parte da folha.
- Produtos em lista vertical.
- Bloco de investimento em `gray/indigo`, nao preto puro.
- Nao ha a estrutura completa em 6 secoes do PRD v2.

### Referencia Visual

O arquivo `Frame_3.svg` citado no PRD nao foi encontrado no repositorio durante a criacao deste plano. Antes de implementar, anexar o SVG no projeto ou indicar o caminho final. Enquanto isso, usar o PRD textual como fonte de verdade.

## Decisoes Assumidas para Implementacao

1. **Lead e Cliente serao a mesma entidade (`Advertiser`) com status.**
   - Motivo: evita duplicar CRUD, propostas e historico.
   - Implementacao recomendada: enum `AdvertiserStatus` com `LEAD` e `CLIENT`.

2. **Registros existentes devem continuar como Cliente.**
   - Default recomendado: `CLIENT`.
   - Tela `/leads` criara/filtrara registros com `status = LEAD`.

3. **Lead vira Cliente quando proposta for aprovada.**
   - Quando uma proposta mudar para `APPROVED`, se houver `advertiserId`, atualizar `Advertiser.status = CLIENT`.
   - Essa regra deve ficar no backend, na rota que altera proposta/status.

4. **"Razao Social" sai apenas da UI.**
   - Manter `Advertiser.legalName` no schema como opcional para preservar dados historicos.

5. **Preview usara cor da Empresa selecionada.**
   - `station.primaryColor` sera a cor padrao do hero, labels, bordas laterais dos cards e telefone no rodape.
   - O campo `ProductTemplate.color` permanece no banco/catalogo, mas nao deve controlar a cor lateral dos cards no preview deste PRD.

6. **Estatisticas serao editaveis como lista de ate 4 itens.**
   - Campo persistido continua sendo `Proposal.stats` JSON.
   - UI do editor: botao "Adicionar item", layout horizontal, limite de 4 itens.
   - Cada item tera 2 campos de texto: `destaque` e `descricao`.
   - O preview so exibe "APRESENTACAO" quando houver pelo menos 1 item com algum conteudo.

7. **Nao alterar funcionalidades fora do PRD.**
   - Qualquer ajuste necessario deve ser pequeno, local e justificado por dependencia direta.

## Modelagem de Dados

### Prisma - Station

Adicionar:

```prisma
primaryColor String @default("#427EFF") @map("primary_color")
```

Validar se a criacao de Empresa ja envia esse campo. Se nao enviar, o default do banco deve preencher.

### Prisma - Advertiser

Adicionar enum:

```prisma
enum AdvertiserStatus {
  LEAD
  CLIENT

  @@map("advertiser_status")
}
```

Adicionar no model:

```prisma
status AdvertiserStatus @default(CLIENT)
```

Observacao: usar default `CLIENT` para preservar comportamento atual de registros existentes.

### Campos Ja Existentes

Nao criar migracao para:

- `Proposal.createdAt`
- `Proposal.updatedAt`
- `Advertiser.createdAt`
- `Advertiser.updatedAt`
- `Proposal.investDesc`

Eles ja existem no schema atual.

## Impacto por Camada

### Banco / Prisma

Arquivos esperados:

- `lib/db/prisma/schema.prisma`
- `scripts/src/seed.ts`

Tarefas:

- Adicionar `Station.primaryColor`.
- Adicionar enum/status de `Advertiser`.
- Atualizar seed para garantir `primaryColor` da Radio 88 FM como `#427EFF`.
- Atualizar seed para que anunciantes/clientes existentes tenham `status = CLIENT`.
- Criar ou ajustar dados de exemplo de Lead, se util para QA.
- Rodar `pnpm db:generate`, `pnpm db:push` e `pnpm seed`.

### Backend / API

Arquivos provaveis:

- `artifacts/api-server/src/routes/stations.ts`
- `artifacts/api-server/src/routes/advertisers.ts`
- `artifacts/api-server/src/routes/proposals.ts`
- `artifacts/api-server/src/routes/dashboard.ts`, se houver cards/contadores afetados
- `artifacts/api-server/src/routes/index.ts`, se uma rota especifica de leads for criada

Tarefas:

- `GET /api/stations`: retornar `primaryColor`.
- `POST/PATCH /api/stations`: aceitar `primaryColor` opcional e validar formato hex (`#RRGGBB`) quando informado.
- `GET /api/proposals/:id`: garantir include de `station.primaryColor`.
- `GET /api/proposals`: garantir nomes necessarios para listagem (`advertiserName`/`advertiserTradeName`, `proposalTypeName`) se ainda faltar.
- `GET /api/advertisers`: aceitar query `status=LEAD|CLIENT`.
- `POST /api/advertisers`: aceitar status opcional; default da API deve ser `CLIENT` quando a chamada vier da tela de Clientes.
- Para criacao via tela de Leads, frontend envia `status = LEAD`.
- `PATCH /api/advertisers/:id`: permitir alterar status quando a tela precisar promover/corrigir, respeitando permissao atual.
- Rota de atualizacao de proposta/status: ao mudar para `APPROVED`, promover o anunciante vinculado para `CLIENT`.
- Manter a regra de permissao existente: COMERCIAL so acessa/edita suas proprias propostas; ADMIN acessa tudo.

Decisao sobre endpoint de Leads:

- Preferencia: nao criar dominio novo no backend.
- Usar `/api/advertisers?status=LEAD`.
- Criar `/api/leads` somente se a arquitetura atual do client ou da UI ficar mais simples sem duplicar regras.

### Frontend - Preview da Proposta

Arquivo:

- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`

Tarefas:

- Reestruturar a folha em 6 secoes:
  1. Header
  2. Hero Cliente
  3. Apresentacao
  4. Plano de Acoes / Produtos
  5. Investimento
  6. Rodape de Contato
- Usar fallback `primaryColor = "#427EFF"`.
- Header:
  - Logo quadrado com fundo `primaryColor`.
  - Nome da emissora em uppercase.
  - Slogan abaixo.
- Hero:
  - Fundo `primaryColor`.
  - Label do tipo de proposta.
  - Nome do cliente grande em branco.
  - Periodo em pill com borda branca.
- Apresentacao:
  - Label com barra 4px x 14px + texto uppercase.
  - Grid de ate 4 colunas.
  - Cores de destaque alternadas: `primaryColor`, `#727272`, `primaryColor`, `#727272`.
  - Renderizar somente se houver conteudo.
- Produtos:
  - Label "PLANO DE ACOES".
  - Grid 2 colunas.
  - Cards com fundo `#F8FBFF`.
  - Borda lateral esquerda sempre `primaryColor`, conforme decisao do usuario.
  - Tag `PROGRAMA` apenas quando houver programa.
- Investimento:
  - Fundo `#000000`.
  - Border radius grande.
  - Label `INVESTIMENTO`.
  - `investDesc` opcional.
  - Valor grande, branco, alinhado a direita.
- Rodape:
  - Contato vindo de `createdBy`.
  - Cargo + emissora.
  - Telefone em `primaryColor`.

### Frontend - Editor/Criacao de Proposta

Arquivos provaveis:

- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/pages/proposals/new.tsx`
- `artifacts/proposta/src/pages/proposals/index.tsx`

Tarefas:

- Garantir que a Empresa selecionada na proposta carregue `primaryColor` no payload e no preview.
- Ajustar editor de estatisticas:
  - Lista horizontal.
  - Botao "Adicionar item".
  - Maximo de 4 itens.
  - Cada item com 2 campos de texto.
  - Permitir editar/remover item.
  - Persistir no JSON `stats`.
- Garantir `investDesc` no acordeao de Investimento, se a UI ainda nao estiver consistente.
- Garantir que a mudanca de status para `Aprovada` chame o backend e atualize cliente/lead conforme regra.
- Nao mexer em autosave, permissao de proposta, sugestao de investimento ou contato do vendedor fora do necessario para manter compatibilidade.

### Frontend - Sidebar e Navegacao

Arquivo:

- `artifacts/proposta/src/components/layout/AppLayout.tsx`

Tarefas:

- Renomear menu visivel "Anunciantes" para "Clientes".
- Manter rota existente `/advertisers` para reduzir impacto tecnico.
- Adicionar item "Leads" abaixo de "Clientes".
- Criar rota `/leads` em `artifacts/proposta/src/App.tsx`.
- Respeitar permissoes atuais:
  - ADMIN e COMERCIAL podem ver Clientes/Leads se hoje ja veem Anunciantes.
  - Acoes administrativas seguem regras ja existentes.

### Frontend - Clientes e Leads

Arquivos provaveis:

- `artifacts/proposta/src/pages/advertisers/index.tsx`
- `artifacts/proposta/src/pages/advertisers/new.tsx`
- `artifacts/proposta/src/pages/advertisers/edit.tsx`
- Novo arquivo sugerido: `artifacts/proposta/src/pages/leads/index.tsx`

Tarefas:

- Trocar textos visiveis:
  - "Anunciante" -> "Cliente"
  - "Anunciantes" -> "Clientes"
- Formulario Cliente:
  - Label `Nome fantasia` -> `Nome`.
  - Remover campo `Razao Social` da UI.
  - Label `Observacoes` -> `Informacao Interna`.
  - Manter `legalName` no schema e nao apagar dados existentes.
- Tela Leads:
  - Reaproveitar listagem de Clientes com filtro `status=LEAD`.
  - Criar novos registros como `status=LEAD`.
  - Exibir estado vazio proprio para Leads.
  - Mostrar acao/status claro quando Lead ja virou Cliente.
- Promocao Lead -> Cliente:
  - Principal: automatica quando proposta vinculada for `APPROVED`.
  - Opcional apenas se necessario para operacao: botao "Marcar como Cliente", protegido por permissao e confirmacao.

### Frontend - Empresa/Emissora

Arquivos provaveis:

- `artifacts/proposta/src/pages/admin/station.tsx`

Tarefas:

- Confirmar que criacao de Empresa funciona sem enviar `primaryColor`, usando default do schema.
- Se o formulario ja tiver campo tecnico escondido/estado inicial, inicializar com `#427EFF`.
- Nao implementar color picker completo neste PRD, salvo se for pequeno e aprovado como extensao.

## Plano de Implementacao Passo a Passo

### Fase 0 - Preparacao

1. Confirmar que o arquivo `Frame_3.svg` esta disponivel ou anexado no projeto.
2. Abrir `ProposalPreview.tsx` e comparar medidas/estrutura com o PRD textual.
3. Rodar checagem inicial:

```bash
pnpm run typecheck
```

4. Registrar qualquer erro preexistente antes de alterar.

### Fase 1 - Banco e Seed

1. Editar `lib/db/prisma/schema.prisma`.
2. Adicionar enum `AdvertiserStatus`.
3. Adicionar `Advertiser.status`.
4. Adicionar `Station.primaryColor`.
5. Atualizar `scripts/src/seed.ts`.
6. Rodar:

```bash
pnpm db:generate
pnpm db:push
pnpm seed
```

7. Validar no banco que:
   - Estacoes existentes tem `primaryColor`.
   - Anunciantes/clientes existentes tem `status = CLIENT`.

### Fase 2 - Backend API

1. Atualizar schemas Zod de `stations`.
2. Atualizar schemas Zod de `advertisers`.
3. Ajustar listagem de advertisers para aceitar filtro `status`.
4. Ajustar criacao/edicao de advertiser para aceitar status.
5. Garantir `station.primaryColor` em detalhe/listagem de proposta quando necessario.
6. Implementar promocao automatica:
   - Quando `Proposal.status` muda para `APPROVED`.
   - Se `proposal.advertiserId` existir.
   - Atualizar `Advertiser.status = CLIENT`.
7. Validar permissoes ADMIN/COMERCIAL nas rotas tocadas.

### Fase 3 - Contrato Frontend/API

1. Ajustar tipos locais quando o client gerado ainda nao conhecer os novos campos.
2. Se houver pipeline de OpenAPI/client, atualizar especificacao e client gerado.
3. Evitar `any` novo, exceto em ponto temporario explicitamente justificado.

### Fase 4 - Sidebar e Rotas

1. Atualizar `AppLayout.tsx`:
   - "Anunciantes" -> "Clientes".
   - Novo item "Leads".
2. Atualizar `App.tsx` com rota `/leads`.
3. Garantir icones Lucide coerentes.
4. Garantir que o item ativo funciona em `/advertisers` e `/leads`.

### Fase 5 - Clientes e Leads

1. Atualizar telas de advertiser para textos de Cliente.
2. Remover `Razao Social` dos formularios.
3. Ajustar labels:
   - `Nome fantasia` -> `Nome`.
   - `Observacoes` -> `Informacao Interna`.
4. Criar tela `/leads`.
5. Reaproveitar componente/listagem onde for simples.
6. Garantir filtro `status=LEAD` em Leads e `status=CLIENT` em Clientes.
7. Garantir criacao:
   - Tela Clientes cria `CLIENT`.
   - Tela Leads cria `LEAD`.

### Fase 6 - Editor de Proposta

1. Ajustar componente/estado de estatisticas para lista maximo 4.
2. Cada item deve ser editavel inline com 2 campos de texto.
3. Adicionar/remover item sem quebrar JSON existente.
4. Garantir compatibilidade com propostas antigas que tenham `stats` em formato anterior.
5. Garantir que mudar status para `APPROVED` atualiza o lead para cliente apos resposta da API.

### Fase 7 - Redesign do ProposalPreview

1. Refatorar `ProposalPreview.tsx` com estrutura de 6 secoes.
2. Criar helpers locais:
   - `getPrimaryColor`
   - `normalizeStats`
   - `formatPeriod`
   - `formatInvestment`
3. Usar estilos inline quando depender de `primaryColor`.
4. Garantir preview sem dados:
   - Cliente placeholder.
   - Empresa placeholder.
   - Sem produtos.
   - Sem investimento.
5. Garantir preview com dados reais:
   - Header mostra emissora.
   - Hero usa cliente.
   - Estatisticas aparecem apenas com conteudo.
   - Produtos em 2 colunas.
   - Investimento preto.
   - Rodape usa vendedor.

### Fase 8 - Documentacao

Atualizar:

- `docs/paginas-por-perfil.md`
- `docs/08-regras-de-negocio.md`
- `docs/06-banco-de-dados.md`
- `docs/04-frontend-guidelines.md`, se houver novo padrao de preview/lead.
- `docs/MUDANCAS.MD`, se for usado como changelog funcional.

Registrar:

- Anunciantes passam a ser Clientes na UI.
- Leads e Clientes usam `Advertiser.status`.
- Lead vira Cliente quando proposta e aprovada.
- `Station.primaryColor` define cor da proposta.
- Estatisticas sao ate 4 itens editaveis.

### Fase 9 - Validacao Tecnica

Rodar:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
PORT=8080 pnpm --filter @workspace/api-server run build
```

Se precisar validar no Docker:

```bash
docker compose up -d --build
curl http://localhost:21709/api/healthz
```

### Fase 10 - QA Funcional

Validar como ADMIN:

- Menu mostra Clientes e Leads.
- Clientes lista apenas `CLIENT`.
- Leads lista apenas `LEAD`.
- Criar Cliente sem Razao Social.
- Criar Lead.
- Editar Informacao Interna.
- Criar/editar Empresa e confirmar `primaryColor`.
- Abrir proposta e confirmar preview redesenhado.

Validar como COMERCIAL:

- Menu mostra Clientes e Leads conforme permissao atual.
- Criar proposta vinculada a Lead.
- Alterar proposta para `APPROVED`.
- Confirmar que o Lead aparece como Cliente depois da aprovacao.
- Confirmar que regra de dono de proposta continua funcionando.

Validar preview:

- Sem estatisticas: secao "APRESENTACAO" nao aparece.
- Com 1 a 4 estatisticas: secao aparece e alterna cores.
- Mais de 4 estatisticas: UI impede adicionar.
- Produtos com programa mostram tag.
- Produtos sem programa omitem tag.
- Cards usam cor da Empresa, nao cor do produto.
- Investimento usa fundo `#000000`.

## Criterios de Aceite

- `Station.primaryColor` existe no banco com default `#427EFF`.
- Empresas novas nascem com `primaryColor` mesmo sem color picker.
- `Advertiser.status` existe e separa `LEAD` de `CLIENT`.
- Registros existentes continuam como Clientes.
- Sidebar mostra "Clientes" e "Leads".
- Rota `/advertisers` segue funcionando como Clientes.
- Rota `/leads` lista e cria Leads.
- Formulario de Cliente mostra `Nome`, nao mostra `Razao Social`, e mostra `Informacao Interna`.
- Ao aprovar proposta de um Lead, o backend promove o registro para Cliente.
- Preview segue a estrutura do PRD v2.
- Estatisticas sao editaveis em ate 4 itens.
- Produto no preview usa cor padrao da emissora selecionada.
- Nenhuma permissao ADMIN/COMERCIAL existente e relaxada.
- Typecheck e builds passam.
- Documentacao afetada atualizada.

## Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| `Frame_3.svg` nao estar disponivel | Usar PRD textual e validar visualmente quando o SVG for anexado |
| Dados legados de `stats` terem formato diferente | Criar normalizador tolerante no frontend |
| Leads existentes serem classificados errado | Default `CLIENT` para preservar registros atuais; criar leads explicitamente pela tela nova |
| Promocao Lead -> Cliente falhar em status update | Implementar no backend em transacao junto da atualizacao de proposta |
| Preview quebrar PDF/exportacao | Validar preview com dados vazios, parciais e completos antes de finalizar |
| Mudanca textual "Anunciante" -> "Cliente" ficar incompleta | Usar `rg "Anunciante|Anunciantes"` e revisar apenas textos visiveis ao usuario |

## Comandos de Apoio Durante Implementacao

Buscar textos legados:

```bash
rg "Anunciante|Anunciantes|Nome fantasia|Razao Social|Observacoes" artifacts/proposta/src
```

Buscar campos de schema:

```bash
rg "primaryColor|AdvertiserStatus|status" lib/db/prisma/schema.prisma artifacts/api-server/src scripts/src
```

Validar build:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
PORT=8080 pnpm --filter @workspace/api-server run build
```

Validar Docker:

```bash
docker compose up -d --build
docker compose ps
curl http://localhost:21709/api/healthz
```

## Ordem Recomendada de Commit

1. Banco + seed.
2. Backend API.
3. Sidebar + Clientes/Leads.
4. Editor de proposta.
5. Redesign do preview.
6. Documentacao + QA.

## Observacoes Finais

Este plano deve ser implementado de forma incremental. A parte mais sensivel e a regra de promocao Lead -> Cliente ao aprovar proposta, porque ela altera dado de negocio e deve ficar protegida no backend.

Nao remover `legalName`, nao renomear fisicamente `Advertiser` e nao alterar regras de permissao fora do PRD.
