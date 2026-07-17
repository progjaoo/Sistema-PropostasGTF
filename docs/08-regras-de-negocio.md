# Regras de Negocio Principais

## Empresas

- Empresas representam emissoras/empresas onde uma proposta pode ser anunciada.
- Uma proposta sempre possui uma empresa (`stationId`).
- Na criacao e edicao de proposta, o usuario deve poder escolher a empresa.
- `Radio 88 FM` deve aparecer como primeira opcao quando cadastrada e ativa.
- Toda empresa possui `primaryColor`, com default `#427EFF`, usado no preview da proposta.
- No cadastro administrativo, Nome e Cor da proposta sao obrigatorios.
- Logo, slogan, endereco, cidade, telefone e e-mail sao opcionais.
- Razao social, nome fantasia duplicado, CNPJ, nome do contato, UF, site e observacoes permanecem apenas como campos legados na API/banco e nao aparecem no formulario.
- ADMIN pode configurar ate 4 itens de Apresentacao padrao por Empresa.
- Cada item de Apresentacao possui destaque e descricao.
- A Apresentacao padrao da Empresa alimenta novas propostas como snapshot.

## Programas

- Programas agrupam produtos comerciais.
- Um programa pode ter varios produtos.
- Um programa pertence a uma empresa/emissora.
- Produtos vinculados a um programa devem pertencer a mesma empresa do programa.
- A listagem de Programas permite filtrar por empresa.
- A tela de Propostas filtra Programas e Produtos pela empresa selecionada.
- Icones de programa podem ser armazenados em base64.
- COMERCIAL consulta programas, mas nao altera.

## Produtos

- Produtos sao modelos reutilizaveis do catalogo comercial.
- Produtos possuem um valor sugerido unico, usado como referencia comercial.
- Produtos podem ter duracao/tempo de reproducao.
- Duracoes sao reutilizaveis e podem ser criadas pelo ADMIN durante o cadastro de produto.
- Todo Produto pertence obrigatoriamente a uma Empresa.
- O Programa e opcional; quando informado, deve pertencer a mesma Empresa do Produto.
- Produto sem Programa aparece como `Sem programa` e pode ser usado normalmente em propostas da sua Empresa.
- O cadastro ADMIN de Produto nao usa mais quantidade; quantidade pertence ao item da proposta.
- O campo tecnico `ProductTemplate.name` continua existindo, mas e gerado pela API.
- Somente ADMIN cria/edita produtos.
- O campo de cor do Produto permanece apenas por compatibilidade; a proposta usa a cor da Empresa.

## Clientes e Leads

- A entidade tecnica continua sendo `Advertiser`.
- Na UI, `Advertiser.status = CLIENT` aparece como Cliente.
- Na UI, `Advertiser.status = LEAD` aparece como Lead.
- A ficha do cliente mostra propostas vinculadas.
- A visibilidade das propostas vinculadas depende do perfil e do dono da proposta.
- Lead vira Cliente automaticamente quando uma proposta vinculada e marcada como aceita (`APPROVED`).
- O campo `legalName` continua no banco para historico, mas nao aparece no formulario de Cliente/Lead.

## Propostas

Status:

- `DRAFT`: Rascunho
- `SENT`: Enviada
- `APPROVED`: Aceita
- `REJECTED`: Rejeitada

Regras:

