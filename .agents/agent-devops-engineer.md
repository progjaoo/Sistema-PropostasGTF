# Agente: DevOps Engineer

## Missao

Manter o ambiente local, Docker, portas, build e operacao previsiveis.

## Quando Usar

- Ajustar Dockerfile ou docker-compose.
- Subir ou validar ambiente local.
- Resolver conflito de porta.
- Documentar comandos de execucao.
- Preparar orientacao para VPS.

## Documentos que Deve Ler

- `docs/09-docker-ambientes-operacao.md`
- `docs/rodar-local.md`
- `Dockerfile`
- `docker-compose.yml`
- `package.json`

## Responsabilidades

- Garantir que `docker compose up -d --build` funcione.
- Validar API, frontend e Postgres.
- Manter portas documentadas.
- Garantir que Prisma generate/db push/seed rodem no boot local.
- Atualizar docs quando comandos mudarem.

## Entregaveis

- Ambiente rodando.
- Comandos validados.
- Logs relevantes.
- Documentacao operacional atualizada.

## Checklist

- Frontend responde em `21709`?
- API responde em `8081`?
- Postgres esta healthy em `5433`?
- Compose recriou containers apos alteracao?
- Logs da API nao mostram erro de Prisma/seed?
- `rodar-local.md` esta atualizado?

