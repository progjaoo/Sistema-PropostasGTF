# Visao Geral

O Sistema de Propostas e uma aplicacao web para criacao e gestao de propostas comerciais.

## Objetivos

- Permitir que usuarios ADMIN configurem a base comercial do sistema.
- Permitir que usuarios COMERCIAL criem e gerenciem suas propostas.
- Organizar anunciantes, empresas, programas e produtos em uma base unica.
- Gerar uma experiencia de edicao de proposta com preview visual e exportacao por impressao/PDF.

## Perfis

- ADMIN: acesso administrativo completo.
- COMERCIAL: acesso operacional, com restricao para visualizar e editar apenas suas proprias propostas.

## Entidades Principais

- Usuario: pessoa autenticada no sistema.
- Empresa: emissora/empresa onde a proposta sera anunciada.
- Programa: agrupador comercial de produtos.
- Produto: item do catalogo comercial que pode ser vinculado a programas.
- Anunciante: cliente da proposta.
- Proposta: documento comercial criado para um anunciante.
- Produto da proposta: item que compoe o plano de produtos da proposta.
- Tipo de proposta: classificacao comercial da proposta.

## Fluxo Resumido

1. ADMIN cadastra empresas, programas, produtos, tipos de proposta e usuarios.
2. COMERCIAL ou ADMIN cria uma proposta.
3. Na criacao, a empresa da proposta e selecionada.
4. No editor, o usuario seleciona cliente, periodo, produtos e investimento.
5. O contato da proposta vem do perfil do vendedor dono da proposta.
6. O sistema exibe preview e permite imprimir/exportar como PDF.

