# PRD 019 - Empresas, Produtos e Gestao de Acessos

- Projeto: GTF Propostas
- Data: 15/07/2026
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces
- Escopo: Tarefas 1, 2 e 3
- Status: Implementado

## 1. Referencias Consultadas

- `docs/README.md`
- `docs/05-backend-api-guidelines.md`
- `docs/06-banco-de-dados.md`
- `docs/07-autenticacao-perfis-permissoes.md`
- `docs/08-regras-de-negocio.md`
- `.agents/README.md`
- `lib/db/prisma/schema.prisma`
- `artifacts/api-server/src/routes/stations.ts`
- `artifacts/api-server/src/routes/product-templates.ts`
- `artifacts/api-server/src/routes/users.ts`
- `artifacts/proposta/src/pages/admin/station.tsx`
- `artifacts/proposta/src/pages/admin/product-templates.tsx`
- `artifacts/proposta/src/pages/admin/users.tsx`

## 2. Agentes Recomendados

| Agente | Responsabilidade neste PRD |
|---|---|
| Product Manager | Consolidar regras de negocio e criterios de aceite das tres tarefas. |
| Software Architect | Definir os relacionamentos Empresa-Produto e Usuario-Empresa sem duplicar regras. |
| Database Engineer | Criar migration de acesso por empresa e preservar dados legados. |
| Backend API Engineer | Aplicar autorizacao por empresa no servidor e ajustar contratos. |
| Frontend Engineer | Simplificar formularios e criar a gestao completa de usuarios e acessos. |
| Security Engineer | Garantir default-deny, impedir escalacao de privilegio e proteger contas administrativas. |
| UX/UI Designer | Organizar color picker, seletores dependentes e tela de permissoes. |
| QA Engineer | Validar CRUD, isolamento entre empresas e regressoes ADMIN/COMERCIAL. |
| Technical Writer | Atualizar documentacao por perfil, API, banco e regras de negocio. |

Agentes principais: **Product Manager** e **Software Architect**.

## 3. Objetivo

Simplificar o cadastro de Empresas, tornar explicito o vinculo de Produto com Empresa mesmo quando nao houver Programa e evoluir a tela de Usuarios para uma gestao de acessos por Empresa.

O resultado deve permitir que o ADMIN determine exatamente para quais Empresas cada usuario COMERCIAL pode vender, sem depender apenas de restricoes visuais no frontend.

## 4. Fora do Escopo

- Renomear os modelos Prisma `Station`, `ProductTemplate` ou `ProposalCategory`.
- Excluir fisicamente usuarios com propostas ou historico.
- Criar permissoes arbitrarias por botao/tela fora do dominio Empresa.
- Alterar a regra de que COMERCIAL edita apenas as proprias propostas.
- Remover colunas historicas de Empresa nesta entrega.
- Alterar o layout do PDF da proposta.

## 5. Diagnostico Atual

### 5.1 Empresas

O modelo `Station` possui muitos campos e a UI atualmente exibe praticamente todos. `name` e `primaryColor` ja existem, sendo a cor default `#427EFF`. O campo CNPJ ja e opcional na API e no banco, mas a interface precisa deixar isso inequivoco ao removê-lo do formulario.

### 5.2 Produtos

`ProductTemplate` ja possui `stationId`, mas o endpoint atual exige `programId` e deriva a Empresa do Programa. Isso impede um produto sem Programa. A nova regra exige:

- Empresa obrigatoria;
- Programa opcional;
- quando houver Programa, ele deve pertencer a mesma Empresa do Produto.

### 5.3 Usuarios

O backend ja permite listar, criar, atualizar, desativar e redefinir senha de usuarios. A tela atual, porem, permite apenas criar e listar. Nao existe relacionamento entre Usuario e Empresa, portanto um COMERCIAL autenticado consegue consultar todas as Empresas e o catalogo completo.

## 6. Tarefa 1 - Cadastro Simplificado de Empresas

### 6.1 Regra de negocio

No formulario de criacao e edicao, somente os campos abaixo permanecem visiveis:

| Campo | Obrigatorio | Observacao |
|---|---:|---|
| Nome | Sim | Nome operacional exibido no sistema e na proposta. |
| Cor da proposta | Sim | Hexadecimal valida no formato `#RRGGBB`. |
| Logo | Nao | Mantem o upload base64 ja existente. |
| Slogan | Nao | Mantem uso no cabecalho da proposta. |
| Endereco | Nao | Campo institucional opcional. |
| Cidade | Nao | Campo institucional opcional. |
| Telefone | Nao | Unico telefone de contato da Empresa. |
| E-mail | Nao | Unico e-mail de contato da Empresa. |
| Ativa | Nao | Mantem ativacao/desativacao no fluxo de edicao. |

