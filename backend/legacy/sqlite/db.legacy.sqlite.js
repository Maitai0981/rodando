const fs = require('node:fs')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

const dataDir = path.join(__dirname, '..', 'data')
const dbFile = process.env.DB_FILE || path.join(dataDir, 'rodando.sqlite')
const shouldSeedDemoData = String(process.env.SEED_DEMO_DATA || '0') === '1'

fs.mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(dbFile)

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'customer')) DEFAULT 'customer',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    manufacturer TEXT NOT NULL,
    category TEXT NOT NULL,
    bike_model TEXT NOT NULL,
    price REAL NOT NULL CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT NOT NULL DEFAULT '',
    hover_image_url TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_bag_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS guest_bag_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_token_hash TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (guest_token_hash, product_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'created',
    total REAL NOT NULL CHECK (total >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price REAL NOT NULL CHECK (unit_price >= 0),
    line_total REAL NOT NULL CHECK (line_total >= 0),
    created_at TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS offers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL UNIQUE,
    badge TEXT NOT NULL DEFAULT 'Oferta',
    description TEXT NOT NULL DEFAULT '',
    compare_at_price REAL NOT NULL CHECK (compare_at_price > 0),
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    starts_at TEXT,
    ends_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    author_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    message TEXT NOT NULL,
    is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
  CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_active_price ON products(is_active, price);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_bag_user_id ON user_bag_items(user_id);
  CREATE INDEX IF NOT EXISTS idx_guest_bag_token_hash ON guest_bag_items(guest_token_hash);
  CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_offers_is_active ON offers(is_active);
  CREATE INDEX IF NOT EXISTS idx_comments_public_created ON comments(is_public, created_at DESC);
`)

ensureColumn('products', 'image_url', "image_url TEXT NOT NULL DEFAULT ''")
ensureColumn('products', 'hover_image_url', "hover_image_url TEXT NOT NULL DEFAULT ''")

function nowIso() {
  return new Date().toISOString()
}

function cleanExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(nowIso())
}

function ensureColumn(tableName, columnName, columnDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all()
  const exists = columns.some((column) => String(column.name) === columnName)
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`)
  }
}

function seedProducts() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM products').get()
  if (Number(row.count) > 0) {
    return
  }

  const insert = db.prepare(`
    INSERT INTO products (
      name, sku, manufacturer, category, bike_model, price, stock, image_url, hover_image_url, description, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const createdAt = nowIso()
  const sample = [
    ['Camara de Ar Aro 18 Fina', 'CA-AR18-F', 'Rodando', 'Camara de Ar', 'CG 160 / Fan 160', 49.9, 120, '', '', 'Alta resistencia para uso urbano e estrada.', 1],
    ['Camara de Ar Aro 17 Larga', 'CA-AR17-L', 'Rodando', 'Camara de Ar', 'XRE 190 / Bros', 58.9, 90, '', '', 'Aplicacao para pneus traseiros mais largos.', 1],
    ['Pastilha de Freio Dianteira Pro', 'PF-DI-PRO', 'Rodaflex', 'Freio', 'CB 300 / Twister', 79.9, 45, '', '', 'Composto com boa resposta e durabilidade.', 1],
    ['Filtro de Oleo Premium', 'FO-118', 'Magna', 'Lubrificacao', 'Factor / Fazer', 32.5, 220, '', '', 'Filtro para revisao preventiva e uso diario.', 1],
    ['Kit Relacao Touring', 'KR-TOUR-991', 'Voltx', 'Transmissao', 'XTZ 250 / Lander', 189.9, 34, '', '', 'Kit relacao com foco em durabilidade.', 1]
  ]

  for (const item of sample) {
    insert.run(...item, createdAt, createdAt)
  }
}

cleanExpiredSessions()
seedProducts()
if (shouldSeedDemoData) {
  seedOffers()
  seedComments()
}

function seedOffers() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM offers').get()
  if (Number(row.count || 0) > 0) {
    return
  }

  const products = db.prepare(`
    SELECT id, price
    FROM products
    WHERE is_active = 1
    ORDER BY id ASC
    LIMIT 3
  `).all()

  if (products.length === 0) return

  const now = nowIso()
  const insert = db.prepare(`
    INSERT INTO offers (product_id, badge, description, compare_at_price, is_active, starts_at, ends_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const descriptors = [
    {
      badge: 'Oferta da semana',
      description: 'Condicao especial com retirada local e envio rapido.',
      multiplier: 1.18,
    },
    {
      badge: 'Mais procurado',
      description: 'Oferta ativa para reposicao imediata no dia a dia.',
      multiplier: 1.14,
    },
    {
      badge: 'Preco especial',
      description: 'Valor promocional por tempo limitado.',
      multiplier: 1.12,
    },
  ]

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index]
    const descriptor = descriptors[index] || descriptors[descriptors.length - 1]
    const compareAt = Math.max(Number(product.price) * descriptor.multiplier, Number(product.price) + 1)
    insert.run(
      Number(product.id),
      descriptor.badge,
      descriptor.description,
      Number(compareAt.toFixed(2)),
      1,
      null,
      null,
      now,
      now,
    )
  }
}

function seedComments() {
  const row = db.prepare('SELECT COUNT(*) AS count FROM comments').get()
  if (Number(row.count || 0) > 0) {
    return
  }

  const now = nowIso()
  const insert = db.prepare(`
    INSERT INTO comments (user_id, author_name, rating, message, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const sample = [
    ['Lucas M.', 5, 'Atendimento rapido no WhatsApp e entrega dentro do prazo combinado.'],
    ['Fernanda R.', 5, 'Catalogo bem organizado e processo de compra simples.'],
    ['Rafael C.', 4, 'Retirada na loja foi tranquila e com suporte na escolha da peca.'],
  ]

  for (const [authorName, rating, message] of sample) {
    insert.run(null, authorName, rating, message, 1, now, now)
  }
}

module.exports = {
  db,
  nowIso,
}
