
## Implementado - Plano 018 Dashboard sem Total e Arquivadas

- Dashboard: removido o card `Total` dos indicadores clicaveis.
- Dashboard: removido o card `Arquivadas`, pois o sistema ainda nao possui fluxo operacional de arquivamento.
- Dashboard: mantidos apenas os cards `Rascunhos`, `Enviadas`, `Aceitas` e `Rejeitadas`.
- Dashboard: a listagem inicial passa a abrir em `Rascunhos`.
- Dashboard: grid dos indicadores ajustada para quatro cards em telas largas.
- Documentacao: `paginas-por-perfil.md` atualizado com o comportamento atual.

## Implementado - Plano 017 Corrigir Fluxo Nova Proposta

- Propostas: `/proposals/new` deixou de redirecionar silenciosamente para `/proposals`.
- Propostas: criada tela funcional de `Nova Proposta` com selecao de Empresa e Tipo de Proposta.
- Propostas: a Empresa prioriza `Radio 88 FM` como primeira opcao quando cadastrada e ativa.
- Propostas: ao criar o rascunho, o sistema chama `POST /api/proposals`, invalida as listas/boards e abre `/proposals/:id/edit`.
- Propostas: mantidos os botoes existentes do Dashboard e da tela `/proposals`, agora apontando para um fluxo funcional.
- Documentacao: `paginas-por-perfil.md` atualizado com o fluxo atual de criacao.

## Implementado - Plano 014 Propostas como Tela Completa de Andamento

- Sidebar: removido o item redundante `Andamento de Propostas`.
- Propostas: `/proposals` passou a abrir a tela completa de acompanhamento por programa, com timeline, etapas, aceite/rejeicao, produtos e investimento.
- Propostas: titulo visual da tela consolidada passou a ser `Propostas`.
- Propostas: `/proposal-progress` ficou como rota legada e redireciona para `/proposals`.
- Codigo: `pages/proposals/index.tsx` ficou como tela legada sem rota ativa principal, preservada para consulta/rollback.
- Documentacao: `paginas-por-perfil.md` atualizado com a navegacao consolidada.

## Implementado - Plano 012 Avisos Recorrentes de Recaptura

- Banco: adicionado modelo `ProposalRecallReminder` e enum `ProposalRecallReminderStatus` para persistir avisos de recaptura.
- Backend: rejeicao de proposta agora cria lembretes automaticos de 3, 6 e 10 meses.
- Backend: aceite de proposta cancela lembretes pendentes e mantem a regra de promover Lead para Cliente apenas em `APPROVED`.
- Backend: Lead com proposta rejeitada permanece `LEAD`.
- API: criado modulo `/api/recall-reminders` com listagem, contagem, notificacao exibida, reagendamento e conclusao.
- Frontend: adicionado item `Avisos de Recaptura` na sidebar com badge de avisos vencidos.
- Frontend: criado dialog central de recaptura, exibido uma vez por sessao quando houver avisos vencidos.
- Frontend: criada tela `/recall-reminders` com filtros e acoes `Abrir proposta`, `Abrir Lead/Cliente`, `Lembrar` e `Tratado`.
- Documentacao: regras de negocio, API, banco e paginas por perfil atualizadas.

## Implementado - Plano 011 Andamento de Propostas e Aceite de Lead

- Sidebar: adicionada pagina `Andamento de Propostas` para ADMIN e COMERCIAL.
- Propostas: criada rota `/proposal-progress` com programas no painel esquerdo e propostas do programa no painel direito.
- Propostas: cards de andamento exibem timeline horizontal por proposta, status, responsavel, empresa, valor e produtos.
- Propostas: `Timeline` passou a aparecer como `Andamento da Proposta` nos textos visiveis.
- Propostas: status tecnico `APPROVED` passou a aparecer como `Aceita` na UI.
- API: criado endpoint `GET /api/proposals/progress-board` com propostas agrupadas por programa e timeline embutida.
- API: ao marcar proposta como `APPROVED`, o backend registra `Aceita` e promove Lead para Cliente quando aplicavel.
- Editor de Proposta: removido o campo `Texto de Periodo Personalizado` do acordeao `Periodo`.
- Docs: criado guia `docs/SUBIR-PRODUÇÃO.md` para publicacao em VPS.
- Validacao local: `pnpm run typecheck`, build da API, build do frontend, Docker Compose e healthcheck passaram.

