
## Implementado - Redesign Proposta, Clientes, Leads e Cor da Empresa

- Sidebar: `Anunciantes` passou a aparecer como `Clientes`.
- Sidebar: criada entrada `Leads` abaixo de Clientes.
- Banco: `Advertiser.status` separa `LEAD` e `CLIENT`.
- Banco: `Station.primaryColor` define a cor padrao da proposta, com default `#427EFF`.
- Clientes/Leads: formulario usa `Nome`, remove `Razao Social` da UI e troca `Observacoes` por `Informacao Interna`.
- Propostas: ao marcar proposta vinculada a Lead como `Aprovada`, o backend promove o Lead para Cliente.
- Editor de proposta: bloco `Apresentacao` permite ate 4 itens com destaque e descricao.
- Preview da proposta: layout redesenhado com Header, Hero, Apresentacao, Plano de Acoes, Investimento e Rodape.
- Preview da proposta: cards de produto e hero usam a cor da Empresa selecionada.

## Implementado - Produtos com Duracao, Horario e Sazonalidade

- Banco: criado cadastro reutilizavel de duracoes de produto.
- Banco: `ProductTemplate` agora pode referenciar uma duracao.
- Banco: `ProposalProduct` guarda `durationLabel`, `airTime` e `seasonality`.
- API: criada rota `/api/product-durations` para listar/criar duracoes.
- Produtos: formulario ADMIN removeu `Nome interno`, `Quantidade` e `Valor sugerido maximo`.
- Produtos: formulario ADMIN usa `Programa`, `Nome do Produto`, `Duracao` e `Valor sugerido`.
- Programas: criacao inline de produto segue os mesmos campos simplificados.
- Propostas: item do plano de acoes permite preencher `Horario` e `Sazonalidade`.
- Propostas: sugestao de investimento usa valor sugerido unico do produto multiplicado pela quantidade.
- Preview/PDF: duracao, horario e sazonalidade aparecem no card do produto somente quando preenchidos.

## Backlog / Pendencias Futuras

NA SIDEBAR COLOCAR ABAIXO DE ANUNCIANTES (QUE SERA CLIENTES O NOME, NÃO MAIS ANUNCIANTES) CRIAR LEADS (Que será a tela daqueles que ainda não Clientes)

    Dentro da tela de Criação de Clientes:
    Nome fantasia será Nome
    Retirar Razão Social do form
    Observações (trocar para informação interna Informação Interna)
    (createdAt - UpdatedAt já está no banco de dados para propostas? clientes? )

CRIAR EMISSORA:
    - A EMISSORA DEVE TER UMA COR PADRÃO AO SER CRIADA, ESSA COR SERÁ A COR DO FORMULÁRIO DE PROPOSTA DELA QUANDO SELECIONADO ESSA EMISSORA ASSIM COMO NA FOTO QUE LHE ENVIEI QUE SERÁ O PADRÃO DE FORMULÁRIO

----------- FALTA ABAIXO ------

CRIAR PROPOSTA - (atualmlente tem uma tela que ao clicar em propostas, cai em uma tela que exibe os programas, retirar essa tela de pré proposta que tem nesse  momento e cair na ideia abaixo):
    - TELA DE PROPOSTA QUANDO CLICAR NA SIDEBAR "PROPOSTAS" DEVE ABRIR UMA TELA QUE EXIBE PROGRAMAS COM SEUS PRODUTOS: 
        ADICIONAR FILTROS: BUSCA POR TEXT - SELEÇÃO DE EMISSORA - SELEÇÃO DE PROGRAMA - STATUS DE PROPOSTAS
        AO FILTRAR - E VIR O PROGRAMA CLICAR NO PROGRAMA E IR PARA AS PROPOSTAS VINCULADAS A ESSE PROGRAMA E VIR HIERARQUICAMENTE AS INFORMAÇÕES DOS MESMOS, COM UM PADRÃO DE DESIGN PARA FÁCIL ENTENDIMENTO DO USUÁRIO.
    - CLIENTE: AO SETAR CLIENTE NAO VER SUGESTÕES DE CLIENTE (Button => NOVO LEAD)
    - PRODUTO: REMOVER BOTAO INSERIR NA PROPOSTA/ADICIONAR PRODUTO NO CATALOGO, AO ABRIR O SELECT DE PRODUTOS, PESQUISA, CLICOU NO PRODUTO ELE VAI PRA PROPOSTA - Botão Criar Produto Novo em vez de Adicionar Produto Avulso - Botão excluir produto sempre visivel e deve ser vermelho - retirar campo tags
    - TIPOGRAFIA DA PÁGINA DO PDF DE PROPOSTAS DEVE SER MONTESSERRAT - A FOLHA EM TAMANHO A4 para impressão e um bom PDF
    - AJUSTAR PARA QUE AO CLICAR NO BOTÃO PDF A IMPRESSÃO FIQUE CORRETA, COMPLETA E NÃO COMO ESTÁ AGORA

TELA DE PROGRAMAS -> CRIAR PROGRAMA -> 
______________________________________

APÓS
DASHBOARD: 

PERMITIR COMERCIAL TRANSITAR CLIENTES:

SISTEMA DE AVISO RECORRENTE: 