Devem sair da UI:

- Razao Social (`legalName`);
- Nome Fantasia duplicado (`tradeName`);
- CNPJ (`cnpj`);
- Nome do contato (`contactName`);
- UF (`state`);
- Site (`website`);
- Dados complementares/observacoes (`notes`).

Esses campos permanecem opcionais no schema e na API para preservar dados historicos e compatibilidade. Novos cadastros os enviam como ausentes, nao como valores fabricados.

### 6.2 Color picker

Criar um componente reutilizavel `ColorPickerField` com:

- seletor visual nativo `input type="color"`;
- campo hexadecimal sincronizado;
- swatch de pre-visualizacao;
- normalizacao para hexadecimal de seis digitos;
- validacao acessivel e mensagem de erro;
- default `#427EFF`.

Nao adicionar biblioteca externa apenas para esse controle. A combinacao do seletor nativo com o input hexadecimal atende o caso e evita nova dependencia.

### 6.3 Backend

- Manter `name` obrigatorio.
- Tornar `primaryColor` obrigatoria no contrato de criacao, ainda que o banco mantenha default defensivo.
- Validar a cor com `^#[0-9A-Fa-f]{6}$`.
- Normalizar a cor para uppercase antes de persistir.
- Manter os demais campos legados opcionais.
- Continuar restringindo POST/PATCH/DELETE a ADMIN.

### 6.4 Criterios de aceite da Tarefa 1

- [x] ADMIN cria Empresa informando apenas Nome e Cor.
- [x] O seletor visual e o hexadecimal permanecem sincronizados.
- [x] Cor invalida bloqueia o salvamento com mensagem no campo.
- [x] Telefone e e-mail sao os unicos campos da secao de contato.
- [x] CNPJ, Razao Social, Site, UF e Dados Complementares nao aparecem no formulario.
- [x] Empresa antiga continua editavel sem perda automatica dos dados ocultos.
- [x] A cor selecionada aparece no preview/PDF das novas propostas da Empresa.

## 7. Tarefa 2 - Produto Vinculado a Empresa e Programa Opcional

### 7.1 Regra de negocio

Todo Produto pertence obrigatoriamente a uma Empresa. O vinculo com Programa passa a ser opcional.

| Cenario | Permitido? | Regra |
|---|---:|---|
| Produto com Empresa e Programa da mesma Empresa | Sim | Fluxo normal. |
| Produto com Empresa e sem Programa | Sim | Produto independente. |
| Produto com Programa de outra Empresa | Nao | API retorna `400`. |
| Produto sem Empresa | Nao | API retorna `400`. |

### 7.2 Formulario administrativo de Produto

Ordem dos campos:

1. Empresa obrigatoria;
2. Programa opcional, filtrado pela Empresa escolhida;
3. Nome do Produto;
4. Duracao;
5. Valor sugerido;
6. Descricao;
7. Status.

Ao trocar a Empresa, se o Programa selecionado nao pertencer a nova Empresa, limpar o Programa e informar o usuario. A lista deve oferecer a opcao `Sem programa`.

### 7.3 Produto novo dentro da proposta

No acordeao Produtos, ao usar `Criar Produto Novo`:

- o campo atualmente rotulado como `Programa` para o item avulso passa a se chamar `Nome do Produto`;
- o valor alimenta `ProposalProduct.title`;
- nao criar Programa implicitamente;
- Programa permanece como um seletor separado e opcional quando fizer sentido;
- a Empresa e herdada da proposta e nao pode ser trocada dentro desse modal.

### 7.4 Banco e API

O schema ja possui `ProductTemplate.stationId` obrigatorio e `programId` opcional, portanto nao e necessaria migration estrutural para esse item.

Ajustes de API:

- `stationId` passa a ser obrigatorio no create de Produto;
- remover a validacao que obriga `programId`;
- validar a existencia e atividade da Empresa;
- quando `programId` existir, validar `program.stationId === stationId`;
- filtros de Produto devem aceitar `stationId` alem de `programId`;
- retornar os dados da Empresa diretamente, sem depender apenas de `programRef.station`;
- descontinuar fallback silencioso para a primeira Empresa cadastrada.

### 7.5 Compatibilidade

