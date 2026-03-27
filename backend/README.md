# Backend — Rodando Moto Center

API REST em Java 21 + Spring Boot 3.5, banco PostgreSQL, build com Maven.

## Runtime

| Componente     | Tecnologia              |
|----------------|-------------------------|
| Runtime        | Java 21                 |
| Framework      | Spring Boot 3.5.0       |
| Banco de dados | PostgreSQL 16           |
| Migrações      | Flyway                  |
| Build          | Maven (via `mvnw`)      |
| Cache          | Caffeine (in-process)   |

## Estrutura

```
src/main/java/com/rodando/backend/
├── api/        ApiController (health/metrics/reset E2E), BaseApiController
├── auth/       AuthController, UserEntity, SessionEntity, PasswordResetTokenEntity
├── account/    AccountService, UserAddressEntity
├── catalog/    CatalogController, CatalogService
├── commerce/   CommerceController, CommerceService
├── owner/      OwnerController, OwnerService, OwnerOfferService, OwnerSupportService
├── assist/     AssistController, AssistService
├── core/       RodandoService, RateLimiterService, PublicCacheService, EmailService
├── common/     ApiException, GlobalExceptionHandler
├── config/     AppProperties, SecurityConfig, WebConfig, AuthFilter
└── tools/      ApiPerfRunner

src/main/resources/
├── application.properties
└── db/migration/   V1__baseline.sql … V6__password_reset_tokens_add_purpose_attempts.sql
```

## Comandos

```bash
# Subir a API
./mvnw spring-boot:run

# Rodar testes
./mvnw test

# Gerar build
./mvnw package -DskipTests
```

Windows (PowerShell):

```powershell
.\mvnw.cmd spring-boot:run
.\mvnw.cmd test
```

## Configuração

Copie o template e preencha os valores:

```bash
cp .env.example .env.local
```

O Spring Boot lê automaticamente `backend/.env.local` via `spring.config.import` em `application.properties`.

Variáveis obrigatórias para desenvolvimento local:

```env
APP_ENV=local
DATABASE_URL=postgres://postgres:SUA_SENHA@127.0.0.1:5432/rodando
OWNER_SEED_EMAIL=owner@rodando.local
OWNER_SEED_PASSWORD=123456
OWNER_SEED_NAME=Owner
ALLOWED_ORIGINS=http://localhost:5173
PUBLIC_APP_BASE_URL=http://localhost:5173
COOKIE_SECURE=0
RATE_LIMIT_ENABLED=1
MOCK_PAYMENT_PROVIDERS=1
```

## Banco de dados local

Resetar e recriar (descartável):

```bash
# Linux / macOS
PGPASSWORD=SUA_SENHA psql -h 127.0.0.1 -U postgres -c "DROP DATABASE IF EXISTS rodando;"
PGPASSWORD=SUA_SENHA psql -h 127.0.0.1 -U postgres -c "CREATE DATABASE rodando;"
./mvnw spring-boot:run
```

```powershell
# Windows PowerShell
$env:PGPASSWORD="SUA_SENHA"
& "C:\Program Files\PostgreSQL\16\bin\dropdb.exe" -h 127.0.0.1 -U postgres rodando
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -h 127.0.0.1 -U postgres rodando
.\mvnw.cmd spring-boot:run
```

Ao subir, o Flyway aplica todas as migrações e o `ApiController` cria o owner seed se `OWNER_SEED_EMAIL` estiver definido.

## Endpoints de health

| Método | Path          | Descrição             |
|--------|---------------|-----------------------|
| GET    | `/api/health` | Status da aplicação   |
| GET    | `/api/ready`  | Prontidão (DB + deps) |
| GET    | `/api/metrics`| Métricas de uso       |

## Variáveis de ambiente

| Variável                    | Padrão                        | Descrição                              |
|-----------------------------|-------------------------------|----------------------------------------|
| `DATABASE_URL`              | `postgres://...@.../rodando`  | URL de conexão PostgreSQL              |
| `APP_ENV`                   | `local`                       | `local`, `staging`, `production`       |
| `PORT`                      | `4000`                        | Porta HTTP                             |
| `OWNER_SEED_EMAIL`          | —                             | Email do owner criado no boot          |
| `OWNER_SEED_PASSWORD`       | —                             | Senha do owner                         |
| `ALLOWED_ORIGINS`           | `http://localhost:5173,...`   | Origins permitidas no CORS             |
| `COOKIE_SECURE`             | `true` em prod               | Exige HTTPS para o cookie de sessão    |
| `RATE_LIMIT_ENABLED`        | `true` (exceto test/e2e)     | Ativa rate limiting em memória         |
| `MOCK_PAYMENT_PROVIDERS`    | `true` em test/e2e            | Simula pagamentos sem chamar gateways  |
| `SMTP_HOST`                 | —                             | Servidor SMTP para emails              |
| `SMTP_PASSWORD`             | —                             | Senha SMTP                             |
| `MERCADOPAGO_ACCESS_TOKEN`  | —                             | Token Mercado Pago                     |
| `DB_RESET`                  | `0`                           | Limpa e recria o schema no boot (CI)   |
| `SEED_BASE_CATALOG`         | `0`                           | Seed de catálogo base no boot          |
