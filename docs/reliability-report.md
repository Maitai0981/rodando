# Reliability Report

Data: 2026-03-27

## Status atual

| Check                         | Status  |
|-------------------------------|---------|
| Backend compila (`mvnw test`) | Passando |
| Frontend lint                 | Passando |
| Frontend build                | Passando |
| Frontend unit tests (155)     | Passando |
| Frontend a11y                 | Passando |
| E2E (Playwright)              | Requer backend + banco rodando |

## Hardening implementado

- Autenticação via cookie HTTP-only com hash SCrypt
- Rate limiting em memória (Caffeine) por IP/chave
- Reset e alteração de senha via OTP por email (TTL 15 min, máx. 5 tentativas)
- Flags destrutivas (`DB_RESET`, `SEED_*`) bloqueadas em `production`/`staging`
- `MOCK_PAYMENT_PROVIDERS` para isolar testes do gateway de pagamento
- Fallback automático para simulação de PIX em não-produção

## Limitações conhecidas

- Rate limiting in-process (Caffeine): não escala entre múltiplas instâncias backend
- Cache público (Caffeine): igualmente local por instância
- Sem APM/tracing distribuído configurado (apenas logs estruturados via SLF4J)
- Sem backup automático configurado no repositório — responsabilidade da infra de hospedagem