- Produtos atuais continuam com seus `stationId` existentes.
- O campo textual legado `program` pode continuar sendo retornado durante a transicao, mas novas regras devem usar `programId/programRef`.
- Nao remover `color` do schema nesta entrega; a UI continua sem usa-lo e o PDF usa a cor da Empresa.

### 7.6 Criterios de aceite da Tarefa 2

- [x] ADMIN escolhe a Empresa antes de criar Produto.
- [x] Programa mostra apenas opcoes da Empresa selecionada.
- [x] E possivel salvar Produto sem Programa.
- [x] Nao e possivel vincular Produto e Programa de Empresas diferentes, inclusive via chamada direta da API.
- [x] Nao existe fallback para a primeira Empresa.
- [x] Produto sem Programa aparece na listagem `Sem programa` e pode ser usado na proposta.
- [x] No item novo da proposta, o campo se chama `Nome do Produto`.
- [x] Criar item novo nao cria Programa automaticamente.

## 8. Tarefa 3 - Gestao Robusta de Usuarios e Acessos

### 8.1 Decisao de modelagem

Criar relacionamento muitos-para-muitos explicito entre Usuario e Empresa:

```prisma
model UserStationAccess {
  id                 String   @id @default(cuid())
  userId             String   @map("user_id")
  stationId          String   @map("station_id")
  canCreateProposals Boolean  @default(true) @map("can_create_proposals")
  canViewCatalog     Boolean  @default(true) @map("can_view_catalog")
  active             Boolean  @default(true)
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt          DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  station            Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)

  @@unique([userId, stationId])
  @@index([stationId, active])
  @@map("user_station_accesses")
}
```

Adicionar as relacoes correspondentes em `User` e `Station`.

### 8.2 Regra de autorizacao

- ADMIN possui acesso global por role e nao precisa de registros na tabela de acesso.
- COMERCIAL opera em modelo **default-deny**: sem vinculo ativo, nao pode criar proposta nem consultar catalogo daquela Empresa.
- `canCreateProposals` controla criacao e troca de Empresa da proposta.
- `canViewCatalog` controla consulta de Programas e Produtos da Empresa.
- A regra atual de propriedade continua valida: acesso a Empresa nao autoriza editar proposta criada por outro COMERCIAL.
- A API e a fonte de verdade; esconder opcoes no frontend e apenas uma camada de UX.

### 8.3 Impacto nos endpoints

Aplicar escopo por Empresa em:

- `GET /api/stations`;
- `GET /api/proposal-categories`;
- `GET /api/product-templates`;
- `POST /api/proposals`;
- `PATCH /api/proposals/:id` quando alterar `stationId`;
- endpoints de listagem/dashboard que retornem propostas fora da regra de propriedade atual;
- qualquer endpoint futuro que receba `stationId`.

Criar helper central, por exemplo:

```text
assertStationPermission(userId, role, stationId, permission)
getAccessibleStationIds(userId, role, permission)
```

Nao duplicar comparacoes de permissao em cada rota.

### 8.4 Contratos de Usuarios

Evoluir os endpoints ADMIN:

- `GET /api/users`: retornar perfil, status e acessos por Empresa;
- `GET /api/users/:id`: detalhe completo para edicao;
- `POST /api/users`: criar usuario e acessos em transacao;
- `PATCH /api/users/:id`: atualizar dados basicos, role, status e acessos em transacao;
- `DELETE /api/users/:id`: desativacao logica, nunca exclusao fisica quando houver historico;
- `POST /api/users/:id/reset-password`: manter reset administrativo com revogacao de sessoes.

Regras adicionais:

- impedir ADMIN de desativar a propria conta;
- impedir desativacao/rebaixamento do ultimo ADMIN ativo;
- e-mail deve ser normalizado e unico;
- COMERCIAL ativo deve possuir ao menos uma Empresa com permissao de criar proposta;
- mudanca de role para ADMIN torna os vinculos irrelevantes, mas nao precisa apaga-los;
- ao desativar usuario, revogar todos os refresh tokens.

### 8.5 Cadastro publico de COMERCIAL

O endpoint atual `POST /api/auth/register-commercial` nao pode continuar criando conta ativa sem escopo de Empresa. Adotar uma das duas opcoes abaixo, sendo a primeira a decisao deste PRD:

1. criar conta `active=false`, sem acessos, aguardando aprovacao do ADMIN;
2. remover o cadastro publico.

Decisao recomendada: manter o cadastro como solicitacao pendente (`active=false`) para preservar o fluxo ja pedido anteriormente, exibindo o usuario na tela administrativa para aprovacao e atribuicao de Empresas.

