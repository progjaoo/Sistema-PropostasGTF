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
- `/api/recall-reminders`
- `/api/dashboard`

## Contratos Especificos

### Programas

- `GET /api/proposal-categories` aceita `stationId`, `search`, `active` e `sort`.
- `POST /api/proposal-categories` exige `stationId`, `name` e `slug`.
- `PATCH /api/proposal-categories/:id` permite trocar `stationId`, mas produtos vinculados precisam pertencer a mesma empresa.
- A resposta de Programa inclui `stationId`, `station` e `products`.

### Timeline de Proposta

- `GET /api/proposals/:id/timeline` retorna as etapas em ordem cronologica.
- `POST /api/proposals/:id/timeline` cria apenas etapas manuais permitidas.
- Etapas automaticas sao criadas por regras internas ao criar proposta de Lead ou ao mudar status para `APPROVED`/`REJECTED`.
- `GET /api/proposals/:id` tambem retorna `timeline` no payload completo do editor.

### Avisos de Recaptura

- `GET /api/recall-reminders` retorna avisos visiveis ao usuario autenticado.
- `GET /api/recall-reminders/count` retorna a contagem usada no badge da sidebar.
- `PATCH /api/recall-reminders/:id/notify` registra que o aviso foi exibido.
- `PATCH /api/recall-reminders/:id/snooze` reagenda o aviso por 7, 15 ou 30 dias.
- `PATCH /api/recall-reminders/:id/done` marca o aviso como tratado.
- ADMIN acessa todos os avisos.
- COMERCIAL acessa somente avisos vinculados a propostas criadas por ele.
- Ao mudar uma proposta para `REJECTED`, a API cria avisos de 3, 6 e 10 meses.
- Ao mudar uma proposta para `APPROVED`, a API cancela avisos pendentes daquela proposta.
- Rejeitar proposta nao altera `Advertiser.status`; Lead continua Lead.

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
