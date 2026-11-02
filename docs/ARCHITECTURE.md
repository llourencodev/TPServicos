# Arquitetura

## Visão geral

```text
Navegador (React/Vite)
       │  /api + Bearer access token / refresh cookie
       ▼
API NestJS ── Prisma ── PostgreSQL
       │
       ├── Redis (rate limit compartilhado)
       ├── OpenStreetMap/Leaflet (mapa público)
       └── Resend opcional (e-mail transacional)
```

O repositório é um monorepo npm com `apps/web` e `apps/api`. O Docker Compose inicia PostgreSQL, Redis, migration, API e web/Nginx.

## Frontend

- React/Vite, com telas, estado de rota manual, cliente HTTP e dashboards hoje concentrados em `apps/web/src/main.tsx`.
- Visual e responsividade em `apps/web/src/style.css`; imagens editoriais são assets locais.
- Rotas públicas e de painel devem permanecer separadas. Uma sessão administrativa não pode substituir `/categorias` ou outra URL pública por dashboard.
- Leaflet é carregado sob demanda, com fallback OpenStreetMap.

## Backend

| Domínio                                   | Responsabilidade                                            |
| ----------------------------------------- | ----------------------------------------------------------- |
| `auth`                                    | cadastro, login, refresh, sessão, recuperação e verificação |
| `providers`                               | perfil, diretório, destaque, mapa e oportunidades           |
| `requests`                                | pedidos, propostas, contratação, mensagens e avaliações     |
| `wallet`                                  | saldo, ledger, compras e estornos                           |
| `admin`                                   | operação, catálogo, verificação, moderação e auditoria      |
| `advertising`, `reports`, `notifications` | divulgação, confiança e comunicação                         |
| `metrics`, `health`, `rate-limit`         | operação e proteção                                         |

## Segurança e fronteiras

- Validação global com whitelist, Helmet, CORS de origem configurada e rate limit.
- JWT curto em `Authorization`; refresh token `HttpOnly`, hashado e rotativo.
- RBAC é garantido no backend; esconder componentes no frontend não é autorização.
- Integrações externas são opcionais e dependem de ambiente; nenhum segredo vai para o código.

## Direção de evolução

Antes de modularizar o frontend ou trocar o roteamento manual, criar regressões de navegação. A decomposição futura é por domínio: `routing`, `api`, `public`, `auth`, `customer`, `provider`, `admin` e componentes compartilhados.
