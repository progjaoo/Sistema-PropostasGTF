# Guidelines de Backend e API

## Estrutura

Local:

```text
artifacts/api-server/src/
```

Padrao:

- Cada dominio possui um arquivo em `routes`.
- Todas as rotas sao montadas em `routes/index.ts`.
- Todas as rotas da API ficam sob o prefixo `/api`.

## Rotas Principais

- `/api/auth`
- `/api/profile`
- `/api/users`
- `/api/stations`
- `/api/advertisers`
- `/api/product-templates`
- `/api/proposal-categories`
- `/api/proposal-types`
- `/api/proposals`
- `/api/dashboard`

## Validacao

- Usar Zod para validar `body`, `params` e `query` quando aplicavel.
- Retornar `400` quando payload estiver invalido.
- Retornar `404` quando recurso nao existir.
- Retornar `403` quando usuario autenticado nao tiver acesso.

## Autenticacao

- Usar `requireAuth` para rotas autenticadas.
- Usar `requireAdmin` para rotas administrativas.
- Nunca confiar em `userId` vindo do payload para operacoes do usuario logado.
- Para perfil proprio, usar sempre `req.userId`.

## Acesso a Dados

- Usar Prisma Client importado de `@workspace/db`.
- Evitar SQL manual.
- Usar `include` e `select` de forma explicita quando houver risco de vazar dados sensiveis.
- Aplicar redacao de campos no backend quando uma regra de negocio exigir ocultacao real, nao apenas esconder no frontend.

## Regras de Resposta

- Datas devem sair em ISO string.
- Campos opcionais devem preferir `null` quando ausentes.
- Listagens paginadas devem retornar dados e metadados quando aplicavel.
- Endpoints de detalhe devem retornar payload completo necessario para a tela.

## Logs

- O projeto usa Pino/Pino HTTP.
- Logs devem registrar metodo, URL sem query sensivel e status.
- Evitar logar tokens, senhas e payloads com dados sensiveis.

