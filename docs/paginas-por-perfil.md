# Paginas por Perfil de Login

Este documento descreve o funcionamento atual das paginas do Sistema de Propostas por tipo de usuario: ADMIN e COMERCIAL.

## Visao Geral

O sistema possui dois perfis:

- ADMIN: perfil administrativo, com acesso ao dashboard e aos cadastros estruturais.
- COMERCIAL: perfil operacional, com foco em propostas, anunciantes e consulta de programas/produtos.

O login fica em `/login`.

Ao entrar:

- ADMIN e redirecionado para `/dashboard`.
- COMERCIAL e redirecionado para `/proposals`.

O logout exige confirmacao antes de encerrar a sessao e exibe alerta/toast de resultado.

## Login e Cadastro

### `/login`

Pagina publica para entrada no sistema.

Funcionalidades:

- Login com e-mail e senha.
- Cadastro publico de usuario COMERCIAL pela aba `Criar acesso`.
- Feedback visual por toast em login, erro de login, cadastro criado e erro de cadastro.

Regras:

- Usuario ADMIN nao se cadastra pela tela publica.
- Todo cadastro publico entra como `COMERCIAL`.
- A sessao fica armazenada em `sessionStorage`.

Credenciais seed:

- ADMIN: `admin@radio88fm.com.br` / `Admin@123`
- COMERCIAL: `carlos@radio88fm.com.br` / `Comercial@123`

## Paginas Comuns aos Perfis

### Meu Perfil

Rota: `/profile`

Acesso:

- ADMIN e COMERCIAL autenticados.
- A opcao fica no rodape do menu lateral, acima de `Sair`.

Funcionalidades:

- Editar nome de exibicao.
- Editar cargo/função comercial.
- Editar telefone de contato com mascara.
- Editar e-mail de contato.
- Enviar/remover avatar em base64.
- Consultar e-mail de login e perfil de acesso em campos bloqueados.

Regras:

- A API usada e `GET /api/profile` e `PATCH /api/profile`.
- O endpoint sempre opera sobre o usuario autenticado pelo token, sem receber ID de usuario no payload.
- E-mail de login, senha, role e status ativo/inativo nao sao alterados nessa tela.
- O cargo, telefone, e-mail comercial e avatar salvos aqui sao usados em propostas criadas pelo usuario.

## Perfil ADMIN

O ADMIN tem acesso ao menu principal e ao bloco `Administracao`.

### Dashboard

Rota: `/dashboard`

Acesso:

- Apenas ADMIN.
- Se um COMERCIAL tentar acessar diretamente, e redirecionado para `/proposals`.
- A API de dashboard tambem exige permissao ADMIN.

Funcionalidades:

- Visao consolidada das propostas.
- Indicadores por status: rascunhos, enviadas, aprovadas e rejeitadas.
- Lista de propostas recentes.

### Propostas

Rotas:

- `/proposals`
- `/proposals/new`
- `/proposals/:id/edit`

Acesso:

- ADMIN e COMERCIAL.

Funcionalidades:

- Visualizar programas com seus produtos vinculados.
- Consultar propostas vinculadas a cada programa em hierarquia.
- Filtrar por texto, empresa, programa e status.
- Criar novo rascunho por dialog, escolhendo a empresa e o tipo inicial.
- Editar proposta.
- Alterar status da proposta.
- Rejeitar proposta com confirmacao por dialog.

Status atuais:

- `DRAFT`: Rascunho
- `SENT`: Enviada
- `APPROVED`: Aprovada
- `REJECTED`: Rejeitada

Observacao:

- A exclusao visual de proposta foi ajustada para rejeicao, mantendo historico operacional.

## Fluxo de Criacao e Edicao de Proposta

Esta secao descreve o fluxo atual da proposta, incluindo a tela de edicao como:

`/proposals/cmr0n5p7w0003pc6rnipi5gzh/edit`

O `cmr0n5p7w0003pc6rnipi5gzh` e o ID da proposta no banco.

### 1. Entrada pela Lista de Propostas

Rota:

- `/proposals`

Funcionamento:

