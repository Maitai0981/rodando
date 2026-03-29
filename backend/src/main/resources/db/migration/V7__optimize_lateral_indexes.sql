-- Otimiza LATERAL join em product_prices:
-- WHERE product_id = ? AND valid_to IS NULL ORDER BY valid_from DESC, id DESC LIMIT 1
-- O índice parcial inclui as colunas de ordenação para evitar sort extra.
CREATE INDEX IF NOT EXISTS idx_prices_product_active_sorted
ON product_prices (product_id, valid_from DESC, id DESC)
WHERE valid_to IS NULL;

-- Otimiza LATERAL joins em product_images:
-- WHERE product_id = ? AND kind = ? ORDER BY sort_order ASC, id ASC LIMIT 1
-- Cobre lookup + sort em uma única varredura de índice.
CREATE INDEX IF NOT EXISTS idx_images_product_kind_sorted
ON product_images (product_id, kind, sort_order ASC, id ASC);

-- Otimiza lookup de sessão com verificação de expiração simultânea:
-- WHERE token_hash = ? AND expires_at > NOW()
-- token_hash já é UNIQUE, mas o índice composto permite index-only scan.
CREATE INDEX IF NOT EXISTS idx_sessions_token_expires
ON sessions (token_hash, expires_at);

-- Otimiza lookup de cart aberto por usuário com filtro de status:
-- WHERE user_id = ? AND status = 'open'
CREATE INDEX IF NOT EXISTS idx_carts_open_by_user
ON carts (user_id, status)
WHERE status = 'open' AND user_id IS NOT NULL;

-- Otimiza lookup de cart aberto por guest com filtro de status:
-- WHERE guest_token_hash = ? AND status = 'open'
CREATE INDEX IF NOT EXISTS idx_carts_open_by_guest
ON carts (guest_token_hash, status)
WHERE status = 'open' AND guest_token_hash IS NOT NULL;
