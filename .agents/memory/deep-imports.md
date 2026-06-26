---
name: API client deep imports
description: Rule against using deep import paths into workspace lib packages
---

Never import from `@workspace/api-client-react/src/generated/api.schemas` or any other deep `src/` subpath.

**Why:** The `package.json` for `@workspace/api-client-react` only exports `.` (the root). Vite will throw a missing specifier error at runtime if a deep path is used, even though TypeScript may not catch it.

**How to apply:** Always import from the package root: `import type { GetMeResponse } from '@workspace/api-client-react'`. The main index re-exports everything from `./generated/api`, `./generated/api.schemas`, and `./custom-fetch` (including `setAuthTokenGetter`, `setBaseUrl`, all hooks and types).
