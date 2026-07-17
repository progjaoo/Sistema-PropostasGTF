# Autenticacao, Perfis e Permissoes

## Autenticacao

O sistema usa:

- Access token JWT.
- Refresh token salvo em cookie HTTP-only.
- Estado de sessao no frontend via Zustand e `sessionStorage`.

## Login

Rota publica:

```text
/login
```

Endpoint:

```text
POST /api/auth/login
```

## Recuperacao de Senha

Rotas publicas:

```text
/forgot-password
/reset-password?token=...
```

Endpoints:

```text
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

Regras:

- A solicitacao de recuperacao sempre responde com mensagem generica, exista ou nao a conta.
- Tokens sao gerados com aleatoriedade criptografica, enviados por e-mail e armazenados no banco apenas como hash SHA-256.
- Tokens expiram em 30 minutos por padrao e podem ser usados uma unica vez.
- Ao redefinir a senha, todos os refresh tokens do usuario sao revogados.
- O e-mail e enviado pelo backend via Resend quando `EMAIL_PROVIDER=resend`.
- A chave `RESEND_API_KEY` deve existir somente como variavel de ambiente/secret do backend.
- Em desenvolvimento, `EMAIL_PROVIDER=mock` evita envio real de e-mail.

## Perfil do Usuario

Rota:

```text
/profile
```

Endpoints:

```text
GET /api/profile
PATCH /api/profile
```

Regras:

- O usuario so edita seu proprio perfil.
- O endpoint nao recebe ID de outro usuario.
- Dados de perfil alimentam o contato comercial da proposta.

## Perfis

### ADMIN

Pode:

- Acessar dashboard.
- Gerenciar usuarios.
- Gerenciar empresas.
- Gerenciar produtos.
- Gerenciar programas.
- Gerenciar tipos de proposta.
- Ver e editar todas as propostas.
- Ver todos os anunciantes e propostas vinculadas.
- Criar, editar, desativar e redefinir a senha de usuarios.
- Aprovar cadastros comerciais pendentes e definir acessos por Empresa.
- Criar e editar a Apresentacao padrao de cada Empresa.

### COMERCIAL

Pode:

- Criar e editar suas proprias propostas.
- Alterar status das suas propostas.
- Ver anunciantes.
- Criar anunciantes.
- Consultar programas e produtos.
- Editar seu proprio perfil.
- Consultar somente Empresas, Programas e Produtos autorizados pelo ADMIN.
- Usar a Apresentacao definida pela Empresa na proposta, sem edita-la no editor.

Nao pode:

- Criar/editar produtos, programas, empresas e usuarios administrativos.
- Acessar proposta de outro vendedor por URL direta.
- Editar proposta de outro vendedor pela ficha do anunciante.
- Criar proposta para Empresa sem permissao ativa.
- Consultar catalogo de Empresa sem permissao de visualizacao.
- Editar a Apresentacao padrao ou alterar `stats` diretamente pela API.

## Acesso por Empresa

- ADMIN possui acesso global por perfil.
- COMERCIAL usa modelo `default-deny`: sem `UserStationAccess` ativo, a Empresa nao e listada e a API rejeita o acesso.
- `canCreateProposals` permite criar, editar, duplicar, alterar status e andamento das propostas proprias naquela Empresa.
- `canViewCatalog` permite consultar os Programas e Produtos daquela Empresa.
- A propriedade continua obrigatoria: permissao para uma Empresa nao libera proposta criada por outro COMERCIAL.
- A API aplica a regra e retorna `403`; filtros no frontend sao apenas uma camada adicional de UX.

## Cadastro Publico Comercial

- `POST /api/auth/register-commercial` cria uma solicitacao com `active=false` e sem acesso a Empresas.
- O ADMIN deve abrir `/admin/users`, atribuir ao menos uma Empresa com permissao de criacao e ativar a conta.
- Usuario inativo nao consegue fazer login.
- Ao desativar um usuario ou redefinir sua senha, os refresh tokens existentes sao revogados.

## Protecoes Administrativas

- Um ADMIN nao pode desativar ou rebaixar a propria conta.
- O ultimo ADMIN ativo nao pode ser desativado ou rebaixado.
- A exclusao administrativa de usuario e logica: a conta fica inativa e o historico e preservado.

## Regra de Propostas de Outro Vendedor

Na ficha do anunciante:

- ADMIN ve tudo e pode editar.
- COMERCIAL dono da proposta ve tudo e pode editar.
- COMERCIAL nao dono ve apenas programa, status e responsavel.
- Campos sensiveis como valor e titulo sao redigidos no backend quando o viewer nao pode editar.
