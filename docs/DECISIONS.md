# Decisões arquiteturais

| Data    | Decisão                                            | Motivo                                            | Consequência                                             |
| ------- | -------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| 2026-10 | PostgreSQL + Prisma                                | Relações e regras financeiras exigem consistência | Toda alteração de schema exige migration incremental     |
| 2026-10 | Argon2id, JWT curto e refresh rotativo             | Reduz exposição de senha e permite revogar sessão | Rotas sensíveis seguem a mesma política                  |
| 2026-10 | Redis com fallback local                           | Rate limit distribuído sem indisponibilizar API   | Fallback precisa de métrica/alerta em produção           |
| 2026-10 | Créditos, estornos e desbloqueios em transação     | Evita saldo incorreto e duplicidade               | Regra financeira não vai ao frontend                     |
| 2026-10 | Aprovação manual para créditos/publicidade         | Não há gateway configurado                        | Não prometer checkout automático sem webhook/conciliação |
| 2026-10 | Tokens de uso único para recuperação/verificação   | Aumenta segurança operacional                     | Exige e-mail antes do lançamento                         |
| 2026-11 | URL pública separada de dashboard com sessão ativa | Evita admin esconder fotos/páginas públicas       | Toda rota futura preserva essa fronteira                 |
| 2026-11 | Equipe multiagente em `AGENTS.md`                  | Processo persistente e auditável                  | Toda tarefa passa por análise, validação e documentação  |
