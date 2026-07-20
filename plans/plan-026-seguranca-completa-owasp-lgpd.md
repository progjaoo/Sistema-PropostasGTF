# Plano 026 - Seguranca Completa OWASP, LGPD e Testes

> **Para agentes executores:** SUB-SKILL OBRIGATORIA: usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar este plano tarefa por tarefa. Cada etapa usa checkbox (`- [ ]`) para permitir acompanhamento e revisao.

**Objetivo:** elevar o Sistema de Propostas GTF a uma baseline verificavel de seguranca para web, API, PostgreSQL, Docker/Vercel e aplicativo Expo, com foco em OWASP ASVS 5.0 nivel 2, OWASP Top 10:2025, OWASP API Security Top 10:2023, OWASP MASVS e obrigacoes tecnicas e administrativas da LGPD.

**Arquitetura:** aplicar defesa em profundidade sem reescrever o sistema. A API Express permanece como fonte de verdade para autenticacao, autorizacao, validacao e redacao de dados; o frontend web usa access token apenas em memoria e refresh token opaco em cookie seguro; o mobile usa tokens em armazenamento seguro nativo. Cada fase deve ser entregue e validada separadamente, com rollback documentado e sem testes destrutivos contra producao.

**Stack:** TypeScript, React, Vite, Express 5, Prisma 6, PostgreSQL 16, Docker, Vercel, Railway PostgreSQL, PNPM Workspaces, Vitest, Supertest, Playwright, OWASP ZAP, GitHub Actions.

**Status:** Planejado em 20/07/2026.

## Restricoes Globais

- Nao executar DAST, brute force, fuzzing ou scanners ativos contra producao sem autorizacao formal e janela definida.
- Nao alterar regras funcionais de ADMIN, COMERCIAL, acesso por Empresa, propriedade de Proposta, Leads ou Clientes.
- Toda regra de acesso deve ser garantida pela API; ocultacao no frontend e apenas UX.
- Nenhum secret, token, senha, hash, connection string ou dado pessoal deve aparecer em Git, logs, erros ou fixtures.
- Usar migrations Prisma versionadas em producao; nao usar `prisma db push` como mecanismo de deploy.
- Tratar conformidade LGPD como trabalho tecnico + organizacional. A conclusao tecnica deste plano nao substitui validacao juridica do controlador, bases legais, contratos e avisos de privacidade.
- A baseline alvo do sistema web/API e OWASP ASVS 5.0 nivel 2.
- A baseline alvo do aplicativo Expo e OWASP MASVS para STORAGE, AUTH, NETWORK, PLATFORM e PRIVACY.
- Usar o PostgreSQL MCP apenas na documentacao final do banco, conforme decisao anterior do projeto; migrations e testes continuam sendo feitos por Prisma e ambiente de teste.

---

## 1. Agentes Selecionados

### Agente principal

**Security Engineer** - `.agents/agent-security-engineer.md`

Responsavel por coordenar threat model, sessao, autenticacao, autorizacao, protecao de dados, testes negativos e criterios de bloqueio de release.

### Agentes de apoio

| Agente | Responsabilidade neste plano |
|---|---|
| Software Architect | Definir boundaries entre sessao, policies, auditoria e rotas sem acoplamento indevido. |
| Backend API Engineer | Implementar middleware, validacao, sessao, rate limit, erros e policies. |
| Database Engineer | Criar migrations de tokens, auditoria, rate limit e retencao com integridade referencial. |
| Frontend Engineer | Remover token do Web Storage, bootstrap seguro, CSP e tratamento uniforme de expiracao. |
| DevOps Engineer | Secrets, Vercel, Docker, PostgreSQL, CI, SCA, SAST e backups. |
| QA Engineer | Matriz de autorizacao, testes de regressao, DAST autorizado e evidencias ASVS. |
| Technical Writer | Atualizar security baseline, LGPD, resposta a incidentes e checklist de release. |

## 2. Avaliacao do Documento `docs/seguranca-back-front.md`

### 2.1 Pontos corretos e aproveitaveis

- Identifica corretamente o risco de guardar credenciais em `sessionStorage`/`localStorage`.
- Recomenda refresh token em cookie `HttpOnly`, rotacao e invalidacao no logout.
- Exige validacao backend com Zod e autorizacao por objeto para evitar BOLA.
- Recomenda bcrypt com custo adequado ou Argon2id, tokens de reset aleatorios e hash do token no banco.
- Define CORS restritivo, limite de payload, logs sem credenciais e containers sem root.
- Reconhece minimizacao, retencao e resposta a incidentes como requisitos LGPD.

### 2.2 Correcoes obrigatorias no documento

1. **Token em memoria nao e inacessivel a XSS.** Um script executado no mesmo contexto pode realizar chamadas autenticadas e acessar estados expostos. Memoria reduz persistencia e exfiltracao direta, mas CSP, ausencia de sinks perigosos e output encoding continuam obrigatorios.
2. **`SameSite=Strict` nao deve ser descrito como solucao percentual de CSRF.** O sistema deve combinar cookie seguro, allowlist de origem, verificacao `Origin`/`Referer` nas rotas baseadas em cookie e cabecalho customizado quando aplicavel.
3. **CSP deve proteger o HTML servido pelo frontend.** Helmet na API JSON nao substitui headers configurados em `vercel.json` para `index.html` e assets.
4. **O exemplo `nonce-{RANDOM_NONCE}` nao funciona como nonce dinamico.** Como o frontend e estatico no Vercel, a primeira fase deve usar CSP em `Report-Only`, inventariar recursos e eliminar dependencias inline antes de enforcement.
5. **Nao escapar HTML antes de persistir todo texto.** Persistir texto normalizado e validar tamanho/formato; React faz output encoding por padrao. Sanitizar HTML apenas quando o produto aceitar HTML intencionalmente.
6. **Rate limit em `Map` nao funciona de forma consistente no Vercel serverless.** O contador deve ser compartilhado e duravel.
7. **Refresh tokens nao devem ser persistidos em claro.** Armazenar somente SHA-256/HMAC do token opaco e comparar por hash.
8. **Argon2 nao deve ser adotado sem benchmark no runtime Vercel.** O bcrypt atual com custo 12 e aceitavel; migracao progressiva para Argon2id depende de compatibilidade e teste de latencia/memoria.
9. **Atualizar referencias.** Trocar OWASP Top 10:2021 por OWASP Top 10:2025 e adicionar ASVS 5.0, API Security 2023 e MASVS.
10. **A classificacao LGPD deve ser precisa.** Senha e credencial critica, mas nao e automaticamente “dado pessoal sensivel” no sentido do art. 5 da LGPD. CNPJ pode identificar pessoa natural em alguns contextos, mas nem todo CNPJ e dado pessoal.
11. **Refresh web e refresh mobile possuem modelos diferentes.** Web usa cookie; mobile usa token opaco no SecureStore. O documento deve apresentar os dois fluxos.
12. **Adicionar governanca de incidentes.** A Resolucao CD/ANPD 15/2024 exige avaliacao, comunicacao quando houver risco ou dano relevante e manutencao do registro de incidentes por pelo menos cinco anos.