- Exibe programas e produtos como a porta principal de trabalho.
- Ao clicar em um programa, mostra as propostas vinculadas aos produtos daquele programa.
- ADMIN visualiza todas as propostas.
- COMERCIAL visualiza apenas as propostas criadas por ele.
- Permite buscar por cliente, produto, programa ou tipo de proposta.
- Permite filtrar por empresa/emissora.
- Permite filtrar por programa.
- Permite filtrar por status.
- Clicar em uma proposta abre `/proposals/:id/edit`.
- A acao `Rejeitar` chama a API de delete, mas o comportamento atual e mudar o status para `REJECTED`.
- A acao `Duplicar` cria um novo rascunho baseado na proposta selecionada.

Endpoint usado:

- `GET /api/proposals/program-board`

Filtros enviados:

- `search`
- `stationId`
- `programId`
- `status`

### 2. Criacao de Nova Proposta

Rota:

- `/proposals/new`

Funcionamento atual:

- `/proposals/new` foi mantida apenas como compatibilidade.
- Ao acessar diretamente, a rota redireciona para `/proposals`.
- A criacao de proposta acontece pelo botao `Nova Proposta` na tela `/proposals`.
- O dialog de criacao permite selecionar a Empresa da proposta e o tipo inicial.
- A lista de Empresas prioriza `Radio 88 FM` como primeira opcao, quando ela estiver cadastrada e ativa.
- A periodicidade inicial e `MONTHLY`.

Dados enviados na criacao:

```json
{
  "stationId": "id_da_empresa_selecionada",
  "proposalTypeId": "id_do_tipo_ativo",
  "periodicity": "MONTHLY",
  "propType": "Proposta Comercial"
}
```

Endpoint usado:

- `POST /api/proposals`

Regras no backend:

- A UI envia `stationId` conforme a Empresa selecionada.
- Se `stationId` nao for enviado por alguma integracao externa, a API ainda usa a primeira empresa cadastrada no banco como fallback.
- `createdById` e definido automaticamente pelo usuario autenticado.
- O status inicial vem do Prisma como `DRAFT`.
- `propMonth` e `propYear` continuam no banco por compatibilidade, mas nao sao mais preenchidos pela UI.
- Se a proposta for criada com produtos, eles sao criados junto e podem guardar `productTemplateId` para rastrear origem no catalogo.
- Uma versao inicial e gravada em `proposal_versions`.

Depois da criacao:

- O frontend mostra toast `Rascunho criado!`.
- O usuario e redirecionado para `/proposals/:id/edit`.

### 3. Tela de Edicao da Proposta

Rota:

- `/proposals/:id/edit`

Exemplo:

- `/proposals/cmr0n5p7w0003pc6rnipi5gzh/edit`

Layout atual:

- Painel esquerdo: editor em acordeoes.
- Painel direito: preview visual da proposta em formato A4.
- Rodape fixo do painel esquerdo: status, botao salvar e botao PDF.

Endpoints usados:

- `GET /api/proposals/:id`
- `PATCH /api/proposals/:id`
- `PATCH /api/proposals/:id/status`

Carregamentos auxiliares:

- `GET /api/advertisers?active=true`
- `GET /api/stations`
- `GET /api/proposal-types?active=true`
- `GET /api/product-templates?active=true`

Controle de acesso:

- ADMIN pode abrir qualquer proposta.
- COMERCIAL so pode abrir proposta criada por ele.
- Se um COMERCIAL tentar abrir proposta de outro usuario, a API retorna `403`.

### 4. Acordeoes do Editor

#### Empresa

Mostra e permite trocar a empresa ligada a proposta.

Origem:

- `proposal.stationId`
- Lista de empresas carregada por `useListStations`

Funcionamento:

- O editor exibe um seletor `Empresa onde sera anunciada`.
- A lista usa apenas empresas ativas e prioriza `Radio 88 FM` como primeira opcao quando cadastrada.
- Ao trocar a empresa, o `stationId` da proposta e atualizado no estado local, o preview muda imediatamente e o autosave envia a alteracao para `PATCH /api/proposals/:id`.

Campos exibidos:

- Nome da empresa.
- Slogan.
- Telefone e e-mail, quando cadastrados.
- Slogan.

#### Proposta

