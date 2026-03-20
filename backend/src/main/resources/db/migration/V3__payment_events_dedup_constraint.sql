-- Garante deduplicação atômica de webhooks.
-- Sem esta constraint, dois webhooks idênticos chegando simultaneamente
-- podem ambos passar pelo SELECT de deduplicação e gerar eventos duplicados.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_dedup
  ON payment_events (provider, event_type, external_id)
  WHERE external_id IS NOT NULL;