## 3. Diagnostico do Codigo Atual

| Severidade | Evidencia | Risco | Acao do plano |
|---|---|---|---|
| Critica | `.env` esta rastreado pelo Git e contem chave de provedor de e-mail | Comprometimento de conta e envio indevido | Contencao e rotacao imediata na Tarefa 1 |
| Critica | `app.ts` usa `cors({ origin: true, credentials: true })` | Qualquer origem refletida pode consumir respostas com credenciais do navegador | Allowlist explicita na Tarefa 5 |
| Alta | `jwt.ts` possui secrets fallback de desenvolvimento | Deploy sem env pode assinar tokens com segredo conhecido | Config fail-fast na Tarefa 1 |
| Alta | `store/auth.ts` persiste access token em `sessionStorage` | Exfiltracao de token por XSS/extensao/acesso local | Sessao web em memoria na Tarefa 3 |
| Alta | `refresh_tokens.token` guarda o token completo | Roubo do banco permite uso direto das sessoes | Token opaco com hash na Tarefa 3 |
| Alta | Rate limit de reset usa `Map` local | Instancias serverless nao compartilham contadores | Rate limit duravel na Tarefa 4 |
| Alta | Nao existe rate limit no login e cadastro publico | Credential stuffing e abuso de cadastro | Tarefa 4 |
| Alta | `requireAuth` confia em `role` do JWT e nao consulta conta ativa | Desativacao/rebaixamento demora ate expirar o access token | Principal atual no banco na Tarefa 3 |
| Alta | Nao ha testes automatizados de autorizacao | Regressao BOLA/BFLA pode chegar a producao | Harness e matriz na Tarefa 2 |
| Media | API sem Helmet, CSP, `no-store` e error handler central | Misconfiguration, cache de respostas e vazamento de stack | Tarefas 5 e 7 |
| Media | `express.json` aceita 10 MB globalmente | Consumo excessivo e abuso de Base64 | Limites por rota na Tarefa 6 |
| Media | Docker executa como root e imagem inclui workspace completo | Maior impacto em caso de comprometimento | Hardening na Tarefa 9 |
| Media | Nao ha SAST, secret scan, SCA ou DAST no CI | Vulnerabilidades e segredos nao bloqueiam release | Tarefas 9 e 10 |
| Media | Nao ha trilha de auditoria de operacoes administrativas | Baixa rastreabilidade e resposta a incidente limitada | Tarefa 7 |
| Media | OpenAPI nao explicita todos os erros e controles | Contrato e testes de seguranca podem divergir | Tarefas 2 e 6 |

### Controles ja existentes que devem ser preservados

- bcrypt com custo 12.
- Access token de 15 minutos e refresh token de 7 dias.
- Rotacao de refresh token web e mobile.
- Refresh token web em cookie `HttpOnly`.
- Reset de senha com token aleatorio, hash SHA-256, expiracao e uso unico.
- Revogacao de refresh tokens apos reset de senha e alteracoes administrativas.
- Validacao Zod em diversas rotas.
- Policies existentes em `services/station-access.ts` e verificacoes de propriedade nas propostas.
- Redacao de titulo e investimento de proposta para COMERCIAL nao proprietario.
- Tokens mobile gravados com `expo-secure-store` no runtime nativo.

## 4. Arquivos Previstos

### Criar

```text
artifacts/api-server/src/config/security.ts
artifacts/api-server/src/middlewares/error-handler.ts
artifacts/api-server/src/middlewares/request-security.ts
artifacts/api-server/src/policies/authorization.ts
artifacts/api-server/src/services/security/audit-service.ts
artifacts/api-server/src/services/security/rate-limit-service.ts
artifacts/api-server/src/services/security/session-service.ts
artifacts/api-server/src/test/factories.ts
artifacts/api-server/src/test/test-app.ts
artifacts/api-server/src/test/security/auth.security.test.ts
artifacts/api-server/src/test/security/authorization.security.test.ts
artifacts/api-server/src/test/security/headers-cors.security.test.ts
artifacts/api-server/src/test/security/validation.security.test.ts
artifacts/api-server/vitest.config.ts
scripts/security/zap-baseline.conf
.github/workflows/ci-security.yml
.github/dependabot.yml
.gitleaks.toml
.env.example
docs/inventario-dados-lgpd.md
docs/resposta-incidentes-seguranca.md
docs/checklist-seguranca-release.md
```

### Modificar

```text
.gitignore
package.json
pnpm-lock.yaml
docker-compose.yml
Dockerfile
vercel.json
lib/db/prisma/schema.prisma
lib/api-spec/openapi.yaml
artifacts/api-server/package.json
artifacts/api-server/src/app.ts
artifacts/api-server/src/lib/jwt.ts
artifacts/api-server/src/middlewares/auth.ts
artifacts/api-server/src/routes/auth.ts
artifacts/api-server/src/routes/*.ts
artifacts/proposta/src/store/auth.ts
artifacts/proposta/src/lib/auth-fetch.ts
artifacts/proposta/src/App.tsx
docs/README.md
docs/05-backend-api-guidelines.md
docs/07-autenticacao-perfis-permissoes.md
docs/09-docker-ambientes-operacao.md
docs/10-qualidade-validacao-contribuicao.md
docs/seguranca-back-front.md
```

### Repositorio mobile relacionado

```text
../Sistema-PropostasGTF_App/artifacts/mobile/src/store/authStore.ts
../Sistema-PropostasGTF_App/artifacts/mobile/src/api/client.ts
../Sistema-PropostasGTF_App/artifacts/mobile/src/utils/secureStorage.native.ts
../Sistema-PropostasGTF_App/docs-mobile/
```

## 5. Ordem de Execucao e Gates

```text
Contencao de secrets
  -> testes de seguranca
  -> sessao e autenticacao
  -> abuso/rate limit
  -> autorizacao
  -> CORS/headers/CSRF
  -> validacao e erros
  -> auditoria/LGPD
  -> infraestrutura/supply chain
  -> mobile
  -> DAST e homologacao
  -> rollout de producao
```

Nenhuma fase pode seguir para producao se os testes da propria fase falharem. Mudancas de schema devem ser aplicadas primeiro em banco de homologacao e validadas com backup restauravel.

---

### Tarefa 1: Contencao imediata de secrets e configuracao fail-fast

**Arquivos:**

- Modificar: `.gitignore`
- Criar: `.env.example`
- Modificar: `artifacts/api-server/src/config/security.ts`
- Modificar: `artifacts/api-server/src/lib/jwt.ts`
- Modificar: `docker-compose.yml`
- Documentar: `docs/09-docker-ambientes-operacao.md`

**Interfaces:**

