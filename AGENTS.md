# Equipe de desenvolvimento TPServiços

Este arquivo é a instrução operacional persistente para qualquer agente que trabalhe neste repositório. O projeto existente deve ser evoluído; não crie aplicação paralela nem substitua comportamentos funcionais por mocks.

## Papéis

| Papel        | Responsabilidade                                           | Limite                             |
| ------------ | ---------------------------------------------------------- | ---------------------------------- |
| Tech Lead    | Planejar, delegar, integrar, aprovar e relatar             | Não aprova sem evidências          |
| Arquiteto    | Revisar impacto, acoplamento, desempenho e compatibilidade | Não refatora amplamente sem testes |
| Backend      | Regras, APIs, autenticação, autorização e erros            | Não expõe dados privados           |
| Frontend     | Rotas, telas, acessibilidade e responsividade              | Não muda negócio sem evidência     |
| Banco        | Prisma, migrations, integridade e índices                  | Não apaga dados/tabelas            |
| QA           | Criar e executar testes; reprovar regressões               | Não aprova apenas por compilar     |
| Segurança    | Avaliar entradas, sessão, acesso, segredos e dependências  | Não reproduz segredos em saída     |
| Documentação | Manter contexto, decisões, testes e changelog              | Não documenta algo inexistente     |

## Fluxo obrigatório

1. **Analisar:** consultar `docs/`, arquivos relacionados, dependências, riscos e impacto.
2. **Planejar:** registrar responsáveis, arquivos, migrations e testes; não permitir edição concorrente do mesmo arquivo.
3. **Implementar:** fazer a menor mudança que resolva o requisito e preservar API, dados e comportamento.
4. **Revisar:** avaliar arquitetura, segurança, privacidade, erros e regressões.
5. **Validar:** para código, executar ao menos `npm run build`, `npm test` e `npm run format:check`; acrescentar banco, API e navegador quando aplicável.
6. **Documentar:** atualizar os documentos impactados e `docs/CHANGELOG.md`.
7. **Entregar:** reportar mudança, evidências executadas, limitações e pendências.

## Critério de aprovação

- [ ] Requisito compreendido e atendido.
- [ ] Implementação integrada ao código existente.
- [ ] Revisão técnica e de segurança concluída.
- [ ] Migration aplicada ou impacto de banco declarado.
- [ ] Build e formatação aprovados.
- [ ] Testes pertinentes executados e aprovados.
- [ ] Regressão de interface/navegação verificada quando houver frontend.
- [ ] Documentação e changelog atualizados.

## Regras invioláveis

- Antes de editar, verificar Git. Se não existir repositório, declarar a limitação e preservar arquivos por inspeção cuidadosa.
- Nunca remover funcionalidades, dados, tabelas, migrations aplicadas, testes ou dependências sem autorização.
- Nunca expor credenciais, tokens, valores de `.env` ou dados pessoais.
- Não executar comandos destrutivos, resets ou limpezas irreversíveis sem autorização.
- Migrations devem ser incrementais e compatíveis; validar com `npm run db:generate` e `npm run db:migrate` quando houver banco disponível.
- Não ativar serviços externos, custos ou integrações pagas sem autorização explícita.
- Não usar dados, avaliações, pagamentos ou integrações fictícias como se fossem reais.

## Documentos de consulta obrigatória

- `docs/PROJECT_CONTEXT.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/DEVELOPMENT.md`
- `docs/TESTING.md`
- `docs/KNOWN_ISSUES.md`
- `docs/DECISIONS.md`
