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
- Usar Sonner para feedback de sucesso/erro sem decisao.
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

