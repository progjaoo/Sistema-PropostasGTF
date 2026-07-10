# Regras de Negocio Principais

## Empresas

- Empresas representam emissoras/empresas onde uma proposta pode ser anunciada.
- Uma proposta sempre possui uma empresa (`stationId`).
- Na criacao e edicao de proposta, o usuario deve poder escolher a empresa.
- `Radio 88 FM` deve aparecer como primeira opcao quando cadastrada e ativa.
- Toda empresa possui `primaryColor`, com default `#427EFF`, usado no preview da proposta.

## Programas

- Programas agrupam produtos comerciais.
- Um programa pode ter varios produtos.
- Icones de programa podem ser armazenados em base64.
- COMERCIAL consulta programas, mas nao altera.

## Produtos

- Produtos sao modelos reutilizaveis do catalogo comercial.
- Produtos possuem um valor sugerido unico, usado como referencia comercial.
- Produtos podem ter duracao/tempo de reproducao.
- Duracoes sao reutilizaveis e podem ser criadas pelo ADMIN durante o cadastro de produto.
- Produtos devem ser vinculados a programas no cadastro.
- O cadastro ADMIN de Produto nao usa mais quantidade; quantidade pertence ao item da proposta.
- O campo tecnico `ProductTemplate.name` continua existindo, mas e gerado pela API.
- Somente ADMIN cria/edita produtos.

## Clientes e Leads

- A entidade tecnica continua sendo `Advertiser`.
- Na UI, `Advertiser.status = CLIENT` aparece como Cliente.
- Na UI, `Advertiser.status = LEAD` aparece como Lead.
- A ficha do cliente mostra propostas vinculadas.
- A visibilidade das propostas vinculadas depende do perfil e do dono da proposta.
- Lead vira Cliente automaticamente quando uma proposta vinculada e marcada como `APPROVED`.
- O campo `legalName` continua no banco para historico, mas nao aparece no formulario de Cliente/Lead.

## Propostas

Status:

- `DRAFT`: Rascunho
- `SENT`: Enviada
- `APPROVED`: Aprovada
- `REJECTED`: Rejeitada

Regras:

- COMERCIAL so visualiza e edita propostas criadas por ele.
- ADMIN visualiza e edita todas.
- O contato exibido na proposta vem do perfil do vendedor (`createdBy`).
- A empresa da proposta vem de `stationId`.
- O cliente/lead vem de `advertiserId`.
- Produtos da proposta podem vir do catalogo ou ser avulsos.
- Cada produto da proposta pode ter horario proprio (`airTime`), definido no editor da proposta.
- Cada produto da proposta pode ter sazonalidade propria: Mensal, Semestral ou Anual.
- Horario e sazonalidade nao pertencem ao produto de catalogo.
- Duracao aparece na proposta quando o produto/item possui essa informacao.
- O preview usa a cor primaria da empresa selecionada.
- A apresentacao da proposta possui ate 4 itens editaveis, cada um com destaque e descricao.

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
