# Contexto do projeto

## Produto

TPServiços é um marketplace local que conecta clientes e profissionais. O modelo atual combina diretório público, pedidos, propostas, contratação, conversa, reputação, créditos para oportunidades e operação administrativa.

## Capacidades implementadas

- Cadastro, login, refresh rotativo, logout, recuperação de senha e confirmação de e-mail configurável.
- Perfis profissionais, categorias, áreas atendidas, disponibilidade, preço inicial, portfólio, verificação e mapa de região aproximada.
- Pedidos, desbloqueio por créditos, propostas, aceite, contratação, mensagens, anexos por URL, conclusão e avaliação do profissional contratado.
- Carteira, ledger, estornos, compra de crédito manual e publicidade patrocinada.
- Administração de usuários, catálogo, pacotes, denúncias, verificações, auditoria e métricas protegidas.
- Páginas públicas distintas: início, profissionais, categorias, serviços, avaliações, como funciona, anúncio, perfil, termos e privacidade.

## Fora do escopo atual

- Checkout e repasse automáticos: a confirmação financeira ainda é manual.
- Envio de e-mail sem a configuração de `RESEND_API_KEY` e `EMAIL_FROM`.
- Upload próprio de arquivos, storage privado, agenda e integração oficial de WhatsApp.

## Tecnologias

| Camada     | Tecnologia                                     |
| ---------- | ---------------------------------------------- |
| Web        | React 19, TypeScript, Vite 7, CSS próprio      |
| API        | NestJS 11, TypeScript, class-validator, Helmet |
| Dados      | PostgreSQL 16, Prisma 6                        |
| Rate limit | Redis 7 com fallback local                     |
| Execução   | npm workspaces e Docker Compose                |

## Rotas de interesse

- Público: `/`, `/profissionais`, `/categorias`, `/servicos`, `/avaliacoes`, `/como-funciona`, `/anuncie`, `/profissional/:id`.
- Painel: `/painel/cliente`, `/painel/profissional` e `/admin/*`.
- API: prefixo `/api`.

## Regras de produto

- Um pedido só pode ser concluído após proposta aceita; avaliação apenas do profissional contratado.
- Créditos, desbloqueios e estornos usam transações e não devem ser manipulados diretamente pela interface.
- Endereço exato de profissionais não é informação pública.
- Documentos de verificação não podem aparecer em páginas públicas.
