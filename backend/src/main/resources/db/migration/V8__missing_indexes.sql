-- V8: índices faltantes para queries de listagem do painel owner

-- listOwnerOrders filtra por (status, payment_status) e ordena por created_at DESC
CREATE INDEX IF NOT EXISTS idx_orders_status_payment_date
    ON orders (status, payment_status, created_at DESC);
