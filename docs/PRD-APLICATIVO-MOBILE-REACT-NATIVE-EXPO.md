# PRD - Aplicativo Mobile GTF Propostas com React Native e Expo

**Versao:** 1.0  
**Data:** 16/07/2026  
**Produto:** GTF Propostas - Sistema Comercial GTF  
**Plataformas alvo:** Android e iOS  
**Tecnologia alvo:** React Native + Expo + TypeScript  
**Repositorio de referencia:** codigo atual do `Sistema-Propostas`  
**Status:** pronto para planejamento e implementacao no Replit

AVISO< lembrando que o replit não poderá subir ou atualizar o código do github importado>
---

## 1. Objetivo deste documento

Este PRD orienta a criacao de um aplicativo mobile nativo para o Sistema de Propostas da GTF.

O aplicativo deve ser criado com React Native e Expo, consumindo a API e o banco ja existentes. Ele nao deve recriar regras de negocio no dispositivo, acessar o PostgreSQL diretamente ou substituir o frontend web atual.

O codigo atual sera publicado no GitHub e fornecido ao Replit como fonte de contexto. O Replit deve usar este documento, a pasta `docs`, o schema Prisma e as rotas Express para preservar o comportamento existente.

O resultado esperado e um aplicativo operacional para ADMIN e COMERCIAL, com prioridade de experiencia para o vendedor em campo.

---

## 2. Fontes da verdade

Em caso de divergencia, seguir esta ordem:

1. Regras de autorizacao implementadas na API Express.
2. Modelos e enums em `lib/db/prisma/schema.prisma`.
3. Este PRD mobile.
4. `docs/08-regras-de-negocio.md`.
5. `docs/07-autenticacao-perfis-permissoes.md`.
6. `docs/paginas-por-perfil.md`.
7. Comportamento visual do frontend web atual.

Arquivos obrigatorios para leitura antes da implementacao:

- `docs/README.md`
- `docs/01-visao-geral.md`
- `docs/02-stack-e-tipo.md`
- `docs/03-arquitetura-e-pastas.md`
- `docs/04-frontend-guidelines.md`
- `docs/05-backend-api-guidelines.md`
- `docs/06-banco-de-dados.md`
- `docs/07-autenticacao-perfis-permissoes.md`
- `docs/08-regras-de-negocio.md`
- `docs/paginas-por-perfil.md`
- `docs/SUBIR-PRODUÇÃO.md`
- `lib/db/prisma/schema.prisma`
- `lib/api-spec/openapi.yaml`
- `artifacts/api-server/src/routes/`
- `artifacts/proposta/src/`

Agentes recomendados conforme `.agents/README.md`:

- Product Manager: escopo, regras e aceite.
- Software Architect: integracao mobile, API e separacao de responsabilidades.
- Frontend Engineer: React Native, Expo Router, formularios e estado.
- Backend API Engineer: sessao mobile, endpoints e contratos.
- Security Engineer: tokens, SecureStore, deep links e autorizacao.
- UX/UI Designer: adaptacao da experiencia web para telas pequenas.
- QA Engineer: matriz ADMIN/COMERCIAL, Android/iOS e regressao da API.
- DevOps Engineer: ambientes, EAS Build, secrets e publicacao.
- Technical Writer: atualizacao dos documentos e instrucoes de operacao.

---

## 3. Contexto do produto atual

O GTF Propostas e um sistema comercial WEB + API para:

- gerenciar Empresas/Emissoras;
- gerenciar Programas e seus Produtos;
- controlar Leads e Clientes;
- criar e editar Propostas comerciais;
- acompanhar o andamento de cada Proposta;
- aceitar ou rejeitar Propostas;
- promover automaticamente Lead para Cliente quando uma Proposta e aceita;
- gerar avisos de recaptura aos 3, 6 e 10 meses de uma rejeicao;
- gerar preview e PDF comercial;
- controlar usuarios e acessos por Empresa.

Arquitetura atual:

```text
Frontend web React/Vite
        |
        | HTTP REST /api + Bearer JWT
        v
API Node.js/Express
        |
        | Prisma ORM
        v
PostgreSQL 16
```

Arquitetura desejada apos o aplicativo:

```text
Frontend web React/Vite ---------+
                                 |
App React Native/Expo -----------+--> API Express --> Prisma --> PostgreSQL
```

O aplicativo mobile e mais um cliente da mesma API. O PostgreSQL continua acessivel somente pelo backend.

---

## 4. Objetivos do aplicativo

### 4.1 Objetivo principal

Permitir que a equipe comercial execute o ciclo de venda pelo celular, desde a criacao do Lead e da Proposta ate o acompanhamento, aceite, rejeicao e recaptura.

### 4.2 Objetivos secundarios

- Dar ao ADMIN visibilidade operacional e acesso aos cadastros administrativos.
- Preservar a mesma fonte de dados do sistema web.
- Reduzir atrito para vendedores em visitas e negociacoes externas.
- Permitir visualizacao e compartilhamento da Proposta em PDF.
- Preparar a base para notificacoes push futuras.

### 4.3 Indicadores de sucesso

- Login e restauracao de sessao funcionam em Android e iOS.
- COMERCIAL consegue criar e salvar uma Proposta sem usar o navegador.
- Propostas criadas no mobile aparecem imediatamente no web e vice-versa.
- Regras de acesso por Empresa e propriedade da Proposta permanecem intactas.
- Lead vira Cliente apenas quando uma Proposta e marcada como `APPROVED`.
- PDF compartilhado pelo mobile preserva identidade, produtos, investimento e contato.
- Nenhum segredo ou credencial do backend e incluido no bundle Expo.

---

## 5. Nao objetivos

Nao fazem parte do escopo inicial:

- criar um banco separado para o aplicativo;
- acessar Prisma ou PostgreSQL diretamente pelo aplicativo;
- substituir ou remover o frontend web;
- alterar regras comerciais apenas no mobile;
- operar completamente offline com sincronizacao de conflitos;
- editar o layout grafico da proposta de forma livre;
- enviar notificacoes push antes de existir registro de dispositivo e consentimento;
- publicar automaticamente nas lojas sem validacao da GTF;
- portar componentes HTML, Radix ou shadcn diretamente para React Native.

---

## 6. Personas e perfis

### 6.1 COMERCIAL

Principal usuario do aplicativo.

Necessidades:

- acessar somente Empresas autorizadas;
- consultar Programas e Produtos permitidos;
- criar Lead e Cliente;
- criar e editar somente suas Propostas;
- registrar andamento;
- marcar Proposta como Enviada, Aceita ou Rejeitada;
- visualizar avisos de recaptura proprios;
- manter perfil e contato comercial atualizados;
- gerar e compartilhar PDF.

### 6.2 ADMIN

Usuario com acesso global.

Necessidades:

- acessar dashboard consolidado;
- ver e operar todas as Propostas;
- gerenciar usuarios e acessos por Empresa;
- gerenciar Empresas e Apresentacoes;
- gerenciar Programas, Produtos, Duracoes e Tipos de Proposta;
- visualizar todos os Leads, Clientes e avisos de recaptura;
- editar o proprio perfil.

---

## 7. Regras de negocio obrigatorias

### RN-MOB-01 - Fonte unica de dados

Web e mobile usam a mesma API e o mesmo banco. Nao criar tabelas duplicadas para o aplicativo.

### RN-MOB-02 - Propriedade da Proposta

- ADMIN acessa todas as Propostas.
- COMERCIAL acessa e altera somente Propostas em que `createdById` seja o seu ID.
- A API deve continuar retornando `403` para acesso direto indevido.

### RN-MOB-03 - Acesso por Empresa

- ADMIN possui acesso global.
- COMERCIAL segue `default-deny`.
- `canCreateProposals` controla criacao e operacao de Propostas naquela Empresa.
- `canViewCatalog` controla consulta a Programas e Produtos daquela Empresa.
- Esconder uma opcao no aplicativo nao substitui a verificacao da API.

### RN-MOB-04 - Leads e Clientes

- A entidade tecnica e `Advertiser`.
- `status=LEAD` aparece como Lead.
- `status=CLIENT` aparece como Cliente.
- Rejeitar uma Proposta nao promove nem rebaixa o registro.
- Apenas aceitar uma Proposta promove Lead para Cliente.

### RN-MOB-05 - Status de Proposta

Mapeamento obrigatorio:

| API | Interface |
|---|---|
| `DRAFT` | Rascunho |
| `SENT` | Enviada |
| `APPROVED` | Aceita |
| `REJECTED` | Rejeitada |
| `ARCHIVED` | Legado, nao exibir no fluxo principal |

### RN-MOB-06 - Andamento

Etapas:

| API | Interface |
|---|---|
| `LEAD_CREATED` | Lead criado |
| `IN_CONVERSATION` | Em conversa |
| `PROPOSAL_SENT` | Proposta enviada |
| `CLIENT_REVIEWING` | Cliente analisando |
| `NEGOTIATION` | Negociacao |
| `APPROVED` | Aceita |
| `REJECTED` | Rejeitada |

Etapas `APPROVED` e `REJECTED` sao geradas pela mudanca de status. Nao devem ser enviadas como etapa manual comum.

### RN-MOB-07 - Recaptura

- Rejeicao gera marcos de 3, 6 e 10 meses.
- ADMIN ve todos os avisos vencidos.
- COMERCIAL ve apenas avisos das Propostas proprias.
- Ao aceitar posteriormente uma Proposta, avisos pendentes sao cancelados.
- No MVP mobile, os avisos sao consultados no login, ao voltar ao foreground e por pull-to-refresh.

### RN-MOB-08 - Contato da Proposta

O contato vem do perfil do vendedor dono:

- `createdBy.name`
- `createdBy.jobTitle`
- `createdBy.contactPhone`
- `createdBy.contactEmail`

Nao usar o contato da Empresa como contato do vendedor.

### RN-MOB-09 - Apresentacao por Empresa

- ADMIN configura ate 4 itens por Empresa.
- COMERCIAL apenas visualiza a Apresentacao aplicada.
- A Proposta guarda um snapshot em `stats`.
- Trocar a Empresa atualiza o snapshot para o padrao da nova Empresa.
- Alterar a Apresentacao da Empresa nao altera Propostas antigas.

### RN-MOB-10 - Produtos da Proposta

- Produto de catalogo pertence a uma Empresa.
- Programa e opcional.
- Quantidade, horario e sazonalidade pertencem ao item da Proposta.
- Sazonalidade aceita `MONTHLY`, `SEMIANNUAL` e `ANNUAL`.
- Produto avulso nao entra na sugestao automatica de investimento.

### RN-MOB-11 - Investimento

- Valor final continua manual.
- Sugestao e informativa.
- Sugestao = valor sugerido do Produto x quantidade, somado para itens de catalogo.
- Dados monetarios devem ser enviados no formato aceito pela API atual, sem depender apenas do texto formatado na interface.

### RN-MOB-12 - Periodo

- Datas podem ser mantidas mesmo quando `showPeriod=false`.
- Se `showPeriod=false`, preview e PDF nao exibem periodo.
- `periodDesc` e legado e nao volta ao editor.

### RN-MOB-13 - Exclusoes

As operacoes atuais sao predominantemente logicas:

- usuario excluido fica inativo;
- Empresa, Cliente/Lead, Programa e Produto podem ser desativados conforme endpoint;
- o aplicativo deve pedir confirmacao antes de acoes destrutivas.

### RN-MOB-14 - Visibilidade na ficha de Cliente/Lead

O mobile deve confiar em `viewerCanEdit` retornado pela API:

- dono ou ADMIN ve titulo, valor e acoes;
- COMERCIAL nao dono ve Programa, status e responsavel;
- dados redigidos pela API nao devem ser reconstruidos no aplicativo.

---

## 8. Arquitetura tecnica recomendada

### 8.1 Local do aplicativo

Criar o aplicativo no mesmo monorepo:

```text
artifacts/mobile/
```

O `pnpm-workspace.yaml` ja inclui `artifacts/*`.

Estrutura sugerida:

```text
artifacts/mobile/
  app/
    (public)/
    (authenticated)/
    (admin)/
    proposals/
    advertisers/
    leads/
  src/
    api/
    components/
    features/
    hooks/
    store/
    theme/
    utils/
  assets/
    brand/
  app.config.ts
  eas.json
  package.json
  tsconfig.json
```

### 8.2 Stack mobile

