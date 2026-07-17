# PRD 020 - Editor de Proposta, Apresentacao por Empresa e Recuperacao de Senha

- Projeto: GTF Propostas
- Data: 15/07/2026
- Tipo: WEB + API
- Stack: TypeScript, React, Vite, Express, Prisma, PostgreSQL, Docker e PNPM Workspaces
- Escopo: Tarefas 4, 5 e 6
- Dependencia: regras de acesso por Empresa definidas no PRD 019
- Status: Implementado

## 1. Referencias Consultadas

- `docs/README.md`
- `docs/05-backend-api-guidelines.md`
- `docs/06-banco-de-dados.md`
- `docs/07-autenticacao-perfis-permissoes.md`
- `.agents/README.md`
- `lib/db/prisma/schema.prisma`
- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/proposta/src/pages/proposals/edit.tsx`
- `artifacts/proposta/src/pages/proposals/new.tsx`
- `artifacts/proposta/src/components/proposal/ProposalPreview.tsx`
- `artifacts/proposta/src/components/proposal/print/`
- [Resend - Introduction](https://resend.com/docs/introduction)
- [Resend - Send email with Node.js](https://resend.com/docs/send-with-nodejs)
- [Resend - Managing domains](https://resend.com/docs/dashboard/domains/introduction)
- [Resend - How to handle API keys](https://resend.com/docs/knowledge-base/how-to-handle-api-keys)

## 2. Agentes Recomendados

| Agente | Responsabilidade neste PRD |
|---|---|
| Product Manager | Detalhar comportamento do editor, apresentacao padrao e recuperacao de senha. |
| Software Architect | Separar configuracao da Empresa, snapshot da Proposta e servico de e-mail. |
| Backend API Engineer | Implementar defaults da proposta, tokens de recuperacao e envio Resend. |
| Database Engineer | Criar modelos de apresentacao e token de redefinicao. |
| Frontend Engineer | Simplificar acordeoes e criar telas de esqueci/redefinir senha. |
| Security Engineer | Proteger tokens, evitar enumeracao de e-mail, limitar abuso e preservar segredos. |
| UX/UI Designer | Tornar Empresa/Lead/Periodo intuitivos e apresentar estados de sucesso/erro. |
| QA Engineer | Validar PDF sem periodo, apresentacoes por Empresa e ciclo completo de senha. |
| DevOps Engineer | Configurar variaveis Resend, dominio, secrets e deploy em VPS. |
| Technical Writer | Atualizar operacao local/producao e regras por perfil. |

Agentes principais: **Product Manager**, **Software Architect** e **Security Engineer**.

## 3. Objetivo

Simplificar a criacao de proposta, centralizar a Apresentacao institucional no cadastro de cada Empresa e oferecer recuperacao segura de senha por e-mail usando Resend.

## 4. Fora do Escopo

- Alterar identidade visual ou paginacao do PDF.
- Permitir ao COMERCIAL editar a Apresentacao padrao.
- Criar login por provedor social.
- Enviar senha temporaria por e-mail.
- Armazenar token de recuperacao em texto puro.
- Expor a API key do Resend no frontend.
- Apagar os campos legados de periodo ou `stats` do banco.

## 5. Tarefa 4 - Ajustes no Editor de Proposta

### 5.1 Acordeao Empresa

O acordeao deve conter apenas o necessario para selecionar onde a proposta sera anunciada:

- label `Empresa`;
- select com Empresas permitidas ao usuario;
- nome e swatch da cor da Empresa selecionada;
- estado vazio/erro quando nao houver Empresa disponivel.

Remover do acordeao:

- telefone;
- e-mail;
- slogan;
- endereco;
- CNPJ;
- qualquer outro dado cadastral.

Esses dados continuam disponiveis para cabecalho/rodape do preview quando aplicavel, apenas nao aparecem no formulario lateral.

### 5.2 Novo Lead dentro da proposta

No modal rapido `Novo Lead`, os campos obrigatorios sao:

| Campo | Obrigatorio | Destino |
|---|---:|---|
| Nome | Sim | `Advertiser.tradeName` |
| Nome do contato | Sim | `Advertiser.contactName` |
| Telefone | Sim | `Advertiser.contactPhone` |

O modal rapido nao deve exibir CNPJ. E-mail e Informacao Interna podem permanecer opcionais se houver espaco e utilidade, mas nao bloqueiam o cadastro.

Regras:

- novo registro nasce com `status=LEAD`;
- telefone usa mascara brasileira e validacao minima de quantidade de digitos;
- ao salvar, selecionar automaticamente o Lead na proposta;
- erros de conflito/validacao ficam no modal, sem perder os valores digitados;
- cadastro completo de Lead continua disponivel na tela propria.

### 5.3 Opcao Nao exibir Periodo

Adicionar ao modelo `Proposal`:

```prisma
showPeriod Boolean @default(true) @map("show_period")
```

No acordeao Periodo:

- checkbox/toggle `Nao exibir periodo na proposta`;
- quando marcado, `showPeriod=false`;
- manter datas armazenadas, mas desabilitar visualmente os campos enquanto oculto;
- ao desmarcar, restaurar a exibicao sem perder as datas anteriores.

No preview e no PDF:

- se `showPeriod=false`, nao renderizar pill, datas, periodicidade nem texto de periodo;
- nao deixar espaco reservado para a secao;
- se `showPeriod=true`, manter comportamento atual.

O campo `periodDesc` permanece legado e nao deve voltar a UI.

### 5.4 Contratos

Adicionar `showPeriod` aos payloads e respostas de:

- criacao de proposta;
- detalhe da proposta;
- atualizacao da proposta;
- duplicacao e versoes/snapshot;
- dados usados pelo preview e print.

### 5.5 Criterios de aceite da Tarefa 4

- [ ] Acordeao Empresa mostra somente seletor, nome e cor.
- [ ] COMERCIAL ve apenas Empresas autorizadas pelo PRD 019.
- [ ] Novo Lead exige Nome, Nome do Contato e Telefone.
- [ ] CNPJ nao aparece no modal rapido.
- [ ] Lead criado e selecionado automaticamente na proposta.
- [ ] `Nao exibir periodo` persiste ao salvar e recarregar.
- [ ] Preview e PDF omitem totalmente o Periodo quando a opcao estiver ativa.
- [ ] Desmarcar a opcao recupera as datas previamente informadas.

## 6. Tarefa 5 - Apresentacao Padrao por Empresa

### 6.1 Regra de negocio

- Apenas ADMIN cria e edita a Apresentacao padrao de uma Empresa.
- Cada Empresa pode ter de zero a quatro itens.
- Cada item possui `destaque`, `descricao` e `ordem`.
- COMERCIAL nao edita esses itens no editor da proposta.
- Ao escolher a Empresa em uma nova proposta, os itens padrao sao aplicados automaticamente.
- A proposta guarda um snapshot dos itens para preservar documentos historicos.

### 6.2 Decisao de persistencia

Criar entidade estruturada, em vez de adicionar outro JSON em `Station`:

```prisma
model StationPresentationItem {
  id          String   @id @default(cuid())
  stationId   String   @map("station_id")
  station     Station  @relation(fields: [stationId], references: [id], onDelete: Cascade)
  highlight   String
  description String   @db.Text
  order       Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt   DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@unique([stationId, order])
  @@index([stationId, active])
  @@map("station_presentation_items")
}
```

`Proposal.stats` continua sendo o snapshot no formato atual `{ num, desc }`, evitando migration dos PDFs/propostas existentes.

### 6.3 Por que usar snapshot

Se o ADMIN alterar a Apresentacao da Empresa amanha, propostas antigas nao devem mudar silenciosamente. Por isso:

- configuracao da Empresa = fonte para novas propostas;
- `Proposal.stats` = fotografia do momento da criacao/selecao;
- mudanca da Empresa durante a edicao exige confirmacao antes de substituir o snapshot.

### 6.4 API administrativa

Opcoes aceitas:

- endpoints dedicados `GET/PUT /api/stations/:id/presentation`; ou
- incluir `presentationItems` no detalhe/edicao da Empresa.

Decisao recomendada: endpoint dedicado, com atualizacao transacional da lista completa e `requireAdmin`.

Contrato sugerido:

```json
{
  "items": [
    { "highlight": "350 mil", "description": "ouvintes por dia", "order": 0 }
  ]
}
```

Validacoes:

- maximo quatro itens ativos;
- `highlight` obrigatorio, maximo 40 caracteres;
- `description` obrigatoria, maximo 140 caracteres e preserva espacos/quebras;
- ordem unica entre 0 e 3;
- Empresa deve existir.

### 6.5 Aplicacao na proposta

No backend de criacao:

1. validar acesso do usuario a Empresa;
2. carregar itens ativos ordenados;
3. ignorar `stats` enviado por COMERCIAL;
4. preencher `Proposal.stats` com o snapshot da Empresa.

No update:

- COMERCIAL nao pode alterar `stats` diretamente;
- ADMIN tambem gerencia a configuracao pela tela da Empresa, nao pelo editor;
- ao trocar `stationId`, o frontend mostra confirmacao e a API reaplica os defaults da nova Empresa;
- se a Empresa nao possui itens, salvar `stats=[]` e ocultar a secao no preview/PDF.

### 6.6 Interface administrativa

Adicionar no cadastro/edicao da Empresa a secao `Apresentacao padrao`:

- lista horizontal/reordenavel de ate quatro itens;
- campos `Destaque` e `Descricao`;
- adicionar/remover item;
- pre-visualizacao simples usando a cor da Empresa;
- contador `n/4`;
- confirmacao ao remover item existente.

No editor da proposta para COMERCIAL:

- remover controles de adicionar, editar e excluir Apresentacao;
- exibir bloco somente leitura com a mensagem `Apresentacao definida pela Empresa`;
- se nao houver itens, exibir estado informativo sem acao administrativa.

### 6.7 Criterios de aceite da Tarefa 5

- [ ] ADMIN cadastra ate quatro itens de Apresentacao por Empresa.
- [ ] COMERCIAL nao consegue alterar a Apresentacao pela UI nem pela API.
- [ ] Selecionar Empresa em nova proposta preenche os itens automaticamente.
- [ ] Trocar Empresa pede confirmacao e substitui os itens pelo novo padrao.
- [ ] Alterar padrao da Empresa nao muda propostas antigas.
- [ ] Empresa sem Apresentacao gera proposta sem a secao.
- [ ] Espacos e quebras da descricao sao preservados.

## 7. Tarefa 6 - Recuperacao de Senha com Resend

### 7.1 Alerta de seguranca imediato

A chave Resend informada durante o levantamento foi exposta em texto. Ela deve ser **revogada e substituida antes de qualquer implementacao ou deploy**. A chave exposta nao sera registrada neste PRD, no codigo, em `.env.example`, em logs ou em commits.

A nova chave deve:

- ter permissao apenas de envio (`sending_access`);
- ser limitada ao dominio de envio quando disponivel;
- existir somente como secret/variavel de ambiente do backend;
- ser diferente entre desenvolvimento/homologacao/producao.

### 7.2 Fluxo funcional

1. Usuario clica `Esqueceu a senha?` em `/login`.
2. Abre `/forgot-password` e informa o e-mail.
3. Frontend chama `POST /api/auth/forgot-password`.
4. API sempre responde com mensagem generica, exista ou nao a conta.
5. Para usuario ativo existente, API cria token de uso unico e envia link por Resend.
6. Usuario abre `/reset-password?token=...`.
7. Informa e confirma a nova senha.
8. Frontend chama `POST /api/auth/reset-password`.
9. API valida token, altera a senha, marca token como usado e revoga todas as sessoes.
10. Usuario volta ao login com confirmacao de sucesso.

### 7.3 Modelo de token

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String    @map("user_id")
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at") @db.Timestamptz(6)
  usedAt    DateTime? @map("used_at") @db.Timestamptz(6)
  createdAt DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)

  @@index([userId, expiresAt])
  @@map("password_reset_tokens")
}
```

