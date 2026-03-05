# Reliability Runbook

## 1) Readiness triage
1. Verifique `GET /api/health`.
2. Verifique `GET /api/ready`.
3. Verifique `GET /api/metrics` (`requests`, `cache`, `queries`, `outbox`).

## 2) Incident: checkout duplicado
1. Confirmar presença de `Idempotency-Key` nos clientes.
2. Consultar tabela `idempotency_keys` pelo `user_id + route + key`.
3. Validar conflitos (`request_hash` divergente => `409`).

## 3) Incident: webhook duplicado / inconsistente
1. Consultar `payment_webhook_events` por `event_id`.
2. Se `processing_status=processed`, evento já aplicado (idempotente).
3. Se `processing_status=error`, revisar `last_error` e payload.

## 4) Incident: notificações atrasadas
1. Consultar `outbox_jobs` (`pending`, `error`, `dead_letter`).
2. Verificar `GET /api/ready` e `GET /api/metrics` para backlog.
3. Corrigir causa raiz e reprocessar jobs `error` conforme procedimento operacional.

## 5) Segurança operacional de dados
1. Em `production/staging`, flags destrutivas são bloqueadas no boot.
2. Scripts destrutivos exigem `ALLOW_DESTRUCTIVE=1`.
3. Nunca habilitar `DB_RESET` ou `SEED_*` em ambiente real.
