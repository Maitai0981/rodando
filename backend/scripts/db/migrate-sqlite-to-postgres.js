const fs = require('node:fs')
const path = require('node:path')

const sourceFile = process.argv[2] || process.env.LEGACY_SQLITE_FILE || path.join(__dirname, '..', '..', 'data', 'rodando.sqlite')

if (!fs.existsSync(sourceFile)) {
  console.error(`Arquivo SQLite legado nao encontrado: ${sourceFile}`)
  process.exit(1)
}

const { DatabaseSync } = require('node:sqlite')
const { initializeDatabase, query, queryOne, withTransaction, closePool } = require('../../src/db')

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensureCategoryId(name, tx) {
  const row = await tx.one(
    `INSERT INTO categories (name, slug)
     VALUES ($1, $2)
     ON CONFLICT (name)
     DO UPDATE SET slug = EXCLUDED.slug
     RETURNING id`,
    [name, slugify(name)],
  )
  return Number(row.id)
}

async function ensureManufacturerId(name, tx) {
  const row = await tx.one(
    `INSERT INTO manufacturers (name)
     VALUES ($1)
     ON CONFLICT (name)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name],
  )
  return Number(row.id)
}

async function migrateUsers(sqliteDb) {
  const rows = sqliteDb.prepare('SELECT id, name, email, password_hash, role, created_at, updated_at FROM users').all()
  const migrated = new Map()

  await withTransaction(async (tx) => {
    for (const row of rows) {
      const created = await tx.one(
        `INSERT INTO users (name, email, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, COALESCE($4::timestamptz, NOW()), COALESCE($5::timestamptz, NOW()))
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name, updated_at = NOW()
         RETURNING id`,
        [row.name, String(row.email).toLowerCase(), row.password_hash, row.created_at || null, row.updated_at || null],
      )

      const roleCode = String(row.role || 'customer') === 'owner' ? 'owner' : 'customer'
      const role = await tx.one('SELECT id FROM roles WHERE code = $1', [roleCode])
      await tx.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [Number(created.id), Number(role.id)])
      migrated.set(Number(row.id), Number(created.id))
    }
  })

  return migrated
}

async function migrateProducts(sqliteDb) {
  const rows = sqliteDb.prepare('SELECT * FROM products').all()
  const migrated = new Map()

  await withTransaction(async (tx) => {
    for (const row of rows) {
      const categoryId = await ensureCategoryId(row.category, tx)
      const manufacturerId = await ensureManufacturerId(row.manufacturer, tx)
      const created = await tx.one(
        `INSERT INTO products (sku, name, description, category_id, manufacturer_id, bike_model, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, NOW()), COALESCE($9::timestamptz, NOW()))
         ON CONFLICT (sku)
         DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = NOW()
         RETURNING id`,
        [
          String(row.sku).toUpperCase(),
          row.name,
          row.description || '',
          categoryId,
          manufacturerId,
          row.bike_model,
          Number(row.is_active) === 1,
          row.created_at || null,
          row.updated_at || null,
        ],
      )

      const productId = Number(created.id)
      await tx.query(
        'INSERT INTO product_stocks (product_id, quantity) VALUES ($1, $2) ON CONFLICT (product_id) DO UPDATE SET quantity = EXCLUDED.quantity',
        [productId, Number(row.stock || 0)],
      )
      await tx.query('INSERT INTO product_prices (product_id, price, valid_from) VALUES ($1, $2, NOW())', [productId, Number(row.price || 0)])

      if (row.image_url) {
        await tx.query(
          `INSERT INTO product_images (product_id, kind, url, sort_order)
           VALUES ($1, 'main', $2, 0)
           ON CONFLICT (product_id, kind, sort_order)
           DO UPDATE SET url = EXCLUDED.url`,
          [productId, row.image_url],
        )
      }
      if (row.hover_image_url) {
        await tx.query(
          `INSERT INTO product_images (product_id, kind, url, sort_order)
           VALUES ($1, 'hover', $2, 0)
           ON CONFLICT (product_id, kind, sort_order)
           DO UPDATE SET url = EXCLUDED.url`,
          [productId, row.hover_image_url],
        )
      }

      migrated.set(Number(row.id), productId)
    }
  })

  return migrated
}

async function migrateOffers(sqliteDb, productMap) {
  const hasTable = sqliteDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='offers'").get()
  if (!hasTable) return

  const rows = sqliteDb.prepare('SELECT * FROM offers').all()
  await withTransaction(async (tx) => {
    for (const row of rows) {
      const productId = productMap.get(Number(row.product_id))
      if (!productId) continue
      await tx.query(
        `INSERT INTO offers (product_id, badge, description, compare_at_price, is_active, starts_at, ends_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8::timestamptz, NOW()), COALESCE($9::timestamptz, NOW()))
         ON CONFLICT (product_id)
         DO UPDATE SET badge = EXCLUDED.badge, description = EXCLUDED.description, compare_at_price = EXCLUDED.compare_at_price, updated_at = NOW()`,
        [
          productId,
          row.badge || 'Oferta',
          row.description || '',
          Number(row.compare_at_price || 0),
          Number(row.is_active) === 1,
          row.starts_at || null,
          row.ends_at || null,
          row.created_at || null,
          row.updated_at || null,
        ],
      )
    }
  })
}

async function run() {
  await initializeDatabase()
  const sqliteDb = new DatabaseSync(sourceFile)

  try {
    const userMap = await migrateUsers(sqliteDb)
    const productMap = await migrateProducts(sqliteDb)
    await migrateOffers(sqliteDb, productMap)

    const info = await queryOne('SELECT COUNT(*)::int AS products FROM products')
    console.log(`Migracao concluida. Usuarios mapeados: ${userMap.size}. Produtos no Postgres: ${Number(info?.products || 0)}.`)
    console.log('Comentarios legados sem product_id nao foram migrados para reviews.')
  } finally {
    sqliteDb.close()
  }
}

run()
  .catch((error) => {
    console.error('Falha na migracao SQLite -> PostgreSQL:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closePool()
  })
