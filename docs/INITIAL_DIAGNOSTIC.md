# Diagnóstico inicial do repositório

Data: 1º de novembro de 2026.

## Resultado executivo

O projeto compila, a migration está consistente com o banco local e o teste automatizado existente passa. A base técnica é funcional e já possui módulos de negócio relevantes, porém ainda não tem cobertura automatizada, CI ou controles operacionais suficientes para lançamento em produção sem trabalho adicional.

## Erros críticos

Nenhum erro crítico de compilação, migration pendente ou teste existente reprovado foi encontrado no diagnóstico.

## Vulnerabilidades e riscos de segurança

| Prioridade | Achado                                                      | Evidência / impacto                                                                        |
| ---------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| P0         | Coordenadas de profissionais retornadas publicamente        | Pode contrariar a promessa de exibir somente região aproximada e expor localização precisa |
| P1         | `COOKIE_SECURE` tem fallback `false` no Compose de produção | Exige configuração explícita de HTTPS antes de lançamento                                  |
| P1         | Auditoria npm indisponível                                  | CA local não confiável impede conhecer vulnerabilidades de dependências                    |
| P2         | Leaflet/CDN sem política CSP/SRI local                      | Disponibilidade, privacidade e supply chain precisam de revisão                            |
| P2         | Sem limpeza de tokens/sessões/auditoria                     | Crescimento e retenção de dados sem política operacional                                   |

Pontos positivos: Argon2id, refresh hashado e rotativo, RBAC no backend, DTOs validados, Helmet, CORS restrito, Prisma sem SQL cru identificado e métricas protegidas.

## Problemas funcionais e de produto

- Pagamentos de créditos e anúncios são manuais; não há gateway, webhooks idempotentes ou conciliação.
- E-mail de recuperação/verificação depende de configuração externa e confirmação não é requisito para todas as ações sensíveis.
- Uploads próprios, storage privado, URLs assinadas e varredura de arquivos não existem.
- Conversas não possuem paginação e são limitadas a 200 mensagens.

## Problemas de qualidade e desempenho

- Há somente um teste automatizado de política de origem; não existem testes web, E2E, integração de banco, autorização ou fluxos financeiros.
- Não há repositório Git nem CI detectado neste diretório.
- `main.tsx` e `style.css` são grandes e concentram responsabilidades; resposta de admin ainda usa diversos `any`.
- Páginas públicas fazem carregamentos além do necessário para rotas legais/perfil; imagens editoriais e bundle precisam de estratégia de otimização conforme o produto crescer.
- Busca usa `contains`; medir antes de introduzir índice trigram ou mecanismo de busca.

## Arquitetura atual

- Monorepo npm: React/Vite na web e NestJS/Prisma na API.
- PostgreSQL transacional e Redis para rate limit compartilhado, com fallback local.
- Domínios de API: auth, providers, requests, wallet, admin, advertising, reports, notifications, health, metrics e rate-limit.
- Migrations são incrementais e o fluxo financeiro usa transações/retry.

## Baseline executado

| Comando                                   | Resultado                                           |
| ----------------------------------------- | --------------------------------------------------- |
| `npm run build`                           | aprovado                                            |
| `npm test`                                | aprovado: 1 teste                                   |
| `npm run format:check`                    | aprovado                                            |
| `npm run db:migrate`                      | aprovado: 7 migrations, sem pendência               |
| `npm audit --omit=dev --audit-level=high` | bloqueado: `unable to verify the first certificate` |

## Plano recomendado

1. Corrigir a privacidade de coordenadas públicas e criar testes de autorização/contratação antes de novas evoluções grandes.
2. Inicializar Git e CI com format, build, testes, migration em banco efêmero e audit em ambiente com CA confiável.
3. Cobrir créditos, proposta, avaliação, mensagens, sessões e RBAC com testes de serviço e HTTP.
4. Definir escolhas de negócio para pagamento, storage privado e e-mail de produção.
5. Modularizar frontend e roteamento manual somente depois das regressões de navegação estarem automatizadas.
