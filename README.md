# Meu balanço — Projeto 2 de Programação Web Full Stack

Aplicação acadêmica de controle financeiro pessoal com React/Vite, Node/Express,
PostgreSQL e JWT. Inclui cadastro/login, CRUD, compras parceladas, relatórios,
previsão de faturas e desafio educativo de saúde financeira.

## Execução rápida

Pré-requisitos: Node.js 22.12+ (testado com 24), npm e PostgreSQL (testado com 17).
A escolha do banco e as bibliotecas devem ser comunicadas/aprovadas pelo professor,
conforme o enunciado. Não presumimos que essa aprovação já ocorreu.

1. Crie um usuário PostgreSQL e um banco vazio chamado `projeto2_financas`.
   Pelo pgAdmin, use Login/Group Roles e Databases; ou, com uma conta administradora:

   ```bash
   createuser --pwprompt financas
   createdb -O financas projeto2_financas
   ```

2. Na pasta `backend`, copie `.env.example` para `.env`. Configure DATABASE_URL
   com usuário, senha, host, porta e banco. Gere um segredo e preencha JWT_SECRET:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Nunca publique o `.env`. Use apenas dados fictícios para demonstração.

3. Terminal do back-end:

   ```bash
   cd backend
   npm ci
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

4. Outro terminal, partindo da raiz do projeto:

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

5. Abra **http://localhost:5173** (use localhost para coincidir com o CORS).
   API: http://localhost:3000. GET /status verifica conexão com o banco.

O seed cria `ana@example.com` e `bruno@example.com`, ambos com senha **Demo12345**.
Há três meses de entradas/saídas e uma compra em seis parcelas no cartão.
São contas públicas de demonstração; não usar para dados pessoais.
O seed preserva usuários existentes e não apaga registros. Se interrompido no meio,
use um banco de demonstração novo para obter a carga completa.

A migração registra o histórico em `schema_migrations` e pode ser chamada novamente.
Em um banco onde o SQL da etapa 1 tenha sido executado manualmente, prefira criar
outro banco vazio para esta entrega; não misture o histórico manual com o runner.

O front-end usa `http://localhost:3000` por padrão. Para outro endereço, copie
`frontend/.env.example` para `.env` e ajuste VITE_API_URL; reinicie o Vite.
Somente o back-end guarda segredos. Variáveis VITE_ são públicas.

## Estrutura exigida

```text
projeto2-financas/
├── backend/
│   ├── package.json / package-lock.json / .env.example
│   ├── database/       SQL, migrations e seed
│   ├── tests/          testes fora de src
│   └── src/
│       ├── server.js
│       ├── routes/     rotas e controladores
│       ├── models/     consultas e regras de negócio
│       ├── middlewares/ autenticação e erros
│       └── config/     pool de conexões
├── frontend/
│   ├── package.json / package-lock.json / index.html
│   └── src/
│       ├── main.jsx
│       ├── components/ páginas e componentes JSX; estilos
│       ├── contexts/   AuthContext
│       └── services/   cliente HTTP único
├── README.md
└── APRESENTACAO.md
```

São exatamente quatro subpastas em `backend/src`. Não existe `controllers`.
Funções puras de validação, centavos e faturas ficam em `models/regras.js`.
Consultas da aplicação ficam em models; scripts administrativos de criação/carga
ficam em database. As regras adicionais do Projeto 1 não estavam no arquivo recebido.

## Modelo e decisões

```mermaid
erDiagram
  usuarios ||--o{ categorias : possui
  usuarios ||--o{ fontes_destinos : possui
  usuarios ||--o{ lancamentos : registra
  categorias ||--o{ lancamentos : classifica
  fontes_destinos ||--o{ lancamentos : identifica
```

- E-mail e CPF têm UNIQUE no banco. E-mail é normalizado com trim/minúsculas;
  CPF é normalizado para dígitos e validado pelos dígitos verificadores na API.
- Categorias são únicas por usuário, nome e tipo, conforme RF4 e DDL do professor.
- Senha usa bcrypt com custo 12 e salt. Exigimos 8 caracteres, letras e números,
  confirmação e limite de 72 bytes para evitar truncamento do bcrypt.
- JWT HS256 expira em uma hora e exige emissor/destinatário. O usuário vem do sub
  assinado; nunca de usuario_id enviado pelo navegador.