## Implementado - Plano 010 Produtos por Programa

- Produtos: tela `/admin/product-templates` passou a usar programas no painel esquerdo e produtos vinculados no painel direito.
- Produtos: filtros atuais de busca, programa, status, valor e ordenacao foram preservados.
- Produtos: cards passaram a usar destaque visual pela cor da Empresa/Emissora do programa, quando disponivel.
- Produtos: modal de criacao/edicao nao exibe mais `Cor do destaque`.
- API: `GET /api/product-templates` retorna `programStationPrimaryColor` para apoiar o destaque por Empresa.

## Implementado - Plano 009 Propostas por Programa

- Propostas: tela `/proposals` passou a usar duas colunas principais, com programas no lado esquerdo e propostas vinculadas no painel direito.
- Propostas: removida a coluna intermediaria que repetia nome do programa e listava produtos disponiveis.
- Propostas: painel direito agora mostra o programa selecionado, contagem de propostas e cards de propostas com metadados separados.
- Propostas: cards foram reorganizados para evitar sobreposicao entre cliente/proposta, empresa, responsavel, data, valor e acoes.

## Implementado - Redesign Proposta, Clientes, Leads e Cor da Empresa

- Sidebar: `Anunciantes` passou a aparecer como `Clientes`.
- Sidebar: criada entrada `Leads` abaixo de Clientes.
- Banco: `Advertiser.status` separa `LEAD` e `CLIENT`.
- Banco: `Station.primaryColor` define a cor padrao da proposta, com default `#427EFF`.
- Clientes/Leads: formulario usa `Nome`, remove `Razao Social` da UI e troca `Observacoes` por `Informacao Interna`.
- Propostas: ao marcar proposta vinculada a Lead como `Aceita`, o backend promove o Lead para Cliente.
- Editor de proposta: bloco `Apresentacao` permite ate 4 itens com destaque e descricao.
- Preview da proposta: layout redesenhado com Header, Hero, Apresentacao, Plano de Acoes, Investimento e Rodape.
- Preview da proposta: cards de produto e hero usam a cor da Empresa selecionada.

## Implementado - Produtos com Duracao, Horario e Sazonalidade

- Banco: criado cadastro reutilizavel de duracoes de produto.
- Banco: `ProductTemplate` agora pode referenciar uma duracao.
- Banco: `ProposalProduct` guarda `durationLabel`, `airTime` e `seasonality`.
- API: criada rota `/api/product-durations` para listar/criar duracoes.
- Produtos: formulario ADMIN removeu `Nome interno`, `Quantidade` e `Valor sugerido maximo`.
- Produtos: formulario ADMIN usa `Programa`, `Nome do Produto`, `Duracao` e `Valor sugerido`.
- Programas: criacao inline de produto segue os mesmos campos simplificados.
- Propostas: item do plano de acoes permite preencher `Horario` e `Sazonalidade`.
- Propostas: sugestao de investimento usa valor sugerido unico do produto multiplicado pela quantidade.
- Preview/PDF: duracao, horario e sazonalidade aparecem no card do produto somente quando preenchidos.

## Implementado - Hierarquia Programa-Empresa e Andamento de Proposta

- Banco/API: Programas agora possuem vinculo com Empresa (`ProposalCategory.stationId`) para separar catalogos por emissora.
- Programas: cadastro ADMIN exige Empresa, exibe badge da Empresa e permite filtro por Empresa.
- Produtos: criacao e vinculo validam que Produto e Programa pertencem a mesma Empresa.
- Propostas: painel por Programas respeita filtro de Empresa e mostra a Empresa do Programa.
- Editor de Proposta: catalogo de Produtos passa a listar apenas produtos da Empresa selecionada na proposta.
- Editor de Proposta: troca de Empresa com produtos existentes exibe aviso para revisao do plano de produtos.
- Editor de Proposta: campo Descricao da Apresentacao virou textarea e preserva quebras de linha no preview.
- Andamento: criado modelo `ProposalTimeline` e endpoints `GET/POST /api/proposals/:id/timeline`.
- Andamento: Lead vinculado a proposta registra `LEAD_CREATED` automaticamente.
- Andamento: status `APPROVED` e `REJECTED` registram etapas automaticas.
- Clientes/Leads: propostas vinculadas exibem a ultima etapa do andamento quando existir.
- Propostas: cada proposta vinculada agora possui botao `Andamento` para abrir as etapas em dialog, sem sair da tela `/proposals`.
- Validacao: Docker Compose reconstruiu a aplicacao, executou `db push`/seed e respondeu `{"status":"ok"}` em `/api/healthz`.
- Pendente propositalmente: Fase 6 de PDF A4 completo foi separada no plano 006.