Campos editaveis:

- Tipo da proposta (`proposalTypeId`)
- Periodicidade (`periodicity`)

Funcionamento:

- O tipo da proposta e um dropdown alimentado por `/api/proposal-types`.
- O editor permite criar um novo tipo inline, sem sair da proposta.
- Ao criar inline, o novo tipo e selecionado automaticamente.
- A periodicidade possui tres valores: `MONTHLY`, `QUARTERLY`, `YEARLY`.
- Os campos antigos de mes e ano foram removidos da UI.

Impacto no preview:

- Aparece no badge superior da proposta: tipo e periodicidade.
- Se o periodo tiver descricao ou datas, o preview usa essa informacao de periodo no lugar do texto generico.

#### Cliente

Campos editaveis:

- Cliente ou lead cadastrado (`advertiserId`)

Funcionamento:

- O bloco antigo `Campanha & Cliente` foi renomeado para `Cliente`.
- A tag da campanha foi removida do formulario e do preview.
- Os campos `clientLine1` e `clientLine2` foram removidos da UI.
- O cliente/lead selecionado aparece em um card.
- O botao `Selecionar` abre um dialog de busca e fecha apos a escolha.
- As sugestoes nao ficam mais abertas no painel depois que um cliente/lead e selecionado.
- Ao selecionar um cliente ou lead, a proposta passa a ficar vinculada a esse cadastro.
- O botao `Novo Lead` cria um lead inline por modal.
- Ao criar um lead, ele ja fica selecionado na proposta.
- Essa vinculacao aparece depois na tela de Clientes, na expansao do cliente.

#### Periodo

Campos editaveis:

- Data inicial (`dateStart`)
- Data final (`dateEnd`)
- Texto personalizado de periodo (`periodDesc`)

Impacto no preview:

- Se `periodDesc` existir, ele tem prioridade.
- Se nao existir, o preview tenta mostrar `dateStart` a `dateEnd`.

#### Produtos

Este e o bloco de produtos dentro da proposta.

Campos por item:

- Quantidade (`qty`)
- Titulo (`title`)
- Programa (`program`)
- Duracao (`durationLabel`)
- Horario (`airTime`)
- Sazonalidade (`seasonality`)
- Descricao (`description`)
- Cor (`color`)

Funcionamento atual:

- O usuario pesquisa produtos do catalogo no campo de busca.
- Ao clicar em um produto pesquisado, ele entra automaticamente na proposta.
- Nao existe mais botao intermediario `Adicionar produto do catalogo`.
- O botao `Criar Produto Novo` adiciona um item manual na proposta.
- O botao de remover item fica sempre visivel e usa cor vermelha.
- O usuario pode alterar cor do item.
- Os produtos do catalogo sao carregados de `/api/product-templates?active=true`.
- A listagem de catalogo e agrupada visualmente por programa.
- Ao inserir produto do catalogo, a proposta recebe titulo, descricao, detalhe, programa, duracao, valor sugerido, cor e `productTemplateId`.
- O campo `Tags` foi removido da UI, mas dados legados continuam sendo preservados no payload quando existirem.
- Quantidade, horario e sazonalidade sao definidos dentro da proposta.
- O produto inserido pode ser editado dentro da proposta sem alterar o produto original do catalogo.
- Horario e sazonalidade aparecem no preview/PDF somente quando preenchidos.

Persistencia:

- Ao salvar, a API apaga os produtos anteriores da proposta e recria a lista enviada pelo editor.
- Quando o item veio do catalogo, `ProposalProduct.productTemplateId` guarda a origem.

#### Investimento & Contato

Campos editaveis:

- Valor (`investValue`)
- Botao `Usar valor sugerido`, quando houver base de calculo pelos produtos do catalogo.

Campos somente leitura:

- Nome do vendedor responsavel pela proposta (`createdBy.name`)
- Cargo do vendedor (`createdBy.jobTitle`)
- Telefone comercial do vendedor (`createdBy.contactPhone`)
- E-mail comercial do vendedor (`createdBy.contactEmail`)

Funcionamento:

