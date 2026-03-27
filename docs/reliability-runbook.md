# Reliability Runbook

Guia de triagem operacional para incidentes no Rodando.

---

## 1. Triagem inicial

```bash
# Checar saúde da API
curl http://SEU_BACKEND/api/health
curl http://SEU_BACKEND/api/ready
curl http://SEU_BACKEND/api/metrics
```

- `/api/health` retorna `{ status: "ok" }` se o servidor está de pé
- `/api/ready` verifica DB, migrações e dependências
- `/api/metrics` expõe contadores de requisições, cache, queries e outbox

---

## 2. Incidente: checkout duplicado

1. Verificar se o pedido foi criado duas vezes na tabela `orders` (mesmo `user_id` + valor + horário próximo)
2. Consultar `payment_transactions` para ver se há dois registros com o mesmo `external_id`
3. Se duplicado: cancelar o mais recente via painel owner e acionar estorno no Mercado Pago

---

## 3. Incidente: webhook do Mercado Pago não processado

1. Confirmar que `MERCADOPAGO_NOTIFICATION_URL` aponta para **HTTPS** — o MP não chama HTTP
2. Verificar logs do backend por mensagens `[WEBHOOK]`
3. Confirmar que `MERCADOPAGO_WEBHOOK_SECRET` está correto (ou removê-lo se não configurado no painel do MP)
4. Reprocessar manualmente: `POST /api/payments/mercadopago/complete?orderId={id}` via painel owner

---

## 4. Incidente: email de OTP não chegou

1. Verificar se `SMTP_HOST` e `SMTP_PASSWORD` estão configurados (`emailEnabled()` no backend)
2. Se não configurado, o backend opera em **modo dev**: o OTP é retornado no JSON como `devCode`
3. Checar logs por mensagens `[OTP DEV]` ou `[EMAIL ERRO]`
4. Em produção: verificar caixa de spam; checar limites do provedor SMTP

---

## 5. Segurança operacional

- Em `production` e `staging`, as flags `DB_RESET`, `SEED_BASE_CATALOG` e `SEED_DEMO_DATA` devem estar `0`
- `MOCK_PAYMENT_PROVIDERS` deve ser `0` em produção
- `E2E_ALLOW_RESET` deve ser `false` em produção

---

## 6. Rate limit disparado incorretamente

1. Checar se o IP/chave está atingindo os limites (`AUTH_RATE_LIMIT_MAX`, `CHECKOUT_RATE_LIMIT_MAX`)
2. O rate limiting é **in-process** (Caffeine) — não escala entre múltiplas instâncias
3. Em ambiente de múltiplas instâncias, considere mover o rate limit para Redis/externo
4. Para desativar temporariamente: `RATE_LIMIT_ENABLED=0` (reiniciar o backend)

---

## 7. Banco de dados — Flyway falhou

```
FlywayException: Validate failed: Migrations have failed validation
```

Possíveis causas:
- Arquivo de migração já aplicado foi modificado (nunca editar migrações aplicadas)
- Migração nova com número duplicado

Resolução em desenvolvimento (banco descartável):

```bash
# Dropar e recriar o banco
PGPASSWORD=SENHA psql -h 127.0.0.1 -U postgres -c "DROP DATABASE rodando; CREATE DATABASE rodando;"
./mvnw spring-boot:run
```

Em produção: investigar `flyway_schema_history` antes de qualquer ação destrutiva.
