# Regras de Negocio Principais

## Empresas

- Empresas representam emissoras/empresas onde uma proposta pode ser anunciada.
- Uma proposta sempre possui uma empresa (`stationId`).
- Na criacao e edicao de proposta, o usuario deve poder escolher a empresa.
- `Radio 88 FM` deve aparecer como primeira opcao quando cadastrada e ativa.

## Programas

- Programas agrupam produtos comerciais.
- Um programa pode ter varios produtos.
- Icones de programa podem ser armazenados em base64.
- COMERCIAL consulta programas, mas nao altera.

## Produtos

- Produtos sao modelos reutilizaveis do catalogo comercial.
- Produtos podem ter valor sugerido minimo e maximo.
- Produtos podem ser vinculados a programas.
- Somente ADMIN cria/edita produtos.

## Anunciantes

- Anunciantes representam clientes.
- A ficha do anunciante mostra propostas vinculadas.
- A visibilidade das propostas vinculadas depende do perfil e do dono da proposta.

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
- O anunciante vem de `advertiserId`.
- Produtos da proposta podem vir do catalogo ou ser avulsos.

## Sugestao de Investimento

O editor calcula a sugestao no frontend.

Formula:

- Se produto tem minimo e maximo: media entre os dois valores.
- Se produto tem apenas um valor: usa o valor disponivel.
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