- A descricao livre de investimento (`investDesc`) foi removida da UI.
- O contato comercial nao e mais digitado por proposta.
- O contato exibido vem do perfil do usuario dono da proposta, nao da Empresa vinculada.
- Quando cargo ou telefone do vendedor nao estao preenchidos, o editor mostra um aviso amarelo com atalho para `/profile`.
- A sugestao de investimento e calculada no frontend em tempo real, somando o valor sugerido unico dos produtos vindos do catalogo multiplicado pela quantidade de cada item.
- Itens avulsos sem `productTemplateId` nao entram no calculo da sugestao.
- O valor sugerido e apenas apoio comercial: o campo `investValue` continua manual e editavel.

Formula da sugestao:

- Produto com valor sugerido: `valorSugerido * quantidade`
- Produto legado sem valor sugerido unico pode usar o valor maximo antigo como fallback.
- Produto sem valores sugeridos: nao soma no total

Impacto no preview:

- O bloco inferior de investimento e contato comercial mostra o vendedor responsavel pela proposta.
- O preview/PDF le os dados de contato em tempo real do `createdBy`, com fallback para campos legados da proposta quando necessario.

#### Acordeoes Removidos

Foram removidos da UI do editor:

- `Capa / Banner`
- `Estatisticas`

Os campos antigos continuam no banco por compatibilidade, mas o payload limpo do editor grava `bannerBase64`, `investDesc`, `campTag`, `clientLine1`, `clientLine2` como nulos ou vazios e `stats` como lista vazia.

### 5. Auto-save

Funcionamento atual:

- A tela copia a proposta da API para `localData`.
- Qualquer alteracao real em `localData` agenda um salvamento automatico.
- O debounce atual e de 2 segundos.
- Durante o salvamento, aparece `Salvando...`.
- Em sucesso, aparece `Salvo as HH:MM:SS`.
- Em erro, aparece `Erro ao salvar` e toast de erro.
- Se houver alteracao pendente, fechar/recarregar a aba dispara confirmacao nativa do navegador.
- O botao de voltar do editor exibe confirmacao por toast antes de sair sem salvar.

Endpoint usado:

- `PATCH /api/proposals/:id`

Ponto de atencao tecnico:

- O efeito de auto-save depende de `localData`.
- A cada salvamento, a API cria uma versao em `proposal_versions`.
- O backend limita as versoes a 50 por proposta, apagando a mais antiga quando ultrapassa esse limite.

### 6. Botao Salvar

Local:

- Rodape fixo do editor.

Funcionamento atual:

- Chama `PATCH /api/proposals/:id`.
- Usa o mesmo payload limpo do auto-save.
- Remove dados relacionais e campos de visualizacao antes de enviar para a API.

### 7. Alteracao de Status

Local:

- Select no rodape do editor.

Status disponiveis:

- Rascunho (`DRAFT`)
- Enviada (`SENT`)
- Aprovada (`APPROVED`)
- Rejeitada (`REJECTED`)

Endpoint usado:

- `PATCH /api/proposals/:id/status`

Funcionamento:

- Ao alterar o status, a API atualiza apenas o campo `status`.
- Em sucesso, a tela mostra toast com label legivel.
- Em erro, mostra toast de erro.

Regras:

- ADMIN pode alterar status de qualquer proposta.
- COMERCIAL so pode alterar status de proposta criada por ele.

### 8. Preview da Proposta

Componente:

- `ProposalPreview`

Entrada:

- Recebe `localData` e `station`.

Renderizacao:

- Formato visual A4.
- Tipografia Montserrat no preview impresso/PDF.
- Topo com identidade visual solida, sem banner carregado pelo usuario.
- Logo/nome da empresa.
- Tipo e periodicidade.
- Nome do cliente.
- Periodo.
- Plano de acoes.
- Investimento.
- Contato comercial.

Ponto importante:

- O preview e visual, nao um PDF real gerado no servidor.
- O botao `PDF` chama `window.print()` e usa CSS de impressao para imprimir somente a area da proposta.

### 9. Impressao / PDF

Local:

- Botao `PDF` no rodape do editor.

Funcionamento atual:

- Chama `window.print()`.
- A geracao depende do dialogo de impressao do navegador.
- O CSS de impressao define `@page size: A4`, remove a escala do preview e oculta sidebar/editor.
- A area `.print-area` e renderizada em 210mm de largura e minimo de 297mm de altura.
- A fonte do PDF e Montserrat, com fallback para Arial.

Ponto de atencao:

- Nao existe geracao server-side de PDF.
- Nao existe armazenamento de PDF gerado.

### 10. Versoes da Proposta

Backend:

- A cada `POST /api/proposals`, uma versao inicial e criada.
- A cada `PATCH /api/proposals/:id`, uma nova versao e criada.

Endpoints existentes:

- `GET /api/proposals/:id/versions`
- `GET /api/proposals/:id/versions/:versionId`

Estado atual no frontend:

- Ainda nao ha tela para listar ou restaurar versoes.

### 11. Duplicacao de Proposta

Backend:

- Existe endpoint `POST /api/proposals/:id/duplicate`.

Funcionamento:

- Copia os dados principais da proposta.
- Copia produtos.
- Cria nova proposta com status `DRAFT`.

Estado atual no frontend:

- A lista importa icone de copiar, mas nao expoe acao funcional de duplicar no menu atual.

### 12. Pontos Provaveis de Ajuste

Pontos que merecem revisao antes de evoluir o fluxo:

- Permitir trocar a empresa da proposta no editor, se fizer sentido operacional.
- Criar UI para versoes da proposta.
- Implementar duplicacao no frontend ou remover indicio visual de copiar.
- Avaliar geracao real de PDF, se o fluxo comercial precisar armazenar ou enviar arquivo.

### Clientes

Rotas:

- `/advertisers`
- `/advertisers/new`
- `/advertisers/:id/edit`

Acesso:

- ADMIN e COMERCIAL.

Funcionalidades:

- Listar clientes (`Advertiser.status = CLIENT`).
- Buscar cliente.
- Criar cliente.
- Editar cliente.
- Excluir cliente com confirmacao por dialog.
- Expandir cliente para visualizar propostas vinculadas.
- Abrir proposta vinculada diretamente pela lista expandida quando o usuario tem permissao.

Formulario:

- Campo `Nome` grava `tradeName`.
- `Razao Social` nao aparece mais na UI, mas `legalName` permanece no banco para historico.
- Campo `Informacao Interna` grava `notes`.

Na expansao do cliente aparecem propostas rascunho, enviadas, aprovadas e rejeitadas vinculadas ao cliente.

Regras de visibilidade das propostas vinculadas:

- ADMIN visualiza titulo, investimento, programa, status e responsavel de todas as propostas, com acesso ao editor.
- COMERCIAL visualiza titulo, investimento, programa, status e responsavel apenas das propostas criadas por ele, com acesso ao editor.
- COMERCIAL visualiza propostas de outros responsaveis em modo restrito: programa, status e responsavel. O titulo da proposta, investimento e acesso ao editor ficam ocultos.
- A permissao da linha vem do backend pelo campo `viewerCanEdit`; o frontend nao decide acesso comparando usuarios localmente.

### Leads

Rotas:

- `/leads`
- `/leads/new`
- `/leads/:id/edit`

Acesso:

- ADMIN e COMERCIAL.

Funcionalidades:

- Listar leads (`Advertiser.status = LEAD`).
- Buscar lead.
- Criar lead.
- Editar lead.
- Excluir lead com confirmacao por dialog.

Regra de conversao:

- Quando uma proposta vinculada ao lead e marcada como `Aprovada`, o backend promove automaticamente o registro para Cliente (`Advertiser.status = CLIENT`).
- A promocao nao depende apenas do frontend; ela acontece no endpoint de atualizacao de status da proposta.

### Usuarios

Rota: `/admin/users`

Acesso:

- Apenas ADMIN.

Funcionalidades:

- Listar usuarios.
- Criar usuarios ADMIN ou COMERCIAL.
- Definir senha temporaria.
- Visualizar perfil, data de criacao e status.
- Toast de sucesso/erro ao criar usuario.

Uso esperado:

- Criar acessos administrativos.
- Criar acessos comerciais quando o ADMIN quiser controlar diretamente os usuarios.

### Empresas

Rota: `/admin/station`