## Implementado - PDF A4 e Ajustes do Editor da Proposta

- PDF/print: adicionadas classes estaveis no preview para impressao A4.
- PDF/print: CSS de impressao força A4, remove sidebar/editor e preserva fundos com `print-color-adjust`.
- PDF/print: removido scale do wrapper impresso para evitar PDF reduzido ou cortado.
- PDF/print: hero, cards de produto, investimento e rodape evitam quebra interna de pagina.
- PDF/print: conteudo interno da folha foi compactado no modo print para manter assinatura e contato dentro do A4.
- PDF/print: descricoes de produto deixam de ficar truncadas no PDF.
- Editor de Proposta: descricao da `Apresentacao` preserva espacos e quebras durante a digitacao.
- Preview/PDF: descricao da `Apresentacao` continua preservando quebras de linha.
- Editor de Proposta: botao de remover produto adicionado passou a usar estilo destrutivo vermelho e `aria-label`.
- Docker: falha de camada cacheada do Prisma foi documentada em `docs/rodar-local.md`, com recuperacao via `docker compose build --no-cache`.
- Validacao local: `pnpm run typecheck`, build frontend, rebuild Docker sem cache e healthcheck passaram.

## Implementado - Plano 007 PDF A4 com Paginacao por Produtos

- PDF/print: criado `ProposalPrint.tsx`, componente exclusivo para impressao.
- PDF/print: o botao `PDF` agora renderiza o print via portal em `document.body`, separado do preview escalonado do editor.
- PDF/print: produtos sao paginados em grupos de ate 4 por pagina.
- PDF/print: header aparece em todas as paginas; hero e Apresentacao apenas na primeira; investimento e contato apenas na ultima.
- PDF/print: `#proposal-print-root` passou a ser a unica area visivel no `@media print`, evitando sidebar/editor e conflito com `.print-area`.
- PDF/print: fundos criticos continuam com `backgroundColor` inline e `print-color-adjust`.
- Validacao local: `pnpm run typecheck`, build frontend, Docker Compose e healthcheck passaram.

## Implementado - Plano 008 PDF Enxuto, Ctrl+P e Borda dos Produtos

- PDF/print: layout do `ProposalPrint` foi compactado para caber ate 4 produtos em uma pagina com investimento e contato.
- PDF/print: cards de produto recuperaram a borda lateral na cor da empresa usando variavel CSS e `border-left` prioritario.
- PDF/print: descricoes de produtos no PDF usam clamp mais curto para preservar o layout de uma pagina.
- Editor de Proposta: `Ctrl+P`/`Cmd+P` agora prepara o `ProposalPrint` antes de abrir o dialog de impressao.
- Editor de Proposta: botao `PDF` e atalho de teclado usam o mesmo handler de impressao.
- Validacao local: `pnpm run typecheck` e build frontend passaram.

## Implementado - Plano 015 Dashboard com Propostas Filtradas por Status

- Dashboard: cards de Total, Rascunhos, Enviadas, Aceitas, Rejeitadas e Arquivadas passaram a ser clicaveis.
- Dashboard: a lista abaixo dos cards passou a responder ao status selecionado.
- Dashboard: lista operacional exibe cliente, tipo, empresa, responsavel, data de atualizacao, status, investimento e acao para abrir a proposta.
- Dashboard: adicionados filtros internos por busca textual, empresa, responsavel, tipo de proposta, periodo e ordenacao.
- Dashboard: adicionada paginacao server-side para navegar dentro do status selecionado.
- API: `GET /api/proposals` passou a aceitar filtros de `stationId`, `proposalTypeId`, `createdById`, `dateFrom`, `dateTo`, `sortBy` e `sortDir`.
- API: resumo de proposta passou a retornar empresa, tipo, responsavel e investimento para a Dashboard.

