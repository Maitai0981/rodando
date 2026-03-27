# Rodando — Documentação do Sistema

> Documento vivo. Atualize sempre que alterar arquitetura, fluxos, variáveis de ambiente ou contratos de API.

---

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura do Repositório](#3-estrutura-do-repositório)
4. [Configuração do Ambiente](#4-configuração-do-ambiente)
5. [Banco de Dados](#5-banco-de-dados)
6. [Backend — Arquitetura](#6-backend--arquitetura)
7. [Frontend — Arquitetura](#7-frontend--arquitetura)
8. [Autenticação e Sessões](#8-autenticação-e-sessões)
9. [Pagamentos](#9-pagamentos)
10. [Testes](#10-testes)
11. [CI/CD](#11-cicd)
12. [Implantação](#12-implantação)

---

## 1. Visão Geral

Rodando é um e-commerce de peças para motocicletas. O sistema tem:

- **Loja pública**: catálogo de produtos, carrinho, checkout com PIX e cartão via Mercado Pago
- **Painel do proprietário**: gestão de produtos, pedidos, ofertas, configurações e relatórios
- **API REST**: backend Spring Boot expondo todos os dados e operações

---

## 2. Stack Tecnológica

### Backend

| Componente         | Tecnologia                         |
|--------------------|------------------------------------|
| Runtime            | Java 21                            |
| Framework          | Spring Boot 3.5.0                  |
| Persistência JPA   | Spring Data JPA + Hibernate 6      |
| SQL direto         | Spring JdbcTemplate                |
| Banco de dados     | PostgreSQL 16                      |
| Migrações          | Flyway                             |
| Cache              | Caffeine (in-process)              |
| HTTP client        | Spring WebFlux WebClient           |
| Email              | Spring Mail (JavaMailSender)       |
| QR Code            | ZXing 3.5.3                        |
| Criptografia       | Bouncy Castle 1.79                 |
| Build              | Maven via wrapper (`mvnw`)         |

### Frontend

| Componente         | Tecnologia                         |
|--------------------|------------------------------------|
| Framework          | React 18                           |
| Linguagem          | TypeScript 5.6                     |
| Build              | Vite 5                             |
| Estilo             | Tailwind CSS 4 + CSS custom props  |
| Componentes base   | MUI (Material UI) 7                |
| Animações          | Framer Motion 11                   |
| Estado de servidor | TanStack React Query v5            |
| Roteamento         | React Router v6                    |
| Testes unitários   | Vitest + Testing Library           |
| Testes E2E         | Playwright                         |
| Node obrigatório   | 20.x                               |

---

## 3. Estrutura do Repositório

```
rodando/
├── .github/workflows/
│   └── quality-gates.yml       Pipeline CI/CD
│
├── backend/                    API Spring Boot
│   ├── src/main/java/com/rodando/backend/
│   │   ├── api/                ApiController, BaseApiController
│   │   ├── auth/               AuthController, UserEntity, SessionEntity,
│   │   │                       PasswordResetTokenEntity, repositórios
│   │   ├── account/            AccountService, UserAddressEntity
│   │   ├── catalog/            CatalogController, CatalogService
│   │   ├── commerce/           CommerceController, CommerceService
│   │   ├── owner/              OwnerController, OwnerService, OwnerOfferService,
│   │   │                       OwnerSupportService
│   │   ├── assist/             AssistController, AssistService
│   │   ├── ops/                OpsController, OpsService
│   │   ├── core/               RodandoService, RateLimiterService,
│   │   │                       PublicCacheService, EmailService, MetricsTracker
│   │   ├── common/             ApiException, GlobalExceptionHandler
│   │   ├── config/             AppProperties, SecurityConfig, WebConfig, AuthFilter
│   │   └── tools/              ApiPerfRunner (runner de perf para CI)
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/       V1 … V6
│   ├── src/test/               Testes de integração JUnit 5
│   ├── pom.xml
│   └── .env.example
│
├── frontend/                   SPA React/TypeScript
│   ├── src/
│   │   ├── features/
│   │   │   ├── assist/         Sistema de orientação contextual inline
│   │   │   └── auth/           AuthSplitLayout
│   │   ├── pages/              Uma página por rota (lazy-loaded)
│   │   ├── routes/             AppRoutes, guards/OwnerRoute
│   │   └── shared/
│   │       ├── context/        AuthContext, CartContext, ThemeContext, AssistContext
│   │       ├── layout/         SiteLayout, OwnerLayout, StoreHeader,
│   │       │                   StoreFooter, MobileBottomNav
│   │       ├── lib/            api.ts, queryClient.ts, formatCurrency.ts,
│   │       │                   validators.ts, ...
│   │       ├── design-system/  tokens.ts, theme.ts
│   │       ├── styles/         index.css, theme.css, tailwind.css
│   │       ├── ui/primitives/  Button, Card, Input, Badge, Toast, ...
│   │       └── common/         ImageWithFallback, RouteFallback
│   ├── e2e/                    Testes Playwright
│   ├── .env.example
│   └── vite.config.ts
│
├── docs/                       Documentação técnica
├── docker-compose.yml          Compose para desenvolvimento local
└── .claude/commands/           Slash commands do Claude Code
```

---

## 4. Configuração do Ambiente

### Pré-requisitos

- Java 21
- Maven 3.9+ (ou use `./mvnw`)
- Node.js 20.x
- PostgreSQL 16

### Backend

```bash
cp backend/.env.example backend/.env.local
# edite backend/.env.local com seus valores locais
cd backend && ./mvnw spring-boot:run
```

O servidor sobe na porta **4000** (`PORT=4000`).

### Frontend

```bash
cp frontend/.env.example frontend/.env.local
# VITE_API_URL pode ficar vazio em desenvolvimento (usa proxy do Vite)
cd frontend && npm ci && npm run dev
```

O Vite sobe na porta **5173** e faz proxy de `/api/*` para `http://localhost:4000`.

### Variáveis de Ambiente — Backend

| Variável                        | Padrão                                   | Descrição                                        |
|---------------------------------|------------------------------------------|--------------------------------------------------|
| `APP_ENV`                       | `local`                                  | `local`, `test`, `e2e`, `staging`, `production`  |
| `PORT`                          | `4000`                                   | Porta HTTP                                       |
| `DATABASE_URL`                  | `postgres://postgres:postgres@.../rodando` | URL de conexão (formato `postgres://`)          |
| `SPRING_DATASOURCE_URL`         | —                                        | URL JDBC (tem precedência sobre `DATABASE_URL`)  |
| `SPRING_DATASOURCE_USERNAME`    | —                                        | Usuário do banco                                 |
| `SPRING_DATASOURCE_PASSWORD`    | —                                        | Senha do banco                                   |
| `FLYWAY_BASELINE_ON_MIGRATE`    | `false`                                  | Baseline Flyway em banco existente               |
| `DB_RESET`                      | `false`                                  | Limpa e recria o banco ao iniciar (CI)           |
| `SEED_BASE_CATALOG`             | `false`                                  | Popula catálogo base ao iniciar                  |
| `SEED_DEMO_DATA`                | `false`                                  | Popula dados demo ao iniciar                     |
| `OWNER_SEED_EMAIL`              | —                                        | Email do owner criado no boot                    |
| `OWNER_SEED_PASSWORD`           | —                                        | Senha do owner                                   |
| `OWNER_SEED_NAME`               | `Owner`                                  | Nome do owner                                    |
| `ALLOWED_ORIGINS`               | `http://localhost:5173,...`              | Origens CORS (separadas por vírgula)             |
| `PUBLIC_APP_BASE_URL`           | `http://localhost:5173`                  | URL pública do frontend                          |
| `COOKIE_SECURE`                 | `true` em prod                          | Exige HTTPS para o cookie de sessão              |
| `MOCK_PAYMENT_PROVIDERS`        | `true` em test/e2e                      | Simula pagamentos sem chamar gateways            |
| `PAYMENT_CARD_PROVIDER`         | `mercado_pago`                           | Provedor de cartão                               |
| `PAYMENT_PIX_PROVIDER`          | `mercado_pago`                           | Provedor PIX                                     |
| `MERCADOPAGO_ACCESS_TOKEN`      | —                                        | Token MP (`TEST-` sandbox, `APP_USR-` produção)  |
| `MERCADOPAGO_NOTIFICATION_URL`  | —                                        | URL de webhook MP (obrigatoriamente HTTPS)       |
| `MERCADOPAGO_WEBHOOK_SECRET`    | —                                        | Secret para validação de webhooks MP             |
| `RATE_LIMIT_ENABLED`            | `true` (exceto test/e2e)                | Ativa rate limiting em memória (Caffeine)        |
| `AUTH_RATE_LIMIT_MAX`           | `10`                                     | Máx. tentativas de autenticação por janela       |
| `AUTH_RATE_LIMIT_WINDOW_MS`     | `900000` (15 min)                        | Janela de rate limit de auth                     |
| `SMTP_HOST`                     | —                                        | Servidor SMTP para envio de emails               |
| `SMTP_PASSWORD`                 | —                                        | Senha SMTP                                       |
| `UPLOAD_MAX_BYTES`              | `6291456` (6 MB)                         | Tamanho máximo de upload de imagem               |
| `E2E_ALLOW_RESET`               | `false`                                  | Permite endpoint de reset de dados para E2E      |
| `E2E_RESET_TOKEN`               | —                                        | Token secreto para reset E2E                     |

### Variáveis de Ambiente — Frontend

| Variável                    | Padrão  | Descrição                                      |
|-----------------------------|---------|------------------------------------------------|
| `VITE_API_URL`              | `""`    | URL base da API. Vazio em dev (usa proxy Vite) |
| `VITE_WEB_VITALS`           | `0`     | Habilita coleta de Web Vitals                  |
| `VITE_SOURCEMAP`            | `0`     | Gera source maps no build de produção          |
| `VITE_DISABLE_ROUTE_MOTION` | `0`     | Desativa animações de transição de rota        |

---

## 5. Banco de Dados

### Migrações (Flyway)

Em `backend/src/main/resources/db/migration/`. Aplicadas automaticamente ao iniciar o backend.

| Arquivo                                               | Descrição                                     |
|-------------------------------------------------------|-----------------------------------------------|
| `V1__baseline.sql`                                    | Schema completo inicial + seeds               |
| `V2__remove_paypal_payment_method.sql`                | Remove `paypal` do enum de métodos            |
| `V3__payment_events_dedup_constraint.sql`             | Constraint de deduplicação de eventos de pag. |
| `V4__add_avatar_url_to_users.sql`                     | Coluna `avatar_url` na tabela `users`         |
| `V5__password_reset_tokens.sql`                       | Tabela `password_reset_tokens`                |
| `V6__password_reset_tokens_add_purpose_attempts.sql`  | Colunas `purpose` e `attempts`                |

> Nunca edite arquivos de migração já aplicados em produção. Crie sempre um novo `V{N+1}__descricao.sql`.

### Tabelas Principais

| Tabela                   | Descrição                                              |
|--------------------------|--------------------------------------------------------|
| `users`                  | Usuários. `role`: `customer` ou `owner`               |
| `roles`                  | Definições de papéis (JPA)                            |
| `user_roles`             | Vínculo user ↔ role                                   |
| `user_addresses`         | Endereços dos usuários (múltiplos por usuário)        |
| `sessions`               | Sessões de autenticação (hash SCrypt)                 |
| `password_reset_tokens`  | Tokens OTP para reset e alteração de senha            |
| `products`               | Catálogo de produtos                                  |
| `bag_items`              | Itens no carrinho (por usuário e por guest)           |
| `orders`                 | Pedidos realizados                                    |
| `order_items`            | Itens de cada pedido                                  |
| `order_events`           | Histórico de eventos de um pedido                     |
| `payment_transactions`   | Transações de pagamento associadas a pedidos          |
| `fiscal_documents`       | Documentos fiscais                                    |
| `ux_assist_state`        | Estado do sistema de assist por rota/usuário          |
| `outbox_events`          | Padrão outbox para notificações assíncronas           |
| `request_log`            | Log de requisições HTTP                               |
| `owner_settings`         | Configurações da loja (endereço, alertas, gateway)    |

### Banco local — Reset rápido

```bash
# Linux / macOS
PGPASSWORD=SENHA psql -h 127.0.0.1 -U postgres -c "DROP DATABASE IF EXISTS rodando;"
PGPASSWORD=SENHA psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE rodando;"
cd backend && ./mvnw spring-boot:run
```

```powershell
# Windows PowerShell
$env:PGPASSWORD="SENHA"
& "C:\Program Files\PostgreSQL\16\bin\dropdb.exe" -h 127.0.0.1 -U postgres rodando
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -h 127.0.0.1 -U postgres rodando
.\mvnw.cmd spring-boot:run
```

---

## 6. Backend — Arquitetura

### Fluxo geral

```
HTTP Request → AuthFilter → Controller → Service → Repository / JdbcTemplate → PostgreSQL
```

### Controllers

| Controller       | Pacote      | Prefixo de rota              |
|------------------|-------------|------------------------------|
| `ApiController`  | `api/`      | `/api/health`, `/api/ready`, `/api/metrics` |
| `AuthController` | `auth/`     | `/api/auth/*`                |
| `CatalogController` | `catalog/` | `/api/products`, `/api/catalog/*`, `/api/offers`, `/api/comments` |
| `CommerceController` | `commerce/` | `/api/bag/*`, `/api/orders/*`, `/api/payments/*` |
| `OwnerController` | `owner/`   | `/api/owner/*`               |
| `AssistController` | `assist/`  | `/api/ux/assist/*`           |
| `OpsController`  | `ops/`      | `/ops`                       |

### Services principais

| Service               | Responsabilidade                                               |
|-----------------------|----------------------------------------------------------------|
| `AccountService`      | Cadastro, login, sessões, endereços, troca e reset de senha    |
| `CommerceService`     | Carrinho, checkout, pedidos, pagamentos, webhooks MP           |
| `CatalogService`      | Listagem e detalhes de produtos públicos                       |
| `OwnerService`        | Produtos, pedidos e configurações do painel owner              |
| `OwnerOfferService`   | Gestão de ofertas e promoções                                  |
| `OwnerSupportService` | Returns, reclamações, auditoria                                |
| `EmailService`        | Confirmações de pedido, OTP de senha                          |
| `RateLimiterService`  | Rate limiting em memória (Caffeine)                            |
| `PublicCacheService`  | Cache de endpoints públicos (produtos, catálogo)               |
| `RodandoService`      | Base: normalização, validação, SQL utilitário, hashing         |

### Tratamento de Erros

- `ApiException(status, message)`: exceção de domínio lançada pelos services
- `GlobalExceptionHandler`: converte em resposta JSON `{ "error": "..." }` com o status correto
- Erros de gateway externos são wrapped como `ApiException(502, ...)`

---

## 7. Frontend — Arquitetura

### Contextos de Estado Global

| Contexto       | Responsabilidade                                           |
|----------------|------------------------------------------------------------|
| `AuthContext`  | Usuário atual, status: `loading`, `authenticated`, `unauthenticated` |
| `CartContext`  | Itens do carrinho, total, sincronização com API           |
| `ThemeContext` | Tema claro / escuro                                       |
| `AssistContext`| Estado do sistema de orientação inline (checklist, dicas) |

### Rotas

Todas definidas em `routes/AppRoutes.tsx`. Rotas de owner protegidas por `guards/OwnerRoute`.

| Rota                         | Página                  | Proteção  |
|------------------------------|-------------------------|-----------|
| `/`                          | `HomePage`              | pública   |
| `/catalog`                   | `CatalogPage`           | pública   |
| `/produto/:idSlug`           | `ProductDetailsPage`    | pública   |
| `/cart`                      | `CartPage`              | pública   |
| `/checkout`                  | `CheckoutPage`          | pública   |
| `/auth`                      | `SignInPage`            | pública   |
| `/auth/signup`               | `SignUpPage`            | pública   |
| `/auth/forgot-password`      | `ForgotPasswordPage`    | pública   |
| `/auth/reset-password`       | `ResetPasswordPage`     | pública (redireciona para `/auth/forgot-password`) |
| `/account/profile`           | `AccountProfilePage`    | autenticado |
| `/account/security`          | `SecurityPage`          | autenticado |
| `/account/settings`          | `SettingsPage`          | autenticado |
| `/orders`                    | `OrdersPage`            | autenticado |
| `/orders/:id`                | `OrderDetailsPage`      | autenticado |
| `/owner`                     | `OwnerGatePage`         | pública   |
| `/owner/login`               | `OwnerSignInPage`       | pública   |
| `/owner/dashboard`           | `OwnerDashboardPage`    | owner     |
| `/owner/products`            | `OwnerProductsPage`     | owner     |
| `/owner/products/new`        | `OwnerProductFormPage`  | owner     |
| `/owner/products/:id/edit`   | `OwnerProductFormPage`  | owner     |
| `/owner/orders`              | `OwnerOrdersPage`       | owner     |
| `/owner/settings`            | `OwnerSettingsPage`     | owner     |

### Cliente HTTP (`shared/lib/api.ts`)

Todas as chamadas usam `apiRequest<T>()`:
- `credentials: 'include'` (envia cookie de sessão)
- Lança `ApiError(message, status, code)` em qualquer erro HTTP
- Em desenvolvimento, o Vite proxy redireciona `/api/*` para `http://localhost:4000`

### Convenções de Código

- Idioma das interfaces: **português**
- URLs de produto via `buildProductUrl()` — nunca construir manualmente
- Testes usam `renderWithProviders` para contexto (QueryClient + Router + Auth)
- `vi.hoisted()` para mocks de módulos nos testes unitários
- Testes a11y rodam separado: `npm run test:a11y` (usa `--pool=forks`)

---

## 8. Autenticação e Sessões

### Mecanismo

- Cookie HTTP-only `session_token` (SameSite=Lax em dev, SameSite=None em prod HTTPS)
- Hash de sessão armazenado em `sessions` com SCrypt
- TTL: 7 dias para usuários autenticados, 30 dias para guests

### Endpoints de Autenticação

| Método  | Rota                                    | Descrição                                        |
|---------|-----------------------------------------|--------------------------------------------------|
| `POST`  | `/api/auth/signup`                      | Cadastro de cliente                              |
| `POST`  | `/api/auth/signin`                      | Login de cliente                                 |
| `POST`  | `/api/auth/owner/signin`                | Login de proprietário                            |
| `POST`  | `/api/auth/logout`                      | Logout (invalida sessão)                         |
| `GET`   | `/api/auth/me`                          | Retorna usuário da sessão atual                  |
| `PATCH` | `/api/auth/profile`                     | Atualiza perfil (nome, telefone, documento)      |
| `PATCH` | `/api/auth/profile/password`            | Altera senha com a senha atual (fluxo clássico)  |
| `POST`  | `/api/auth/profile/avatar`              | Upload de foto de perfil                         |
| `GET`   | `/api/auth/addresses`                   | Lista endereços do usuário                       |
| `POST`  | `/api/auth/addresses`                   | Cria endereço                                    |
| `PUT`   | `/api/auth/addresses/:id`               | Atualiza endereço                                |
| `PATCH` | `/api/auth/addresses/:id/default`       | Define endereço padrão                           |
| `DELETE`| `/api/auth/addresses/:id`               | Remove endereço                                  |

### Recuperação e Alteração de Senha via OTP

Dois fluxos independentes, ambos usando códigos de 6 dígitos por email (TTL 15 min, máx. 5 tentativas):

| Fluxo                    | Passo 1                                      | Passo 2                                        |
|--------------------------|----------------------------------------------|------------------------------------------------|
| **Recuperação** (sem login) | `POST /api/auth/password-reset/request` | `POST /api/auth/password-reset/confirm`       |
| **Alteração** (logado)   | `POST /api/auth/password-change/request-code`| `POST /api/auth/password-change/confirm`      |

- Se `SMTP_HOST` + `SMTP_PASSWORD` não estiverem configurados, o código OTP é retornado no JSON como `devCode` (modo dev)
- Os tokens OTP ficam na tabela `password_reset_tokens` com coluna `purpose` (`reset` ou `change`)

---

## 9. Pagamentos

### Provedores Suportados

| Método          | Provedor           |
|-----------------|--------------------|
| Cartão crédito  | Mercado Pago (Checkout Pro) |
| Cartão débito   | Mercado Pago (Checkout Pro) |
| PIX             | Mercado Pago (Payments API) |

### Fluxo PIX

```
1. POST /api/orders/checkout { paymentMethod: "pix", recipientDocument: "CPF" }
2. Backend decide: simulação local ou chamada real ao MP
   - Local: e-mail termina em .local | documento vazio | MOCK_PAYMENT_PROVIDERS=1
   - Real: chama POST https://api.mercadopago.com/v1/payments
     - Sucesso: retorna { qrCode, pix (base64 PNG) }
     - Erro em não-produção: fallback automático para simulação
3. Frontend exibe QR Code + "Copiar código PIX"
4. Usuário paga no app do banco
5. MP chama POST /api/payments/webhooks/mercadopago (precisa HTTPS)
6. Backend atualiza status do pedido
```

### Fluxo Cartão (Checkout Pro)

```
1. POST /api/orders/checkout { paymentMethod: "card_credit" | "card_debit" }
2. Backend cria preferência no MP → retorna checkoutUrl
3. Frontend exibe link para o Mercado Pago
4. Usuário conclui pagamento no MP
5. MP redireciona para /checkout?mpStatus=success&token={preference_id}
6. Frontend detecta parâmetros → POST /api/payments/mercadopago/complete
7. Backend sincroniza status e navega para /orders/:id
```

### Webhook Mercado Pago

- Endpoint: `POST /api/payments/webhooks/mercadopago`
- Valida assinatura via `MERCADOPAGO_WEBHOOK_SECRET`
- `MERCADOPAGO_NOTIFICATION_URL` precisa ser **HTTPS** (o MP não chama HTTP)
- Em desenvolvimento: use ngrok (`ngrok http 4000`)

---

## 10. Testes

### Resumo

| Suite                    | Arquivos | Testes   | Status               |
|--------------------------|----------|----------|----------------------|
| Backend (JUnit 5)        | 13       | ~30      | Passando             |
| Frontend unit (Vitest)   | 17       | 155+     | Passando             |
| Frontend a11y (vitest-axe)| separado | —       | Passando             |
| E2E (Playwright)         | —        | —        | Requer backend + DB  |

### Backend

Os testes usam `@SpringBootTest` (contexto completo) e requerem PostgreSQL.

```bash
cd backend && ./mvnw test
```

| Teste                                  | Cobre                                                |
|----------------------------------------|------------------------------------------------------|
| `AppPropertiesTests`                   | Precedência de variáveis; defaults do Flyway         |
| `DatabaseConfigTests`                  | Conexão; tabelas obrigatórias; Flyway aplicado       |
| `EnvironmentValidatorTests`            | Validator de configuração                            |
| `RateLimiterServiceTests`              | Janela; bloqueio após limite excedido                |
| `CommentsEndpointSmokeTests`           | Endpoint público de comentários                      |
| `CatalogServiceSmokeTests`             | `listProducts` retorna `items` + `meta`              |
| `AccountServiceSmokeTests`             | Cadastro → sessão → endereço → login (JPA)           |
| `CommerceServiceOrderPaymentPayloadTests` | Mapeamento de campos PIX do `payload_json`        |
| `CommerceServicePixQrTests`            | `generatePixQrImage` retorna PNG válido              |
| `ShippingQuoteTests`                   | Cálculo de frete                                     |
| `CartOperationsTests`                  | Operações de carrinho                                |
| `OwnerServiceSmokeTests`               | Smoke do serviço de owner                            |
| `RodandoServiceUtilTests`              | Utilitários de normalização e validação              |

### Frontend

```bash
cd frontend
npm run test:unit   # unitários (CI — sem a11y)
npm run test:a11y   # acessibilidade (pool separado)
npm run test:e2e    # E2E (requer backend rodando)
```

Convenções dos testes unitários:
- `renderWithProviders` para montar componentes com todos os providers
- `vi.hoisted()` para mocks de módulo (evita problemas de hoisting do Vitest)
- `Route` + `Routes` envolvendo o componente testado quando há navegação

---

## 11. CI/CD

Pipeline em `.github/workflows/quality-gates.yml`. Executa em todo `push` e `pull_request`.

| Job                  | O que faz                                       | Bloqueia? |
|----------------------|-------------------------------------------------|-----------|
| `backend-tests`      | `./mvnw test` com PostgreSQL de serviço         | Sim       |
| `frontend-quality`   | lint + build + `test:unit` + `test:a11y`        | Sim       |
| `frontend-e2e`       | Playwright com backend e banco reais            | Sim       |
| `security-audit`     | `npm audit --audit-level=high`                  | Sim       |
| `performance-report` | Métricas de API e bundle; salva artefatos       | Sim       |
| `quality-summary`    | Gate final: falha se qualquer job falhar        | Sim       |

**Causa comum de falha em cascata:** arquivos novos não adicionados ao git (`git status ??`). O código modificado referencia os arquivos novos, que não existem no repositório remoto — compilação e build falham no CI.

---

## 12. Implantação

### Checklist de Produção

- [ ] `APP_ENV=production`
- [ ] `PUBLIC_APP_BASE_URL` com URL HTTPS real do frontend
- [ ] `ALLOWED_ORIGINS` listando apenas os domínios do frontend
- [ ] `COOKIE_SECURE=1`
- [ ] `COOKIE_DOMAIN` configurado com o domínio correto
- [ ] `MERCADOPAGO_ACCESS_TOKEN` com prefixo `APP_USR-`
- [ ] `MERCADOPAGO_NOTIFICATION_URL` apontando para HTTPS do backend
- [ ] `MERCADOPAGO_WEBHOOK_SECRET` preenchido
- [ ] `MOCK_PAYMENT_PROVIDERS=0`
- [ ] `DB_RESET=0`
- [ ] `SMTP_HOST` + `SMTP_PASSWORD` configurados para envio de emails reais
- [ ] `RATE_LIMIT_ENABLED=1`

### Proxy Reverso

O backend precisa de HTTPS em produção para:
- Cookie `SameSite=None; Secure` (sessão cross-origin com o frontend)
- Receber webhooks do Mercado Pago (apenas HTTPS)

Configure nginx/caddy como proxy reverso na porta 4000, ou use Railway/Render com HTTPS automático.
