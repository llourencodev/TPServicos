# Problemas conhecidos e prioridades

## P0 — privacidade de localização

`ProviderProfile.latitude` e `longitude` participam da busca pública. Como o produto promete região aproximada, transformar ou arredondar no backend antes de retorno público. Não corrigido nesta etapa de diagnóstico para não alterar comportamento sem plano e testes específicos.

## P1 — testes e CI

Existe apenas um teste de API; não há testes web, E2E, banco, RBAC, créditos, proposta, pagamento ou regressão de rotas. Não há repositório Git nem CI detectado neste diretório; inicializar Git e configurar CI é pré-requisito para gate de merge/deploy.

## P1 — frontend e roteamento manual

`apps/web/src/main.tsx` e `style.css` são extensos. Não há 404 declarativa; as consultas administrativas ainda são carregadas mesmo em seção filtrada. Modularizar depois da suíte de regressão.

## P1 — pagamentos e arquivos

Pagamentos são manuais; não existe gateway, webhook idempotente ou conciliação. Portfólio, anexos e documentos usam URLs externas sem storage privado, URLs assinadas, antivírus ou retenção.

## P2 — e-mail, tokens e operação

E-mail depende de configuração externa e confirmação não é requisito para toda ação sensível. Tokens expirados, sessões revogadas e logs de auditoria não têm tarefa de retenção. Não há runbook visível de backup/restore ou resposta a incidentes.

## P2 — infraestrutura e dependências externas

Nginx não define CSP, Permissions-Policy ou HSTS; estabeleça isso no proxy HTTPS. Leaflet vem de CDN sem SRI/CSP restritiva. Se Redis falhar, o fallback local não protege múltiplas réplicas adequadamente; produção precisa de monitoramento e alerta.

## P2 — desempenho

Busca textual usa `contains`; medir antes de adicionar `pg_trgm`. Conversas têm limite de 200 mensagens sem paginação. Bundle web e imagens editoriais devem ser otimizados/lazy-loaded antes de crescimento significativo.

## Ambiente

`npm audit` está bloqueado por certificado TLS não confiável ao acessar `registry.npmjs.org`. Resolver a cadeia de certificados no sistema/CI antes de usar auditoria como gate.
