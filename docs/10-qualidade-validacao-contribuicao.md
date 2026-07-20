# Qualidade, Validacao e Contribuicao

## Antes de Entregar uma Mudanca

Rode:

```bash
pnpm run typecheck
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
```

Quando a mudanca precisar estar disponivel no Docker:

```bash
docker compose up -d --build
```

## Mudancas no Banco

Depois de alterar `lib/db/prisma/schema.prisma`:

```bash
pnpm db:generate
pnpm db:push
pnpm seed
```

## Padroes de Codigo

- Preferir TypeScript estrito e tipos claros.
- Evitar duplicacao de regra de negocio entre frontend e backend.
- Regras de permissao devem ser aplicadas no backend.
- Frontend pode esconder elementos, mas nao deve ser a unica barreira de seguranca.
- Reaproveitar componentes existentes antes de criar novos.
- Manter alteracoes pequenas e focadas.

## Padroes de UI

- Usar shadcn/ui/Radix para dialogs, selects, inputs e alertas.
- Usar AlertDialog para confirmacoes criticas.
- Usar React Toastify, exclusivamente pelo wrapper `src/lib/feedback.ts`, para feedback de sucesso/erro sem decisao.
- Usar icones Lucide em botoes quando houver icone correspondente.
- Manter textos claros e operacionais.
- Evitar instrucoes longas dentro da interface.

## Padroes de API

- Validar entrada com Zod.
- Responder erros de forma consistente.
- Nao vazar campos redigidos por regra de negocio.
- Garantir `403` em tentativas de acesso indevido.
- Preferir `null` para campos opcionais ausentes.

## Padroes de Documentacao

- Atualizar `docs/README.md` quando criar novo documento.
- Atualizar `paginas-por-perfil.md` quando mudar uma tela ou permissao.
- Atualizar `rodar-local.md` quando mudar comandos, portas ou credenciais.
- Documentar regras novas em `08-regras-de-negocio.md`.

## Checklist Rapido

- A mudanca respeita ADMIN vs COMERCIAL?
- A API protege a regra, nao apenas a UI?
- O typecheck passou?
- O build do frontend passou?
- O Docker foi reconstruido quando necessario?
- A documentacao relevante foi atualizada?
- `pnpm run test:security` passou no banco isolado `_test`?
- Nenhum `.env`, certificado ou chave privada esta rastreado pelo Git?

## Checklist Responsivo

Validar pelo menos em `320x568`, `390x844`, `768x1024` e `1440x900`:

- menu mobile abre, navega, destaca a rota atual e fecha depois da navegacao;
- nenhum documento apresenta rolagem horizontal acidental;
- filtros mobile abrem, aplicam e limpam sem duplicar requisicoes;
- tabelas administrativas viram cards legiveis no celular;
- dialogs e AlertDialogs cabem no viewport e possuem scroll interno;
- botoes, selects e acoes possuem alvo de toque de pelo menos `44px`;
- teclado virtual nao esconde o envio de login, filtros ou formularios;
- editor alterna entre Editar e Preview, mantendo autosave;
- timeline rola por toque e centraliza a etapa atual;
- PDF A4, `Ctrl+P`/`Cmd+P`, investimento e contato permanecem inalterados;
- ADMIN e COMERCIAL recebem somente rotas e acoes autorizadas;
- orientacao retrato e paisagem nao causam sobreposicao.
