# TPServiços

Marketplace local de serviços. Este projeto é independente do MeuSuporte que está na raiz do repositório.

## Governança de desenvolvimento

As regras persistentes de trabalho estão em [AGENTS.md](AGENTS.md). Antes de alterar o código, consulte também o [diagnóstico inicial](docs/INITIAL_DIAGNOSTIC.md), a documentação de [contexto](docs/PROJECT_CONTEXT.md), [arquitetura](docs/ARCHITECTURE.md), [banco](docs/DATABASE.md), [testes](docs/TESTING.md), [decisões](docs/DECISIONS.md) e [pendências conhecidas](docs/KNOWN_ISSUES.md).

## Stack inicial

- Web: React, TypeScript e Vite.
- API: NestJS, TypeScript e Prisma.
- Banco: PostgreSQL.
- Autenticação: senha com Argon2id, access token curto e refresh token rotativo em cookie HttpOnly.

## MVP em desenvolvimento

- Clientes publicam pedidos sem custo.
- Prestadores configuram perfil, categorias e cidades atendidas.
- Prestadores encontram oportunidades compatíveis e desbloqueiam contato com créditos.
- Ledger audita créditos comprados, usados e devolvidos.
- Compras de créditos ficam pendentes de confirmação administrativa até a integração de um provedor de pagamento.
- Propostas aceitas vinculam um profissional ao pedido; somente este profissional pode receber a avaliação após a conclusão.
- Recuperação de senha e confirmação de e-mail usam tokens de uso único. Para entrega em produção, configure Resend (ou substitua o adaptador em `AuthService`) com `RESEND_API_KEY`, `EMAIL_FROM` e `APP_PUBLIC_URL`.
- Perfis em destaque são opcionais e ficam para a próxima etapa.

## Desenvolvimento local

1. Copie `.env.example` para `.env`. Troque os dois segredos JWT por valores aleatórios longos e defina uma senha forte para o administrador.
2. Inicie PostgreSQL, Redis, API e Web: `docker compose up --build`.
3. Acesse `http://localhost:8080`. A primeira inicialização aplica migrations e categorias automaticamente.

Para desenvolvimento com recarga automática, inicie PostgreSQL e Redis (`docker compose up -d postgres redis`), instale dependências com `npm install`, gere o cliente (`npm run db:generate`), aplique migrations e seed (`npm run db:migrate` e `npm run db:seed`) e rode `npm run dev`. Nesse modo, Web: `http://localhost:5180`; API: `http://localhost:3100`. O Vite encaminha `/api` para a API. O Compose usa um serviço de migração separado antes de iniciar a API.

O seed cria categorias iniciais e o administrador definido por `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Compras de créditos ficam pendentes para validação administrativa até existir integração com um provedor de pagamento. Não use credenciais de desenvolvimento em produção; configure também `COOKIE_SECURE=true` com HTTPS.

## Antes de publicar

- Configure `APP_PUBLIC_URL` como a URL pública HTTPS, `RESEND_API_KEY` e `EMAIL_FROM` para que confirmação de e-mail e recuperação de senha sejam entregues aos usuários.
- Integre um provedor de pagamento no fluxo de `CreditPurchase` antes de prometer checkout automático. O painel já registra referência de pagamento e aprova créditos de forma auditável, mas não processa cartões ou PIX sem uma credencial de adquirente.
- Armazene imagens, anexos de conversa e documentos de verificação em um storage privado com URLs assinadas. A interface aceita links HTTPS; documentos de verificação nunca são exibidos no perfil público.

## Qualidade e segurança

- Execute `npm test` para verificar regras críticas de segurança que não dependem de serviços externos.
- A criação de conta exige senha de pelo menos 10 caracteres, com letra maiúscula, minúscula e número.
- As rotas de autenticação que criam ou usam o cookie de atualização aceitam somente `POST`s da origem configurada em `WEB_ORIGIN`.
- Após iniciar o PostgreSQL, aplique as alterações não destrutivas do banco com `npm run db:migrate`.
- Consulte [a auditoria e o plano incremental](docs/AUDITORIA-E-PLANO.md) para o estado atual, riscos conhecidos e a ordem de evolução.

## Operação e escala

- A API limita requisições com contadores compartilhados no Redis. Se o Redis ficar indisponível, a API continua respondendo com limite local por processo; `tpservicos_rate_limit_fallback_total` mostra esse modo degradado. Nesse intervalo, o limite não é global entre réplicas.
- Configure `METRICS_TOKEN` com pelo menos 32 caracteres aleatórios para habilitar `GET /api/metrics`. O endpoint exige `Authorization: Bearer <token>` e expõe contadores, latência em buckets, requisições em andamento e uptime. Sem token, o endpoint retorna 404. Em produção, monitore cada réplica da API individualmente.
- `DB_CONNECTION_LIMIT` configura o pool Prisma por réplica. Dimensione o total como `réplicas × limite` e deixe margem para migrações, administração e conexões do próprio PostgreSQL.
- A API pode ser replicada no Compose com `docker compose up -d --scale api=3`; Redis compartilha os limites e o Nginx reconsulta o DNS interno do Docker. Para produção, configure um alvo de scrape por réplica em vez de coletar métricas pelo balanceador.
- No Compose local, somente a Web fica acessível em `127.0.0.1:8080`; PostgreSQL fica restrito ao loopback em `127.0.0.1:5433`. A API e Redis permanecem na rede interna do Compose.
- Para produção, use HTTPS, segredos próprios, backups testados do PostgreSQL e um serviço gerenciado para banco/Redis. O endpoint de métricas deve ficar acessível apenas à rede de monitoramento.
