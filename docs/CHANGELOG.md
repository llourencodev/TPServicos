# Changelog técnico

## 2026-11-02 — Controle de versão inicial

- Inicializado o repositório Git local na branch `main` para publicação controlada do código existente.
- Confirmado que `.env`, dependências e artefatos de build permanecem fora do versionamento por `.gitignore`.
- Publicação remota planejada como repositório privado, sem incluir credenciais ou dados locais.

## 2026-11-01 — Fundação de equipe multiagente

- Adicionado `AGENTS.md` com papéis, fluxo, critério de aprovação e regras de preservação.
- Criados documentos de contexto, arquitetura, banco, desenvolvimento, testes, decisões e pendências.
- Registrado diagnóstico completo em `docs/INITIAL_DIAGNOSTIC.md`.
- Executado diagnóstico inicial e baseline de build, testes, formatação e migrations.
- Registrado bloqueio de `npm audit` por certificado TLS local; nenhuma dependência foi alterada para contornar o problema.
- Registradas prioridades de privacidade de coordenadas e cobertura insuficiente de testes.

## 2026-11-01 — Navegação pública e painel

- Mantida separação entre URLs públicas e painel autenticado para que sessão administrativa não substitua páginas públicas por âncoras.
- Páginas administrativas usam URLs explícitas por seção.
