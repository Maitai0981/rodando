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

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/products` | Catálogo público com filtros |
| GET | `/api/products/:id` | Detalhes de produto |
| GET | `/api/catalog/highlights` | Destaques (8 produtos com desconto) |
| GET | `/api/catalog/categories` | Categorias com contagem de produtos |
| GET | `/api/catalog/recommendations` | Recomendações |
| GET | `/api/offers` | Ofertas ativas |
| GET | `/api/comments` | Avaliações públicas |
| POST | `/api/orders/quote` | Cotação de frete |
| POST | `/api/auth/signin` | Login de cliente |
| POST | `/api/auth/signup` | Cadastro de cliente |

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
