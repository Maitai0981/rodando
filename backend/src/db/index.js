const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { Pool } = require('pg')

const DEFAULT_DATABASE_URL = 'postgres://postgres:postgres@127.0.0.1:5432/rodando'
const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL
const shouldSeedBaseCatalog = String(process.env.SEED_BASE_CATALOG || '0') === '1'
const shouldSeedDemoData = String(process.env.SEED_DEMO_DATA || '0') === '1'
const shouldResetSchema = String(process.env.DB_RESET || '0') === '1'

const schemaPath = path.join(__dirname, 'schema.sql')
const schemaSql = fs.readFileSync(schemaPath, 'utf8')

const pool = new Pool({
  connectionString,
  max: Number(process.env.DB_POOL_MAX || 12),
})

let initPromise = null
const NON_USER_RESET_TABLES = [
  'sessions',
  'product_images',
  'product_prices',
  'product_stocks',
  'offers',
  'product_vehicle_fitment',
  'vehicles',
  'inventory_movements',
  'carts',
  'cart_items',
  'orders',
  'order_items',
  'reviews',
  'product_events',
  'product_returns',
  'customer_complaints',
  'owner_audit_logs',
  'owner_notifications',
  'fiscal_documents',
  'payment_transactions',
  'order_events',
  'shipping_quotes',
  'shipping_promotions',
  'geo_cache',
  'media_assets',
  'user_ux_assist_state',
  'user_addresses',
  'owner_settings',
  'products',
  'categories',
  'manufacturers',
]

