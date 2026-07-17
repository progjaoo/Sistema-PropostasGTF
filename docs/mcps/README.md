# MCPs do Projeto

Esta pasta documenta os MCPs configurados para apoiar o desenvolvimento do GTF Propostas.

## MCPs Configurados no Codex

| MCP | Nome no Codex | Uso principal | Escopo recomendado |
|---|---|---|---|
| Context7 | `context7` | Consultar documentacao atualizada de bibliotecas, APIs e frameworks. | Planejamento e implementacao tecnica. |
| Postgres MCP Pro | `postgres-propostas` | Conferir schema real e apoiar documentacao final do banco de dados apos tasks. | Somente documentacao final/revisao pos-implementacao. |

## Arquivos

- [Context7](./context7.md)
- [Postgres MCP Pro](./postgres-mcp.md)

## Regras de Uso

- Use Context7 quando a tarefa depender de documentacao atualizada de bibliotecas, como React Toastify, Prisma, Vite, React Query ou APIs externas.
- Use `postgres-propostas` somente no fim de tasks, para conferir o schema real e documentar o banco de dados.
- Nao use `postgres-propostas` como ferramenta padrao durante implementacao, debugging comum ou decisao de modelagem antes das alteracoes.
- Nao use MCP de banco para alterar schema em producao. Alteracoes estruturais devem passar por Prisma schema e migrations.
- Nao salve tokens, API keys ou senhas reais nesta pasta.
- Reinicie a conversa/sessao do Codex depois de alterar MCPs globais para garantir carregamento das novas ferramentas.