### 8.6 Tela administrativa de Usuarios

A tela deve oferecer:

- busca por nome/e-mail;
- filtro por perfil, status e Empresa;
- criar usuario;
- editar nome, e-mail, perfil e status;
- atribuir uma ou mais Empresas;
- configurar `Criar propostas` e `Visualizar catalogo` por Empresa;
- resetar senha administrativa;
- desativar usuario com `AlertDialog` destrutivo;
- indicar contas pendentes de aprovacao;
- exibir resumo das Empresas permitidas na listagem.

Usar checkboxes/toggles em uma tabela de Empresas. Evitar select multiplo opaco, pois o ADMIN precisa entender as permissoes por linha.

### 8.7 Migration e dados existentes

Para evitar bloquear todos os usuarios atuais:

1. criar `user_station_accesses`;
2. para cada COMERCIAL ativo existente, criar acesso a todas as Empresas ativas atuais com as duas permissoes habilitadas;
3. novos COMERCIAIS passam a seguir default-deny;
4. registrar no plano de deploy que o ADMIN deve revisar os acessos apos a migration.

### 8.8 Criterios de aceite da Tarefa 3

- [x] ADMIN cria, edita, desativa e redefine senha de usuarios.
- [x] ADMIN atribui Empresas e permissoes por Empresa a cada COMERCIAL.
- [x] COMERCIAL autorizado para Empresa X consegue criar proposta para X.
- [x] O mesmo COMERCIAL nao ve nem seleciona Empresa Y sem acesso.
- [x] Chamada direta tentando criar proposta para Y retorna `403`.
- [x] Programa e Produto de Empresa nao autorizada nao vazam pela API.
- [x] Acesso a Empresa nao permite editar proposta de outro vendedor.
- [x] Usuario desativado perde sessoes ativas.
- [x] O ultimo ADMIN ativo nao pode ser removido/rebaixado.
- [x] Cadastro publico gera conta pendente, sem acesso automatico.
- [x] Usuarios legados continuam operacionais apos o backfill.

## 9. Ordem de Implementacao

### Fase 1 - Contratos e migration

1. Criar `UserStationAccess` no Prisma.
2. Criar migration e backfill de usuarios existentes.
3. Ajustar schemas Zod/OpenAPI.
4. Regenerar Prisma Client e API client React.

### Fase 2 - Autorizacao central

1. Criar servico/helper de acesso por Empresa.
2. Aplicar filtros e `403` nos endpoints afetados.
3. Ajustar cadastro publico para pendente.
4. Adicionar testes de abuso e isolamento.

### Fase 3 - Empresas

1. Simplificar schema do formulario.
2. Criar `ColorPickerField`.
3. Remover campos definidos da UI sem limpar dados legados.
4. Ajustar cards/listagem para Nome, contato e cor.

### Fase 4 - Produtos

1. Tornar Empresa explicita e Programa opcional na API.
2. Adicionar filtro `stationId`.
3. Ajustar formulario com selects dependentes.
4. Ajustar criacao de Produto Novo na proposta.

### Fase 5 - Usuarios

1. Completar contratos de detalhe e atualizacao.
2. Implementar transacoes de usuario + acessos.
3. Construir tela administrativa robusta.
4. Implementar protecoes do ultimo ADMIN e revogacao de sessao.

### Fase 6 - Documentacao e QA

1. Atualizar `docs/06-banco-de-dados.md`.
2. Atualizar `docs/07-autenticacao-perfis-permissoes.md`.
3. Atualizar `docs/08-regras-de-negocio.md`.
4. Atualizar `docs/paginas-por-perfil.md` e `docs/MUDANCAS.MD`.
5. Executar matriz ADMIN/COMERCIAL com duas Empresas.

## 10. Arquivos Provavelmente Afetados

| Camada | Arquivos/areas |
|---|---|
| Banco | `lib/db/prisma/schema.prisma`, migration e seed/backfill |
| Contratos | `lib/api-spec/openapi.yaml`, `lib/api-zod`, `lib/api-client-react` gerados |
| API | `routes/users.ts`, `routes/stations.ts`, `routes/product-templates.ts`, `routes/proposals.ts`, novo servico de acesso |
| Frontend | `admin/station.tsx`, `admin/product-templates.tsx`, `admin/users.tsx`, editor de proposta, componente de color picker |
| Docs | banco, autenticacao, regras, paginas por perfil e mudancas |

