# Rodando Moto Center

E-commerce de peças para motocicletas com painel de gestão integrado. Desenvolvido com Spring Boot no backend e React no frontend, suportando checkout via PIX e cartão de crédito pelo Mercado Pago.

---

## Funcionalidades

**Loja pública**
- Catálogo com filtros por categoria, marca, faixa de preço e disponibilidade
- Carrinho persistente (usuário autenticado e guest)
- Checkout com PIX e cartão via Mercado Pago
- Acompanhamento de pedidos
- Avaliações de produtos
- Recuperação de senha por e-mail

**Painel do proprietário**
- Gestão de produtos, estoque e imagens
- Gestão de pedidos e status de pagamento
- Ofertas e promoções
- Configurações da loja (dados fiscais, frete, gateways)
- Relatórios e logs de auditoria

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Java 21, Spring Boot 3.5, JdbcTemplate, Flyway |
| Banco de dados | PostgreSQL 16 |
| Cache | Caffeine (in-process) |
| Frontend | React 18, TypeScript 5.6, Vite 5 |
| Estilo | Tailwind CSS 4, Framer Motion |
| Queries | TanStack Query v5 |
| Roteamento | React Router v6 |
| Pagamentos | Mercado Pago (PIX + cartão) |
| Testes | Vitest, Testing Library, Playwright |
| Infraestrutura | Docker, Docker Compose |

---

## Pré-requisitos

- **Docker** e **Docker Compose** (recomendado para rodar tudo junto)
- Ou, para desenvolvimento local:
  - Java 21+
  - Maven (ou use o wrapper `./mvnw`)
  - Node.js 20
  - PostgreSQL 16

---

## Rodando com Docker (recomendado)

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd rodando

# Suba os três serviços (banco, backend, frontend)
docker compose up --build
```

Após o build:
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- API Health: http://localhost:4000/api/health

O banco é criado e populado automaticamente com dados de demonstração.

---

## Desenvolvimento local

### 1. Banco de dados

```bash
# Sobe apenas o PostgreSQL via Docker
docker compose up postgres -d
```

### 2. Backend

```bash
cd backend

# Copie e configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# Rode o backend (porta 4000)
./mvnw spring-boot:run
```

### 3. Frontend

```bash
cd frontend

# Instale as dependências
npm install

# Copie e configure as variáveis de ambiente
cp .env.example .env.local
# Edite VITE_API_URL=http://localhost:4000

# Rode o frontend (porta 5173)
npm run dev
```

---

## Variáveis de ambiente

### Backend — `backend/.env.local`

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `APP_ENV` | Ambiente (`local`, `test`, `staging`, `production`) | `local` |
| `PORT` | Porta HTTP do backend | `4000` |
| `DATABASE_URL` | URL de conexão PostgreSQL | `postgres://postgres:postgres@127.0.0.1:5432/rodando` |
| `OWNER_SEED_EMAIL` | E-mail do owner criado no boot | `owner@rodando.local` |
| `OWNER_SEED_PASSWORD` | Senha do owner | — |
| `ALLOWED_ORIGINS` | Origins CORS permitidas (separadas por vírgula) | `http://localhost:5173` |
| `PUBLIC_APP_BASE_URL` | URL pública do frontend (usada no Mercado Pago) | `http://localhost:5173` |
| `MERCADOPAGO_PUBLIC_KEY` | Chave pública MP (`TEST-...` para sandbox) | — |
| `MERCADOPAGO_ACCESS_TOKEN` | Access token MP | — |
| `MERCADOPAGO_WEBHOOK_SECRET` | Secret para validação de webhook | — |
| `SMTP_HOST` | Host SMTP para envio de e-mails | — |
| `SMTP_USERNAME` | Usuário SMTP | — |
| `SMTP_PASSWORD` | Senha SMTP | — |
| `MOCK_PAYMENT_PROVIDERS` | `1` simula pagamentos sem chamar APIs externas | `0` |
| `SEED_BASE_CATALOG` | `1` popula catálogo base no boot | `0` |
| `SEED_DEMO_DATA` | `1` popula dados de demonstração no boot | `0` |

> Copie `backend/.env.example` para `backend/.env.local` — nunca commite o `.env.local`.