- sessionStorage mantém a sessão ao recarregar. Logout descarta o token; não há
  revogação central de JWT. Rotas protegidas consultam o servidor e o cliente
  HTTP encerra sessão no 401. Um timer também encerra a sessão na expiração.
- FK composta `(categoria_id,usuario_id,tipo)` impede categoria de outro usuário
  ou tipo. A FK de fonte/destino inclui usuario_id. A API também valida essas
  relações e filtra as operações por usuário. Dado alheio resulta em 404.
- Valores são NUMERIC(12,2) no banco e strings decimais na API. Divisão usa
  centavos inteiros. R$ 100,00 em 3× = 33,34 + 33,33 + 33,33. Se alguma parcela
  ficasse em zero centavo, rejeitamos. Intervalo permitido: 1–48 parcelas.
- Cadastro e parcelas são transações com a mesma conexão e rollback em falha.
  Leituras de categoria/fonte usam bloqueios para proteger as relações durante
  uma gravação concorrente.
- `data_compra` preserva a data original. Para cartão, `data` é o vencimento e
  `data_fechamento_fatura` guarda o ciclo calculado. Para outros tipos, data é a
  data da movimentação. Assim, filtros e relatórios incluem parcelas no mês do
  vencimento. Essa opção é expressamente admitida na seção de faturas.
- Compra feita no fechamento entra no próximo ciclo. A parcela k desloca o
  primeiro ciclo em k−1 meses. Dias inexistentes são ajustados ao último dia.
  Vencimento é no mesmo mês apenas quando seu dia é maior que o fechamento.
- Faturas mostram a atual aberta + três próximas. Limite comprometido inclui
  todas as parcelas com vencimento hoje ou depois, mesmo fora da janela exibida.
  Não há quitação/estorno: usamos o critério de “ainda não vencidas” do enunciado.
  Limite disponível negativo é mostrado; compra acima do limite não é bloqueada.
- A edição altera somente uma parcela. O valor no PUT é o valor da parcela.
  Em grupos, não alterar quantidade, cartão ou data original; excluir/recriar
  para reestruturar a compra. A interface permite excluir uma ou todas.
- Categoria/fonte utilizada não pode ser excluída. Cartão com lançamentos permite
  editar nome/limite, mas bloqueia mudança de tipo/ciclo para preservar faturas.
- Não há exclusão de usuário. FKs não apagam histórico em cascata.
- Relatórios usam SUM/GROUP BY no servidor. Os totais da listagem são do filtro
  completo; a paginação mostra 20 registros por página.
- Mês completo compara com o mês anterior. Intervalos personalizados comparam
  com o intervalo imediatamente anterior de igual quantidade de dias. Base
  anterior zero aparece como “sem base anterior”, sem divisão por zero.
- Use uma única despesa para cada compra: não lançar novamente o pagamento da
  fatura como saída, pois o modelo não contém transferências entre contas.

## Validação e segurança

Servidor valida campos obrigatórios, tamanho, enums, CPF, senha, IDs, valor,
datas reais, intervalo, cartões e relações. Formulários complementam com tipos,
limites e required e exibem os erros do servidor junto aos campos.
Consultas usam parâmetros; nomes interpolados de tabelas vêm de uma lista interna.
CORS é restrito a FRONTEND_ORIGIN; não é mecanismo de autenticação.
Login/cadastro têm limite de 30 tentativas por IP em 15 minutos (memória local).
Erros não devolvem SQL, detalhes internos ou senha_hash. Não usamos HTML do usuário.
API e servidor de desenvolvimento escutam somente localmente nesta configuração.

Padrão de erro:

```json
{"erro":"Dados inválidos.","campos":{"valor":"O valor deve ser maior que zero."}}
```

Códigos: 201 criado; 200 consulta/edição; 204 exclusão; 400 validação;
401 autenticação; 404 recurso não encontrado ou de outro usuário;
409 duplicidade/vínculo; 429 tentativas excessivas; 500 falha interna genérica.

## Rotas

Todas as rotas /api exigem Bearer JWT, exceto cadastro/login.