## 11. QA Consolidado

- [x] Criar e editar Empresa apenas com campos permitidos.
- [x] Color picker funciona com mouse, teclado e entrada hexadecimal.
- [x] Produto com e sem Programa funciona para a Empresa correta.
- [x] Trocar Empresa limpa Programa incompativel.
- [x] Usuario ADMIN mantem acesso global.
- [x] Usuario COMERCIAL enxerga somente Empresas autorizadas.
- [x] Permissoes sao aplicadas no backend e nao apenas na UI.
- [x] Propostas existentes continuam acessiveis ao dono conforme RN atual.
- [x] Typecheck, build, migrations e testes passam.
- [x] Docker sobe com migration aplicada e healthcheck saudavel.

## 12. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Bloquear usuarios existentes apos migration | Backfill de todas as Empresas ativas antes de ativar default-deny. |
| Vazar catalogo de Empresa nao autorizada | Filtrar no backend com helper central de escopo. |
| Programa e Produto ficarem em Empresas diferentes | Validacao transacional no POST/PATCH da API. |
| Remover campo da UI apagar dado historico | Nao enviar `null` para campos ocultos durante edicao. |
| Desativar ultimo ADMIN | Regra explicita no backend e teste de concorrencia. |
| Cadastro publico contornar gestao de acesso | Criar conta pendente e sem `UserStationAccess`. |

## 13. Checklist de Implementacao

Este checklist deve ser atualizado durante a execucao do PRD:

- [x] Migration e backfill de `UserStationAccess` implementados.
- [x] Autorizacao por Empresa aplicada na API.
- [x] Cadastro de Empresa simplificado e color picker criado.
- [x] Produto com Empresa obrigatoria e Programa opcional implementado.
- [x] Modal de Produto Novo corrigido para `Nome do Produto`.
- [x] CRUD administrativo de Usuarios concluido.
- [x] Gestao de permissoes por Empresa concluida.
- [x] Cadastro publico convertido para aprovacao pendente.
- [x] Testes, typecheck e build concluidos.
- [x] Documentacao atualizada.

## 14. Resultado da Implementacao

### Banco e API

- Criado `UserStationAccess` com migration, indice, chaves estrangeiras e backfill de usuarios legados.
- Criado helper central para listar Empresas acessiveis e validar `canCreateProposals`/`canViewCatalog`.
- Aplicado escopo nas Empresas, Programas, Produtos, Propostas, Templates, Timeline, Status, Duplicacao e Versoes.
- Cadastro publico de COMERCIAL agora cria conta pendente (`active=false`) e sem acesso automatico.
- Contrato OpenAPI e clientes React/Zod foram regenerados.

### Frontend

- Cadastro de Empresa simplificado sem apagar campos historicos omitidos no PATCH.
- Color picker nativo sincronizado com campo hexadecimal.
- Produto com Empresa obrigatoria, Programa opcional e filtro dependente.
- Gestao de Usuarios com busca, filtros, criacao, edicao, desativacao, reset de senha e matriz de acesso.
- Seletor de Empresa da nova proposta mostra somente Empresas com permissao de criacao.

### Verificacoes Executadas

- `pnpm db:generate`: aprovado.
- `pnpm --filter @workspace/api-spec run codegen`: aprovado.
- `pnpm run typecheck`: aprovado em API, frontend, scripts e bibliotecas.
- Build de `@workspace/proposta`: aprovado.
- Build de `@workspace/api-server`: aprovado.
- `docker compose up -d --build`: aprovado.
- `GET /api/healthz`: retornou `{"status":"ok"}`.
- Teste ADMIN: Empresa criada com Nome/Cor e Produto criado sem Programa (`201`).
- Teste Produto: tentativa de vincular Programa de outra Empresa foi rejeitada (`400`).
- Teste COMERCIAL: Empresas permitidas e catalogo autorizado (`200`).
- Teste COMERCIAL: catalogo e criacao de proposta em Empresa sem acesso (`403`).
- Teste Usuarios: criacao e detalhe (`201`/`200`), reset de senha (`200`) e desativacao (`200`).
- Teste Usuarios: COMERCIAL ativo sem permissao de criacao foi rejeitado (`400`) e login apos desativacao foi rejeitado (`401`).
- Teste Seguranca: autodesativacao do ADMIN foi rejeitada (`409`).
- Teste Cadastro Publico: solicitacao criada inativa e pendente de aprovacao (`201`, `active=false`).
- Registros temporarios de QA removidos ao final.
