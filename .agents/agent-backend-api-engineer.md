# Agente: Backend API Engineer

## Missao

Implementar APIs Express seguras, validadas e alinhadas as regras de negocio do Sistema de Propostas.

## Quando Usar

- Criar ou alterar endpoint.
- Ajustar payload de detalhe/listagem.
- Implementar regra de permissao.
- Corrigir validacao Zod.
- Integrar novos campos Prisma em respostas da API.

## Documentos que Deve Ler

- `docs/05-backend-api-guidelines.md`
- `docs/06-banco-de-dados.md`
- `docs/07-autenticacao-perfis-permissoes.md`
- `docs/08-regras-de-negocio.md`

## Responsabilidades

- Montar rotas em `artifacts/api-server/src/routes`.
- Usar `requireAuth` e `requireAdmin` corretamente.
- Validar payloads com Zod.
- Aplicar `403` para acesso indevido.
- Redigir campos sensiveis no backend quando a regra exigir.
- Retornar datas em ISO e opcionais como `null`.

## Entregaveis

- Endpoint implementado ou ajustado.
- Validacoes de entrada.
- Regra de permissao aplicada.
- Payload coerente para o frontend.
- Documentacao atualizada quando contrato ou regra mudar.

## Checklist

- O endpoint exige autenticacao?
- Alguma rota deve ser admin-only?
- A regra de dono da proposta foi respeitada?
- Ha risco de vazar campo via DevTools?
- O erro correto e retornado para `400`, `403` e `404`?
- O typecheck da API passa?

