CREATE TABLE IF NOT EXISTS roles (
  id SMALLSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  document TEXT,
  cep TEXT,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS cep TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS document TEXT;

CREATE TABLE IF NOT EXISTS user_addresses (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Principal',
  cep TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT,
  complement TEXT,
  district TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  reference TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_default
ON user_addresses(user_id)
WHERE is_default = TRUE;

CREATE TABLE IF NOT EXISTS user_ux_assist_state (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('public', 'owner')),
  route_key TEXT NOT NULL,
  checklist_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  dismissed_tips JSONB NOT NULL DEFAULT '[]'::jsonb,
  overlay_seen BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, scope, route_key)
);

CREATE INDEX IF NOT EXISTS idx_user_ux_assist_state_user_scope
ON user_ux_assist_state(user_id, scope, updated_at DESC);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id SMALLINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  parent_id BIGINT REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS manufacturers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category_id BIGINT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  manufacturer_id BIGINT NOT NULL REFERENCES manufacturers(id) ON DELETE RESTRICT,
  bike_model TEXT NOT NULL,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  minimum_stock INTEGER NOT NULL DEFAULT 5 CHECK (minimum_stock >= 0),
  reorder_point INTEGER NOT NULL DEFAULT 10 CHECK (reorder_point >= 0),
  seo_slug TEXT,
  seo_meta_title TEXT,
  seo_meta_description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS cost NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS minimum_stock INTEGER NOT NULL DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point INTEGER NOT NULL DEFAULT 10;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_slug TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_meta_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_meta_description TEXT;

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_cost_check;
ALTER TABLE products ADD CONSTRAINT products_cost_check CHECK (cost >= 0);

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_minimum_stock_check;
ALTER TABLE products ADD CONSTRAINT products_minimum_stock_check CHECK (minimum_stock >= 0);

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_reorder_point_check;
ALTER TABLE products ADD CONSTRAINT products_reorder_point_check CHECK (reorder_point >= 0);

CREATE TABLE IF NOT EXISTS product_stocks (
  product_id BIGINT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0)
);

CREATE TABLE IF NOT EXISTS product_prices (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS product_images (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('main', 'hover')),
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, kind, sort_order)
);

