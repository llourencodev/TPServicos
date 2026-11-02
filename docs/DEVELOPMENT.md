# Desenvolvimento

## Pré-requisitos

- Node.js 22 ou superior.
- Docker Desktop para PostgreSQL e Redis locais.
- Arquivo `.env` baseado em `.env.example`, com segredos próprios e fora do versionamento.

## Comandos

```powershell
npm install
docker compose up -d postgres redis
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Checks obrigatórios após código:

```powershell
npm run build
npm test
npm run format:check
```

Para schema, acrescentar `npm run db:migrate`. Para interface, testar URLs afetadas no navegador, inclusive sessão autenticada quando aplicável.

## Padrões

- **Backend:** DTO validado, autorização no servidor, erros explícitos e transação para mudanças financeiras ou concorrentes.
- **Frontend:** respostas reais de API, estados de loading/erro/vazio, URLs próprias e responsividade preservada.
- **Banco:** somente Prisma e migrations; não alterar schema manualmente.
- **Documentação:** registrar decisões não óbvias e atualizar changelog após entrega relevante.

## Roteamento atual

Não há biblioteca de router. URLs públicas, painéis e admin são resolvidos em `apps/web/src/main.tsx`. Uma URL pública deve continuar pública mesmo com sessão ativa; URL de painel precisa ser explícita.

## Operação e segredos

Nunca passar credenciais por argumentos de shell, commits, logs ou documentação. Em produção HTTPS, `COOKIE_SECURE=true` deve ser obrigatório; o fallback atual do Compose é adequado apenas ao desenvolvimento HTTP local. E-mail, pagamentos e storage só podem ser ativados com configuração e validação explícitas.