## Implementado - Plano 016 Proposta Multipagina com Paginacao Dinamica

- PDF/print: `ProposalPrint` deixou de usar paginacao fixa por 4 produtos.
- PDF/print: criado fluxo de medicao offscreen em A4 antes da impressao.
- PDF/print: criado algoritmo puro de paginacao por altura real dos cards e espaco reservado por pagina.
- PDF/print: criada estrutura de paginas prontas com pagina inicial, paginas intermediarias e pagina final.
- PDF/print: investimento e rodape continuam aparecendo somente na ultima pagina.
- PDF/print: botao `PDF` e `Ctrl+P`/`Cmd+P` agora chamam `window.print()` somente depois que a medicao e a paginacao terminam.
- PDF/print: CSS da folha A4 passou a usar altura fixa, `overflow: hidden` e quebra controlada por pagina.
- Arquitetura: secoes visuais do print foram separadas em componentes reutilizaveis dentro de `components/proposal/print`.

## Backlog / Pendencias Futuras

NA SIDEBAR COLOCAR ABAIXO DE ANUNCIANTES (QUE SERA CLIENTES O NOME, NÃO MAIS ANUNCIANTES) CRIAR LEADS (Que será a tela daqueles que ainda não Clientes)

    Dentro da tela de Criação de Clientes:
    Nome fantasia será Nome
    Retirar Razão Social do form
    Observações (trocar para informação interna Informação Interna)
    (createdAt - UpdatedAt já está no banco de dados para propostas? clientes? )

CRIAR EMISSORA:
    - A EMISSORA DEVE TER UMA COR PADRÃO AO SER CRIADA, ESSA COR SERÁ A COR DO FORMULÁRIO DE PROPOSTA DELA QUANDO SELECIONADO ESSA EMISSORA ASSIM COMO NA FOTO QUE LHE ENVIEI QUE SERÁ O PADRÃO DE FORMULÁRIO

----------- FALTA ABAIXO ------

CRIAR PROPOSTA - (atualmlente tem uma tela que ao clicar em propostas, cai em uma tela que exibe os programas, retirar essa tela de pré proposta que tem nesse  momento e cair na ideia abaixo):
    - TELA DE PROPOSTA QUANDO CLICAR NA SIDEBAR "PROPOSTAS" DEVE ABRIR UMA TELA QUE EXIBE PROGRAMAS COM SEUS PRODUTOS: 
        ADICIONAR FILTROS: BUSCA POR TEXT - SELEÇÃO DE EMISSORA - SELEÇÃO DE PROGRAMA - STATUS DE PROPOSTAS
        AO FILTRAR - E VIR O PROGRAMA CLICAR NO PROGRAMA E IR PARA AS PROPOSTAS VINCULADAS A ESSE PROGRAMA E VIR HIERARQUICAMENTE AS INFORMAÇÕES DOS MESMOS, COM UM PADRÃO DE DESIGN PARA FÁCIL ENTENDIMENTO DO USUÁRIO.
    - CLIENTE: AO SETAR CLIENTE NAO VER SUGESTÕES DE CLIENTE (Button => NOVO LEAD)
    - PRODUTO: REMOVER BOTAO INSERIR NA PROPOSTA/ADICIONAR PRODUTO NO CATALOGO, AO ABRIR O SELECT DE PRODUTOS, PESQUISA, CLICOU NO PRODUTO ELE VAI PRA PROPOSTA - Botão Criar Produto Novo em vez de Adicionar Produto Avulso - Botão excluir produto sempre visivel e deve ser vermelho - retirar campo tags
    - TIPOGRAFIA DA PÁGINA DO PDF DE PROPOSTAS DEVE SER MONTESSERRAT - A FOLHA EM TAMANHO A4 para impressão e um bom PDF
    - AJUSTAR PARA QUE AO CLICAR NO BOTÃO PDF A IMPRESSÃO FIQUE CORRETA, COMPLETA E NÃO COMO ESTÁ AGORA
______________________________________
### PEDIDOS LEO - 15 JULHO 2026
- TAREFA 1: No cadastro de EMPRESAS:
    - retirar RAZAO SOCIAL, CNPJ NÃO DEVE SER OBRIGATÓRIO, SITE, DADOS COMPLEMENTARES, UF. Obrigatório apenas Nome - Cor da Proposta
    - Colocar um componente color picker no cor padrão da proposta da empresa
    - Contato da empresa deixar apenas TELEFONE e EMAIL
