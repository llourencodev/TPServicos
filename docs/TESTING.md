# Testes e validação

## Baseline verificado em 1º de novembro de 2026

| Check                                     | Resultado                                                                   |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `npm run build`                           | Aprovado: API NestJS e web Vite compilam                                    |
| `npm test`                                | Aprovado: 1 teste de política de origem                                     |
| `npm run format:check`                    | Aprovado                                                                    |
| `npm run db:migrate`                      | Aprovado: 7 migrations, nenhuma pendente                                    |
| `npm audit --omit=dev --audit-level=high` | Bloqueado por certificado TLS local não verificável ao acessar registry npm |

## Suíte existente

- `apps/api/test/origin-policy.spec.ts`: aceita apenas origem configurada para autenticação baseada em cookie.

Essa cobertura não prova regras de negócio nem regressão completa.

## Matriz mínima

| Área                      | Validação mínima                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Auth/sessão               | origem, login, refresh, logout, permissão e sessão revogada                           |
| Pedido/proposta/avaliação | estados válidos/inválidos, autorização e concorrência                                 |
| Créditos/pagamentos       | saldo, idempotência, ledger, estorno e revisão admin                                  |
| Prisma                    | generate, migrate, consulta relacionada e integridade                                 |
| API                       | sucesso, 400, 401, 403 e 404                                                          |
| Interface                 | rota direta, sessão ativa, loading/erro/vazio, mobile e navegação sem âncora indevida |
| Segurança                 | dados sensíveis, RBAC, entrada inesperada, logs e configuração                        |

## Prioridade de expansão

1. Testes Nest de créditos, proposta aceita, avaliação e autorização.
2. Integração HTTP de login, refresh e erros principais.
3. Vitest/Testing Library para componentes críticos.
4. E2E para páginas públicas, sessão admin e carregamento de imagens.
5. CI que execute format, build, testes, migrate em banco efêmero e audit com CA confiável.