function nowIso() {
  return new Date().toISOString()
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

function escapeIdent(identifier) {
  return `"${String(identifier).replace(/"/g, '""')}"`
}

async function query(text, params = []) {
  return pool.query(text, params)
}

async function queryOne(text, params = []) {
  const { rows } = await query(text, params)
  return rows[0] || null
}

async function withTransaction(handler) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const tx = {
      query: (text, params = []) => client.query(text, params),
      one: async (text, params = []) => {
        const { rows } = await client.query(text, params)
        return rows[0] || null
      },
    }
    const result = await handler(tx)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function ensureDatabaseExists() {
  const parsed = new URL(connectionString)
  const dbName = parsed.pathname.replace(/^\//, '').trim()
  if (!dbName) return

  const maintenanceUrl = new URL(connectionString)
  maintenanceUrl.pathname = '/postgres'

  const maintenance = new Pool({ connectionString: maintenanceUrl.toString(), max: 2 })
  try {
    const exists = await maintenance.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
    if (exists.rowCount === 0) {
      await maintenance.query(`CREATE DATABASE ${escapeIdent(dbName)}`)
    }
  } finally {
    await maintenance.end()
  }
}

async function resetSchema() {
  await query('DROP SCHEMA IF EXISTS public CASCADE')
  await query('CREATE SCHEMA public')
}

async function applySchema() {
  await query(schemaSql)
}

async function upsertCategory(client, name) {
  const slug = slugify(name)
  const row = await client.one(
    `INSERT INTO categories (name, slug)
     VALUES ($1, $2)
     ON CONFLICT (name)
     DO UPDATE SET slug = EXCLUDED.slug
     RETURNING id`,
    [name, slug],
  )
  return Number(row.id)
}

async function upsertManufacturer(client, name) {
  const row = await client.one(
    `INSERT INTO manufacturers (name)
     VALUES ($1)
     ON CONFLICT (name)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name],
  )
  return Number(row.id)
}

async function seedProducts() {
  const row = await queryOne('SELECT COUNT(*)::int AS count FROM products')
  if (Number(row?.count || 0) > 0) {
    return
  }

  const sample = [
    {
      name: 'Camara de Ar Aro 18 Fina',
      sku: 'CA-AR18-F',
      manufacturer: 'Rodando',
      category: 'Camara de Ar',
      bikeModel: 'CG 160 / Fan 160',
      price: 49.9,
      stock: 120,
      imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
      hoverImageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
      description: 'Alta resistencia para uso urbano e estrada.',
      cost: 29.9,
      minimumStock: 8,
      reorderPoint: 16,
      isActive: true,
    },
    {
      name: 'Camara de Ar Aro 17 Larga',
      sku: 'CA-AR17-L',
      manufacturer: 'Rodando',
      category: 'Camara de Ar',
      bikeModel: 'XRE 190 / Bros',
      price: 58.9,
      stock: 90,
      imageUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=80',
      hoverImageUrl: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80',
      description: 'Aplicacao para pneus traseiros mais largos.',
      cost: 35.5,
      minimumStock: 8,
      reorderPoint: 14,
      isActive: true,
    },
    {
      name: 'Pastilha de Freio Dianteira Pro',
      sku: 'PF-DI-PRO',
      manufacturer: 'Rodaflex',
      category: 'Freio',
      bikeModel: 'CB 300 / Twister',
      price: 79.9,
      stock: 45,
      imageUrl: 'https://images.unsplash.com/photo-1613214150331-6b3f6dd43d58?auto=format&fit=crop&w=1200&q=80',
      hoverImageUrl: 'https://images.unsplash.com/photo-1613214150331-6b3f6dd43d58?auto=format&fit=crop&w=900&q=80',
      description: 'Composto com boa resposta e durabilidade.',
      cost: 48.9,
      minimumStock: 5,
      reorderPoint: 10,
      isActive: true,
    },
    {
      name: 'Filtro de Oleo Premium',
      sku: 'FO-118',
      manufacturer: 'Magna',
      category: 'Lubrificacao',
      bikeModel: 'Factor / Fazer',
      price: 32.5,
      stock: 220,
      imageUrl: 'https://images.unsplash.com/photo-1588542506506-0e42f6f9d75b?auto=format&fit=crop&w=1200&q=80',
      hoverImageUrl: 'https://images.unsplash.com/photo-1588542506506-0e42f6f9d75b?auto=format&fit=crop&w=900&q=80',
      description: 'Filtro para revisao preventiva e uso diario.',
      cost: 19.8,
      minimumStock: 15,
      reorderPoint: 30,
      isActive: true,
    },
  ]

  await withTransaction(async (tx) => {
    for (const item of sample) {
      const categoryId = await upsertCategory(tx, item.category)
      const manufacturerId = await upsertManufacturer(tx, item.manufacturer)

      const product = await tx.one(
        `INSERT INTO products (
          sku, name, description, category_id, manufacturer_id, bike_model, cost, minimum_stock, reorder_point, is_active, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
        RETURNING id`,
        [
          item.sku,
          item.name,
          item.description,
          categoryId,
          manufacturerId,
          item.bikeModel,
          item.cost ?? 0,
          item.minimumStock ?? 5,
          item.reorderPoint ?? 10,
          item.isActive,
        ],
      )

      const productId = Number(product.id)

      await tx.query('INSERT INTO product_stocks (product_id, quantity) VALUES ($1, $2)', [productId, item.stock])
      await tx.query('INSERT INTO product_prices (product_id, price, valid_from) VALUES ($1, $2, NOW())', [productId, item.price])
      await tx.query(
        'INSERT INTO product_images (product_id, kind, url, sort_order) VALUES ($1, $2, $3, $4)',
        [productId, 'main', item.imageUrl, 0],
      )
      if (item.hoverImageUrl) {
        await tx.query(
          'INSERT INTO product_images (product_id, kind, url, sort_order) VALUES ($1, $2, $3, $4)',
          [productId, 'hover', item.hoverImageUrl, 0],
        )
      }

      const location = await tx.one('SELECT id FROM stock_locations WHERE name = $1', ['Loja'])
      await tx.query(
        'INSERT INTO inventory_movements (product_id, location_id, delta, reason, created_at) VALUES ($1, $2, $3, $4, NOW())',
        [productId, Number(location?.id || 1), item.stock, 'seed'],
      )
    }
  })
}

async function seedOffers() {
  const row = await queryOne('SELECT COUNT(*)::int AS count FROM offers')
  if (Number(row?.count || 0) > 0) {
    return
  }

  const products = await query(`
    SELECT p.id, pp.price
    FROM products p
    JOIN product_prices pp ON pp.product_id = p.id AND pp.valid_to IS NULL
    WHERE p.is_active = TRUE
    ORDER BY p.id ASC
    LIMIT 3
  `)

  const descriptors = [
    { badge: 'Oferta da semana', description: 'Condicao especial com retirada local e envio rapido.', multiplier: 1.18 },
    { badge: 'Mais procurado', description: 'Oferta ativa para reposicao imediata no dia a dia.', multiplier: 1.14 },
    { badge: 'Preco especial', description: 'Valor promocional por tempo limitado.', multiplier: 1.12 },
  ]

  await withTransaction(async (tx) => {
    for (let index = 0; index < products.rows.length; index += 1) {
      const item = products.rows[index]
      const descriptor = descriptors[index] || descriptors[descriptors.length - 1]
      const compareAtPrice = Math.max(Number(item.price) * descriptor.multiplier, Number(item.price) + 1)

      await tx.query(
        `INSERT INTO offers (product_id, badge, description, compare_at_price, is_active, starts_at, ends_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, TRUE, NULL, NULL, NOW(), NOW())`,
        [Number(item.id), descriptor.badge, descriptor.description, Number(compareAtPrice.toFixed(2))],
      )
    }
  })
}

async function seedDemoReviews() {
  const count = await queryOne('SELECT COUNT(*)::int AS count FROM reviews')
  if (Number(count?.count || 0) > 0) {
    return
  }

  const customerRole = await queryOne('SELECT id FROM roles WHERE code = $1', ['customer'])
  if (!customerRole) {
    return
  }

  const productRow = await queryOne('SELECT id FROM products WHERE is_active = TRUE ORDER BY id ASC LIMIT 1')
  if (!productRow) {
    return
  }

  const demoUser = await queryOne(
    `INSERT INTO users (name, email, password_hash, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    ['Cliente Demo', 'cliente_demo@rodando.local', hashPassword('123456')],
  )

  await query(
    'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [Number(demoUser.id), Number(customerRole.id)],
  )

  const message = 'Compra com entrega rapida e atendimento claro no WhatsApp.'
  await query(
    `INSERT INTO reviews (user_id, product_id, rating, message, is_public, created_at, updated_at)
     VALUES ($1, $2, 5, $3, TRUE, NOW(), NOW())
     ON CONFLICT (user_id, product_id)
     DO UPDATE SET rating = EXCLUDED.rating, message = EXCLUDED.message, updated_at = NOW()`,
    [Number(demoUser.id), Number(productRow.id), message],
  )
}

async function ensureSeedOwner() {
  const email = String(process.env.OWNER_SEED_EMAIL || '').trim().toLowerCase()
  const password = String(process.env.OWNER_SEED_PASSWORD || '').trim()
  const name = String(process.env.OWNER_SEED_NAME || 'Owner')
  if (!email || !password) {
    return
  }

  const ownerRole = await queryOne('SELECT id FROM roles WHERE code = $1', ['owner'])
  if (!ownerRole) return

  const existing = await queryOne('SELECT id FROM users WHERE lower(email) = lower($1)', [email])
  let userId = null

  if (existing) {
    userId = Number(existing.id)
  } else {
    const created = await queryOne(
      `INSERT INTO users (name, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id`,
      [name, email, hashPassword(password)],
    )
    userId = Number(created.id)
  }

  await query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, Number(ownerRole.id)])
}

async function initializeDatabase() {
  if (initPromise) {
    return initPromise
  }

  initPromise = (async () => {
    await ensureDatabaseExists()
    if (shouldResetSchema) {
      await resetSchema()
    }
    await applySchema()
    if (shouldSeedBaseCatalog) {
      await seedProducts()
    }
    if (shouldSeedDemoData) {
      await seedOffers()
      await seedDemoReviews()
    }
    await ensureSeedOwner()
  })()

  return initPromise
}

async function reseedBaseCatalog() {
  await seedProducts()
}

async function resetNonUserData({ reseedBase = true } = {}) {
  const tableListSql = NON_USER_RESET_TABLES.map(escapeIdent).join(', ')
  await query(`TRUNCATE TABLE ${tableListSql} RESTART IDENTITY CASCADE`)
  if (reseedBase) {
    await reseedBaseCatalog()
  }
}

function isDemoUserEmail(email) {
  const safeEmail = String(email || '').trim().toLowerCase()
  if (!safeEmail) return false

  if (safeEmail === 'cliente_demo@rodando.local') return true
  if (safeEmail === 'owner_e2e@rodando.local') return true
  if (safeEmail.endsWith('@rodando.local') && safeEmail.startsWith('auth_ui_')) return true
  if (safeEmail.endsWith('@rodando.local') && safeEmail.startsWith('customer_e2e_')) return true
  if (safeEmail.endsWith('@rodando.local') && safeEmail.includes('_e2e_')) return true
  return false
}

async function purgeDemoUsers() {
  return withTransaction(async (tx) => {
    const rows = await tx.query('SELECT id, email FROM users')
    let removed = 0

    for (const row of rows.rows) {
      const userId = Number(row.id)
      if (!Number.isInteger(userId) || userId <= 0) continue
      if (!isDemoUserEmail(row.email)) continue

      await tx.query('DELETE FROM users WHERE id = $1', [userId])
      removed += 1
    }

    return { removed }
  })
}

async function collectOperationalCounts() {
  const tableNames = [
    'products',
    'offers',
    'reviews',
    'orders',
    'carts',
    'product_events',
    'owner_audit_logs',
  ]
  const counts = {}

  for (const tableName of tableNames) {
    const row = await queryOne(`SELECT COUNT(*)::int AS total FROM ${escapeIdent(tableName)}`)
    counts[tableName] = Number(row?.total || 0)
  }

  return counts
}

async function cleanRealData() {
  await resetNonUserData({ reseedBase: false })
  const purged = await purgeDemoUsers()
  const counts = await collectOperationalCounts()

  return {
    removedDemoUsers: Number(purged?.removed || 0),
    counts,
  }
}

async function closePool() {
  await pool.end()
}

module.exports = {
  connectionString,
  nowIso,
  pool,
  query,
  queryOne,
  withTransaction,
  initializeDatabase,
  ensureSeedOwner,
  reseedBaseCatalog,
  resetNonUserData,
  purgeDemoUsers,
  cleanRealData,
  collectOperationalCounts,
  closePool,
  hashPassword,
}
