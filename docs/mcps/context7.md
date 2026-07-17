# Context7 MCP

## Objetivo

Context7 traz documentacao atualizada e exemplos de codigo para o agente, reduzindo risco de usar API antiga ou comportamento desatualizado de bibliotecas.

## Configuracao Atual

Registrado no Codex como:

```toml
[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
```

## Como Usar

Ao pedir implementacoes que dependem de documentacao atualizada, inclua explicitamente algo como:

```text
use context7 para consultar a documentacao atual do React Toastify
```

Ou informe a biblioteca diretamente:

```text
use context7 com react-toastify para revisar o uso de toast.success, toast.warning e ToastContainer
```

## API Key

A configuracao atual funciona sem registrar chave no repositorio. O Context7 recomenda API key para limites maiores e acesso autenticado.

Se for necessario configurar uma API key depois, use o fluxo oficial:

```bash
npx ctx7 setup --codex
```

ou ajuste `~/.codex/config.toml` com a chave fora do repositorio.

## Fontes

- https://context7.com/docs/overview
- https://context7.com/docs/clients/codex
- https://github.com/upstash/context7