- COMERCIAL so visualiza e edita propostas criadas por ele.
- ADMIN visualiza e edita todas.
- COMERCIAL so opera propostas em Empresas com `canCreateProposals` ativo.
- O catalogo usado no editor e filtrado pela Empresa da proposta e pela permissao `canViewCatalog`.
- O contato exibido na proposta vem do perfil do vendedor (`createdBy`).
- A empresa da proposta vem de `stationId`.
- O cliente/lead vem de `advertiserId`.
- Produtos da proposta podem vir do catalogo ou ser avulsos.
- Cada produto da proposta pode ter horario proprio (`airTime`), definido no editor da proposta.
- Cada produto da proposta pode ter sazonalidade propria: Mensal, Semestral ou Anual.
- Horario e sazonalidade nao pertencem ao produto de catalogo.
- Duracao aparece na proposta quando o produto/item possui essa informacao.
- O preview usa a cor primaria da empresa selecionada.
- A apresentacao da proposta vem da Empresa e fica somente leitura no editor.
- Ao trocar a Empresa da proposta, a API substitui o snapshot da Apresentacao pelo padrao da nova Empresa.
- Alterar a Apresentacao padrao da Empresa nao altera propostas antigas ja criadas.
- A opcao `Nao exibir periodo na proposta` oculta periodo no preview/PDF sem apagar datas salvas.
- O campo legado `periodDesc` nao volta para a UI.

## Andamento da Proposta

- Toda proposta pode ter um andamento de etapas comerciais.
- Ao criar proposta vinculada a Lead, a API registra `LEAD_CREATED` automaticamente.
- COMERCIAL e ADMIN podem adicionar etapas manuais: `IN_CONVERSATION`, `PROPOSAL_SENT`, `CLIENT_REVIEWING`, `NEGOTIATION`.
- Ao mudar status para `APPROVED`, a API registra etapa `APPROVED` automaticamente e exibe o status como `Aceita`.
- Ao mudar status para `REJECTED`, a API registra etapa `REJECTED` automaticamente.
- O andamento segue a permissao da proposta: COMERCIAL acessa apenas propostas proprias; ADMIN acessa todas.
- O sistema mantem no maximo 50 etapas por proposta, removendo as mais antigas quando exceder esse limite.
- Clientes e Leads exibem a ultima etapa do andamento nas propostas vinculadas.
- A pagina `/proposal-progress` mostra `Andamento de Propostas` por programa, com timeline horizontal e acao de aceite.

## Avisos de Recaptura

- Propostas marcadas como `REJECTED` geram avisos recorrentes de recaptura.
- Os avisos sao criados automaticamente para 3, 6 e 10 meses depois da rejeicao.
- Lead com proposta rejeitada permanece `LEAD`.
- Cliente com proposta rejeitada permanece `CLIENT`.
- Somente proposta marcada como `APPROVED`/`Aceita` promove Lead para Cliente.
- ADMIN visualiza todos os avisos vencidos.
- COMERCIAL visualiza apenas avisos de propostas criadas por ele.
- Avisos vencidos aparecem em badge na sidebar e em dialog central uma vez por sessao.
- A tela `/recall-reminders` permite revisar avisos, abrir proposta, abrir Lead/Cliente, lembrar depois ou marcar como tratado.
- `Lembrar depois` reagenda o aviso por 7, 15 ou 30 dias.
- `Marcar tratado` remove o aviso da lista ativa e grava usuario/data de tratamento.
- Se uma proposta rejeitada for aceita depois, os avisos pendentes dessa proposta sao cancelados.

## Sugestao de Investimento

O editor calcula a sugestao no frontend.

Formula:

- Usa o valor sugerido unico do produto.
- Para dados legados sem valor sugerido unico, usa o valor maximo antigo como fallback quando existir.
- Multiplica pela quantidade do item.
- Soma todos os itens vindos do catalogo.
- Itens avulsos nao entram no calculo.

O valor final (`investValue`) continua manual.

## Contato Comercial

- Fonte correta: perfil do vendedor dono da proposta.
- Campos usados:
  - `createdBy.name`
  - `createdBy.jobTitle`
  - `createdBy.contactPhone`
  - `createdBy.contactEmail`
- Se cargo ou telefone estiverem ausentes, o editor exibe aviso de perfil incompleto.

## Tipos de Proposta

- Tipos de proposta sao cadastrados em `/admin/proposal-types`.
- Criacao de proposta tenta usar o primeiro tipo ativo como padrao.
- O editor permite criar tipo inline quando necessario.