Acesso:

- Apenas ADMIN.

Funcionalidades:

- Criar empresa.
- Editar empresa.
- Desativar empresa com confirmacao por toast.
- Upload de foto/logo em base64.
- Listar empresas cadastradas.
- Definir cor padrao da proposta (`primaryColor`), com default `#427EFF`.

Campos principais:

- Nome principal.
- Nome fantasia.
- Razao social.
- CNPJ.
- Slogan.
- Cor padrao da proposta.
- Contato.
- Telefone.
- E-mail.
- Endereco.
- Cidade.
- UF.
- Site.
- Dados complementares.
- Logo/foto em base64.

Observacao:

- Esta tela substitui o conceito antigo de `Emissora`.

### Produtos

Rota: `/admin/product-templates`

Acesso:

- Apenas ADMIN.

Funcionalidades:

- Criar produto.
- Editar produto.
- Excluir produto com confirmacao por toast.
- Vincular produto a um programa.
- Informar valor sugerido unico.
- Selecionar duracao do produto.
- Criar nova duracao dentro do formulario de produto.
- Definir cor de destaque.
- Buscar por nome, titulo ou descricao.
- Filtrar por programa.
- Filtrar por status: ativo, inativo ou todos.
- Filtrar por valor sugerido minimo e maximo.
- Ordenar por ordem cadastrada, nome, data ou valor sugerido.

Campos principais:

- Programa.
- Nome do Produto.
- Duracao.
- Valor sugerido.
- Descricao.
- Detalhe.
- Tags.
- Cor.

Observacao:

- Esta tela substitui o conceito antigo de `Template de Produto`.
- O campo tecnico `ProductTemplate.name` ainda existe no banco, mas e gerado pela API.
- Quantidade nao faz parte do cadastro de Produto; ela e definida no item da proposta.

### Programas

Rota ADMIN: `/admin/proposal-categories`

Acesso:

- ADMIN tem CRUD completo.

Funcionalidades:

- Criar programa.
- Editar programa.
- Excluir programa com confirmacao por toast.
- Upload de icone/imagem em base64.
- Vincular produtos existentes ao programa.
- Criar produto novo dentro do modal de programa.
- Listar produtos vinculados em cada card.
- Buscar por nome, slug ou descricao.
- Filtrar por status: ativo, inativo ou todos.
- Ordenar por ordem cadastrada, nome, data ou quantidade de produtos.

Campos principais:

- Nome.
- Slug.
- Ordem.
- Descricao.
- Icone/imagem em base64.
- Produtos vinculados.

Regras de vinculo:

- Um programa pode ter varios produtos.
- Um produto fica vinculado a um unico programa via `programId`.
- Ao selecionar um produto que ja estava em outro programa, ele passa para o programa salvo.
- Se um produto for removido da selecao do programa atual, ele fica sem programa definido.
- Se o programa ja existe, o produto criado dentro do modal e persistido imediatamente e ja fica selecionado.
- Se o programa ainda esta sendo criado, os produtos novos ficam pendentes em memoria e sao criados depois que o programa for salvo.
- O produto criado dentro do modal de programa usa os mesmos campos simplificados: nome do produto, duracao e valor sugerido unico.

Observacao:

- Esta tela substitui o conceito antigo de `Categoria de Propostas`.
- Valores antigos de icone textual ou emoji nao sao mais usados como icone visual. Se nao houver base64, a tela mostra um placeholder com iniciais.

### Tipos de Proposta

Rota: `/admin/proposal-types`

Acesso:

- Apenas ADMIN.

Funcionalidades:

- Listar tipos de proposta.
- Buscar por nome.
- Filtrar por status: ativo, inativo ou todos.
- Criar tipo de proposta.
- Editar nome e status.
- Ativar ou desativar tipo.
- Desativar tipo com confirmacao por toast.

Uso no fluxo:

- O editor de proposta carrega tipos ativos para o dropdown do acordeao `Proposta`.
- O ADMIN gerencia a base principal nessa tela.
- O COMERCIAL tambem pode criar um tipo inline dentro do editor, quando precisar cadastrar rapidamente uma nova classificacao.

## Perfil COMERCIAL