| Método | Rota | Finalidade |
|---|---|---|
| POST | /api/auth/cadastro | nome, email, cpf, senha, confirmacaoSenha |
| POST | /api/auth/login | email, senha → token e usuário |
| GET | /api/auth/me | usuário da sessão |
| GET / POST | /api/categorias | listar / criar |
| PUT / DELETE | /api/categorias/:id | editar / excluir |
| GET / POST | /api/fontes-destinos | listar / criar |
| PUT / DELETE | /api/fontes-destinos/:id | editar / excluir |
| GET / POST | /api/lancamentos | listar / criar uma compra ou movimentação |
| GET / PUT / DELETE | /api/lancamentos/:id | detalhe / editar / excluir |
| GET | /api/relatorios/categorias | totais, percentuais e período anterior |
| GET | /api/relatorios/fontes-destinos | entradas, saídas e saldo de contas |
| GET | /api/relatorios/faturas?meses=3 | atual aberta + próximas 3 |
| GET | /api/saude-financeira | indicadores, projeção e dicas |

Listagem aceita `inicio`, `fim`, `tipo`, `categoriaId`, `fonteDestinoId`, `pagina`.
Relatórios por categoria/fonte aceitam inicio/fim. Datas: AAAA-MM-DD.
DELETE de lançamento aceita `?todasParcelas=true` ou `false`.

Exemplo de POST /api/lancamentos (IDs precisam pertencer ao usuário):

```json
{
  "tipo":"saida", "descricao":"Livro", "valor":"100.00",
  "data":"2026-11-03", "categoriaId":7, "fonteDestinoId":2,
  "totalParcelas":3
}
```

## Testes

Unitários (não precisam de banco):

```bash
cd backend
npm test
```

Integração usa banco exclusivo terminado em `_test` e APAGA somente seu conteúdo.
Configure TEST_DATABASE_URL no `.env`. Crie esse banco e aplique as mesmas migrations.
Em Linux/macOS, partindo de backend (substitua pela URL de teste):

```bash
DATABASE_URL='postgresql://usuario:senha@localhost:5432/projeto2_financas_test' npm run db:migrate
npm run test:integration
```

No PowerShell, defina `$env:DATABASE_URL` antes da migração e remova essa variável
com `Remove-Item Env:DATABASE_URL` depois. O teste usa TEST_DATABASE_URL e a impõe
antes de importar o pool. Nunca use um banco de dados pessoais com sufixo `_test`.

Validação realizada: 12 casos unitários e 19 cenários de integração dentro de
um teste principal (o runner informa 20). Cenários incluem autenticação, CPF,
normalização/duplicatas, isolamento, FK, CRUD, parcelas, faturas, paginação e rollback.
Front-end: `npm run build`. Conferência manual no navegador descrita na entrega.

## Saúde financeira (desafio)

Indicadores: renda média mensal, taxa de poupança e parcelas futuras divididas
pela renda média mensal; também devolvemos despesa média. Base: três meses
completos anteriores, incluindo meses vazios como zero. Renda zero produz taxa
nula e uma dica para completar os registros. Meta de poupança 20% e alerta de
comprometimento acima de 50% são heurísticas educativas, não regras universais.

Projeção: saldo registrado antes do mês atual + (renda média − despesa média)
por seis meses. Não é previsão probabilística e não soma novamente parcelas
futuras. As faturas mostram os compromissos futuros separadamente. Dicas são
calculadas localmente, sem serviço externo. O aviso educativo é visível na tela.

## Limitações e entrega

- Sem deploy público, sincronização bancária, recuperação de senha ou revogação
  de token; não são requisitos deste projeto. A configuração é para demonstração local.
- Auditoria das dependências: back-end sem alertas na instalação; front-end com
  quatro alertas transitivos de desenvolvimento ligados a picomatch/Vite.
  O aviso GHSA-fc5q-39xc-vjpf não possui versão corrigida publicada na consulta.
  Não aplicamos downgrade automático sugerido pelo audit. O projeto não recebe
  padrões glob de usuários e o Vite permanece restrito ao computador local.
  Referência: https://github.com/advisories/GHSA-fc5q-39xc-vjpf
- Não entregar node_modules, .env ou banco local. Os lockfiles devem acompanhar
  o código para que `npm ci` reproduza as versões testadas.
- O professor exige histórico incremental dos integrantes. Não foi inventado
  histórico retroativo. Faça commits reais das próximas revisões e ensaios.
- Veja `APRESENTACAO.md` para o roteiro e explicações.

Referências: https://www.postgresql.org/docs/current/ddl-constraints.html,
https://expressjs.com/, https://vite.dev/guide/.
