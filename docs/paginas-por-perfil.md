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

- Listar propostas.
- Filtrar por status.
- Buscar por cliente, campanha ou tipo.
- Criar novo rascunho.
- Editar proposta.
- Alterar status da proposta.
- Rejeitar proposta com confirmacao por toast.

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

- Lista propostas em ordem de atualizacao.
- ADMIN visualiza todas as propostas.
- COMERCIAL visualiza apenas as propostas criadas por ele.
- Permite buscar por tipo, cliente e tag de campanha.
- Permite filtrar por status.
- A acao `Editar` abre `/proposals/:id/edit`.
- A acao `Rejeitar` chama a API de delete, mas o comportamento atual e mudar o status para `REJECTED`.

Endpoint usado:

- `GET /api/proposals`

Filtros enviados:

- `page`
- `limit`
- `search`
- `status`

### 2. Criacao de Nova Proposta

Rota:

- `/proposals/new`

Funcionamento atual:

- A tela nao usa mais templates de proposta.
- Ela mostra uma mensagem informando que templates foram removidos.
- A tela permite selecionar a Empresa da proposta antes de criar o rascunho.
- A lista de Empresas prioriza `Radio 88 FM` como primeira opcao, quando ela estiver cadastrada e ativa.
- A tela lista programas e produtos apenas como catalogo de consulta.
- O botao `Criar Rascunho` cria uma proposta em branco.
- A criacao ja tenta usar o primeiro tipo de proposta ativo cadastrado em `/api/proposal-types`.
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

- Anunciante cadastrado (`advertiserId`)

Funcionamento:

- O bloco antigo `Campanha & Cliente` foi renomeado para `Cliente`.
- A tag da campanha foi removida do formulario e do preview.
- Os campos `clientLine1` e `clientLine2` foram removidos da UI.
- O seletor de anunciante virou busca textual com lista de resultados.
- Ao selecionar um anunciante, a proposta passa a ficar vinculada ao cliente.
- O editor permite criar um anunciante inline por modal.
- Ao criar ou selecionar um anunciante, o nome de contato e telefone sao preenchidos a partir do cadastro do cliente quando existirem.
- Essa vinculacao aparece depois na tela de Anunciantes, na expansao do cliente.

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
- Programa/Horario (`program`)
- Descricao (`description`)
- Tags (`tags`)
- Cor (`color`)

Funcionamento atual:

- O usuario pode adicionar produto do catalogo.
- O usuario pode adicionar item avulso manualmente.
- O usuario pode remover item manualmente.
- O usuario pode alterar cor do item.
- Os produtos do catalogo sao carregados de `/api/product-templates?active=true`.
- A listagem de catalogo e agrupada visualmente por programa.
- Ao inserir produto do catalogo, a proposta recebe quantidade, titulo, descricao, detalhe, programa, tags, cor e `productTemplateId`.
- O produto inserido pode ser editado dentro da proposta sem alterar o produto original do catalogo.

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
- A sugestao de investimento e calculada no frontend em tempo real, somando a media dos valores sugeridos dos produtos vindos do catalogo multiplicada pela quantidade de cada item.
- Itens avulsos sem `productTemplateId` nao entram no calculo da sugestao.
- O valor sugerido e apenas apoio comercial: o campo `investValue` continua manual e editavel.

Formula da sugestao:

- Produto com minimo e maximo: `(valorSugeridoMin + valorSugeridoMax) / 2 * quantidade`
- Produto com apenas minimo ou apenas maximo: `valor disponivel * quantidade`
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
- O botao `PDF` chama `window.print()`.

### 9. Impressao / PDF

Local:

- Botao `PDF` no rodape do editor.

Funcionamento atual:

- Chama `window.print()`.
- A geracao depende do dialogo de impressao do navegador.
- O layout impresso depende das regras CSS de print existentes no frontend.

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

### Anunciantes

Rotas:

- `/advertisers`
- `/advertisers/new`
- `/advertisers/:id/edit`

Acesso:

- ADMIN e COMERCIAL.

Funcionalidades:

- Listar anunciantes.
- Buscar anunciante.
- Criar anunciante.
- Editar anunciante.
- Excluir anunciante com confirmacao por dialog.
- Expandir anunciante para visualizar propostas vinculadas.
- Abrir proposta vinculada diretamente pela lista expandida quando o usuario tem permissao.

Na expansao do anunciante aparecem propostas rascunho, enviadas, aprovadas e rejeitadas vinculadas ao cliente.

Regras de visibilidade das propostas vinculadas:

- ADMIN visualiza titulo, investimento, programa, status e responsavel de todas as propostas, com acesso ao editor.
- COMERCIAL visualiza titulo, investimento, programa, status e responsavel apenas das propostas criadas por ele, com acesso ao editor.
- COMERCIAL visualiza propostas de outros responsaveis em modo restrito: programa, status e responsavel. O titulo da proposta, investimento e acesso ao editor ficam ocultos.
- A permissao da linha vem do backend pelo campo `viewerCanEdit`; o frontend nao decide acesso comparando usuarios localmente.

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

Campos principais:

- Nome principal.
- Nome fantasia.
- Razao social.
- CNPJ.
- Slogan.
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
- Informar faixa de valor sugerida.
- Definir cor de destaque.
- Buscar por nome interno, titulo ou descricao.
- Filtrar por programa, incluindo `Sem programa`.
- Filtrar por status: ativo, inativo ou todos.
- Filtrar por valor sugerido minimo e maximo.
- Ordenar por ordem cadastrada, nome, data ou valor sugerido.

Campos principais:

- Nome interno.
- Titulo na proposta.
- Quantidade.
- Programa.
- Valor sugerido minimo.
- Valor sugerido maximo.
- Descricao.
- Detalhe.
- Tags.
- Cor.

Observacao:

- Esta tela substitui o conceito antigo de `Template de Produto`.

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
- Anunciantes
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

- Criar rascunho de proposta.
- Editar proposta.
- Alterar status.
- Vincular anunciante.
- Consultar dados comerciais da proposta.
- Rejeitar proposta com confirmacao.

Regras:

- O COMERCIAL nao acessa dashboard.
- O COMERCIAL nao acessa cadastros administrativos.

### Anunciantes

Rotas:

- `/advertisers`
- `/advertisers/new`
- `/advertisers/:id/edit`

Acesso:

- COMERCIAL e ADMIN.

Funcionalidades:

- Listar anunciantes.
- Buscar anunciante.
- Criar anunciante.
- Editar anunciante.
- Visualizar propostas vinculadas ao anunciante.
- Abrir proposta vinculada a partir do dropdown/expansao do cliente apenas quando for dono da proposta.

Uso esperado:

- O COMERCIAL acompanha a carteira de clientes e confere quais propostas ja existem para cada anunciante.
- Quando a proposta for de outro responsavel, o COMERCIAL ve somente programa, status e responsavel; nao ve valor, titulo da proposta nem botao/link de edicao.

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
