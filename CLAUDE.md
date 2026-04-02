# CLAUDE.md — Rodando Moto Center

## Projeto

Loja de peças para motocicletas. Stack full-stack:
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query v5, React Router v6
- **Backend**: Spring Boot 3.5, Java 21, PostgreSQL, Flyway, Caffeine cache

## Permissões automáticas

Claude Code pode executar sem pedir confirmação:

- Leitura e escrita de arquivos do projeto (`frontend/`, `backend/`, `docs/`)
- Execução de testes: `cd frontend && npm test`, `cd frontend && npm run test:run`
- Build do frontend: `cd frontend && npm run build`
- Lint: `cd frontend && npm run lint`
- Comandos `git status`, `git diff`, `git log`

Sempre pedir confirmação antes de:
- `git commit`, `git push`
- Modificar arquivos `.env`
- Rodar comandos que afetam o banco de dados

## Convenções de código

### Frontend
- Idioma das interfaces: **português**
- Tema escuro: fundo `#0a0a0f`, dourado `#d4a843`, texto `#f0ede8`
- Tokens de design em `frontend/src/shared/design-system/tokens.ts`
- API centralizada em `frontend/src/shared/lib/api.ts` — usar `apiRequest<T>()` para novos endpoints
- URLs de produto via `buildProductUrl()` — nunca construir manualmente
- Testes com Vitest + Testing Library; mocks via `vi.mock` / `vi.spyOn`
- `renderWithProviders` para testes que precisam de contexto (QueryClient, Router, Auth)
- Testes a11y rodam separado: `npm run test:a11y` (usa `--pool=forks` para evitar OOM do axe)

### Backend
- Respostas JSON via `Map<String, Object>` com `service.orderedMap()`
- SQL direto via `service.many()` / `service.one()` / `service.execute()`
- Cache via `PublicCacheService` para endpoints públicos
- Novos endpoints públicos em `CatalogController.java`; endpoints de owner em `OwnerController.java`
- Autenticação de owner via `requireOwner(request)` (herdado de `BaseApiController`)

## Estrutura relevante

```
frontend/src/
  features/           — funcionalidades por domínio (assist/, auth/)
  pages/              — páginas React (uma por rota)
  routes/             — AppRoutes, guards/OwnerRoute
  shared/
    context/          — AuthContext, CartContext, ThemeContext, AssistContext
    layout/           — SiteLayout, OwnerLayout, StoreHeader, StoreFooter
    lib/              — api.ts, queryClient.ts, formatCurrency.ts...
    design-system/    — tokens.ts, theme.ts
    ui/primitives/    — componentes base reutilizáveis
    styles/           — CSS global

backend/src/main/java/com/rodando/backend/
  catalog/            — CatalogController, CatalogService
  commerce/           — CommerceController, CommerceService
  owner/              — OwnerController, OwnerService, OwnerOfferService, OwnerSupportService
  auth/               — AuthController, AuthContext, UserEntity, repositórios
  account/            — AccountService, UserAddressEntity
  core/               — RodandoService, RateLimiterService, PublicCacheService
  api/                — ApiController (health/metrics/reset), BaseApiController
```

## Testes

```bash
# Frontend (unitários, modo CI — exclui a11y)
cd frontend && npm run test:unit

# Frontend (acessibilidade — roda com --pool=forks)
cd frontend && npm run test:a11y

# Frontend (watch interativo)
cd frontend && npm test

# E2E (requer backend rodando)
cd frontend && npm run test:e2e

# Tudo junto
cd frontend && npm run test:all
```

## Endpoints da API

### Catálogo (público)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/products` | Catálogo público com filtros |
| GET | `/api/products/:id` | Detalhes de produto |
| GET | `/api/catalog/highlights` | Destaques (8 produtos com desconto) |
| GET | `/api/catalog/categories` | Categorias com contagem de produtos |
| GET | `/api/catalog/recommendations` | Recomendações |
| GET | `/api/offers` | Ofertas ativas |
| GET | `/api/comments` | Avaliações públicas |
| POST | `/api/comments` | Criar avaliação (requer auth) |

### Autenticação e conta

