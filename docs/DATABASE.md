# Banco de dados e migrations

## Banco e ORM

PostgreSQL é o banco transacional, acessado por Prisma. O schema canônico é `apps/api/prisma/schema.prisma`; migrations ficam em `apps/api/prisma/migrations/`.

## Grupos de entidades

| Grupo         | Entidades                                                                                                  |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Identidade    | `User`, `RefreshSession`, `SecurityToken`                                                                  |
| Profissionais | `ProviderProfile`, `ServiceCategory`, `ProviderCategory`                                                   |
| Contratação   | `ServiceRequest`, `ServiceRequestStatusHistory`, `Proposal`, `DirectMessage`, `Rating`                     |
| Créditos      | `CreditAccount`, `CreditLedgerEntry`, `CreditPackage`, `CreditPurchase`, `LeadUnlock`, `LeadRefundRequest` |
| Operação      | `AppNotification`, `PlatformReport`, `AuditLog`, publicidade patrocinada                                   |

## Integridade essencial

- E-mail, perfil e carteira são únicos por usuário.
- Uma proposta é única por pedido/prestador; uma avaliação é única por pedido.
- Avaliação exige pedido concluído e profissional aceito.
- Desbloqueio é único por prestador/pedido e saldo não pode ficar negativo.
- Crédito, estorno e contratação usam transações e verificações condicionais.

## Política de migration

1. Nunca editar migration já aplicada.
2. Criar migration nova e não destrutiva para qualquer alteração de schema.
3. Evitar remoções em produção; preferir expansão, migração de dados e compatibilidade.
4. Executar `npm run db:generate` e `npm run db:migrate` antes de aprovar.
5. Validar criação, leitura, autorização e integridade do fluxo relacionado.

## Privacidade de localização

Latitude e longitude são dados de localização sensíveis. A interface promete região aproximada; qualquer resposta pública deve limitar a precisão. A exposição atual está registrada em `docs/KNOWN_ISSUES.md`.
