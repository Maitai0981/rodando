# Rodando — Documentação do Sistema

> Documento vivo. Atualize esta página sempre que alterar arquitetura, fluxos, variáveis de ambiente ou contratos de API.
> Última revisão: 2026-03-16 — refatoração package-by-feature (backend) e feature-sliced (frontend)

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura do Repositório](#3-estrutura-do-repositório)
4. [Configuração do Ambiente](#4-configuração-do-ambiente)
5. [Banco de Dados](#5-banco-de-dados)
6. [Backend — Arquitetura](#6-backend--arquitetura)
7. [Frontend — Arquitetura](#7-frontend--arquitetura)
8. [Pagamentos](#8-pagamentos)
9. [Autenticação e Sessões](#9-autenticação-e-sessões)
10. [Testes](#10-testes)
11. [CI/CD](#11-cicd)
12. [Implantação](#12-implantação)
13. [Rate Limiting](#13-rate-limiting)
14. [Guia de Manutenção](#14-guia-de-manutenção)

---

## 1. Visão Geral

Rodando é uma plataforma de e-commerce para venda de peças de motocicletas. O sistema possui:

- **Loja pública**: catálogo de produtos, carrinho, checkout com PIX e cartão via Mercado Pago
- **Painel do proprietário**: gestão de produtos, pedidos, ofertas, configurações, relatórios
- **API REST**: backend Spring Boot expondo todos os dados e operações

---

## 2. Stack Tecnológica

### Backend
| Componente | Tecnologia | Versão |
|---|---|---|
| Runtime | Java | 21 |
| Framework | Spring Boot | 3.5.0 |
| Persistência JPA | Spring Data JPA + Hibernate | 6.x |
| SQL direto | Spring JdbcTemplate | — |
| Banco de dados | PostgreSQL | 16 |
| Migrações | Flyway | — |
| Cache | Caffeine (in-process) | — |
| HTTP client | Spring WebFlux WebClient | — |
| QR Code | ZXing | 3.5.3 |
| Criptografia | Bouncy Castle | 1.79 |
| Build | Maven via wrapper (`mvnw`) | 3.9.11 |

### Frontend
| Componente | Tecnologia | Versão |
|---|---|---|
| Framework | React | 18 |
| Linguagem | TypeScript | — |
| Build | Vite | — |
| Estilo | Tailwind CSS + CSS custom properties | — |
| Componentes UI base | MUI (Material UI) | — |
| Animações | Framer Motion | — |
| Estado de servidor | TanStack React Query | — |
| Roteamento | React Router v6 | — |
| Testes unitários | Vitest + Testing Library | — |
| Testes E2E | Playwright | — |

---

## 3. Estrutura do Repositório

```
rodando/
├── backend/                    # API Spring Boot
│   ├── src/main/java/com/rodando/backend/
│   │   ├── api/                # ApiController (health, metrics, reset E2E), BaseApiController
│   │   ├── auth/               # AuthController, AuthContext, UserEntity, SessionEntity, repositórios
│   │   ├── account/            # AccountService, UserAddressEntity, UserAddressRepository
│   │   ├── catalog/            # CatalogController, CatalogService
│   │   ├── commerce/           # CommerceController, CommerceService
│   │   ├── owner/              # OwnerController, OwnerService, OwnerOfferService, OwnerSupportService
│   │   ├── assist/             # AssistController, AssistService
│   │   ├── ops/                # OpsController, OpsService
│   │   ├── core/               # RodandoService, RateLimiterService, PublicCacheService, MetricsTracker...
│   │   ├── common/             # ApiException, GlobalExceptionHandler, JsonSupport
│   │   ├── config/             # AppProperties, SecurityConfig, WebConfig, AuthFilter
│   │   └── tools/              # ApiPerfRunner (runner de performance para CI)
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/       # V1__baseline.sql, V2__remove_paypal_payment_method.sql
│   ├── src/test/               # Testes de integração JUnit 5
│   ├── pom.xml
│   └── .env.example            # Template de variáveis de ambiente
│
├── frontend/                   # SPA React/TypeScript
│   ├── src/
│   │   ├── features/           # Funcionalidades por domínio
│   │   │   ├── assist/         # Componentes e schema do sistema de orientação inline
│   │   │   └── auth/           # Componentes de autenticação (AuthSplitLayout)
│   │   ├── pages/              # 17 páginas React (uma por rota)
│   │   ├── routes/             # AppRoutes, RouteMotionOrchestrator, guards/OwnerRoute
│   │   ├── shared/             # Código transversal reutilizado por features e pages
│   │   │   ├── context/        # AuthContext, CartContext, ThemeContext, AssistContext
│   │   │   ├── layout/         # SiteLayout, OwnerLayout, StoreHeader, StoreFooter, MobileBottomNav
│   │   │   ├── lib/            # api.ts, queryClient.ts, formatCurrency.ts, validators.ts...
│   │   │   ├── design-system/  # theme.ts, tokens.ts
│   │   │   ├── styles/         # index.css, theme.css, fonts.css, tailwind.css
│   │   │   ├── ui/             # primitives/ — Button, Card, Input, Modal, Icon, Badge, etc.
│   │   │   └── common/         # ImageWithFallback, RouteFallback
│   │   └── a11y/               # Testes de acessibilidade com vitest-axe
│   ├── e2e/                    # Testes Playwright
│   ├── .env.example            # Template de variáveis de ambiente
│   └── vite.config.ts
│
├── docs/                       # Documentação técnica
│   ├── SISTEMA.md              # Este arquivo
│   ├── visual-palette.md       # Paleta de cores e tokens visuais
│   ├── reliability-baseline.md # Métricas de confiabilidade
│   ├── reliability-report.md   # Relatório de confiabilidade
│   └── reliability-runbook.md  # Runbook operacional
│
├── docker/
│   └── postgres/               # Configuração Docker do PostgreSQL local
│
├── docker-compose.yml          # Compose para desenvolvimento local
└── .github/workflows/
    └── quality-gates.yml       # Pipeline CI/CD
```

---

## 4. Configuração do Ambiente

### Pré-requisitos
- Java 21
- Maven 3.9+ (ou use `mvnw` / `mvnw.cmd`)
- Node.js 20+
- PostgreSQL 16

### Backend

Copie `.env.example` para `.env.local` e preencha os valores:

```sh
cp backend/.env.example backend/.env.local
```

O Spring Boot carrega automaticamente `backend/.env.local` via `spring.config.import` configurado em `application.properties`.

Execute o backend:
```sh
cd backend
./mvnw spring-boot:run     # Linux/Mac
mvnw.cmd spring-boot:run   # Windows
```

O servidor sobe na porta **4000** por padrão (`PORT=4000`).

### Frontend

```sh
cp frontend/.env.example frontend/.env.local
```

Edite `frontend/.env.local`:
```
VITE_API_URL=         # deixe vazio para usar o proxy do Vite (desenvolvimento)
```

Execute o frontend:
```sh
cd frontend
npm install
npm run dev
```

O Vite sobe na porta **5173** e faz proxy de `/api` para `http://localhost:4000`.

### Variáveis de Ambiente — Backend

| Variável | Padrão | Descrição |
|---|---|---|
| `APP_ENV` | `local` | Ambiente: `local`, `test`, `e2e`, `staging`, `production` |
| `PORT` | `4000` | Porta do servidor HTTP |
| `DATABASE_URL` | `postgres://postgres:postgres@127.0.0.1:5432/rodando` | URL de conexão (formato postgres://) |
| `SPRING_DATASOURCE_URL` | — | URL JDBC (tem precedência sobre `DATABASE_URL`) |
| `SPRING_DATASOURCE_USERNAME` | — | Usuário do banco |
| `SPRING_DATASOURCE_PASSWORD` | — | Senha do banco |
| `FLYWAY_BASELINE_ON_MIGRATE` | `false` | Baseline Flyway em banco existente |
| `FLYWAY_BASELINE_VERSION` | `0` | Versão de baseline |
| `DB_RESET` | `false` | Limpa e recria o banco ao iniciar (apenas dev) |
| `SEED_BASE_CATALOG` | `false` | Popula catálogo base ao iniciar |
| `SEED_DEMO_DATA` | `false` | Popula dados demo ao iniciar |
| `OWNER_SEED_EMAIL` | — | E-mail da conta proprietário criada no boot |
| `OWNER_SEED_PASSWORD` | — | Senha da conta proprietário |
| `OWNER_SEED_NAME` | `Owner` | Nome do proprietário |
| `PUBLIC_APP_BASE_URL` | `http://localhost:5173` | URL pública do frontend (usada em back_urls do MP) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,...` | Origens CORS permitidas (separadas por vírgula) |
| `COOKIE_DOMAIN` | — | Domínio do cookie de sessão (deixe vazio para localhost) |
| `COOKIE_SECURE` | `true` em produção | Se `true`, cookie só trafega em HTTPS |
| `MOCK_PAYMENT_PROVIDERS` | `true` em test/e2e | Se `1`, simula pagamentos sem chamar APIs externas |
| `PAYMENT_CARD_PROVIDER` | `mercado_pago` | Provedor de pagamento com cartão |
| `PAYMENT_PIX_PROVIDER` | `mercado_pago` | Provedor de pagamento PIX |
| `MERCADOPAGO_PUBLIC_KEY` | — | Chave pública do Mercado Pago |
| `MERCADOPAGO_ACCESS_TOKEN` | — | Token de acesso do Mercado Pago (`TEST-` para sandbox, `APP_USR-` para produção) |
| `MERCADOPAGO_WEBHOOK_SECRET` | — | Secret para validação de webhooks |
| `MERCADOPAGO_NOTIFICATION_URL` | — | URL de webhook (precisa ser HTTPS para o MP chamar) |
| `RATE_LIMIT_ENABLED` | `true` fora de test | Habilita rate limiting |
| `AUTH_RATE_LIMIT_MAX` | `10` | Máx. tentativas de autenticação por janela |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` (15min) | Janela de rate limit de auth |
| `CHECKOUT_RATE_LIMIT_MAX` | `12` | Máx. checkouts por janela |
| `CHECKOUT_RATE_LIMIT_WINDOW_MS` | `600000` (10min) | Janela de rate limit de checkout |
| `UPLOAD_MAX_BYTES` | `6291456` (6MB) | Tamanho máximo de upload de imagem |
| `ALERT_EMAIL_WEBHOOK_URL` | — | Webhook para alertas por e-mail |
| `ALERT_WHATSAPP_WEBHOOK_URL` | — | Webhook para alertas por WhatsApp |
| `E2E_ALLOW_RESET` | `false` | Permite endpoint de reset de dados para E2E |
| `E2E_RESET_TOKEN` | — | Token secreto para o endpoint de reset E2E |

### Variáveis de Ambiente — Frontend

| Variável | Padrão | Descrição |
|---|---|---|
| `VITE_API_URL` | `""` (proxy Vite) | URL base da API. Vazio em dev (usa proxy `/api → localhost:4000`) |
| `VITE_WEB_VITALS` | `0` | Habilita coleta de Web Vitals (`1` = ativo) |
| `VITE_SOURCEMAP` | `0` | Gera source maps no build de produção |
| `VITE_DISABLE_ROUTE_MOTION` | `0` | Desabilita animações de transição de rota |

---

## 5. Banco de Dados

### Migrações (Flyway)

As migrações ficam em `backend/src/main/resources/db/migration/`. São executadas automaticamente ao iniciar o backend.

| Arquivo | Descrição |
|---|---|
| `V1__baseline.sql` | Schema completo inicial |
| `V2__remove_paypal_payment_method.sql` | Remove `paypal` do enum de métodos de pagamento |

**Ao adicionar uma nova migração:** crie o arquivo `V{N+1}__descricao.sql` no diretório de migrações. Nunca edite arquivos de migração já aplicados em produção.

### Tabelas Principais

| Tabela | Descrição |
|---|---|
| `users` | Usuários (clientes e proprietário). Campo `role`: `customer`, `owner` |
| `user_addresses` | Endereços dos usuários (múltiplos por usuário) |
| `sessions` | Sessões de autenticação com hash SCrypt |
| `roles` | Definições de papéis (JPA) |
| `products` | Catálogo de produtos |
| `bag_items` | Itens no carrinho por usuário |
| `orders` | Pedidos realizados |
| `order_items` | Itens de cada pedido |
| `order_events` | Histórico de eventos de um pedido |
| `payment_transactions` | Transações de pagamento associadas a pedidos |
| `fiscal_documents` | Documentos fiscais |
| `ux_assist_state` | Estado do sistema de assist/dicas por rota/usuário |
| `outbox_events` | Eventos de saída (padrão outbox) para notificações |
| `request_log` | Log de requisições HTTP |

---

## 6. Backend — Arquitetura

### Organização — Package by Feature

O backend segue o padrão **package-by-feature**: cada domínio de negócio tem seu próprio pacote com controller, service e entidades/repositórios relacionados.

```
Controller → Service → Repository / JdbcTemplate → PostgreSQL
```

- **Controllers**: recebem a requisição HTTP, extraem parâmetros, delegam ao service, retornam JSON via `Map<String, Object>`
- **Services**: toda a lógica de negócio. `RodandoService` (`core/`) é a base com utilitários compartilhados
- **Repositories** (`auth/`, `account/`): acesso a dados via Spring Data JPA para entidades com mapeamento completo
- **JdbcTemplate**: usado em `RodandoService` e services de negócio para queries SQL diretas de alta performance

### Controllers

| Controller | Pacote | Endpoints |
|---|---|---|
| `ApiController` | `api/` | `GET /api/health`, `/ready`, `/metrics`; `POST /api/test/reset-non-user` |
| `AuthController` | `auth/` | `/api/auth/*` — signup, signin, logout, me, profile, addresses |
| `CatalogController` | `catalog/` | `GET /api/products`, `/api/catalog/*`, `/api/offers`, `/api/comments` |
| `CommerceController` | `commerce/` | `/api/bag/*`, `/api/orders/*`, `/api/payments/*` |
| `OwnerController` | `owner/` | `/api/owner/*` — dashboard, produtos, pedidos, ofertas, settings, uploads |
| `AssistController` | `assist/` | `/api/ux-assist/*` |
| `OpsController` | `ops/` | Painel operacional interno |

### Services de Negócio

| Service | Responsabilidade |
|---|---|
| `CommerceService` | Checkout, pedidos, pagamentos (PIX + cartão), webhooks Mercado Pago |
| `CatalogService` | Listagem e detalhes de produtos públicos |
| `AccountService` | Cadastro, login, sessões, endereços (usa JPA) |
| `OwnerService` | Operações do proprietário: produtos, pedidos, configurações |
| `OwnerOfferService` | Gestão de ofertas/promoções |
| `OwnerSupportService` | Returns, reclamações, auditoria |
| `AssistService` | Estado do sistema de orientação (checklist, dicas) |
| `RateLimiterService` | Rate limiting em memória (Caffeine) |
| `PublicCacheService` | Cache de dados públicos (produtos, catálogo) |
| `MetricsTracker` | Rastreamento de métricas de performance |
| `OutboxService` | Polling do outbox para alertas/notificações |
| `RequestLogService` | Gravação assíncrona de log de requisições |
| `OpsService` | Operações internas (ops-ui, SQL runner) |
| `RodandoService` | Utilitários base: normalização, validação, transações, JSON |

### Tratamento de Erros

- `ApiException(status, message)`: exceção de domínio lançada pelos services
- `GlobalExceptionHandler`: converte `ApiException` em resposta JSON `{ "error": "..." }` com o status HTTP correto
- Erros de gateway (Mercado Pago, etc.) são wrapped como `ApiException(502, ...)`

### Autenticação

Ver seção [9. Autenticação e Sessões](#9-autenticação-e-sessões).

---

## 7. Frontend — Arquitetura

### Organização — Bulletproof React

O frontend segue o padrão **feature-sliced**: funcionalidades de domínio ficam em `features/`, código transversal (contextos, layout, lib, UI) em `shared/`, e as páginas em `pages/`.

### Contextos de Estado Global

| Contexto | Arquivo | Responsabilidade |
|---|---|---|
| `AuthContext` | `shared/context/AuthContext.tsx` | Usuário autenticado, status (`loading`, `authenticated`, `anonymous`) |
| `CartContext` | `shared/context/CartContext.tsx` | Itens do carrinho, total, sincronização com API |
| `ThemeContext` | `shared/context/ThemeContext.tsx` | Tema claro/escuro |
| `AssistContext` | `shared/context/AssistContext.tsx` | Estado do sistema de orientação inline |

### Rotas

Definidas em `routes/AppRoutes.tsx`. Proteção de rotas de owner via `routes/guards/OwnerRoute.tsx` (redireciona para `/owner/signin` se não autenticado como owner).

| Rota | Componente | Proteção |
|---|---|---|
| `/` | `HomePage` | pública |
| `/catalogo` | `CatalogPage` | pública |
| `/produto/:id` | `ProductDetailsPage` | pública |
| `/carrinho` | `CartPage` | pública |
| `/checkout` | `CheckoutPage` | autenticado (redireciona para `/auth`) |
| `/auth` | `SignInPage` | pública |
| `/cadastro` | `SignUpPage` | pública |
| `/conta` | `AccountProfilePage` | autenticado |
| `/pedidos` | `OrdersPage` | autenticado |
| `/pedidos/:id` | `OrderDetailsPage` | autenticado |
| `/owner` | `OwnerGatePage` | owner |
| `/owner/signin` | `OwnerSignInPage` | pública |
| `/owner/dashboard` | `OwnerDashboardPage` | owner |
| `/owner/produtos` | `OwnerProductsPage` | owner |
| `/owner/produtos/novo` | `OwnerProductFormPage` | owner |
| `/owner/produtos/:id` | `OwnerProductFormPage` | owner |
| `/owner/pedidos` | `OwnerOrdersPage` | owner |
| `/owner/configuracoes` | `OwnerSettingsPage` | owner |

### Layouts

- `SiteLayout` (`shared/layout/SiteLayout.tsx`): layout das páginas públicas com `StoreHeader`, `StoreFooter` e `MobileBottomNav`
- `OwnerLayout` (`shared/layout/OwnerLayout.tsx`): layout do painel do proprietário com navegação lateral

### Design System

- **Tokens**: `shared/design-system/tokens.ts` e `shared/styles/theme.css` (CSS custom properties)
- **Primitivos**: `shared/ui/primitives/` — Button, Card, Input, Modal, Badge, Toast, Icon, etc.
- **Animações**: `shared/ui/primitives/MotionReveal`, `SectionReveal`, `NavTransition`, `RouteMotionOrchestrator`

### Cliente HTTP (`shared/lib/api.ts`)

Todas as chamadas à API passam por `apiRequest<T>()`, que:
1. Usa `fetch` com `credentials: 'include'` (envia cookie de sessão)
2. Lança `ApiError` com `status` e `code` em caso de erro HTTP
3. Em desenvolvimento, o Vite proxy redireciona `/api` para `http://localhost:4000`

---

## 8. Pagamentos

### Provedores Suportados

| Método | Provedor | Configuração |
|---|---|---|
| Cartão de crédito | Mercado Pago (Checkout Pro) | `PAYMENT_CARD_PROVIDER=mercado_pago` |
| Cartão de débito | Mercado Pago (Checkout Pro) | `PAYMENT_CARD_PROVIDER=mercado_pago` |
| PIX | Mercado Pago (Payments API) | `PAYMENT_PIX_PROVIDER=mercado_pago` |

### Fluxo PIX

```
1. Usuário seleciona PIX no checkout
2. POST /api/orders/checkout { paymentMethod: "pix", recipientDocument: "..." }
3. Backend: shouldUseLocalPixSimulation()?
   - Sim: retorna QR Code simulado (dev com e-mail .local ou documento vazio)
   - Não: chama POST https://api.mercadopago.com/v1/payments
     - Sucesso: retorna qrCode (texto) + pix (base64 PNG do QR)
     - Erro 400/422/502 + APP_ENV != production/staging: fallback para simulação local
     - Erro em produção: propaga o erro para o usuário
4. Frontend exibe QR Code + botão "Copiar código PIX"
5. Usuário paga no app do banco
6. MP chama webhook (MERCADOPAGO_NOTIFICATION_URL, precisa ser HTTPS)
7. Backend atualiza status do pedido
```

**Simulação local (dev):** Ativada automaticamente quando:
- E-mail do usuário termina em `.local`
- Documento (CPF/CNPJ) não informado
- Qualquer erro do MP em ambiente não-production (fallback automático)

### Fluxo Cartão (Checkout Pro)

```
1. Usuário seleciona cartão no checkout
2. POST /api/orders/checkout { paymentMethod: "card_credit" | "card_debit" }
3. Backend cria preferência em POST https://api.mercadopago.com/checkout/preferences
   - Inclui back_urls se PUBLIC_APP_BASE_URL for HTTPS ou localhost
4. Frontend exibe link "Ir para o Mercado Pago"
5. Usuário completa pagamento no site do MP
6. MP redireciona para /checkout?mpStatus=success&token={preference_id}
7. Frontend detecta parâmetros e chama POST /api/payments/mercadopago/complete
8. Backend sincroniza status e redireciona para /pedidos/:id
```

### Credenciais Mercado Pago

| Prefixo do token | Tipo | Comportamento |
|---|---|---|
| `TEST-` | Sandbox | Aceita CPF/e-mail de teste, não processa pagamentos reais |
| `APP_USR-` | Produção | Exige CPF válido e e-mail real; self-payment bloqueado |

**Em desenvolvimento com credenciais de produção (`APP_USR-`):** O backend faz fallback automático para simulação local em qualquer rejeição do MP, permitindo testar o fluxo completo sem credenciais reais do comprador.

### Webhook Mercado Pago

- Endpoint: `POST /api/payments/webhooks/mercadopago`
- Exige `MERCADOPAGO_NOTIFICATION_URL` apontando para uma URL **HTTPS** (o MP não chama HTTP)
- Em desenvolvimento, use um túnel como ngrok: `ngrok http 4000`
- Valida a assinatura via `MERCADOPAGO_WEBHOOK_SECRET` quando configurado

---

## 9. Autenticação e Sessões

### Mecanismo

- Sessões baseadas em cookie HTTP-only (`session_token`)
- Hash de sessão armazenado na tabela `sessions` com SCrypt
- TTL: 7 dias para usuários autenticados, 30 dias para convidados

### Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/signup` | Cadastro de cliente |
| `POST` | `/api/auth/signin` | Login de cliente |
| `POST` | `/api/auth/owner/signin` | Login de proprietário |
| `POST` | `/api/auth/logout` | Logout (invalida sessão) |
| `GET` | `/api/auth/me` | Retorna usuário da sessão atual |
| `PATCH` | `/api/auth/profile` | Atualiza perfil (nome, telefone, CPF) |
| `GET` | `/api/auth/addresses` | Lista endereços do usuário |
| `POST` | `/api/auth/addresses` | Cria endereço |
| `PUT` | `/api/auth/addresses/:id` | Atualiza endereço |
| `PATCH` | `/api/auth/addresses/:id/default` | Define endereço padrão |
| `DELETE` | `/api/auth/addresses/:id` | Remove endereço |

### CORS

Origens permitidas configuradas via `ALLOWED_ORIGINS`. Em produção, liste apenas os domínios do frontend.

---

## 10. Testes

### Resultados Atuais

| Suite | Arquivos | Testes | Status |
|---|---|---|---|
| Backend (JUnit 5) | 9 | 13 | Todos passando |
| Frontend unit (Vitest) | 6 | 25 | Todos passando |
| Frontend a11y (Vitest + axe) | 1 | 4 | Todos passando |
| E2E (Playwright) | 2 | — | Requer backend+DB rodando |

### Backend — Testes de Integração

Os testes de backend requerem PostgreSQL rodando. Usam `@SpringBootTest` (contexto completo) e apontam para o banco configurado em `.env.local`.

| Arquivo de Teste | O que cobre |
|---|---|
| `AppPropertiesTests` | Prioridade de variáveis de banco; defaults do Flyway |
| `DatabaseConfigTests` | Conexão com banco; tabelas obrigatórias existem; Flyway aplicado |
| `EnvironmentValidatorTests` | Validator de configuração de ambiente |
| `RateLimiterServiceTests` | Janela de rate limit; bloqueio após limite excedido |
| `CommentsEndpointSmokeTests` | Endpoint público de comentários responde sem erro |
| `CatalogServiceSmokeTests` | `listProducts` retorna `items` e `meta` sem lançar exceção |
| `AccountServiceSmokeTests` | Cadastro → sessão → endereço → login completo via JPA |
| `CommerceServiceOrderPaymentPayloadTests` | `getOrder` mapeia campos PIX corretamente a partir do `payload_json` |
| `CommerceServicePixQrTests` | `generatePixQrImage` retorna PNG válido (cabeçalho PNG + tamanho mínimo) |

**Executar testes backend:**
```sh
# Linux/Mac
cd backend && ./mvnw test

# Windows (com Maven do IntelliJ ou instalado)
cd backend && mvn test
```

### Frontend — Testes Unitários

Executam em JSDOM sem servidor. Mocks de API via `vi.spyOn`.

| Arquivo de Teste | O que cobre |
|---|---|
| `a11y/critical-pages.a11y.test.tsx` | Acessibilidade das páginas críticas (SignIn, Cart, Checkout, OwnerDashboard, ProductDetails) — roda separado com `--pool=forks` |
| `shared/layout/__tests__/SiteLayout.test.tsx` | SiteLayout renderiza header/footer; exibe links de conta para usuário autenticado |
| `pages/__tests__/AuthPages.test.tsx` | SignIn navega com `returnTo`; SignUp cria conta; OwnerSignIn funciona |
| `pages/__tests__/CartPage.test.tsx` | Renderiza itens; redireciona anônimo para `/auth?returnTo=/checkout` |
| `pages/__tests__/CatalogPage.test.tsx` | Sincroniza `q` da URL; filtragem de busca |
| `pages/__tests__/CheckoutPage.test.tsx` | Gera checkout MP com link; conclui retorno do MP; gera PIX com QR e cópia |
| `pages/__tests__/OwnerPages.test.tsx` | Dashboard do owner; lista de produtos; lista de pedidos |

**Executar testes frontend:**
```sh
cd frontend
npm run test:unit    # todos os testes unitários
npm run test:a11y    # somente testes de acessibilidade
npm run test:all     # unit + e2e
```

### E2E — Playwright

Os testes E2E requerem backend + banco rodando. O script `scripts/e2e-db-preflight.mjs` verifica a disponibilidade do banco antes de rodar.

| Arquivo | Cenários |
|---|---|
| `e2e/public-commerce.spec.ts` | Navegação na loja; adicionar ao carrinho; checkout público |
| `e2e/owner-operations.spec.ts` | Login como owner; CRUD de produto; gestão de pedidos |

**Executar testes E2E:**
```sh
cd frontend
npm run test:e2e          # headless
npm run test:e2e:headed   # com browser visível
```

### Adicionando Novos Testes

- **Backend:** crie o arquivo em `backend/src/test/java/com/rodando/backend/` seguindo o padrão `@SpringBootTest`. Limpe dados criados no `@AfterEach`.
- **Frontend unitário:** crie em `frontend/src/.../__tests__/NomeDoComponente.test.tsx`. Use `renderWithProviders` para montar componentes com todos os providers.
- **Frontend E2E:** adicione cenários em `frontend/e2e/` usando `@playwright/test`.

---

## 11. CI/CD

Pipeline definido em `.github/workflows/quality-gates.yml`. Executado em todo `push` e `pull_request`.

| Job | Descrição | Bloqueia merge? |
|---|---|---|
| `backend-tests` | `./mvnw test` com PostgreSQL de serviço | Sim |
| `frontend-quality` | lint + build + `test:unit` + `test:a11y` | Sim |
| `frontend-e2e` | Playwright com backend + DB reais | Sim |
| `security-audit` | `npm audit --audit-level=high` | Sim |
| `performance-report` | Coleta métricas de API e bundle; salva artifacts | Sim |
| `quality-summary` | Gate final: falha se qualquer job falhar | Sim |

**Artefatos gerados pelo CI:**
- `playwright-report/` e `test-results/` — relatório visual dos testes E2E
- `docs/performance-pass-report.md` — relatório de performance da API e do bundle

---

## 12. Implantação

### Checklist de Produção

- [ ] `APP_ENV=production`
- [ ] `PUBLIC_APP_BASE_URL` configurado com URL HTTPS real do frontend
- [ ] `ALLOWED_ORIGINS` listando apenas os domínios do frontend
- [ ] `COOKIE_SECURE=1`
- [ ] `COOKIE_DOMAIN` configurado com o domínio correto
- [ ] `MERCADOPAGO_ACCESS_TOKEN` com prefixo `APP_USR-` (produção)
- [ ] `MERCADOPAGO_NOTIFICATION_URL` apontando para URL **HTTPS** do backend
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` preenchido
- [ ] `MOCK_PAYMENT_PROVIDERS=0`
- [ ] `DB_RESET=0`

### Proxy Reverso / HTTPS

O backend precisa de HTTPS em produção para:
1. Cookie de sessão seguro (`COOKIE_SECURE=true`)
2. Webhooks do Mercado Pago (MP só chama endpoints HTTPS)
3. `notification_url` enviada ao MP (o backend verifica `isHttpsUrl()` antes de incluir)

### Frontend Build

```sh
cd frontend
npm run build     # gera dist/
```

Sirva `frontend/dist/` como arquivos estáticos. Configure o servidor para retornar `index.html` para qualquer rota (SPA com React Router).

Configure `VITE_API_URL` com a URL base da API em produção antes de fazer o build.

---

## 13. Rate Limiting

Implementado em memória via `RateLimiterService` (Caffeine). Desabilitado automaticamente em `test` e `e2e`.

| Endpoint / Grupo | Máx. requisições | Janela | Variável de configuração |
|---|---|---|---|
| Auth (`/api/auth/signin`, `/api/auth/signup`) | 10 | 15 min | `AUTH_RATE_LIMIT_MAX` / `AUTH_RATE_LIMIT_WINDOW_MS` |
| Checkout (`/api/orders/checkout`) | 12 | 10 min | `CHECKOUT_RATE_LIMIT_MAX` / `CHECKOUT_RATE_LIMIT_WINDOW_MS` |
| Callbacks de pagamento | 30 | 10 min | `PAYMENT_CALLBACK_RATE_LIMIT_MAX` / `PAYMENT_CALLBACK_RATE_LIMIT_WINDOW_MS` |
| Webhooks | 600 | 1 min | `WEBHOOK_RATE_LIMIT_MAX` / `WEBHOOK_RATE_LIMIT_WINDOW_MS` |

---

## 14. Guia de Manutenção

### Como Atualizar Esta Documentação

Este documento deve ser atualizado sempre que:

| Mudança | O que atualizar neste doc |
|---|---|
| Nova variável de ambiente | Seção [4 — Variáveis de Ambiente](#4-configuração-do-ambiente) |
| Nova migração de banco | Tabela de migrações na seção [5](#5-banco-de-dados) |
| Nova tabela/coluna relevante | Tabela de esquema na seção [5](#5-banco-de-dados) |
| Novo endpoint de API | Seção da feature ou seção [9](#9-autenticação-e-sessões) |
| Nova rota frontend | Tabela de rotas na seção [7](#7-frontend--arquitetura) |
| Novo provedor de pagamento | Seção [8 — Pagamentos](#8-pagamentos) |
| Novo job de CI | Seção [11 — CI/CD](#11-cicd) |
| Mudança em rate limit | Seção [13 — Rate Limiting](#13-rate-limiting) |
| Novo service ou componente relevante | Seções [6](#6-backend--arquitetura) ou [7](#7-frontend--arquitetura) |
| Novo arquivo de teste | Tabelas na seção [10 — Testes](#10-testes) |

### Convenções do Projeto

- **Idioma:** código e comentários em inglês; UI e mensagens de erro para o usuário em português
- **Migrações:** sempre `V{N}__descricao_em_ingles.sql`; nunca editar migrations aplicadas
- **Testes de integração:** sempre limpar dados criados no `@AfterEach`; usar e-mails únicos por UUID
- **Testes de unidade frontend:** mockar contextos via `vi.mock`; usar `renderWithProviders`
- **Pagamentos em dev:** nunca fazer pagamentos reais; usar simulação local ou credenciais de sandbox `TEST-`
- **Segurança:** nunca commitar `.env.local`, credenciais reais ou tokens

### Diagnóstico Rápido

| Sintoma | Verificar |
|---|---|
| PIX não gera QR Code | `MOCK_PAYMENT_PROVIDERS`, e-mail do usuário termina em `.local`?, documento preenchido? |
| Cartão não redireciona de volta | `PUBLIC_APP_BASE_URL` é HTTPS ou localhost? `back_urls` incluído na preferência? |
| Webhook não chega | `MERCADOPAGO_NOTIFICATION_URL` é HTTPS? Porta 4000 acessível externamente? |
| CORS bloqueando frontend | `ALLOWED_ORIGINS` inclui a origem do frontend? |
| Cookie não persistido | `COOKIE_DOMAIN` correto? `COOKIE_SECURE` compatível com HTTPS? |
| Testes E2E falhando localmente | Backend e DB estão rodando? `E2E_ALLOW_RESET=1`? `E2E_RESET_TOKEN` configurado? |
