# Agentes de IA do Sistema de Propostas

Este diretorio define agentes especializados para apoiar o desenvolvimento do Sistema de Propostas.

Use estes agentes como papeis de trabalho em um time de software. Cada agente deve seguir a documentacao principal do projeto em `docs/README.md` e respeitar a stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces.

## Como Usar

1. Escolha o agente pela natureza da tarefa.
2. Leia o arquivo do agente antes de executar a tarefa.
3. Leia os documentos recomendados pelo agente.
4. Execute a tarefa respeitando os checklists do agente.
5. Atualize a documentacao quando houver mudanca de comportamento, regra ou operacao.

## Indice de Agentes

| Agente | Arquivo | Quando usar |
|---|---|---|
| Product Manager | [agent-product-manager.md](./agent-product-manager.md) | Refinar requisitos, transformar pedido em escopo, preservar regras de negocio e priorizar entregas. |
| Software Architect | [agent-software-architect.md](./agent-software-architect.md) | Decidir arquitetura, boundaries, organizacao de pastas, impacto transversal e evolucao tecnica. |
| Frontend Engineer | [agent-frontend-engineer.md](./agent-frontend-engineer.md) | Implementar telas, componentes React, rotas, estados, formularios, UX operacional e integracao com API. |
| Backend API Engineer | [agent-backend-api-engineer.md](./agent-backend-api-engineer.md) | Criar ou alterar endpoints Express, validacoes Zod, regras de permissao e contratos de API. |
| Database Engineer | [agent-database-engineer.md](./agent-database-engineer.md) | Alterar Prisma schema, relacoes, seeds, integridade de dados e evolucao do PostgreSQL. |
| QA Engineer | [agent-qa-engineer.md](./agent-qa-engineer.md) | Planejar validacao, testar fluxos ADMIN/COMERCIAL, montar cenarios de regressao e checklist de aceite. |
| DevOps Engineer | [agent-devops-engineer.md](./agent-devops-engineer.md) | Ajustar Docker, portas, ambientes, comandos de execucao, build e operacao local/VPS. |
| Security Engineer | [agent-security-engineer.md](./agent-security-engineer.md) | Revisar autenticacao, autorizacao, redacao de campos, tokens, dados sensiveis e acesso indevido. |
| Technical Writer | [agent-technical-writer.md](./agent-technical-writer.md) | Criar ou atualizar documentacao tecnica, guias, READMEs, fluxos e regras por perfil. |
| UX/UI Designer | [agent-ux-ui-designer.md](./agent-ux-ui-designer.md) | Revisar experiencia, hierarquia visual, consistencia shadcn/ui, dialogs, toasts e usabilidade operacional. |

## Documentos Base

Todos os agentes devem conhecer:

- `docs/README.md`
- `docs/01-visao-geral.md`
- `docs/02-stack-e-tipo.md`
- `docs/03-arquitetura-e-pastas.md`
- `docs/08-regras-de-negocio.md`
- `docs/10-qualidade-validacao-contribuicao.md`

Documentos especificos por agente estao listados dentro de cada arquivo.