- Expo na versao estavel compativel com React 19 usada no workspace.
- React Native.
- TypeScript estrito.
- Expo Router para navegacao e deep links.
- TanStack Query para cache, invalidacao e estados de rede.
- Zustand para estado de sessao e preferencias locais.
- React Hook Form + Zod para formularios.
- Expo SecureStore para tokens.
- Expo Image Picker para avatar e imagens, com compressao antes de base64.
- Expo Print para gerar arquivo PDF local quando a estrategia definida na secao 16 for usada.
- Expo Sharing para compartilhar o PDF.
- Expo Linking para recuperacao de senha e links internos.
- Date picker nativo compativel com Expo.
- Biblioteca de icones suportada pelo Expo, mantendo equivalentes visuais aos icones Lucide.

Nao usar no aplicativo:

- Wouter;
- Vite;
- React DOM;
- shadcn/ui ou Radix UI;
- `window`, `document`, `sessionStorage` ou `window.print`;
- Tailwind web diretamente.

### 8.3 Camadas

```text
Screens / Expo Router
        |
Feature hooks e formularios
        |
TanStack Query + cliente HTTP mobile
        |
API Express HTTPS
```

Regras de autorizacao continuam no backend. O mobile controla apenas experiencia e apresentacao.

O cliente compartilhado em `lib/api-client-react` ja possui pontos de configuracao para React Native:

- `setBaseUrl(...)` transforma rotas relativas em URL absoluta;
- `setAuthTokenGetter(...)` injeta o Bearer token;
- o parser trata a diferenca de `response.body` no React Native.

O aplicativo deve avaliar e reutilizar esse pacote para tipos, funcoes e hooks cobertos pelo OpenAPI. Na inicializacao, configurar `setBaseUrl(EXPO_PUBLIC_API_URL)` de forma que uma rota gerada como `/api/...` nao seja enviada como URL relativa. Endpoints ainda ausentes do contrato devem ser adicionados ao OpenAPI e regenerados, evitando uma segunda camada permanente de tipos manuais.

### 8.4 Configuracao de ambiente

Variaveis permitidas no bundle:

```env
EXPO_PUBLIC_API_URL=https://propostas.grupogtf.com.br/api
EXPO_PUBLIC_APP_ENV=production
```

Nunca incluir no aplicativo:

- `DATABASE_URL`;
- `JWT_SECRET`;
- `JWT_REFRESH_SECRET`;
- `RESEND_API_KEY`;
- senha do Postgres;
- qualquer secret de EAS como variavel `EXPO_PUBLIC_*`.

### 8.5 Ambientes

- Desenvolvimento local: API da maquina acessada pelo IP da rede local, nao `localhost` no aparelho fisico.
- Preview/Teste: API HTTPS em ambiente de homologacao.
- Producao: API HTTPS no dominio oficial.

Android e iOS de producao nao devem depender de HTTP sem TLS.

---

## 9. Adaptacoes obrigatorias na API

O aplicativo nao deve ser considerado pronto para producao sem estas adaptacoes.

### 9.1 Sessao mobile

Problema atual:

- login retorna access token no JSON;
- refresh token fica apenas em cookie HTTP-only;
- o frontend web usa `sessionStorage` para o access token;
- cookies de refresh nao sao uma base suficientemente previsivel para um aplicativo React Native.

Implementar um fluxo mobile explicito, preservando o fluxo web atual.

Opcao recomendada:

```text
POST /api/auth/mobile/login
POST /api/auth/mobile/refresh
POST /api/auth/mobile/logout
```

Regras:

- login mobile retorna `accessToken`, `refreshToken`, `user` e tempos de expiracao;
- refresh token deve ser armazenado somente no `SecureStore`;
- o banco deve guardar apenas uma representacao segura/hash do refresh token em evolucao futura; no minimo preservar revogacao por sessao;
- refresh deve rotacionar o token;
- logout revoga a sessao do dispositivo;
- desativacao do usuario e redefinicao de senha revogam todas as sessoes;
- nao retornar refresh token mobile para clientes web por acidente;
- registrar um identificador opcional do dispositivo/sessao, sem coletar identificadores invasivos;
- limitar tentativas de login e refresh.

Alternativa aceitavel:

- generalizar `/auth/login`, `/auth/refresh` e `/auth/logout` com contrato especifico para cliente mobile.

O contrato deve estar documentado no OpenAPI antes do aplicativo depender dele.

### 9.2 Cliente HTTP e renovacao

O cliente mobile deve:

1. enviar `Authorization: Bearer <accessToken>`;
2. ao receber `401` por expiracao, executar apenas um refresh por vez;
3. repetir uma unica vez as requisicoes que aguardavam refresh;
4. limpar sessao se o refresh falhar;
5. nunca criar loop infinito de refresh;
6. nao repetir automaticamente operacoes destrutivas sem garantia de idempotencia.

### 9.3 Recuperacao de senha

O backend atual gera link web usando `APP_PUBLIC_URL`.

Para o mobile, escolher uma estrategia antes da publicacao:

- recomendada: Universal Link/App Link HTTPS que abre o aplicativo quando instalado e o web como fallback;
- alternativa MVP: abrir a tela web de redefinicao no navegador do dispositivo.

Nao aceitar uma URL arbitraria enviada pelo usuario no endpoint de recuperacao, evitando open redirect.

### 9.4 OpenAPI

Atualizar `lib/api-spec/openapi.yaml` para refletir todas as rotas usadas pelo mobile, incluindo rotas que hoje existem no Express mas podem nao estar completas no contrato gerado:

- profile;
- apresentacao da Empresa;
- duracoes;
- timeline;
- progress board;
- avisos de recaptura;
- sessao mobile;
- filtros e paginacao.

Depois, regenerar clientes e schemas compartilhados.

### 9.5 Paginacao e volume

Listagens grandes nao devem obrigar o mobile a baixar toda a base.

Adicionar ou confirmar paginacao para:

- Clientes/Leads;
- quadro de Propostas;
- Programas e Produtos quando o volume crescer;
- avisos de recaptura;
- usuarios ADMIN.

Resposta recomendada:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "totalPages": 0
}
```

### 9.6 CORS e producao

O backend atual usa origem dinamica. Em producao web, configurar allowlist explicita. Aplicativos nativos nao dependem de CORS como navegador, mas a API continua exposta e deve manter HTTPS, rate limit e validacao.

---

## 10. Navegacao do aplicativo

### 10.1 Navegacao publica

```text
Splash
  -> Login
     -> Criar acesso COMERCIAL
     -> Esqueci minha senha
        -> Confirmacao
     -> Redefinir senha por deep link