| Método | Path | Descrição |
|--------|------|-----------|
| POST | `/api/auth/signin` | Login de cliente |
| POST | `/api/auth/signup` | Cadastro de cliente |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Dados do usuário autenticado |
| PATCH | `/api/auth/profile` | Atualizar perfil |
| PATCH | `/api/auth/profile/password` | Mudar senha |
| POST | `/api/auth/profile/avatar` | Upload de avatar |
| POST | `/api/auth/password-reset/request` | Solicitar reset de senha |
| POST | `/api/auth/password-reset/confirm` | Confirmar reset de senha |
| POST | `/api/auth/password-change/request-code` | Solicitar código para mudar senha |
| POST | `/api/auth/password-change/confirm` | Confirmar mudança de senha |
| POST | `/api/auth/email-change/request-code` | Solicitar código para mudar e-mail |
| POST | `/api/auth/email-change/confirm` | Confirmar mudança de e-mail |
| GET | `/api/auth/addresses` | Listar endereços |
| POST | `/api/auth/addresses` | Criar endereço |
| PUT | `/api/auth/addresses/:id` | Atualizar endereço |
| PATCH | `/api/auth/addresses/:id/default` | Definir endereço padrão |
| DELETE | `/api/auth/addresses/:id` | Deletar endereço |

### Carrinho e pedidos

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/bag` | Carrinho do usuário |
| POST | `/api/bag/items` | Adicionar item ao carrinho |
| PUT | `/api/bag/items/:productId` | Atualizar quantidade |
| DELETE | `/api/bag/items/:productId` | Remover item |
| DELETE | `/api/bag` | Limpar carrinho |
| POST | `/api/orders/quote` | Cotação de frete |
| POST | `/api/orders/checkout` | Finalizar pedido |
| GET | `/api/orders` | Listar pedidos do usuário |
| GET | `/api/orders/:id` | Detalhes do pedido |
| GET | `/api/orders/:id/events` | Histórico do pedido |
| POST | `/api/orders/:id/cancel` | Cancelar pedido |

### Painel owner (`/api/owner/*` — requer role owner/staff)

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/owner/dashboard` | Métricas e produtos |
| GET/POST | `/api/owner/products` | Listar / criar produto |
| GET/PUT/DELETE | `/api/owner/products/:id` | Detalhes / editar / deletar |
| GET/PUT | `/api/owner/settings` | Configurações da loja |
| GET | `/api/owner/orders` | Listar pedidos (com filtros) |
| GET | `/api/owner/orders/:id` | Detalhes do pedido |
| PATCH | `/api/owner/orders/:id/status` | Atualizar status do pedido |
| GET/POST | `/api/owner/offers` | Listar / criar oferta |
| PUT/DELETE | `/api/owner/offers/:id` | Editar / deletar oferta |
| GET/POST | `/api/owner/shipping-promotions` | Listar / criar promoção de frete |
| PUT/DELETE | `/api/owner/shipping-promotions/:id` | Editar / deletar promoção |
| GET | `/api/owner/analytics/orders` | Análise de pedidos por período |
| GET/POST | `/api/owner/returns` | Listar / criar devolução |
| PATCH | `/api/owner/returns/:id` | Atualizar devolução |
| GET/POST | `/api/owner/complaints` | Listar / criar reclamação |
| PATCH | `/api/owner/complaints/:id` | Atualizar reclamação |
| GET | `/api/owner/audit-logs` | Logs de auditoria |
| GET/POST | `/api/owner/staff` | Listar / criar funcionário (só owner) |
| PATCH | `/api/owner/staff/:id` | Atualizar funcionário (só owner) |
| POST | `/api/owner/staff/:id/reset-password` | Reset de senha de funcionário |
| POST | `/api/owner/uploads` | Upload de imagem (MIME + tamanho validados) |

### Assistente UX

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/ux/assist/state` | Estado do checklist do assistente |
| PUT | `/api/ux/assist/state` | Atualizar estado |
| POST | `/api/ux/assist/reset` | Resetar estado |

## Slash commands disponíveis

| Comando | Ação |
|---------|------|
| `/test` | Roda testes unitários do frontend e reporta resultado |
| `/build` | Lint + build de produção do frontend |
| `/backend-test` | Compila e roda testes Java do backend |
| `/check` | Verificação completa: lint + testes + build |
| `/new-endpoint` | Guia para criar novo endpoint seguindo as convenções |

## Comportamentos importantes

- Cupons de desconto são validados pelo backend — não incluir lógica de cupom no cliente
- `buildProductUrl()` em `api.ts` constrói URLs de produto com slug normalizado
- `pageSize: 120` em `listPublicProducts` é um anti-padrão — usar endpoints dedicados
- Ratings exibidos nas páginas devem vir da API (`socialProof`), nunca hardcoded
- Quantidade máxima no carrinho = `item.stock` (não usar `|| 1` como fallback)