- Produz: `securityConfig` validado no boot.
- Consome: variaveis `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `APP_PUBLIC_URL`, `RESEND_API_KEY`.

- [ ] **Passo 1: revogar e rotacionar credenciais expostas**

Rotacionar no provedor, nesta ordem:

1. chave Resend;
2. senha/URL publica do PostgreSQL Railway;
3. `JWT_SECRET` e `JWT_REFRESH_SECRET`;
4. qualquer token presente no historico Git, documentacao, terminal compartilhado ou conversa.

Resultado esperado: sessoes anteriores ficam invalidas e nenhuma credencial antiga autentica.

- [ ] **Passo 2: impedir novo versionamento de arquivos locais**

Adicionar ao `.gitignore`:

```gitignore
.env
.env.*
!.env.example
*.pem
*.key
*.p12
```

Executar:

```bash
git rm --cached .env
git status --short
```

Esperado: `.env` aparece removido apenas do indice; o arquivo local continua no disco.

- [ ] **Passo 3: criar `.env.example` sem valores reais**

```env
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public
JWT_SECRET=replace-with-at-least-64-random-characters
JWT_REFRESH_SECRET=replace-with-a-different-64-character-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ALLOWED_ORIGINS=http://localhost:21709
APP_PUBLIC_URL=http://localhost:21709
EMAIL_PROVIDER=mock
RESEND_API_KEY=
RESEND_FROM_EMAIL=GTF Propostas <nao-responda@example.com>
PASSWORD_RESET_TTL_MINUTES=30
TRUST_PROXY=1
```

- [ ] **Passo 4: validar configuracao no boot**

Criar `securityConfig` com Zod. Em `production`, secrets menores que 64 caracteres, valores default conhecidos ou ausencia de `DATABASE_URL` devem encerrar o processo antes de montar rotas.

Contrato:

```typescript
export interface SecurityConfig {
  isProduction: boolean;
  accessTokenSecret: string;
  refreshTokenSecret: string;
  accessTokenTtl: string;
  refreshTokenTtl: string;
  allowedOrigins: string[];
  trustProxy: number | boolean;
}

