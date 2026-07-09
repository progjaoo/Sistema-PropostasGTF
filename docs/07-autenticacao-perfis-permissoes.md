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

### COMERCIAL

Pode:

- Criar e editar suas proprias propostas.
- Alterar status das suas propostas.
- Ver anunciantes.
- Criar anunciantes.
- Consultar programas e produtos.
- Editar seu proprio perfil.

Nao pode:

- Criar/editar produtos, programas, empresas e usuarios administrativos.
- Acessar proposta de outro vendedor por URL direta.
- Editar proposta de outro vendedor pela ficha do anunciante.

## Regra de Propostas de Outro Vendedor

Na ficha do anunciante:

- ADMIN ve tudo e pode editar.
- COMERCIAL dono da proposta ve tudo e pode editar.
- COMERCIAL nao dono ve apenas programa, status e responsavel.
- Campos sensiveis como valor e titulo sao redigidos no backend quando o viewer nao pode editar.