```

### 10.2 Navegacao autenticada COMERCIAL

Bottom tabs recomendadas:

1. Propostas
2. Clientes
3. Leads
4. Avisos
5. Perfil

Acao principal `Nova Proposta` deve ficar acessivel na tela de Propostas e por botao flutuante ou botao de cabecalho, sem cobrir conteudo.

### 10.3 Navegacao autenticada ADMIN

Bottom tabs recomendadas:

1. Dashboard
2. Propostas
3. Clientes
4. Avisos
5. Menu

O Menu ADMIN abre:

- Leads;
- Usuarios;
- Empresas;
- Produtos;
- Programas;
- Tipos de Proposta;
- Meu Perfil;
- Sair.

### 10.4 Protecao de rotas

- sessao ausente: redirecionar para Login;
- sessao em restauracao: manter Splash, sem piscar telas autenticadas;
- COMERCIAL tentando acessar rota ADMIN: bloquear e voltar para Propostas;
- `403` de recurso: mostrar tela de acesso negado, sem revelar dados;
- `401` apos falha de refresh: encerrar sessao e abrir Login.

---

## 11. Requisitos funcionais por tela

### RF-01 - Splash e restauracao de sessao

- Exibir marca GTF.
- Ler tokens do SecureStore.
- Renovar access token se necessario.
- Carregar `/api/auth/me`.
- Direcionar ADMIN para Dashboard e COMERCIAL para Propostas.
- Em falha, limpar sessao e abrir Login.

### RF-02 - Login

- Logo completa GTF.
- Texto `Sistema Comercial GTF`.
- E-mail e senha.
- Mostrar/ocultar senha.
- Botao Entrar.
- Link Esqueceu a senha.
- Link Criar acesso comercial.
- Feedback claro para credencial invalida, conta inativa e indisponibilidade.

### RF-03 - Cadastro comercial

- Nome, e-mail, senha e confirmacao.
- Criar `COMERCIAL` inativo.
- Informar que o ADMIN precisa aprovar e liberar Empresas.
- Nao autenticar automaticamente conta pendente.

### RF-04 - Recuperacao de senha

- Solicitar e-mail.
- Sempre mostrar mensagem generica de seguranca.
- Suportar link de redefinicao conforme secao 9.3.
- Nova senha com no minimo 8 caracteres e confirmacao.

### RF-05 - Dashboard ADMIN

- Exibir cards clicaveis: Rascunhos, Enviadas, Aceitas e Rejeitadas.
- Nao exibir Total nem Arquivadas no fluxo atual.
- Ao tocar em um status, listar Propostas filtradas.
- Filtros: texto, Empresa, responsavel, tipo e intervalo de datas.
- Abrir detalhe/editor da Proposta.

### RF-06 - Propostas / Andamento

- Usar o conceito atual da tela `/proposals`.
- Filtros: busca, Empresa, Programa e status.
- Lista de Programas e contagem de Propostas.
- Ao selecionar Programa, mostrar somente Propostas vinculadas.
- Em tela pequena, usar navegacao em duas etapas: Programas -> Propostas do Programa.
- Card deve exibir Cliente/Lead, tipo, Empresa, responsavel, atualizacao, produtos, investimento e timeline horizontal adaptada para scroll.
- Acoes: abrir, registrar andamento, Aceita e Rejeitar.
- A acao Aceita deve usar verde; Rejeitar deve usar vermelho.

### RF-07 - Nova Proposta

- Selecionar Empresa permitida para criacao.
- Priorizar Radio 88 FM quando disponivel.
- Selecionar tipo ativo ou primeiro tipo ativo como padrao.
- Criar como `DRAFT`.
- Abrir o editor apos criacao.
- Mostrar feedback de rascunho criado.

### RF-08 - Editor de Proposta

No mobile, nao replicar o split-screen web. Usar etapas/accordeons com barra de progresso:

1. Empresa e tipo.
2. Cliente ou Lead.
3. Periodo.
4. Apresentacao somente leitura para COMERCIAL.
5. Produtos.
6. Investimento e contato.
7. Revisao e preview.

Requisitos:

- autosave com debounce e indicador `Salvando`, `Salvo` ou `Falha ao salvar`;
- permitir salvamento manual;
- nao perder alteracoes ao alternar aplicativo/foreground;
- alertar antes de sair com alteracoes nao enviadas;
- permitir mudar status conforme permissoes;
- permitir abrir Andamento da Proposta;
- `showPeriod` controla exibicao do periodo;
- contato do vendedor somente leitura;
- aviso e link para Perfil quando cargo/telefone estiverem incompletos.

### RF-09 - Cliente/Lead da Proposta

- Buscar registros existentes por texto.
- Nao exibir sugestoes invasivas enquanto nenhum termo for digitado.
- Permitir criar novo Lead no fluxo.
- Cadastro rapido de Lead exige Nome, Nome do Contato e Telefone.
- Campos adicionais continuam opcionais conforme API.
- Depois de criar, selecionar automaticamente o Lead.

### RF-10 - Produtos no editor

- Carregar somente catalogo da Empresa e permitido ao usuario.
- Filtrar por Programa e texto.
- Tocar no Produto adiciona ao plano.
- Evitar duplicacao acidental ou pedir confirmacao de quantidade.
- Editar quantidade, duracao exibida, horario e sazonalidade.
- Produto avulso usa rotulo `Nome do Produto`, descricao/informacao e Programa opcional.
- Botao excluir sempre visivel, vermelho e sem sobrepor campos.
- Mostrar valor sugerido e total calculado.

### RF-11 - Preview

- Abrir em tela cheia.
- Usar cor `station.primaryColor`.
- Exibir logo, Empresa, Cliente, tipo, periodo quando habilitado, Apresentacao, Produtos, investimento e contato.
- Preservar identidade do preview web.
- Permitir zoom sem alterar layout do documento.

### RF-12 - PDF e compartilhamento

- Gerar documento completo sem `window.print`.
- Permitir compartilhar com WhatsApp, e-mail, Drive e folha de compartilhamento do sistema.
- Nome sugerido: `Proposta-{cliente}-{data}.pdf`.
- Nao incluir token, URL privada ou dados de debug no arquivo.
- Ver estrategia tecnica na secao 16.

### RF-13 - Timeline / Andamento da Proposta

- Exibir etapas em ordem cronologica.
- Timeline horizontal ou vertical conforme largura/acessibilidade.
- Registrar etapa manual permitida com nota opcional.
- Aceitar ou rejeitar com confirmacao.
- Atualizar cache de Proposta, Cliente/Lead, Dashboard e Avisos apos mutacao.

### RF-14 - Clientes

- Listar `Advertiser.status=CLIENT`.
- Buscar por Nome.
- Criar, editar e desativar.
- Campos principais: Nome, contato, telefone, e-mail e informacao interna.
- Mostrar Propostas vinculadas respeitando `viewerCanEdit`.

### RF-15 - Leads

- Listar `Advertiser.status=LEAD`.
- Mesmo CRUD base de Clientes.
- Mostrar andamento e Propostas vinculadas.
- Nao disponibilizar promocao manual no fluxo principal; promocao ocorre por aceite da Proposta.

### RF-16 - Avisos de Recaptura

- Badge com quantidade vencida.
- Dialog/resumo depois do login, no maximo uma vez por sessao.
- Lista com filtros por texto, Empresa, marco, status e responsavel para ADMIN.
- Acoes: abrir Proposta, abrir Lead/Cliente, lembrar em 7/15/30 dias e marcar tratado.
- Atualizar badge imediatamente.

### RF-17 - Meu Perfil

- Editar nome, cargo, telefone, e-mail de contato e avatar.
- E-mail de login e perfil ficam bloqueados.
- Comprimir avatar antes de converter para base64.
- Validar limite de payload de 10 MB da API e adotar limite mobile menor.

### RF-18 - Usuarios ADMIN

- Listar e buscar usuarios.
- Criar ADMIN ou COMERCIAL.
- Editar nome, e-mail, perfil e status.
- Definir acessos por Empresa:
  - criar Propostas;
  - ver Catalogo;
  - ativo.
- Redefinir senha.
- Desativar com confirmacao.
- Preservar protecoes do ultimo ADMIN e da propria conta.

### RF-19 - Empresas ADMIN

- Listar, criar, editar e desativar.
- Nome e cor da Proposta obrigatorios.
- Color picker nativo.
- Logo, slogan, telefone, e-mail, endereco e cidade opcionais.
- Configurar ate 4 itens de Apresentacao.
- Campos legados nao devem reaparecer sem novo requisito.

### RF-20 - Programas ADMIN

- Filtrar por Empresa, texto e status.
- Criar, editar e desativar.
- Vincular obrigatoriamente a Empresa em novos registros.
- Vincular Produtos da mesma Empresa.
- Suportar icone base64 com compressao.
- COMERCIAL apenas consulta quando tiver catalogo permitido.

### RF-21 - Produtos ADMIN

- Navegar por Programa e listar Produtos.
- Manter filtros de texto e ativo.
- Criar Produto com Empresa obrigatoria e Programa opcional.
- Nome, descricao, valor sugerido e duracao.
- Criar duracao reutilizavel durante o fluxo ADMIN.
- Nao exibir cor do Produto; a Proposta usa a cor da Empresa.
- Produto sem Programa aparece como `Sem programa`.

### RF-22 - Tipos de Proposta ADMIN

- Listar, criar, editar e desativar.
- Somente tipos ativos aparecem na criacao.
- Confirmar desativacao quando houver impacto em novos cadastros.

### RF-23 - Logout

- Pedir confirmacao.
- Revogar refresh token mobile.
- Limpar SecureStore, Zustand e cache do TanStack Query.
- Voltar ao Login sem permitir retorno a telas autenticadas.

---

## 12. Contratos e endpoints existentes

Base: `/api`.

### 12.1 Publicos

```text
GET  /healthz
POST /auth/login
POST /auth/register-commercial
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/refresh        # atual, baseado em cookie web
POST /auth/logout         # atual, baseado em cookie web
```

### 12.2 Sessao e perfil

```text
GET   /auth/me
GET   /profile
PATCH /profile
```

### 12.3 Usuarios ADMIN

```text
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
POST   /users/:id/reset-password
```

### 12.4 Empresas e Apresentacao

```text
GET    /stations
POST   /stations
PATCH  /stations/:id
DELETE /stations/:id
GET    /stations/:id/presentation
PUT    /stations/:id/presentation
```

### 12.5 Clientes e Leads

```text
GET    /advertisers?status=LEAD|CLIENT&search=&active=
POST   /advertisers
GET    /advertisers/:id
PATCH  /advertisers/:id
DELETE /advertisers/:id
```

### 12.6 Catalogo

```text
GET    /product-durations
POST   /product-durations