export const securityConfig: SecurityConfig;
```

- [ ] **Passo 5: remover fallback de JWT**

`artifacts/api-server/src/lib/jwt.ts` deve importar `securityConfig` e nunca usar `dev_jwt_secret_change_me`.

- [ ] **Passo 6: verificar ausencia de secrets**

Executar:

```bash
git ls-files | rg '(^|/)\.env($|\.)|\.pem$|\.key$|\.p12$'
rg -l --hidden --glob '!node_modules/**' --glob '!.git/**' 're_[A-Za-z0-9_-]{20,}|postgresql://[^[:space:]]+:[^[:space:]]+@'
```

Esperado: nenhum secret real rastreado. `.env.example` pode conter apenas placeholders.

- [ ] **Passo 7: decidir limpeza do historico**

Se um secret real entrou em commit, a rotacao e obrigatoria mesmo que o historico seja reescrito. Reescrita com `git filter-repo` exige backup, coordenacao com todos os clones e aprovacao explicita do responsavel pelo repositorio.

**Gate:** nenhum deploy ocorre antes da rotacao e do fail-fast.

---

### Tarefa 2: Harness de testes e matriz de autorizacao

**Arquivos:**

- Modificar: `artifacts/api-server/package.json`
- Criar: `artifacts/api-server/vitest.config.ts`
- Criar: `artifacts/api-server/src/test/test-app.ts`
- Criar: `artifacts/api-server/src/test/factories.ts`
- Criar: `artifacts/api-server/src/test/security/*.security.test.ts`
- Modificar: `docker-compose.yml`

**Interfaces:**

- Produz: `createTestApp()`, factories ADMIN/COMERCIAL/Empresa/Proposta e banco isolado.
- Consome: app Express, Prisma e schema de producao.

- [ ] **Passo 1: instalar ferramentas**

```bash
pnpm --filter @workspace/api-server add -D vitest supertest @types/supertest
```

- [ ] **Passo 2: adicionar scripts**

```json
{
  "scripts": {
    "test": "vitest run",
    "test:security": "vitest run src/test/security",
    "test:security:watch": "vitest src/test/security"
  }
}
```

- [ ] **Passo 3: criar PostgreSQL de teste isolado**

Adicionar service `postgres-test` sem reutilizar o volume local:

```yaml
postgres-test:
  image: postgres:16-alpine
  environment:
    POSTGRES_DB: propostas_test
    POSTGRES_USER: propostas_test
    POSTGRES_PASSWORD: propostas_test
  ports:
    - "5434:5432"
  tmpfs:
    - /var/lib/postgresql/data
```

O teste deve recusar `DATABASE_URL` cujo nome do banco nao termine em `_test`.

- [ ] **Passo 4: escrever primeiro teste negativo**

```typescript
it("retorna 401 sem bearer token", async () => {
  const response = await request(app).get("/api/proposals");
  expect(response.status).toBe(401);
});
```

Executar:

```bash
pnpm --filter @workspace/api-server run test:security
```

Esperado: teste passa sem acessar dados reais.

- [ ] **Passo 5: criar matriz de acesso**

Cobrir no minimo:

| Ator | Recurso | Acao | Esperado |
|---|---|---|---|
| anonimo | qualquer rota privada | GET/POST | 401 |
| COMERCIAL A | proposta propria/Empresa permitida | ler/editar/status/timeline | 200 |
| COMERCIAL A | proposta de B | detalhe/editar/deletar/versoes | 403 ou 404 consistente |
| COMERCIAL A | Empresa sem acesso | catalogo/criar proposta | 403 |
| COMERCIAL com `canViewCatalog=false` | produtos/programas | listar/detalhar | 403 |
| COMERCIAL com `canCreateProposals=false` | proposta | criar/editar/duplicar/status | 403 |
| COMERCIAL | usuarios/empresas/configuracao | mutacao | 403 |
| ADMIN | recursos administrativos | CRUD valido | 2xx |
| usuario inativo | access token ainda valido | qualquer rota privada | 401 |

- [ ] **Passo 6: testar redacao por propriedade**

Para proposta de outro vendedor na tela de Cliente, afirmar:

```typescript
expect(linkedProposal.viewerCanEdit).toBe(false);
expect(linkedProposal.title).toBeNull();
expect(linkedProposal.investValue).toBeNull();
expect(linkedProposal.createdBy.name).toBeTruthy();
```

- [ ] **Passo 7: adicionar comando raiz**

```json
{
  "scripts": {
    "test:security": "pnpm --filter @workspace/api-server run test:security"
  }
}
```

**Gate:** a matriz deve passar antes de refatorar middleware ou policies.

---

### Tarefa 3: Sessao web/mobile e autenticacao robusta

**Arquivos:**

- Modificar: `lib/db/prisma/schema.prisma`
- Criar: migration Prisma de sessao segura
- Criar: `artifacts/api-server/src/services/security/session-service.ts`
- Modificar: `artifacts/api-server/src/routes/auth.ts`
- Modificar: `artifacts/api-server/src/lib/jwt.ts`
- Modificar: `artifacts/api-server/src/middlewares/auth.ts`
- Modificar: `artifacts/proposta/src/store/auth.ts`
- Modificar: `artifacts/proposta/src/lib/auth-fetch.ts`
- Modificar: `artifacts/proposta/src/App.tsx`
- Testar: `auth.security.test.ts`

**Interfaces:**

- Produz: `createSession`, `rotateSession`, `revokeSession`, `revokeAllUserSessions`, `getCurrentPrincipal`.
- Access token: JWT curto com `iss`, `aud`, `sub`, `jti`, `exp`, algoritmo fixo.
- Refresh token: valor opaco aleatorio; somente hash persistido.

- [ ] **Passo 1: escrever testes de sessao**

Cobrir:

- login web nao retorna refresh token no JSON;
- cookie web possui `HttpOnly`, `Secure` em producao, `SameSite=Strict`, `Path=/`;
- refresh rotaciona token e invalida o anterior;
- replay do refresh anterior revoga a familia;
- reset de senha e desativacao revogam todas as sessoes;
- papel alterado passa a valer imediatamente;
- bootstrap web recupera sessao sem `sessionStorage`;
- mobile continua recebendo refresh token apenas no endpoint `/mobile/login`.

- [ ] **Passo 2: migrar refresh token para hash**

Modelo alvo:

```prisma
model RefreshToken {
  id           String    @id @default(cuid())
  tokenHash    String    @unique @map("token_hash")
  familyId     String    @map("family_id")
  userId       String    @map("user_id")
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt    DateTime  @map("expires_at") @db.Timestamptz(6)
  lastUsedAt   DateTime? @map("last_used_at") @db.Timestamptz(6)
  revokedAt    DateTime? @map("revoked_at") @db.Timestamptz(6)
  createdAt    DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([userId, revokedAt])
  @@index([familyId])
  @@map("refresh_tokens")
}
```

Gerar token com `crypto.randomBytes(32).toString("base64url")` e persistir `sha256(token)`.

- [ ] **Passo 3: fixar claims JWT**

Assinar e verificar:

```typescript
jwt.sign(
  { role },
  secret,
  {
    algorithm: "HS256",
    subject: userId,
    issuer: "gtf-propostas",
    audience: "gtf-propostas-api",
    jwtid: crypto.randomUUID(),
    expiresIn: "15m",
  },
);
```

`jwt.verify` deve declarar `algorithms`, `issuer` e `audience`.

- [ ] **Passo 4: revalidar principal no banco**

`requireAuth` deve buscar `id`, `role` e `active` pelo `sub`. O papel usado na autorizacao vem do banco, nao do payload enviado pelo cliente. Usuario inativo recebe 401.

Contrato:

```typescript
export interface AuthPrincipal {
  userId: string;
  role: "ADMIN" | "COMERCIAL";
}
```

- [ ] **Passo 5: remover persistencia web**

`store/auth.ts` deve usar Zustand sem `persist` e sem `sessionStorage`:

```typescript
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  bootstrapped: false,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  markBootstrapped: () => set({ bootstrapped: true }),
}));
```

- [ ] **Passo 6: bootstrap web por refresh**

Na inicializacao, chamar uma unica vez `POST /api/auth/refresh` com `credentials: "include"`. Enquanto isso, mostrar estado neutro de carregamento; nao redirecionar para login antes do bootstrap terminar.

- [ ] **Passo 7: impedir refresh storm**

Manter promise unica para requisicoes 401 concorrentes. Cada request pode repetir no maximo uma vez. Falha limpa memoria e leva ao login.

- [ ] **Passo 8: padronizar cookie**

Nome de producao recomendado: `__Host-gtf_refresh`. Atributos:

```typescript
{
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
}
```

Em desenvolvimento HTTP, usar nome sem prefixo `__Host-` e `secure: false`.

**Gate:** testes de rotacao, replay, revogacao, bootstrap e usuario inativo passam.

---

### Tarefa 4: Rate limiting duravel e protecao contra abuso

**Arquivos:**

- Modificar: `lib/db/prisma/schema.prisma`
- Criar: migration Prisma de rate limit
- Criar: `artifacts/api-server/src/services/security/rate-limit-service.ts`
- Modificar: `artifacts/api-server/src/routes/auth.ts`
- Testar: `auth.security.test.ts`

**Interfaces:**

- Produz: `consumeSecurityLimit(scope, key, policy)`.
- Chaves de e-mail/IP devem ser HMAC com secret dedicado, nunca e-mail puro.

- [ ] **Passo 1: escrever testes que simulam instancias diferentes**

O sexto login invalido para a mesma conta dentro da janela deve retornar 429 mesmo recriando o app Express entre as tentativas.

- [ ] **Passo 2: criar contador compartilhado**

Modelo alvo:

```prisma
model SecurityRateLimit {
  id          String   @id @default(cuid())
  scope       String
  keyHash     String   @map("key_hash")
  windowStart DateTime @map("window_start") @db.Timestamptz(6)
  count       Int      @default(0)
  expiresAt   DateTime @map("expires_at") @db.Timestamptz(6)

  @@unique([scope, keyHash, windowStart])
  @@index([expiresAt])
  @@map("security_rate_limits")
}
```

Atualizar contador em transacao/`upsert`.

- [ ] **Passo 3: politicas iniciais**

| Fluxo | Chave | Limite |
|---|---|---|
| login falho | IP + conta normalizada | 5/15 min |
| cadastro comercial | IP | 3/h |
| esqueci senha | IP + conta | 5/h |
| reset senha | IP + tokenHash | 10/15 min |
| refresh invalido | IP + familia | 20/15 min |
| API global | IP autenticado/anonimo | 300/15 min como baseline mensuravel |

Login bem-sucedido nao deve contar como falha. Resposta de conta inexistente e senha invalida deve ser semanticamente igual e usar comparacao de hash dummy para reduzir enumeracao por tempo.

- [ ] **Passo 4: proteger cadastro publico**

Manter `active=false`, aplicar rate limit e adicionar feature flag:

```env
PUBLIC_COMMERCIAL_REGISTRATION_ENABLED=true
```

Quando `false`, responder 404. Se abuso persistir, uma tarefa futura pode integrar CAPTCHA; nao adicionar fornecedor externo sem decisao de produto.

- [ ] **Passo 5: limpeza**

Executar job diario idempotente para remover contadores expirados. No Vercel, usar Cron protegido por secret ou rotina administrativa autenticada; nao depender apenas do startup da funcao.

**Gate:** limites sobrevivem a nova instancia e nao bloqueiam login valido indevidamente.

---

### Tarefa 5: CORS, CSRF, headers e seguranca do navegador

**Arquivos:**

- Criar: `artifacts/api-server/src/middlewares/request-security.ts`
- Modificar: `artifacts/api-server/src/app.ts`
- Modificar: `artifacts/api-server/package.json`
- Modificar: `vercel.json`
- Testar: `headers-cors.security.test.ts`

**Interfaces:**

- Consome: `securityConfig.allowedOrigins`.
- Produz: CORS allowlist, verificacao de origem em endpoints de cookie e headers web/API.

- [ ] **Passo 1: instalar Helmet**

```bash
pnpm --filter @workspace/api-server add helmet
```

- [ ] **Passo 2: escrever testes CORS**

```typescript
it("nao reflete origem desconhecida", async () => {
  const response = await request(app)
    .get("/api/healthz")
    .set("Origin", "https://evil.example");
  expect(response.headers["access-control-allow-origin"]).toBeUndefined();
});
```

Testar origem web oficial, localhost autorizado e request mobile sem `Origin`.

- [ ] **Passo 3: allowlist explicita**

`CORS_ALLOWED_ORIGINS` aceita lista separada por virgula. Callback CORS:

- permite origem presente na lista;
- permite ausencia de `Origin` para app mobile e ferramentas servidor-servidor;
- rejeita origem desconhecida;
- permite apenas `GET, POST, PUT, PATCH, DELETE, OPTIONS`;
- permite `Content-Type`, `Authorization`, `X-CSRF-Token`, `X-Client-Platform`;
- expõe apenas headers necessarios.

- [ ] **Passo 4: proteger endpoints baseados em cookie**

Para `/auth/refresh` e `/auth/logout`, validar `Origin` contra allowlist quando presente. Em navegadores, exigir `Origin` ou `Referer` same-origin em requisicoes mutantes. Endpoints mobile usam bearer/refresh no body e nao dependem de cookie.

- [ ] **Passo 5: headers da API**

Aplicar:

```text
Cache-Control: no-store
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
X-Frame-Options: DENY
```

Desativar `x-powered-by`.

- [ ] **Passo 6: headers do frontend no Vercel**

Adicionar em `vercel.json`:

- HSTS para producao;
- `frame-ancestors 'none'`;
- `nosniff`;
- `strict-origin-when-cross-origin`;
- Permissions Policy;
- CSP inicialmente em `Content-Security-Policy-Report-Only`.

Inventariar scripts, fonts, imagens Base64/blob, conexoes API e estilos. Promover CSP para enforcement somente depois de homologacao sem violacoes legitimas.

- [ ] **Passo 7: evitar cache de dados autenticados**

Rotas `/api/*` autenticadas e respostas de auth devem enviar `Cache-Control: no-store, private`.

**Gate:** origem desconhecida nao recebe CORS; frontend oficial e mobile continuam funcionando.

---

### Tarefa 6: Validacao completa, mass assignment e erros seguros

**Arquivos:**

- Criar: `artifacts/api-server/src/middlewares/error-handler.ts`
- Modificar: `artifacts/api-server/src/routes/*.ts`
- Modificar: `lib/api-spec/openapi.yaml`
- Testar: `validation.security.test.ts`

**Interfaces:**

- Produz: respostas de erro `{ error: { code, message, requestId, fields? } }`.
- Consome: schemas Zod strict para body, params e query.

- [ ] **Passo 1: inventariar todas as rotas**

Montar tabela no plano de teste com metodo, path, autenticacao, role, ownership, schema de body/query/params, limite e resposta.

- [ ] **Passo 2: rejeitar propriedades desconhecidas**

Usar `.strict()` nos schemas de mutacao para impedir mass assignment de `role`, `active`, `createdById`, `stationId`, `status` ou `viewerCanEdit` fora das rotas que controlam esses campos.

- [ ] **Passo 3: validar params e query**

IDs devem ter tamanho/formato compativel com CUID. Paginacao:

```typescript
const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
```

- [ ] **Passo 4: limites por tipo de campo**

- nome: 2-120 caracteres;
- descricao: maximo 2.000;
- stats: maximo 4 itens;
- produtos por proposta: maximo 100;
- Base64: MIME allowlist PNG/JPEG/WebP e maximo 2 MB decodificados;
- arrays/tags: quantidade e tamanho individual limitados;
- valores monetarios: formato decimal normalizado no backend;
- content type mutante: aceitar `application/json`, rejeitar demais com 415.

- [ ] **Passo 5: reduzir limite global**

Usar `express.json({ limit: "1mb" })` como padrao e middleware especifico de ate 3 MB apenas nas rotas que recebem imagem Base64.

- [ ] **Passo 6: handler central**

Erros inesperados geram log com `requestId`, retornam 500 generico e nunca expoem stack, SQL, Prisma error code, path local ou resposta integral do Resend.

- [ ] **Passo 7: atualizar OpenAPI**

Documentar 400, 401, 403, 404, 409, 413, 415, 429 e 500, schemas de erro e todos os endpoints mobile/auth atuais.

**Gate:** fuzz de payload invalido nao causa 500 nem persiste campos nao permitidos.

---

### Tarefa 7: Autorizacao central, auditoria e eventos de seguranca

**Arquivos:**

- Criar: `artifacts/api-server/src/policies/authorization.ts`
- Criar: `artifacts/api-server/src/services/security/audit-service.ts`
- Modificar: `lib/db/prisma/schema.prisma`
- Criar: migration Prisma de auditoria
- Modificar: `artifacts/api-server/src/routes/*.ts`
- Testar: `authorization.security.test.ts`

**Interfaces:**

```typescript
export async function canAccessStation(principal: AuthPrincipal, stationId: string, capability: "viewCatalog" | "createProposal"): Promise<boolean>;
export async function canReadProposal(principal: AuthPrincipal, proposal: ProposalOwnership): Promise<boolean>;
export async function canMutateProposal(principal: AuthPrincipal, proposal: ProposalOwnership): Promise<boolean>;
export async function recordAuditEvent(input: AuditEventInput): Promise<void>;
```

- [ ] **Passo 1: escrever testes por policy**

Testar ADMIN, proprietario, nao proprietario, Empresa autorizada, Empresa bloqueada, usuario inativo e dado legado sem owner.

- [ ] **Passo 2: centralizar regras repetidas**

Rotas continuam responsaveis por HTTP; policies recebem principal e recurso e retornam decisao. Nao criar uma policy generica baseada apenas em strings.

- [ ] **Passo 3: revisar BOLA/BFLA endpoint por endpoint**

Prioridade:

1. propostas, versoes, timeline, duplicacao e status;
2. clientes/leads e propostas vinculadas;
3. usuarios e acessos por Empresa;
4. produtos/programas/apresentacoes;
5. avisos de recaptura;
6. dashboard e agregacoes.

- [ ] **Passo 4: criar trilha de auditoria**

Modelo minimo:

```prisma
model AuditEvent {
  id           String   @id @default(cuid())
  actorUserId  String?  @map("actor_user_id")
  action       String
  resourceType String   @map("resource_type")
  resourceId   String?  @map("resource_id")
  outcome      String
  requestId    String?  @map("request_id")
  metadata     Json?
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([actorUserId, createdAt])
  @@index([resourceType, resourceId, createdAt])
  @@map("audit_events")
}
```

Nao armazenar senha, token, corpo completo, e-mail completo, telefone, CNPJ ou connection string em `metadata`.

- [ ] **Passo 5: eventos obrigatorios**

- login success/failure sem e-mail puro;
- logout e refresh replay;
- reset de senha solicitado/concluido;
- usuario criado, ativado, desativado, role alterada e senha redefinida;
- acesso por Empresa alterado;
- proposta aprovada/rejeitada/deletada/duplicada;
- tentativa de acesso negado a objeto;
- alteracao de Empresa, Produto, Programa e Apresentacao.

- [ ] **Passo 6: Pino redact**

Configurar redacao para:

```text
req.headers.authorization
req.headers.cookie
res.headers["set-cookie"]
password
newPassword
confirmPassword
token
refreshToken
accessToken
DATABASE_URL
RESEND_API_KEY
```

**Gate:** toda mutacao administrativa relevante gera evento; nenhum segredo aparece nos logs.

---

### Tarefa 8: LGPD, retencao e resposta a incidentes

**Arquivos:**

- Criar: `docs/inventario-dados-lgpd.md`
- Criar: `docs/resposta-incidentes-seguranca.md`
- Criar: `docs/checklist-seguranca-release.md`
- Modificar: `docs/seguranca-back-front.md`
- Modificar: `docs/README.md`
- Modificar: `lib/db/prisma/schema.prisma` quando a politica aprovada exigir

- [ ] **Passo 1: inventario de dados e tratamento**

Para cada campo de User, Advertiser, Station, Proposal, tokens, logs e backups, documentar:

- dado e titular;
- finalidade;
- base legal a ser validada pelo controlador;
- origem;
- quem acessa;
- fornecedores/suboperadores;
- local/regiao de armazenamento;
- retencao;
- descarte/anominizacao;
- risco e controle.

- [ ] **Passo 2: mapa de fornecedores**

Registrar Vercel, Railway PostgreSQL, Resend, GitHub e Expo/EAS, incluindo papel contratual, regiao, subprocessadores, retencao e mecanismo de exclusao/exportacao.

- [ ] **Passo 3: politica de retencao**

Proposta inicial para aprovacao organizacional:

- reset tokens: apagar expirados/ usados apos 30 dias;
- refresh tokens: apagar expirados/revogados apos 30 dias;
- rate limits: apagar apos 7 dias;
- logs operacionais: 30 dias;
- audit events: 12 meses, salvo obrigacao maior;
- registro de incidente LGPD: minimo 5 anos;
- Leads inativos: revisar/anominizar segundo finalidade e base legal definidas;
- backups: janela e descarte alinhados ao provedor.

- [ ] **Passo 4: direitos do titular**

Documentar procedimento autenticado para confirmacao, acesso, correcao, portabilidade quando aplicavel, anonimização/bloqueio/eliminacao e informacao sobre compartilhamento. Preservar registros sujeitos a obrigacao legal sem usar exclusao fisica indiscriminada.

- [ ] **Passo 5: playbook de incidente**

Incluir:

1. deteccao e abertura;
2. contencao;
3. preservacao de evidencia;
4. classificacao de dados/titulares;
5. avaliacao de risco ou dano relevante;
6. decisao de comunicacao;
7. comunicacao ANPD/titulares nos prazos regulatorios vigentes;
8. recuperacao;
9. registro por pelo menos cinco anos;
10. pos-incidente e acoes corretivas.

- [ ] **Passo 6: revisar `seguranca-back-front.md`**

Aplicar todas as correcoes da secao 2 deste plano, marcar controles como `Existente`, `Parcial` ou `Planejado` e apontar testes que comprovam cada controle.

**Gate:** responsaveis organizacionais aprovam inventario, retencao e playbook; validacao juridica fica registrada.

---

### Tarefa 9: Infraestrutura, banco, Docker e supply chain

**Arquivos:**

- Modificar: `Dockerfile`
- Modificar: `docker-compose.yml`
- Modificar: `vercel.json`
- Criar: `.github/workflows/ci-security.yml`
- Criar: `.github/dependabot.yml`
- Criar: `.gitleaks.toml`
- Modificar: `package.json`
- Documentar: `docs/09-docker-ambientes-operacao.md`

- [ ] **Passo 1: Docker multi-stage e non-root**

Separar build/runtime, copiar somente artefatos necessarios, criar usuario sem privilegio e usar `USER`. Fixar imagem por digest na fase de estabilizacao.

- [ ] **Passo 2: runtime minimo**

- filesystem read-only quando possivel;
- `tmpfs` para `/tmp`;
- `cap_drop: [ALL]`;
- `no-new-privileges:true`;
- healthcheck;
- limites de memoria/CPU no ambiente que suportar;
- Postgres sem porta publica em producao.

- [ ] **Passo 3: usuarios distintos do banco**

Criar:

- role de migration com DDL;
- role runtime apenas com DML necessario no schema da aplicacao;
- conexao TLS com validacao do certificado;
- backups automaticos e teste trimestral de restauracao.

- [ ] **Passo 4: CI de seguranca**

Workflow em pull request:

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test:security
pnpm audit --prod --audit-level high
gitleaks detect --no-banner --redact
```

Adicionar CodeQL para JavaScript/TypeScript e Dependabot semanal para npm e GitHub Actions.

- [ ] **Passo 5: politica de vulnerabilidade**

- critica exploravel: bloquear deploy e corrigir em 24 h;
- alta exploravel: bloquear deploy e corrigir em 72 h;
- alta sem caminho exploravel: aceitar temporariamente com justificativa e prazo;
- media/baixa: backlog com SLA definido.

- [ ] **Passo 6: separar migration de boot**

Remover `prisma db push` e seed do boot de producao. Pipeline:

```bash
pnpm --filter @workspace/db run generate
pnpm --filter @workspace/db exec prisma migrate deploy
pnpm --filter @workspace/api-server run build
```

Seed somente por comando manual e idempotente em ambiente autorizado.

**Gate:** imagem roda non-root; CI bloqueia secret e vulnerabilidade critica; restauracao de backup e comprovada.

---

### Tarefa 10: Seguranca do aplicativo Expo

**Arquivos:**

- Modificar no repositorio mobile: `src/store/authStore.ts`
- Modificar no repositorio mobile: `src/api/client.ts`
- Verificar: `src/utils/secureStorage.native.ts`
- Documentar: `docs-mobile/`

**Interfaces:**

- Consome: `/api/auth/mobile/login`, `/refresh`, `/logout`.
- Produz: tokens apenas no Keychain/Keystore via Expo SecureStore.

- [ ] **Passo 1: confirmar armazenamento nativo**

Access e refresh token devem usar `expo-secure-store`. `AsyncStorage` pode guardar apenas perfil nao sensivel e deve ser limpo no logout.

- [ ] **Passo 2: impedir fallback inseguro em build nativo**

Se SecureStore falhar, encerrar sessao; nao migrar token para AsyncStorage. O fallback web do projeto Expo nao deve ser usado como criterio de seguranca do app nativo.

- [ ] **Passo 3: validar API URL**

Build de producao aceita apenas `https://` e host autorizado. Nao incluir secrets em `EXPO_PUBLIC_*`, pois essas variaveis ficam no bundle.

- [ ] **Passo 4: sessao mobile**

- refresh single-flight;
- uma repeticao por 401;
- logout remove token local mesmo se API falhar;
- refresh replay encerra familia;
- app em background nao exibe dados sensiveis no app switcher quando viavel;
- deep link de reset valida esquema, host e token antes de navegar.

- [ ] **Passo 5: checklist MASVS**

Cobrir STORAGE, AUTH, NETWORK, PLATFORM e PRIVACY. Testar build real, nao apenas Expo Go, antes de publicar.

**Gate:** nenhuma credencial aparece em AsyncStorage, logs Metro, crash reports ou bundle.

---

### Tarefa 11: DAST, testes E2E e evidencias ASVS

**Arquivos:**

- Criar: `scripts/security/zap-baseline.conf`
- Criar: testes Playwright de sessao/roles
- Modificar: `.github/workflows/ci-security.yml`
- Atualizar: `docs/checklist-seguranca-release.md`

- [ ] **Passo 1: ambiente de homologacao**

Criar banco e deploy descartaveis, sem dados reais, com contas:

- ADMIN;
- COMERCIAL A com Empresa X;
- COMERCIAL B com Empresa X;
- COMERCIAL C sem Empresa X;
- usuario inativo.

- [ ] **Passo 2: E2E de sessao**

Validar login, reload, refresh, expiracao, logout, reset de senha, desativacao imediata, concorrencia de requests e navegacao mobile web.

- [ ] **Passo 3: E2E de autorizacao**

Manipular IDs diretamente pela rede e confirmar 403/404; nao confiar apenas em botoes ocultos.

- [ ] **Passo 4: OWASP ZAP baseline**

Executar apenas contra homologacao autorizada:

```bash
docker run --rm -t owasp/zap2docker-stable zap-baseline.py \
  -t "$STAGING_URL" \
  -c /zap/wrk/zap-baseline.conf \
  -r zap-report.html
```

Falhar CI para alertas High; revisar Medium com justificativa.

- [ ] **Passo 5: casos de abuso manuais**

- IDOR/BOLA em IDs de propostas, versoes, clientes, avisos e usuarios;
- mass assignment de role/owner/status/station;
- payload Base64 excessivo;
- content type inesperado;
- CORS de origem hostil;
- replay de refresh;
- enumeracao de e-mail;
- brute force dentro/fora da janela;
- XSS armazenado em nome, descricao, informacao interna e apresentacao;
- acesso apos desativacao e troca de senha.

- [ ] **Passo 6: matriz ASVS**

Criar evidencia para requisitos aplicaveis do ASVS 5.0 nivel 2. Cada item deve conter requisito, aplicabilidade, controle, teste, resultado e link para evidencia.

**Gate:** zero achado critico/alto aberto e todos os cenarios de autorizacao passam.

---

### Tarefa 12: Rollout seguro e operacao continua

**Arquivos:**

- Atualizar: `docs/SUBIR-PRODUÇÃO.md`
- Atualizar: `docs/STATUS-PRODUCAO-ECOSSISTEMA.md`
- Atualizar: `docs/checklist-seguranca-release.md`

- [ ] **Passo 1: rollout em ordem**

1. backup e restauracao verificada;
2. migration compativel com versao anterior;
3. backend com leitura dupla temporaria de refresh legado apenas se indispensavel;
4. frontend web sem Web Storage;
5. app mobile compativel;
6. revogacao de sessoes legadas;
7. remocao do caminho temporario.

- [ ] **Passo 2: CSP progressiva**

Manter `Report-Only` por uma janela de homologacao, corrigir violacoes legitimas e ativar enforcement em deploy separado.

- [ ] **Passo 3: observabilidade**

Alertas minimos:

- pico de 401/403/429;
- refresh replay;
- falhas de login por conta/IP hash;
- alteracoes administrativas;
- erros 5xx;
- indisponibilidade da API/banco;
- falha de backup.

- [ ] **Passo 4: runbook de rollback**

Documentar rollback de app, migration forward-fix, restauracao e revogacao emergencial de tokens/secrets. Nao usar rollback destrutivo de schema sem backup.

- [ ] **Passo 5: cadencia**

- dependencias: semanal;
- restore de backup: trimestral;
- revisao de acessos ADMIN/COMERCIAL/Empresa: trimestral;
- tabletop de incidente: semestral;
- DAST e revisao ASVS: antes de release relevante e ao menos semestral;
- pentest externo: antes de ampliar uso ou armazenar novas categorias de dados.

**Gate final:** checklist de release assinado por Security, QA e responsavel operacional.

---

## 6. Comandos de Validacao Final

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test:security
pnpm --filter @workspace/api-server run build
PORT=21709 BASE_PATH=/ pnpm --filter @workspace/proposta run build
pnpm audit --prod --audit-level high
docker compose up -d --build
curl -i http://localhost:21709/api/healthz
```

Resultados esperados:

- typecheck e builds com exit code 0;
- testes de seguranca sem falhas;
- nenhum secret detectado;
- healthcheck 200;
- CORS hostil sem `Access-Control-Allow-Origin`;
- respostas autenticadas com `Cache-Control: no-store`;
- usuario inativo perde acesso imediatamente;
- COMERCIAL nunca acessa proposta/Empresa fora da sua policy;
- web nao possui token em Local Storage ou Session Storage;
- mobile guarda tokens somente em SecureStore;
- ZAP sem alerta High em homologacao.

## 7. Criterios de Aceite

1. Nenhuma credencial real esta rastreada e todas as credenciais expostas foram rotacionadas.
2. Configuracao de producao falha no boot quando secrets obrigatorios estao ausentes ou fracos.
3. Access token web existe apenas em memoria; refresh token web e opaco, rotativo, `HttpOnly` e persistido somente como hash.
4. Tokens mobile ficam no Keychain/Keystore via SecureStore.
5. CORS usa allowlist e nao reflete origem arbitraria.
6. Rate limits funcionam entre instancias serverless.
7. Usuario inativo, rebaixado ou sem acesso por Empresa perde permissao imediatamente.
8. Matriz ADMIN/COMERCIAL/ownership/Empresa possui testes automatizados.
9. Todas as entradas mutantes usam schema Zod estrito, limites e content type esperado.
10. Logs e audit trail nao contem secrets nem dados pessoais desnecessarios.
11. Frontend e API enviam headers apropriados; CSP foi validada em Report-Only antes do enforcement.
12. CI executa typecheck, testes, SCA, secret scan e CodeQL.
13. Docker executa como usuario non-root e producao nao usa `db push`/seed no boot.
14. Inventario LGPD, retencao, direitos do titular e playbook de incidente foram aprovados.
15. Homologacao passa nos testes E2E, matriz ASVS e ZAP sem achados criticos/altos.

## 8. Checklist de Implementacao

- [ ] Tarefa 1 - Contencao de secrets e fail-fast (codigo concluido; rotacoes externas pendentes)
- [x] Tarefa 2 - Harness e matriz de testes
- [x] Tarefa 3 - Sessao e autenticacao
- [x] Tarefa 4 - Rate limiting duravel
- [x] Tarefa 5 - CORS, CSRF e headers
- [x] Tarefa 6 - Validacao e erros seguros
- [ ] Tarefa 7 - Policies e auditoria
- [ ] Tarefa 8 - LGPD e incidentes
- [ ] Tarefa 9 - Infraestrutura e supply chain
- [ ] Tarefa 10 - Aplicativo Expo
- [ ] Tarefa 11 - DAST, E2E e ASVS
- [ ] Tarefa 12 - Rollout e operacao continua

## 8.1 Checklist da Execucao Parcial - 20/07/2026

Escopo executado: Tarefas 1 a 6. Nenhum deploy, alteracao de variavel no
Vercel ou migration no PostgreSQL Railway foi realizado nesta etapa.

### Tarefa 1

- [x] `.env` removido do indice do Git e mantido apenas localmente.
- [x] `.gitignore` protege `.env`, certificados e chaves privadas.
- [x] `.env.example` criado somente com placeholders.
- [x] configuracao de seguranca valida o ambiente e falha no boot de producao
  quando faltam banco ou secrets fortes.
- [x] fallback inseguro do JWT removido; algoritmo e claims fixados.
- [x] URL real do Railway removida da documentacao rastreada.
- [ ] chave Resend rotacionada no provedor.
- [ ] senha/URL publica do Railway rotacionada.
- [ ] secrets JWT e HMAC configurados/rotacionados no Vercel.
- [ ] decisao sobre limpeza do historico Git aprovada pelo responsavel.

### Tarefa 2

- [x] Vitest, Supertest e scripts de seguranca adicionados.
- [x] PostgreSQL efemero `propostas_test` no profile Docker `test`.
- [x] helper recusa banco cujo nome nao termina em `_test`.
- [x] matriz cobre anonimo, dono, nao dono, Empresa/capabilities,
  administracao, usuario inativo e redacao por propriedade.

### Tarefa 3

- [x] refresh token opaco persistido somente como hash.
- [x] rotacao, familia, replay e revogacao implementados.
- [x] JWT de acesso com `HS256`, `iss`, `aud`, `sub` e `jti`.
- [x] papel e status ativo revalidados no banco em cada rota privada.
- [x] access token web somente em memoria e refresh em cookie protegido.
- [x] bootstrap e refresh single-flight no frontend.
- [x] fluxo mobile preservado com armazenamento seguro e refresh opaco.
- [x] migration expansiva criada sem remover a coluna legada.

### Tarefa 4

- [x] contador compartilhado persistido no PostgreSQL.
- [x] chaves de rate limit protegidas por HMAC.
- [x] limites de login, cadastro, recuperacao, reset, refresh e API global.
- [x] hash dummy reduz enumeracao temporal de conta.
- [x] cadastro publico controlado por feature flag.
- [x] endpoint idempotente de limpeza protegido por `CRON_SECRET`.
- [x] agendamento diario declarado em `vercel.json`.
- [ ] `CRON_SECRET` configurado no Vercel para ativar o job.

### Tarefa 5

- [x] Helmet e headers privados aplicados na API.
- [x] CORS usa allowlist e preserva requests nativos sem `Origin`.
- [x] refresh/logout web validam origem ou referer autorizado.
- [x] CSP do frontend adicionada em modo Report-Only.
- [x] HSTS, frame deny, nosniff, referrer e permissions policy declarados.

### Tarefa 6

- [x] inventario de rotas revisado e OpenAPI regenerado.
- [x] schemas de mutacao estritos e mass assignment rejeitado.
- [x] IDs, filtros e paginacao validados.
- [x] limites de nomes, descricoes, indicadores, produtos, tags e imagens.
- [x] JSON global de 1 MB e limite localizado de 3 MB para Base64.
- [x] handler central retorna erro estruturado e 500 generico.
- [x] frontend web, cliente gerado e aplicativo mobile leem o novo contrato.
- [x] respostas reutilizaveis `400/401/403/404/409/413/415/429/500`
  documentadas no OpenAPI.

### Evidencias

- [x] `pnpm --filter @workspace/api-server run test:security`: 7 arquivos,
  26 testes aprovados.
- [x] typecheck da API aprovado durante a implementacao.
- [x] typecheck do frontend aprovado durante a implementacao.
- [x] `pnpm run typecheck`: todos os workspaces aprovados em 20/07/2026.
- [x] build da API aprovado em 20/07/2026.
- [x] build do frontend aprovado com `PORT=21709 BASE_PATH=/` em 20/07/2026.
- [x] `docker compose config --quiet`, parse de `vercel.json` e
  `git diff --check` aprovados.
- [x] teste isolado da configuracao fail-fast: 3 testes aprovados.
- [ ] nova repeticao da suite integrada apos o fechamento foi bloqueada pelo
  Docker Desktop local, que nao reiniciou depois de o disco atingir `ENOSPC`.
  A ultima execucao completa anterior, feita depois das mudancas das tarefas
  1-6, permanece com 7 arquivos e 26 testes aprovados. Este bloqueio local nao
  acessou nem alterou Railway ou Vercel.

### Antes de publicar

- [ ] rotacionar Resend, credencial publica Railway, JWTs e HMAC.
- [ ] configurar `CRON_SECRET` e as demais variaveis validadas no Vercel.
- [ ] aplicar e validar a migration primeiro em homologacao, com backup
  restauravel.
- [ ] repetir a suite integrada com o Docker Desktop operacional.
- [ ] executar o rollout da Tarefa 12; nenhuma alteracao desta execucao foi
  publicada automaticamente.

## 9. Referencias Oficiais

- OWASP Top 10:2025: https://owasp.org/Top10/
- OWASP API Security Top 10:2023: https://owasp.org/API-Security/editions/2023/en/0x10-api-security-risks/
- OWASP ASVS 5.0: https://owasp.org/www-project-application-security-verification-standard/
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP REST Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Logging Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- OWASP MASVS: https://mas.owasp.org/MASVS/
- LGPD - Lei 13.709/2018: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm
- Guia ANPD de seguranca para agentes de tratamento: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-vf.pdf
- Resolucao CD/ANPD 15/2024 e comunicacao de incidente: https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-o-regulamento-de-comunicacao-de-incidente-de-seguranca

## 10. Auto-Revisao do Plano

- Cobertura: web, API, banco, Docker/Vercel, mobile, CI, OWASP, LGPD e operacao incluidos.
- Prioridade: secrets/CORS/testes antes de refatoracoes de menor risco.
- Consistencia: access JWT curto + refresh opaco hash; web cookie e mobile SecureStore.
- Escopo: nenhuma regra funcional e alterada; CAPTCHA, MFA e IdP ficam fora ate decisao de produto.
- Rollback: migrations e CSP possuem rollout progressivo.
- Evidencia: cada controle relevante possui teste, comando ou documento de aceite.