- TAREFA 2: No cadastro de Produto:
    - Deve ter a empresa para vincular esse produto
    - Nem sempre um produto, será um programa, então no accordeão de Produto na Criaçãoi de Proposta, quando crio um produto NOVO, o nome PROGRAMA deve ser NOME DO PRODUTO.
- TAREFA 3: GESTÃO DE USUÁRIOS MAIS ROBUSTA:
    - O Admin deve ter como CRIAR/ATUALIZAR/DELETAR USUÁRIOS, deve ter uma tela para gerência desses usuários para que ele posssa fazer a Gestão de Acessos desses, exemplo: Criei um login comercial para o Lucas Silva, ele pode crir propostas apnas para a empresa X e não pode criar para empresa Y, ele deve poder gerir a possibilidade de vendas e acessos desses usários comerciais. Criar um planejamento para uma gestão de acessos completa.

- TAREFA 4: DENTRO DA CRIAÇÃO DE PROPOSTA:
    - No acorddeao retirar os dados da empresa ali no empresa dentro do accordeão, precisa ser mais intuitivo então pode retirar os dados da empresa.
    - No accordeao no criar novo lead, no modal obrigatório para esse cadastro apenas NOME - NOME DO CONTATO - TELEFONE o resto não precisa ser obrigatório, não precisa ter CNPJ no cadastro do novo lead.
    - No accodeão de PERÍODO, precisa ter a opção "Não exibir Período" e ele marcando esse check não deve exibir PERÍODO no pdf da PROPOSTA.
- TAREFA 5: APRESENTAÇÃO:
    - No accordeão de APRESENTAÇÃO, o login COMERCIAL não deve ter acesso a isso, a APRESENTAÇÃO deve ser criada pelo ADMIN e já ser setado na proposta por empresa, cada empresa tem a apresentação dela, vamos estruturar para que apenas o ADMIN crie apresentações PADRÃO para cada empresa e quando o comercial for criar proposta, ele ao escolher a empresa já vir a APRESENTAÇÃO que foi criado para essa empresa pelo ADMIN do sistema no PDF da proposta.

- TAREFA 6: LOGIN:
    - Criar recuperação de senha casa o usário esqueça a senha, na tela de Login colocar um Esqueceu a Senha? Ele insere o email cadastrado e ai será enviado um link para ele trocar de senha, pense em um plano, irei utilizar o RESEND para essa recuperação de senha através do EMAIL.
    https://resend.com/docs/introduction DOCUMENTAÇÃO DO RESEND
    API key deve ser configurada somente pela variavel de ambiente `RESEND_API_KEY` e nunca registrada na documentacao.

## Implementado - Plano 019 Empresas, Produtos e Gestao de Acessos

- Empresas: formulario simplificado para Nome, Cor da proposta, Logo, Slogan, Endereco, Cidade, Telefone, E-mail e Status.
- Empresas: criado `ColorPickerField` sincronizado com hexadecimal e normalizacao para `#RRGGBB` uppercase.
- Produtos: Empresa passou a ser obrigatoria e Programa opcional; a API valida que ambos pertencem ao mesmo escopo.
- Produtos: listagem e formulario agora filtram Programas por Empresa e aceitam `Sem programa`.
- Propostas: item avulso usa o rotulo `Nome do Produto`; o catalogo e filtrado pela Empresa da proposta.
- Banco: criada a tabela `user_station_accesses` com permissoes para criar propostas e visualizar catalogo.
- Banco: migration e seed fazem backfill dos COMERCIAIS ativos para as Empresas ativas existentes.
- Usuarios: tela administrativa ganhou CRUD, filtros, status pendente, reset de senha e matriz de acesso por Empresa.
- Seguranca: COMERCIAL opera em `default-deny`; API retorna `403` para Empresa ou catalogo sem permissao e preserva a regra de propriedade da proposta.
- Cadastro publico: novas contas COMERCIAIS ficam inativas ate aprovacao do ADMIN.
- Validacao: Prisma generate, codegen, typecheck, builds de frontend/API, Docker Compose, healthcheck e matriz HTTP ADMIN/COMERCIAL executados.