GET    /product-templates
POST   /product-templates
PATCH  /product-templates/:id
DELETE /product-templates/:id

GET    /proposal-categories
POST   /proposal-categories
PATCH  /proposal-categories/:id
DELETE /proposal-categories/:id

GET    /proposal-types
POST   /proposal-types
PATCH  /proposal-types/:id
DELETE /proposal-types/:id
```

### 12.7 Propostas

```text
GET    /proposals/program-board
GET    /proposals/progress-board
GET    /proposals
POST   /proposals
GET    /proposals/:id
PATCH  /proposals/:id
DELETE /proposals/:id
PATCH  /proposals/:id/status
POST   /proposals/:id/duplicate
GET    /proposals/:id/timeline
POST   /proposals/:id/timeline
GET    /proposals/:id/versions
GET    /proposals/:id/versions/:versionId
```

### 12.8 Avisos

```text
GET   /recall-reminders
GET   /recall-reminders/count
PATCH /recall-reminders/:id/notify
PATCH /recall-reminders/:id/snooze
PATCH /recall-reminders/:id/done
```

### 12.9 Dashboard ADMIN

```text
GET /dashboard/stats
GET /dashboard/recent-proposals
GET /dashboard/template-usage
```

O Replit deve conferir os payloads diretamente nas rotas Express e no OpenAPI. Nao inferir nomes de campos somente pelos textos da interface web.

---

## 13. Modelo de dados relevante

### 13.1 Entidades

- `User`: conta, perfil e contato do vendedor.
- `UserStationAccess`: matriz de acesso do COMERCIAL por Empresa.
- `RefreshToken`: sessoes revogaveis.
- `PasswordResetToken`: recuperacao de senha por hash e uso unico.
- `Station`: Empresa/Emissora e identidade da Proposta.
- `StationPresentationItem`: Apresentacao padrao da Empresa.
- `Advertiser`: Lead ou Cliente.
- `ProposalCategory`: Programa.
- `ProductTemplate`: Produto de catalogo.
- `ProductDuration`: duracao reutilizavel.
- `ProposalType`: tipo comercial.
- `Proposal`: documento e negociacao.
- `ProposalProduct`: item/snapshot usado na Proposta.
- `ProposalVersion`: historico de snapshots.
- `ProposalTimeline`: andamento comercial.
- `ProposalRecallReminder`: avisos recorrentes de recaptura.

### 13.2 Identificadores e datas

- IDs sao strings CUID; nunca assumir UUID.
- Datas da API sao ISO 8601.
- O aplicativo deve formatar no locale `pt-BR` e manter o valor ISO internamente.
- Valores monetarios atuais podem chegar como string; normalizar em uma camada de dominio.

### 13.3 Imagens base64

Logo, avatar e icones podem vir como base64.

Regras mobile:

- aceitar data URI e base64 conforme payload atual;
- comprimir e redimensionar antes do upload;
- nao manter imagens grandes duplicadas no estado global;
- usar cache local de imagem quando seguro;
- tratar payload ausente com iniciais/placeholder.

---

## 14. Estado, cache e sincronizacao

### 14.1 Estado local

Zustand deve armazenar apenas:

- usuario autenticado;
- estado efemero da sessao;
- preferencias pequenas de interface.

Tokens ficam no SecureStore, nao em AsyncStorage simples.

### 14.2 Cache de servidor

TanStack Query deve controlar:

- listas e detalhes;
- loading, erro e retry;
- invalidacao depois de mutacoes;
- pull-to-refresh;
- refetch ao voltar ao foreground.

### 14.3 Chaves de cache recomendadas

```text
['me']
['stations']
['programs', filters]
['products', filters]
['advertisers', type, filters]
['proposal', id]
['proposal-progress', filters]
['proposal-timeline', id]
['recall-reminders', filters]
['recall-reminders-count']
['dashboard-stats']
['users', filters]
```

### 14.4 Autosave

- debounce entre 600 e 1000 ms;
- fila de uma mutacao ativa por Proposta;
- nao sobrescrever resposta mais nova com resposta antiga;
- ao falhar, manter estado local e permitir tentar novamente;
- antes de fechar tela, aguardar salvamento ou alertar;
- nao executar autosave enquanto dados iniciais ainda estao carregando.

### 14.5 Offline

MVP:

- permitir leitura de cache recente;
- mostrar banner sem conexao;
- bloquear mutacoes com mensagem clara;
- nao prometer sincronizacao offline.

Futuro:

- fila de rascunhos offline com versionamento e resolucao de conflitos.

---

## 15. UX/UI e identidade

### 15.1 Marca

- Nome: `GTF Propostas`.
- Subtitulo: `Sistema Comercial GTF`.
- Assets atuais:
  - `artifacts/proposta/public/brand/gtf-logo-completa.png`
  - `artifacts/proposta/public/brand/gtf-logo-horizontal.png`
- Copiar para `artifacts/mobile/assets/brand/`, preservando os originais.

### 15.2 Direcao visual

- Interface operacional, limpa e densa.
- Nao reproduzir sidebar desktop no celular.
- Usar bottom tabs e telas de detalhe.
- Cards com raio maximo de 8 px, salvo componente visual da Proposta.
- Verde para aceitar/criar/atualizar com sucesso.
- Vermelho para rejeitar/excluir/desativar.
- Amarelo para aviso.
- Cor da Empresa apenas no documento/preview e pontos contextuais, sem dominar todo o aplicativo.

### 15.3 Feedback

- Sucesso informativo: toast/snackbar nativo verde.
- Erro: toast/snackbar vermelho com texto acionavel.
- Warning: amarelo.
- Confirmacoes criticas: dialog/modal com Sim/Nao ou acao nomeada.
- Nunca usar toast para pedir confirmacao.
- Evitar multiplos toasts para uma unica acao.

### 15.4 Acessibilidade

- area de toque minima de 44x44 pt;
- suporte a Dynamic Type sem quebrar botoes;
- labels acessiveis em icones;
- contraste WCAG AA;
- nao depender apenas de cor para status;
- foco e leitura coerentes para VoiceOver/TalkBack;
- timeline deve ter alternativa textual.

### 15.5 Teclado e formularios

- evitar que teclado cubra campos e botoes;
- usar tipo de teclado adequado para e-mail, telefone e numero;
- avancar entre campos;
- mascaras visuais nao podem corromper payload;
- preservar texto multilinha e espacos na Apresentacao/descricao.

---

## 16. PDF no aplicativo

O componente web atual usa DOM, portal e CSS de impressao. Ele nao pode ser importado diretamente no React Native.

### 16.1 Estrategia MVP recomendada

1. Obter o payload completo da Proposta pela API.
2. Gerar HTML controlado no mobile com a mesma identidade da versao web.
3. Usar `expo-print` para criar o arquivo PDF.
4. Usar `expo-sharing` para compartilhar.

Regras:

- paginas A4 controladas;
- nenhum card dividido;
- Hero e Apresentacao apenas na primeira pagina;
- cabecalho resumido em continuacoes;
- investimento e contato somente na ultima pagina;
- identidade da Empresa via `primaryColor` e logo;
- ate 4 cards compactos devem caber na primeira pagina quando o conteudo permitir;
- descricoes longas exigem paginacao sem corte;
- PDF deve ser testado em Android e iOS.

### 16.2 Evolucao recomendada

Criar geracao canonica no backend:

```text
POST /api/proposals/:id/pdf
```

Beneficios:

- web e mobile recebem o mesmo arquivo;
- identidade e paginacao ficam centralizadas;
- facilita auditoria, anexos e envio futuro por e-mail.

Essa evolucao nao deve bloquear o MVP se o PDF local for validado visualmente.

---

## 17. Notificacoes

### 17.1 MVP

- badge interno de recaptura;
- resumo apos login uma vez por sessao;
- refetch ao abrir o app e voltar ao foreground;
- nenhuma permissao de push solicitada sem necessidade.

### 17.2 Fase futura - Push Expo

Exigira:

- modelo de dispositivo/push token no banco;
- endpoint de registro e revogacao de token;
- consentimento do usuario;
- job agendado no backend;
- tratamento de tokens invalidos;
- notificacao sem expor dados comerciais sensiveis na tela bloqueada.

---

## 18. Seguranca e privacidade

### 18.1 Obrigatorio

- HTTPS em homologacao e producao.
- Tokens no SecureStore.
- Bearer token em todas as rotas autenticadas.
- Nenhuma credencial em logs.
- Nenhum secret em `EXPO_PUBLIC_*`.
- Validacao de permissao no backend.
- Limpeza completa no logout.
- Redacao de Propostas de outro vendedor respeitada.
- Rate limit em login e recuperacao de senha.
- Deep links aceitam somente hosts e paths autorizados.
- Desabilitar screenshots apenas em telas realmente sensiveis, se aprovado pelo produto.

### 18.2 Dados pessoais

O aplicativo trata nomes, e-mails, telefones, CNPJ legado e informacoes comerciais. Aplicar:

- coleta minima;
- exibicao apenas conforme perfil;
- logs sem payload pessoal;
- politica de privacidade antes da publicacao;
- canal para desativacao/correcao conforme processo interno da GTF.

### 18.3 Dependencias

- respeitar `minimumReleaseAge: 1440` do workspace;
- nao desativar protecao de supply chain;
- evitar bibliotecas sem manutencao quando Expo oferece modulo oficial;
- executar auditoria antes do release.

---

## 19. Tratamento de erros

Mapeamento minimo:

| HTTP | Comportamento mobile |
|---|---|
| `400` | Mostrar validacao e manter dados do formulario |
| `401` | Tentar refresh uma vez; se falhar, Login |
| `403` | Acesso negado sem expor dados |
| `404` | Recurso removido; voltar e atualizar lista |
| `409` | Exibir conflito de negocio informado pela API |
| `429` | Informar limite e aguardar antes de repetir |
| `500+` | Mensagem generica, retry seguro e log tecnico sem segredo |

Mensagens da API podem estar em portugues ou ingles. O aplicativo deve mapear mensagens conhecidas e ter fallback em portugues.

---

## 20. Observabilidade

### 20.1 Aplicativo

Recomendado antes da producao:

- rastreamento de crashes;
- versao do app e ambiente em eventos tecnicos;
- breadcrumbs sem dados pessoais;
- medicao de falhas de login, refresh, autosave e PDF;
- nenhum token ou payload completo em telemetria.

### 20.2 API

- manter Pino;
- correlacionar requisicoes por ID;
- registrar status e rota sem query sensivel;
- diferenciar cliente web/mobile por header de versao, sem confiar nele para autorizacao.

Header sugerido:

```text
X-Client-Platform: mobile
X-Client-Version: 1.0.0
```

---

## 21. Estrategia de entrega

### Fase 0 - Preparacao do repositorio

- Criar `artifacts/mobile`.
- Configurar Expo Router, TypeScript, lint/typecheck e ambientes.
- Copiar assets de marca.
- Configurar provider de Query e tema.
- Atualizar OpenAPI e definir sessao mobile.

### Fase 1 - Fundacao e autenticacao

- Splash.
- Login.
- Cadastro comercial.
- Esqueci/redefinir senha.
- SecureStore.
- Refresh com rotacao.
- Logout.
- Guards por perfil.

### Fase 2 - Operacao COMERCIAL essencial

- Propostas/Andamento.
- Nova Proposta.
- Editor em etapas.
- Clientes e Leads.
- Timeline, aceite e rejeicao.
- Perfil.
- Avisos de recaptura.

### Fase 3 - Preview e PDF

- Preview mobile.
- Template HTML A4.
- Expo Print.
- Expo Sharing.
- QA visual contra PDF web.

### Fase 4 - Administracao

- Dashboard.
- Usuarios e acessos.
- Empresas e Apresentacao.
- Programas, Produtos, Duracoes e Tipos.

### Fase 5 - Qualidade e publicacao

- Testes automatizados.
- QA em Android/iOS.
- Homologacao com ADMIN e COMERCIAL.
- EAS Build.
- Politica de privacidade.
- Icones, splash e metadados de loja.
- Release interno antes da publicacao.

---

## 22. Testes obrigatorios

### 22.1 Unitarios

- mapeamento de enums e labels;
- calculo de investimento sugerido;
- normalizacao de moeda, telefone e datas;
- refresh single-flight;
- regras de exibicao por `viewerCanEdit`;
- montagem de paginas do PDF.

### 22.2 Integracao

- login, refresh, logout e revogacao;
- criacao e autosave de Proposta;
- mudanca de Empresa e atualizacao da Apresentacao;
- aceite promove Lead;
- rejeicao cria avisos;
- snooze e done atualizam badge;
- `403` para Proposta de outro COMERCIAL.

### 22.3 E2E

Perfis:

- ADMIN seed.
- COMERCIAL Carlos seed.
- segundo COMERCIAL para teste cruzado.

Cenarios:

1. Login e restauracao apos fechar o app.
2. Sessao expira e renova sem perder formulario.
3. COMERCIAL cria Lead e Proposta.
4. Adiciona Produtos, quantidade, horario e sazonalidade.
5. Salva, reabre e confere no web.
6. Registra andamento.
7. Rejeita e confere recaptura.
8. Aceita Proposta de Lead e confirma promocao para Cliente.
9. ADMIN gerencia acesso por Empresa.
10. COMERCIAL perde acesso e recebe `403`/lista atualizada.
11. Gera e compartilha PDF com 0, 1, 4, 5, 12 e 20 Produtos.
12. Testa app sem rede e retomada.

### 22.4 Dispositivos

- Android pequeno e medio.
- iPhone pequeno e grande.
- modo claro;
- fonte do sistema ampliada;
- teclado aberto em formularios longos;
- conexao lenta e intermitente.

---

## 23. Criterios de aceite gerais

- [ ] O aplicativo abre em Android e iOS via Expo/EAS.
- [ ] Web atual continua funcionando sem regressao.
- [ ] App usa a API existente e nao acessa o banco diretamente.
- [ ] Sessao mobile usa SecureStore e refresh rotativo/revogavel.
- [ ] ADMIN e COMERCIAL veem apenas rotas e dados permitidos.
- [ ] A API continua sendo a barreira real de autorizacao.
- [ ] COMERCIAL cria e edita somente suas Propostas.
- [ ] Acesso por Empresa respeita `canCreateProposals` e `canViewCatalog`.
- [ ] Lead vira Cliente somente apos `APPROVED`.
- [ ] Rejeicao preserva Lead e gera recaptura.
- [ ] Timeline e status ficam sincronizados com o web.
- [ ] Preview usa cor, logo e Apresentacao da Empresa.
- [ ] PDF completo pode ser compartilhado.
- [ ] Logout revoga sessao e limpa dados locais.
- [ ] Typecheck, testes e builds passam.
- [ ] Nenhum secret foi incluido no bundle ou Git.
- [ ] OpenAPI foi atualizado com contratos mobile e rotas usadas.
- [ ] Documentacao de desenvolvimento, build e release foi criada.

---

## 24. Definition of Done por funcionalidade

Uma funcionalidade so esta concluida quando:

1. interface Android e iOS implementada;
2. loading, vazio, erro e retry tratados;
3. permissoes ADMIN/COMERCIAL validadas;
4. API protege a regra;
5. cache e invalidacoes corretos;
6. acessibilidade basica validada;
7. testes relevantes adicionados;
8. typecheck e build passam;
9. comportamento conferido contra o sistema web;
10. documentacao atualizada.

---

## 25. Comandos esperados no novo pacote

Adicionar scripts na raiz sem remover os existentes:

```jsonc
{
  "scripts": {
    "mobile:start": "pnpm --filter @workspace/mobile start",
    "mobile:android": "pnpm --filter @workspace/mobile android",
    "mobile:ios": "pnpm --filter @workspace/mobile ios",
    "mobile:typecheck": "pnpm --filter @workspace/mobile typecheck"
  }
}
```

No pacote mobile:

```text
pnpm start
pnpm android
pnpm ios
pnpm typecheck
pnpm test
```

O `pnpm run typecheck` da raiz deve incluir o aplicativo.

---

## 26. CI/CD e publicacao

### 26.1 Pull requests

Validar:

- instalacao PNPM com lockfile;
- typecheck do workspace;
- testes mobile;
- validacao do Expo config;
- ausencia de secrets;
- build de preview quando aplicavel.

### 26.2 EAS

Perfis sugeridos:

- `development`: development client;
- `preview`: distribuicao interna;
- `production`: lojas.

Secrets devem ser configurados no ambiente EAS e no backend, nunca no repositorio.

### 26.3 Identidade de pacote

Definir com a GTF antes do primeiro build de loja:

- iOS bundle identifier;
- Android application ID;
- nome exibido;
- icone;
- splash;
- URLs de politica de privacidade e suporte.

Depois de publicados, identifiers nao devem ser alterados sem impacto de produto novo.

---

## 27. Riscos e mitigacoes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Refresh atual depende de cookie web | Sessao expira em 15 min | Criar contrato mobile e SecureStore antes da producao |
| OpenAPI nao cobrir todas as rotas reais | Tipos incorretos e integracao fragil | Atualizar contrato a partir das rotas Express |
| Duplicar regras no app | Divergencia web/mobile | Manter regra no backend e compartilhar enums/tipos |
| PDF web depende do DOM | PDF mobile quebrado | Expo Print no MVP e endpoint canonico no futuro |
| Listas sem paginacao | Lentidao e alto consumo | Paginar endpoints de volume |
| Base64 grande | Memoria e payload excessivos | Comprimir, limitar dimensoes e tamanho |
| Autosave concorrente | Dados antigos sobrescrevem novos | Fila por Proposta e controle de versao da mutacao |
| API de desenvolvimento em localhost | Aparelho fisico nao conecta | Usar IP LAN ou tunnel HTTPS de homologacao |
| Administracao extensa no celular | UX congestionada | Priorizar COMERCIAL e entregar ADMIN por fase |
| Push prematuro | Complexidade e privacidade | Manter recaptura in-app no MVP |

---

## 28. Decisoes fechadas para o Replit

O Replit deve seguir estas decisoes sem reinterpretar o produto:

1. Criar o app em `artifacts/mobile` no monorepo atual.
2. Manter frontend web, API e Prisma existentes.
3. Nunca conectar React Native diretamente ao PostgreSQL.
4. Usar Expo Router, TanStack Query, Zustand e SecureStore.
5. Adaptar autenticacao para refresh token mobile revogavel.
6. Implementar primeiro o fluxo COMERCIAL completo.
7. Manter ADMIN no escopo, entregue em fase posterior do mesmo produto.
8. Usar `Advertiser` para Lead e Cliente, diferenciados por status.
9. Confiar em `viewerCanEdit` e nas respostas `403` da API.
10. Nao portar shadcn/Radix; criar componentes nativos equivalentes.
11. Nao usar `window.print`; usar estrategia de PDF mobile.
12. Preservar a identidade `GTF Propostas - Sistema Comercial GTF`.
13. Atualizar OpenAPI sempre que alterar contrato.
14. Nao colocar chaves Resend, JWT ou banco no aplicativo.
15. Nao remover protecoes de supply chain do PNPM.

---

## 29. Entregaveis esperados do Replit

- codigo em `artifacts/mobile`;
- adaptacoes de API necessarias para sessao mobile;
- OpenAPI atualizado;
- testes unitarios, integracao e E2E definidos neste PRD;
- `app.config.ts` e `eas.json` sem secrets;
- README do aplicativo;
- guia de ambiente local com API Docker;
- guia de build Android/iOS;
- guia de EAS Preview e Production;
- matriz de endpoints consumidos por tela;
- checklist de QA executado;
- registro de limitacoes conhecidas.

---

## 30. Checklist de inicio para o Replit

- [ ] Clonar o repositorio completo.
- [ ] Ler as fontes da verdade da secao 2.
- [ ] Rodar web, API e Postgres existentes.
- [ ] Validar `/api/healthz`.
- [ ] Validar login ADMIN e COMERCIAL no sistema web.
- [ ] Mapear respostas reais dos endpoints.
- [ ] Atualizar OpenAPI antes de gerar novo client.
- [ ] Definir contrato de sessao mobile com o backend.
- [ ] Criar `artifacts/mobile`.
- [ ] Configurar URL da API por ambiente.
- [ ] Implementar uma vertical slice: Login -> Propostas -> Detalhe.
- [ ] Validar `403`, refresh e logout antes de expandir telas.
- [ ] Implementar o restante por fases.

---

## 31. Observacao final

Este aplicativo deve ser tratado como uma nova interface para um dominio ja existente. A qualidade da entrega depende menos de copiar pixels do frontend web e mais de preservar contratos, permissoes, estados comerciais e consistencia entre os dois clientes.

Quando uma regra parecer ausente ou ambigua, o Replit deve consultar a API, o schema e a documentacao antes de criar um novo comportamento. Mudancas de regra exigem decisao de produto e implementacao no backend, nao apenas uma condicional no aplicativo.
