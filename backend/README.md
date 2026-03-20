# Backend

O backend roda oficialmente como uma aplicacao `Java 21 + Spring Boot + Gradle`.
Nao existe mais runtime Node dentro de `backend/` para API, regras de negocio, testes ou scripts operacionais.

## Estrutura

- `src/main/java/`: aplicacao Spring Boot organizada na mesma linha do `api_supabase-main`.
- `src/main/java/com/rodando/backend/controller`: controllers HTTP.
- `src/main/java/com/rodando/backend/models`: entidades e modelos de apoio.
- `src/main/java/com/rodando/backend/repository`: repositories JPA.
- `src/main/java/com/rodando/backend/service`: regras de negocio e servicos de aplicacao.
- `src/main/resources/`: configuracao Spring, migracoes Flyway e assets do painel `/ops`.
- `src/test/java/`: testes Java.
- `uploads/`: arquivos enviados em ambiente local.

Observacao:
- Os unicos arquivos nao-Java mantidos no backend sao recursos estaticos do `/ops` e SQL de migracao. A logica da API fica em Java.

## Runtime

- Java: `21`
- Spring Boot: `3.5.0`
- Banco: `PostgreSQL`
- Build tool: `Gradle Wrapper`

## Comandos

Windows PowerShell:

```powershell
cd C:\Users\mathe\rodando\backend
.\gradlew.bat bootRun
```

Linux/macOS:

```bash
cd backend
./gradlew bootRun
```

Comandos uteis:

- subir a API: `./gradlew bootRun`
- rodar testes: `./gradlew test`
- gerar build: `./gradlew build`
- benchmark curto da API: `./gradlew apiPerf`

## Configuracao

- Variavel principal: `APP_ENV`
- Arquivos locais suportados:
  - `.env.local`
  - `.env.test.local`
- O Spring importa automaticamente o arquivo correspondente ao ambiente.
- O fluxo local padrao assume banco limpo:
  - mantenha `FLYWAY_BASELINE_ON_MIGRATE=false`
  - se o schema `public` estiver herdado e sem `flyway_schema_history`, resete o banco `rodando`
- Baseline permanece como escape para schema legado:
  - `FLYWAY_BASELINE_ON_MIGRATE=true`
  - `FLYWAY_BASELINE_VERSION=0`
- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` e `SPRING_DATASOURCE_PASSWORD` tem precedencia sobre `DATABASE_URL`

Exemplo local:

```env
APP_ENV=local
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5433/rodando
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
PUBLIC_APP_BASE_URL=http://localhost:5173
COOKIE_SECURE=0
TRUST_PROXY=0
RATE_LIMIT_ENABLED=1
PAYMENT_CARD_PROVIDER=mercado_pago
PAYMENT_PIX_PROVIDER=mercado_pago
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxxxxxxx
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxx
MERCADOPAGO_NOTIFICATION_URL=http://127.0.0.1:4000/api/payments/webhooks/mercadopago
MOCK_PAYMENT_PROVIDERS=0
```

## Banco local

Se o banco local estiver descartavel, prefira resetar antes de subir a API:

Windows PowerShell:

```powershell
$env:PGPASSWORD="SUA_SENHA"
& "C:\Program Files\PostgreSQL\16\bin\dropdb.exe" -h 127.0.0.1 -U postgres rodando
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -h 127.0.0.1 -U postgres rodando
.\gradlew.bat bootRun
```

Depois do reset, o backend deve criar `flyway_schema_history`, aplicar `V1__baseline.sql` e responder em `http://127.0.0.1:4000/api/health`.

## Endpoints operacionais

- `GET /api/health`
- `GET /api/ready`
- `GET /api/metrics`
- `GET /ops`

O `/ops` continua protegido por sessao owner e agora e servido a partir de resources do Spring.

## Performance

O task `apiPerf` gera:

- `backend/perf/backend-api.json`

Ele depende de a API estar rodando no `API_BASE` configurado, ou usa `http://127.0.0.1:4000` por padrao.