O COMERCIAL possui acesso operacional reduzido.

Menu visivel:

- Propostas
- Clientes
- Leads
- Programas

Nao aparece o bloco `Administracao`.

### Propostas

Rotas:

- `/proposals`
- `/proposals/new`
- `/proposals/:id/edit`

Acesso:

- COMERCIAL e ADMIN.

Funcionalidades:

- Visualizar propostas por programas e produtos.
- Filtrar por texto, empresa, programa e status.
- Criar rascunho de proposta pelo dialog `Nova Proposta`.
- Editar proposta.
- Alterar status.
- Vincular cliente ou lead.
- Consultar dados comerciais da proposta.
- Rejeitar proposta com confirmacao.

Regras:

- O COMERCIAL nao acessa dashboard.
- O COMERCIAL nao acessa cadastros administrativos.

### Clientes

Rotas:

- `/advertisers`
- `/advertisers/new`
- `/advertisers/:id/edit`

Acesso:

- COMERCIAL e ADMIN.

Funcionalidades:

- Listar clientes.
- Buscar cliente.
- Criar cliente.
- Editar cliente.
- Visualizar propostas vinculadas ao cliente.
- Abrir proposta vinculada a partir do dropdown/expansao do cliente apenas quando for dono da proposta.

Uso esperado:

- O COMERCIAL acompanha a carteira de clientes e confere quais propostas ja existem para cada cliente.
- Quando a proposta for de outro responsavel, o COMERCIAL ve somente programa, status e responsavel; nao ve valor, titulo da proposta nem botao/link de edicao.

### Leads

Rotas:

- `/leads`
- `/leads/new`
- `/leads/:id/edit`

Acesso:

- COMERCIAL e ADMIN.

Funcionalidades:

- Listar leads.
- Buscar lead.
- Criar lead.
- Editar lead.
- Visualizar oportunidades antes de virarem clientes.

Regra:

- Ao marcar uma proposta vinculada ao lead como `Aprovada`, o backend promove automaticamente esse lead para Cliente.

### Programas

Rota COMERCIAL: `/programs`

Acesso:

- COMERCIAL e usuarios autenticados.

Funcionalidades:

- Visualizar programas.
- Visualizar produtos vinculados a cada programa.
- Consultar descricoes e faixas de valor sugeridas.
- Buscar programas por nome, slug ou descricao.
- Filtrar por status e ordenar a listagem.

Restricoes:

- COMERCIAL nao cria programa.
- COMERCIAL nao edita programa.
- COMERCIAL nao exclui programa.
- COMERCIAL nao cria, edita ou exclui produtos.

Uso esperado:

- Servir como consulta comercial dos programas disponiveis e dos produtos que podem compor propostas.

## Paginas Fora do Fluxo Atual

Existe arquivo legado de tela de templates de proposta em:

- `artifacts/proposta/src/pages/admin/proposal-templates.tsx`

Estado atual:

- Nao esta exposto no menu.
- Nao possui rota ativa no `App.tsx`.
- O fluxo atual nao usa mais `Templates de Proposta`.

## Alertas e Feedbacks

O sistema usa `sonner` para toasts.

Fluxos com alertas/toasts:

- Login realizado.
- Erro de login.
- Cadastro comercial criado.
- Erro de cadastro comercial.
- Logout com confirmacao.
- Logout concluido.
- Criacao/edicao/exclusao de usuarios, empresas, produtos, programas, anunciantes e propostas.
- Upload de icone em programa.
- Erro de auto-save da proposta.
- Alteracao de status da proposta.
- Confirmacao antes de sair do editor com alteracoes pendentes.
- Criacao inline de tipo de proposta, anunciante e produto vinculado a programa.

## Rotas Resumidas

### Publicas

- `/login`

### Compartilhadas

- `/proposals`
- `/proposals/new`
- `/proposals/:id/edit`
- `/advertisers`
- `/advertisers/new`
- `/advertisers/:id/edit`

### COMERCIAL

- `/programs`

### ADMIN

- `/dashboard`
- `/admin/users`
- `/admin/station`
- `/admin/product-templates`
- `/admin/proposal-categories`
- `/admin/proposal-types`