Regras tecnicas:

- gerar token criptograficamente seguro com `crypto.randomBytes(32)`;
- enviar token em base64url/hex apenas no link;
- persistir somente SHA-256 do token;
- expirar em 30 minutos;
- token e de uso unico;
- invalidar tokens anteriores ainda abertos do mesmo usuario ao gerar um novo;
- executar troca de senha, consumo do token e revogacao de refresh tokens em transacao.

### 7.4 Endpoints publicos

#### `POST /api/auth/forgot-password`

Request:

```json
{ "email": "usuario@empresa.com.br" }
```

Resposta sempre `202`:

```json
{ "message": "Se o e-mail estiver cadastrado, enviaremos as instrucoes de recuperacao." }
```

Nao revelar se o e-mail existe, se a conta esta inativa ou se o envio ocorreu.

#### `POST /api/auth/reset-password`

Request:

```json
{
  "token": "token-recebido-no-link",
  "newPassword": "nova-senha",
  "confirmPassword": "nova-senha"
}
```

Respostas:

- `200` para sucesso;
- `400` para token invalido, expirado ou usado, com mensagem unica;
- `429` para limite excedido.

### 7.5 Politica de senha

Padronizar criacao, reset administrativo e auto-recuperacao com a mesma regra minima:

- minimo de 8 caracteres;
- maximo de 128 caracteres;
- aceitar gerenciadores de senha e colagem;
- nao exigir combinacoes artificiais de simbolos;
- hash bcrypt com custo 12, igual ao fluxo atual.