### Frontend — `frontend/.env.local`

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `VITE_API_URL` | URL base do backend | `http://localhost:4000` |

---

## Scripts disponíveis

### Frontend

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run lint         # Lint com ESLint
npm run test:unit    # Testes unitários (Vitest)
npm run test:a11y    # Testes de acessibilidade (axe-core)
npm run test:e2e     # Testes E2E (Playwright) — requer backend rodando
npm run test:all     # Unitários + E2E
npm run format       # Formata código com Prettier
```

### Backend

```bash
./mvnw spring-boot:run     # Inicia o servidor
./mvnw test                # Roda testes unitários
./mvnw compile             # Compila sem rodar
```

---

## Estrutura do projeto

```
rodando/
├── backend/                        # Spring Boot
│   ├── src/main/java/com/rodando/
│   │   ├── api/                    # BaseApiController, ApiController (health)
│   │   ├── auth/                   # Login, signup, sessões, reset de senha
│   │   ├── account/                # Endereços do usuário
│   │   ├── catalog/                # Catálogo público (produtos, categorias, destaques)
│   │   ├── commerce/               # Carrinho, pedidos, pagamentos, webhooks
│   │   ├── owner/                  # Painel do proprietário
│   │   ├── core/                   # RodandoService, cache, rate limit, e-mail
│   │   └── config/                 # CORS, segurança, filtros
│   └── src/main/resources/
│       └── db/migration/           # Migrações Flyway (V1–V7)
│
└── frontend/
    └── src/
        ├── features/               # Módulos por domínio (auth, assist)
        ├── pages/                  # Uma página por rota
        ├── routes/                 # AppRoutes, guards
        └── shared/
            ├── context/            # AuthContext, CartContext, ThemeContext
            ├── layout/             # SiteLayout, OwnerLayout, Header, Footer
            ├── lib/                # api.ts, formatCurrency, queryClient
            ├── design-system/      # Tokens de design
            └── ui/primitives/      # Componentes base reutilizáveis
```

---

## API — Endpoints públicos principais

| Método | Path | Descrição |
|--------|------|-----------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/products` | Catálogo com filtros e paginação |
| `GET` | `/api/products/:id` | Detalhes de produto |
| `GET` | `/api/catalog/highlights` | Destaques (produtos com desconto) |
| `GET` | `/api/catalog/categories` | Categorias com contagem |
| `GET` | `/api/catalog/recommendations` | Recomendações |
| `GET` | `/api/offers` | Ofertas ativas |
| `GET` | `/api/comments` | Avaliações públicas |
| `POST` | `/api/orders/quote` | Cotação de frete |
| `POST` | `/api/auth/signin` | Login |
| `POST` | `/api/auth/signup` | Cadastro |
| `GET` | `/api/bag` | Carrinho do usuário/guest |
| `POST` | `/api/bag/items` | Adicionar item ao carrinho |
| `POST` | `/api/orders/checkout` | Finalizar compra |

---

## Pagamentos

O sistema usa **Mercado Pago** como gateway. Para testar localmente:

1. Crie uma aplicação em [developers.mercadopago.com](https://developers.mercadopago.com)
2. Use credenciais `TEST-...` (sandbox) no `.env.local`
3. Para receber webhooks localmente, use um tunnel:
   ```bash
   ngrok http 4000
   # Copie a URL HTTPS gerada para MERCADOPAGO_NOTIFICATION_URL
   ```

Alternativamente, defina `MOCK_PAYMENT_PROVIDERS=1` para simular pagamentos sem chamar APIs externas.

---

## Testes E2E

Os testes Playwright sobem um banco isolado automaticamente. Requisitos:

```bash
# Instale os navegadores do Playwright (apenas na primeira vez)
cd frontend && npx playwright install --with-deps

# Backend deve estar rodando com APP_ENV=e2e e E2E_ALLOW_RESET=1
# Configure backend/.env.local:
#   APP_ENV=e2e
#   E2E_ALLOW_RESET=1
#   E2E_RESET_TOKEN=qualquer-string

npm run test:e2e
```

---

## Licença

Proprietário — todos os direitos reservados.