CREATE TABLE IF NOT EXISTS media_assets (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  storage_key TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
  badge TEXT NOT NULL DEFAULT 'Oferta',
  description TEXT NOT NULL DEFAULT '',
  compare_at_price NUMERIC(12,2) NOT NULL CHECK (compare_at_price > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id BIGSERIAL PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year_from SMALLINT,
  year_to SMALLINT,
  UNIQUE (brand, model, year_from, year_to)
);

CREATE TABLE IF NOT EXISTS product_vehicle_fitment (
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  notes TEXT,
  PRIMARY KEY (product_id, vehicle_id)
);

CREATE TABLE IF NOT EXISTS stock_locations (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id BIGINT REFERENCES stock_locations(id) ON DELETE SET NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  guest_token_hash TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'converted', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (user_id IS NOT NULL AND guest_token_hash IS NULL)
    OR (user_id IS NULL AND guest_token_hash IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS cart_items (
  cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'cancelled', 'shipped', 'completed')),
  subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
  shipping NUMERIC(12,2) NOT NULL CHECK (shipping >= 0),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_method TEXT CHECK (delivery_method IN ('pickup', 'delivery'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS address_id BIGINT REFERENCES user_addresses(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_document TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_street TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_complement TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_district TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_city TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_state TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_cep TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km NUMERIC(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS eta_days INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'rejected', 'cancelled'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_external_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS fiscal_status TEXT NOT NULL DEFAULT 'pending_data' CHECK (fiscal_status IN ('pending_data', 'ready', 'issued_manual', 'error'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS minimum_profit_ok BOOLEAN;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS minimum_price_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS owner_settings (
  owner_user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sales_alert_email TEXT NOT NULL,
  sales_alert_whatsapp TEXT,
  store_name TEXT,
  store_cnpj TEXT,
  store_ie TEXT,
  store_address_street TEXT,
  store_address_number TEXT,
  store_address_complement TEXT,
  store_address_district TEXT,
  store_address_city TEXT,
  store_address_state TEXT,
  store_address_cep TEXT,
  store_lat DOUBLE PRECISION,
  store_lng DOUBLE PRECISION,
  free_shipping_global_min NUMERIC(12,2) NOT NULL DEFAULT 199 CHECK (free_shipping_global_min >= 0),
  tax_profile TEXT NOT NULL DEFAULT 'simples_nacional',
  tax_percent NUMERIC(6,4) NOT NULL DEFAULT 0.06 CHECK (tax_percent >= 0),
  gateway_fee_percent NUMERIC(6,4) NOT NULL DEFAULT 0.049 CHECK (gateway_fee_percent >= 0),
  gateway_fixed_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (gateway_fixed_fee >= 0),
  operational_percent NUMERIC(6,4) NOT NULL DEFAULT 0.03 CHECK (operational_percent >= 0),
  packaging_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (packaging_cost >= 0),
  block_below_minimum BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_promotions (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'product' CHECK (scope IN ('product', 'category', 'global')),
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  category_id BIGINT REFERENCES categories(id) ON DELETE CASCADE,
  is_free_shipping BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS geo_cache (
  id BIGSERIAL PRIMARY KEY,
  cep TEXT,
  query TEXT NOT NULL UNIQUE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  city TEXT,
  state TEXT,
  provider TEXT NOT NULL DEFAULT 'nominatim',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_quotes (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('pickup', 'delivery')),
  distance_km NUMERIC(10,2),
  eta_days INTEGER NOT NULL CHECK (eta_days >= 1),
  shipping_cost NUMERIC(12,2) NOT NULL CHECK (shipping_cost >= 0),
  rule_applied TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_events (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT,
  status TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiscal_documents (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_data' CHECK (status IN ('pending_data', 'ready', 'issued_manual', 'error')),
  document_type TEXT NOT NULL DEFAULT 'NFe',
  number TEXT,
  series TEXT,
  access_key TEXT,
  xml_url TEXT,
  pdf_url TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS owner_notifications (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'whatsapp')),
  target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'error')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS product_events (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'add_to_cart', 'checkout_start', 'purchase')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_reason_catalog (
  code TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_returns (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  order_item_order_id BIGINT,
  order_item_product_id BIGINT,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  reason_code TEXT REFERENCES return_reason_catalog(code) ON DELETE RESTRICT,
  reason_detail TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'approved', 'rejected', 'resolved')),
  owner_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  FOREIGN KEY (order_item_order_id, order_item_product_id) REFERENCES order_items(order_id, product_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS customer_complaints (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  owner_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS owner_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id BIGINT,
  before_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  after_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_open_user ON carts (user_id)
WHERE status = 'open' AND user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_carts_open_guest ON carts (guest_token_hash)
WHERE status = 'open' AND guest_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
CREATE INDEX IF NOT EXISTS idx_users_cep ON users (cep);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (is_active);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_prices_product_active ON product_prices (product_id, valid_to);
CREATE INDEX IF NOT EXISTS idx_images_product_kind ON product_images (product_id, kind);
CREATE INDEX IF NOT EXISTS idx_media_assets_owner_date ON media_assets (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_active ON offers (is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_product_type_date ON product_events (product_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_events_date ON product_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_returns_product_date ON product_returns (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_returns_status ON product_returns (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_complaints_product_date ON customer_complaints (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_complaints_status ON customer_complaints (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_audit_logs_entity ON owner_audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_audit_logs_owner ON owner_audit_logs (owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user ON user_addresses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shipping_promotions_active ON shipping_promotions (is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_shipping_promotions_product ON shipping_promotions (product_id);
CREATE INDEX IF NOT EXISTS idx_shipping_promotions_category ON shipping_promotions (category_id);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events (order_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_order ON payment_transactions (order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status_date ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_city ON orders (delivery_city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_notifications_order ON owner_notifications (order_id, created_at DESC);

INSERT INTO roles (code, name)
VALUES
  ('customer', 'Cliente'),
  ('owner', 'Owner')
ON CONFLICT (code) DO NOTHING;

INSERT INTO stock_locations (name)
VALUES ('Loja')
ON CONFLICT (name) DO NOTHING;

INSERT INTO return_reason_catalog (code, label)
VALUES
  ('wrong_item', 'Item incorreto'),
  ('damaged', 'Produto danificado'),
  ('defect', 'Defeito de fabrica'),
  ('incompatible', 'Incompatibilidade com a moto'),
  ('other', 'Outro motivo')
ON CONFLICT (code) DO NOTHING;