### 7.6 Protecao contra abuso

- rate limit por IP e por hash normalizado do e-mail;
- sugestao inicial: 5 solicitacoes por hora por combinacao IP/e-mail;
- manter resposta e tempo semelhantes para conta existente e inexistente;
- nao registrar token, senha, API key ou URL completa com token;
- revogar refresh tokens apos redefinicao;
- evento de auditoria sem dados sensiveis para solicitacao e conclusao;
- limpar tokens expirados por job diario ou exclusao oportunista.

### 7.7 Integracao Resend

Criar servico backend isolado, por exemplo `services/email/password-reset-email.ts`. Nunca importar o SDK Resend no frontend.

Variaveis:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=GTF Propostas <nao-responda@subdominio-verificado>
APP_PUBLIC_URL=https://propostas.seudominio.com.br
PASSWORD_RESET_TTL_MINUTES=30
```

O `.env.example` deve conter apenas nomes e valores ficticios.

Para producao:

- verificar dominio/subdominio no Resend;
- configurar SPF e DKIM indicados no painel;
- usar no `from` exatamente o dominio verificado;
- preferir subdominio dedicado para isolar reputacao de envio;
- injetar a chave como secret na VPS/CI;
- validar logs do Resend sem expor o token do link.

### 7.8 E-mail

Conteudo minimo:

- marca `GTF Propostas`;
- informacao de que houve solicitacao de redefinicao;
- botao `Redefinir senha`;
- aviso de expiracao em 30 minutos;
- orientacao para ignorar se nao solicitou;
- URL alternativa em texto, sem incluir dados adicionais do usuario.

Nao enviar senha temporaria ou senha em texto.

### 7.9 Frontend

#### Login

- link `Esqueceu a senha?` proximo ao campo Senha;
- manter `GTF Propostas` e `Sistema Comercial GTF` conforme identidade atual.

#### `/forgot-password`

- input de e-mail;
- botao com estado de envio;
- mensagem generica de sucesso;
- link para voltar ao login;
- nao informar se a conta existe.

#### `/reset-password`

- nova senha;
- confirmar senha;
- mostrar/ocultar senha;
- validacao local igual ao backend;
- estados de token ausente, invalido/expirado e sucesso;
- apos sucesso, botao `Ir para o login`.

### 7.10 Operacao local

- Testes automatizados devem mockar o servico de e-mail.
- Em desenvolvimento, nao imprimir token em logs compartilhados.
- Pode existir adaptador `EMAIL_PROVIDER=mock` apenas para ambiente local/teste, protegido para falhar ao iniciar em `NODE_ENV=production`.
- Teste integrado real deve usar uma chave de desenvolvimento restrita e destinatario controlado.

### 7.11 Criterios de aceite da Tarefa 6

- [ ] Login possui link `Esqueceu a senha?`.
- [ ] Solicitar e-mail existente e inexistente retorna a mesma mensagem.
- [ ] E-mail valido recebe link pelo Resend.
- [ ] Token nao aparece em texto puro no banco ou logs.
- [ ] Token expira em 30 minutos e funciona uma unica vez.
- [ ] Nova senha invalida todas as sessoes anteriores.
- [ ] Rate limit bloqueia abuso sem revelar existencia da conta.
- [ ] Chave Resend existe somente no backend via ambiente.
- [ ] Dominio de envio esta verificado com SPF/DKIM antes de producao.
- [ ] Chave exposta durante o levantamento foi revogada.

## 8. Ordem de Implementacao

### Fase 0 - Seguranca operacional

1. Revogar imediatamente a chave Resend exposta.
2. Criar chave nova com permissao de envio.
3. Definir subdominio/remetente e configurar DNS.
4. Nunca inserir o segredo no repositorio ou neste plano.

### Fase 1 - Banco e contratos

1. Adicionar `Proposal.showPeriod`.
2. Criar `StationPresentationItem`.
3. Criar `PasswordResetToken`.
4. Criar migrations e atualizar seed.
5. Atualizar OpenAPI/Zod e regenerar clients.

### Fase 2 - Editor

1. Simplificar acordeao Empresa.
2. Simplificar Novo Lead.
3. Adicionar `Nao exibir periodo`.
4. Atualizar preview, print, duplicacao e snapshots.

### Fase 3 - Apresentacao por Empresa

1. Criar endpoints ADMIN.
2. Criar secao no formulario de Empresa.
3. Aplicar snapshot no create/troca de Empresa.
4. Tornar acordeao somente leitura para COMERCIAL.
5. Bloquear alteracao indevida na API.

### Fase 4 - Recuperacao de senha

1. Criar servico Resend server-side.
2. Criar endpoints e rate limit.
3. Criar telas publicas e rotas.
4. Criar template do e-mail.
5. Revogar sessoes no reset.
6. Configurar secrets Docker/VPS.

### Fase 5 - QA e documentacao

1. Executar testes de editor e PDF.
2. Executar testes de permissao da Apresentacao.
3. Executar testes de seguranca do reset.
4. Atualizar docs de autenticacao, banco, regras e producao.

## 9. Arquivos Provavelmente Afetados

| Camada | Arquivos/areas |
|---|---|
| Banco | `lib/db/prisma/schema.prisma`, migrations e seed |
| Contratos | OpenAPI, Zod e client React gerado |
| API | `routes/auth.ts`, `routes/proposals.ts`, `routes/stations.ts`, novo servico de e-mail e rate limit |
| Frontend | login, forgot/reset password, `proposals/edit.tsx`, `proposals/new.tsx`, `admin/station.tsx` |
| Preview/PDF | `ProposalPreview.tsx` e componentes em `components/proposal/print/` |
| Operacao | `.env.example`, Docker Compose, `docs/SUBIR-PRODUÇÃO.md` e `docs/rodar-local.md` |

## 10. QA Consolidado

### Editor e PDF

- [ ] Empresa nao exibe dados cadastrais no acordeao.
- [ ] Novo Lead valida os tres campos obrigatorios.
- [ ] Periodo aparece e desaparece sem perder datas.
- [ ] PDF multipagina continua integro com Periodo oculto.

### Apresentacao

- [ ] Duas Empresas podem ter Apresentacoes diferentes.
- [ ] COMERCIAL recebe a correta ao selecionar cada Empresa.
- [ ] COMERCIAL nao altera itens via DevTools/API.
- [ ] Proposta antiga nao muda quando o ADMIN atualiza o padrao.

### Recuperacao de senha

- [ ] E-mail existente, inexistente e inativo geram resposta publica equivalente.
- [ ] Token valido redefine senha.
- [ ] Token expirado, usado ou adulterado falha.
- [ ] Solicitacao repetida invalida token anterior.
- [ ] Login antigo falha e nova senha funciona.
- [ ] Refresh tokens anteriores deixam de funcionar.
- [ ] Rate limit retorna `429`.
- [ ] Nenhum segredo aparece em bundle frontend, banco ou logs.

## 11. Riscos e Mitigacoes

| Risco | Mitigacao |
|---|---|
| Propostas antigas mudarem com o padrao da Empresa | Snapshot em `Proposal.stats`. |
| COMERCIAL adulterar `stats` pelo payload | Ignorar/rejeitar campo no backend conforme role. |
| Periodo oculto deixar espaco no PDF | Renderizacao condicional sem container vazio. |
| Enumeracao de usuarios no esqueci senha | Resposta generica, rate limit e tempo semelhante. |
| Roubo de token no banco | Persistir somente hash SHA-256. |
| API key vazar no bundle ou Git | Servico server-side e secrets de ambiente. |
| Remetente falhar em producao | Verificar dominio e usar `from` no dominio exato. |
| Usuario continuar logado apos reset | Remover todos os refresh tokens na transacao. |

## 12. Checklist de Implementacao

Este checklist deve ser atualizado durante a execucao do PRD:

- [ ] Chave Resend exposta revogada e nova chave criada com escopo minimo. Pendente de acao externa do responsavel da conta Resend.
- [x] `showPeriod` implementado em banco, API, editor, preview e PDF.
- [x] Modal de Novo Lead simplificado.
- [x] Acordeao Empresa simplificado.
- [x] Apresentacao padrao por Empresa implementada.
- [x] Apresentacao bloqueada para COMERCIAL no backend e frontend.
- [x] Model e endpoints de recuperacao de senha implementados.
- [x] Integracao Resend server-side implementada.
- [x] Rate limit, token hash, expiracao e revogacao de sessoes validados por implementacao e typecheck.
- [x] Testes, typecheck e build concluidos.
- [x] Documentacao local e de producao atualizada.

## 13. Resultado da Implementacao

- Banco: adicionados `Proposal.showPeriod`, `StationPresentationItem` e `PasswordResetToken`, com migration formal.
- API: adicionados `GET/PUT /api/stations/:id/presentation`, `POST /api/auth/forgot-password` e `POST /api/auth/reset-password`.
- API: criacao/troca de Empresa em proposta aplica snapshot da Apresentacao padrao da Empresa; COMERCIAL nao altera `stats` pelo payload.
- Frontend: editor de proposta simplificado em Empresa, Novo Lead, Periodo e Apresentacao.
- Frontend: adicionadas paginas publicas `/forgot-password` e `/reset-password`.
- Operacao: `.env.example`, `docs/rodar-local.md` e `docs/SUBIR-PRODUÇÃO.md` documentam Resend por variavel de ambiente.
- Seguranca: token de recuperacao e salvo apenas como hash SHA-256, expira por padrao em 30 minutos e revoga sessoes antigas ao redefinir senha.
