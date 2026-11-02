# Auditoria técnica — TPServiços

> Registro histórico da auditoria de 29 de outubro de 2026. Para o contexto operacional atual, consulte `PROJECT_CONTEXT.md`, `KNOWN_ISSUES.md`, `TESTING.md` e `DECISIONS.md`.

Data da auditoria: 29 de outubro de 2026.

## Estado atual

O projeto é um monorepo npm com uma aplicação web React 19/Vite e uma API NestJS 11/Prisma 6. O PostgreSQL é o banco transacional e o Redis suporta o rate limit compartilhado. A aplicação é um **marketplace de oportunidades com créditos**, e não ainda o marketplace completo de contratação, agenda, chat e pagamentos descrito na visão de produto.

Funcionalidades efetivamente implementadas:

- Cadastro, login, token de acesso curto e refresh token rotativo em cookie `HttpOnly`.
- Perfis de prestador, categorias, regiões atendidas e busca pública paginada.
- Publicação de pedidos por clientes e desbloqueio de contatos por profissionais com débito transacional de créditos.
- Carteira, livro-razão de créditos, solicitações de estorno e revisão administrativa.
- Avaliação única após conclusão do pedido, com validação de que o profissional liberou o contato.
- Catálogo e aprovação administrativa de publicidade patrocinada.
- Health checks, métricas protegidas por token, Docker Compose e limite distribuído via Redis, com fallback local documentado.

## Pontos fortes

- O banco possui relações explícitas, constraints financeiras e índices para os caminhos principais.
- O fluxo de desbloqueio usa transação, update condicional de saldo e idempotência pelo par prestador/pedido.
- Autorização é aplicada no backend com guardas JWT e papéis; não depende apenas de esconder elementos da interface.
- Senhas usam Argon2id e tokens de atualização são armazenados como hashes.
- Validação global rejeita campos inesperados e o backend já aplica Helmet, CORS e rate limit.

## Problemas e riscos identificados

1. Não havia testes automatizados, pipeline de CI ou documentação de endpoints. O build passa, mas não prova regras de negócio.
2. A interface está concentrada em `apps/web/src/main.tsx` (mais de 3 mil linhas) e o CSS em um único arquivo com seletores repetidos. Isso torna a evolução e a revisão mais arriscadas.
3. O pedido não possuía trilha persistida de mudanças de estado; apenas o status atual era gravado.
4. As rotas de autenticação dependiam de `SameSite=Lax`, sem validação explícita de origem para operações que criam ou usam o cookie de sessão.
5. Não há verificação de e-mail, recuperação de senha, edição de dados do cliente, upload próprio de arquivos, moderação, chat, agenda, notificações ou fluxo de orçamento/contratação.
6. Perfis públicos são resumidos: ainda não há página detalhada, portfólio, preço, disponibilidade nem indicadores de serviço concluído.
7. A compra de créditos e a publicidade são propositalmente manuais. Não há gateway, idempotência de webhook ou conciliação automática de pagamento.
8. A auditoria de dependências não pôde consultar o registro npm por falha local de certificado da cadeia TLS; isso precisa ser resolvido no ambiente de CI antes da liberação.

## Alterações desta primeira entrega

- Criada a migração não destrutiva `20261029000100_request_status_history`, com histórico de status, autor e data para cada pedido novo, concluído ou cancelado.
- O histórico é retornado para o cliente e exibido no painel, que agora também permite cancelar um pedido aberto.
- Adicionada validação de origem para `register`, `login`, `refresh` e `logout`; as respostas de autenticação não podem ser armazenadas em cache.
- `refresh` e `logout` receberam limites específicos, e a política de senha de novas contas foi reforçada.
- Introduzido o primeiro teste automatizado de política de origem e o comando `npm test`.
- Evoluída a página inicial com um sistema visual consistente (superfícies, cores, foco acessível, estados de carregamento e responsividade), além de destaques que consomem dados reais de perfis, demanda e avaliações verificadas.
- Adicionados `GET /api/providers/highlights` e `GET /api/categories/highlights`. Quando não há pedidos ou avaliações suficientes, a interface mostra um estado vazio honesto em vez de métricas ou depoimentos fictícios.
- Adicionada a gestão administrativa de usuários: administradores podem consultar as 50 contas mais recentes e criar contas de cliente ou profissional. A senha inicial exige complexidade mínima, é confirmada na interface, recebe hash Argon2id no servidor e nunca é retornada pela API.

> A migração foi criada, validada e aplicada ao PostgreSQL local em 29 de outubro de 2026. Em ambientes novos, execute `npm run db:migrate` com PostgreSQL acessível para criar a tabela de histórico.

## Plano priorizado

1. **Fundação e qualidade (em andamento):** dividir a interface por domínio, tipar respostas que ainda usam `any`, ampliar testes de API e integrar formatação, testes, build e `npm audit` no CI.
2. **Jornada de contratação:** modelar orçamento, proposta, contratação e histórico de eventos; só então incluir os estados de negócio restantes e avaliações vinculadas à contratação escolhida.
3. **Catálogo premium:** página pública detalhada de profissional, especialidades, preço orientativo, portfólio, disponibilidade, busca por relevância e filtros adicionais.
4. **Operação:** chat, notificações, agenda e moderação. Esses módulos precisam de regras de permissão e retenção de dados antes da interface.
5. **Administração e monetização:** RBAC granular, logs administrativos, pagamentos por provedor, idempotência de webhook, conciliação e trilha financeira.
6. **Produção:** e-mail verificado, recuperação de senha, armazenamento de arquivos, política LGPD, backups testados, alertas, deploy com HTTPS e revisão OWASP.
