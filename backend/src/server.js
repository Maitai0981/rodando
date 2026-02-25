const express = require('express')
const cookieParser = require('cookie-parser')
const { db, nowIso } = require('./db')
const {
  attachAuth,
  clearSessionCookie,
  countOwners,
  createSession,
  createUser,
  deleteSessionByToken,
  getUserByEmail,
  requireOwner,
  setSessionCookie,
  verifyPassword,
} = require('./auth')

const PORT = Number(process.env.PORT || 4000)
const app = express()

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())
app.use(attachAuth)

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: nowIso() })
})

app.get('/api/auth/me', (req, res) => {
  if (!req.auth?.user) {
    return res.status(401).json({ error: 'Nao autenticado.' })
  }
  return res.json({ user: req.auth.user })
})

app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password } = req.body || {}

    const safeName = String(name || '').trim()
    const safeEmail = String(email || '').trim().toLowerCase()
    const safePassword = String(password || '')

    if (safeName.length < 2) {
      return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres.' })
    }
    if (!safeEmail.includes('@') || safeEmail.length < 5) {
      return res.status(400).json({ error: 'Email invalido.' })
    }
    if (safePassword.length < 6) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres.' })
    }
    if (getUserByEmail(safeEmail)) {
      return res.status(409).json({ error: 'Email ja cadastrado.' })
    }

    const role = countOwners() === 0 ? 'owner' : 'customer'
    const userRow = createUser({ name: safeName, email: safeEmail, password: safePassword, role })
    const session = createSession(userRow.id)

    setSessionCookie(res, session.token, session.expiresAt)
    return res.status(201).json({
      message: role === 'owner' ? 'Conta owner criada e autenticada.' : 'Conta criada e autenticada.',
      user: {
        id: Number(userRow.id),
        name: userRow.name,
        email: userRow.email,
        role: userRow.role,
        createdAt: userRow.created_at,
      },
    })
  } catch (error) {
    if (String(error?.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email ja cadastrado.' })
    }
    return res.status(500).json({ error: 'Falha ao criar conta.' })
  }
})

app.post('/api/auth/signin', (req, res) => {
  const { email, password } = req.body || {}
  const safeEmail = String(email || '').trim().toLowerCase()
  const safePassword = String(password || '')

  if (!safeEmail || !safePassword) {
    return res.status(400).json({ error: 'Informe email e senha.' })
  }

  const userRow = getUserByEmail(safeEmail)
  if (!userRow || !verifyPassword(safePassword, userRow.password_hash)) {
    return res.status(401).json({ error: 'Credenciais invalidas.' })
  }

  const session = createSession(userRow.id)
  setSessionCookie(res, session.token, session.expiresAt)

  return res.json({
    message: 'Login realizado com sucesso.',
    user: {
      id: Number(userRow.id),
      name: userRow.name,
      email: userRow.email,
      role: userRow.role,
      createdAt: userRow.created_at,
    },
  })
})

app.post('/api/auth/logout', (req, res) => {
  deleteSessionByToken(req.auth?.token)
  clearSessionCookie(res)
  res.json({ message: 'Logout realizado.' })
})

app.get('/api/products', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  const params = []

  let sql = `
    SELECT id, name, sku, manufacturer, category, bike_model AS bikeModel, price, stock, description, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
    FROM products
    WHERE is_active = 1
  `

  if (q) {
    sql += ' AND (lower(name) LIKE ? OR lower(sku) LIKE ? OR lower(manufacturer) LIKE ? OR lower(category) LIKE ? OR lower(bike_model) LIKE ? )'
    const term = `%${q}%`
    params.push(term, term, term, term, term)
  }

  sql += ' ORDER BY name ASC'
  const rows = db.prepare(sql).all(...params)
  res.json({ items: rows })
})

app.get('/api/owner/dashboard', requireOwner, (_req, res) => {
  const products = db.prepare('SELECT COUNT(*) AS total, SUM(stock) AS stockTotal, SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END) AS lowStock FROM products').get()
  const active = db.prepare('SELECT COUNT(*) AS count FROM products WHERE is_active = 1').get()
  const avgPrice = db.prepare('SELECT AVG(price) AS avgPrice FROM products').get()

  res.json({
    metrics: {
      totalProducts: Number(products.total || 0),
      activeProducts: Number(active.count || 0),
      stockTotal: Number(products.stockTotal || 0),
      lowStockProducts: Number(products.lowStock || 0),
      averagePrice: Number(avgPrice.avgPrice || 0),
    },
  })
})

app.get('/api/owner/products', requireOwner, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  let sql = `
    SELECT id, name, sku, manufacturer, category, bike_model AS bikeModel, price, stock, description,
           is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
    FROM products
  `
  const params = []
  if (q) {
    sql += ' WHERE lower(name) LIKE ? OR lower(sku) LIKE ? OR lower(manufacturer) LIKE ? OR lower(category) LIKE ? OR lower(bike_model) LIKE ? '
    const term = `%${q}%`
    params.push(term, term, term, term, term)
  }
  sql += ' ORDER BY updated_at DESC, id DESC'

  const items = db.prepare(sql).all(...params)
  res.json({ items })
})

app.get('/api/owner/products/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID invalido.' })
  }

  const item = getProductById(id)
  if (!item) {
    return res.status(404).json({ error: 'Produto nao encontrado.' })
  }

  return res.json({ item })
})

app.post('/api/owner/products', requireOwner, (req, res) => {
  const parsed = validateProduct(req.body)
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error })
  }

  const now = nowIso()
  try {
    const result = db.prepare(`
      INSERT INTO products (name, sku, manufacturer, category, bike_model, price, stock, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      parsed.value.name,
      parsed.value.sku,
      parsed.value.manufacturer,
      parsed.value.category,
      parsed.value.bikeModel,
      parsed.value.price,
      parsed.value.stock,
      parsed.value.description,
      parsed.value.isActive ? 1 : 0,
      now,
      now,
    )

    const item = getProductById(result.lastInsertRowid)
    return res.status(201).json({ item })
  } catch (error) {
    if (String(error?.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'SKU ja cadastrado.' })
    }
    return res.status(500).json({ error: 'Falha ao criar produto.' })
  }
})

app.put('/api/owner/products/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID invalido.' })
  }

  const current = getProductById(id)
  if (!current) {
    return res.status(404).json({ error: 'Produto nao encontrado.' })
  }

  const parsed = validateProduct(req.body)
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error })
  }

  try {
    db.prepare(`
      UPDATE products
      SET name = ?, sku = ?, manufacturer = ?, category = ?, bike_model = ?, price = ?, stock = ?, description = ?, is_active = ?, updated_at = ?
      WHERE id = ?
    `).run(
      parsed.value.name,
      parsed.value.sku,
      parsed.value.manufacturer,
      parsed.value.category,
      parsed.value.bikeModel,
      parsed.value.price,
      parsed.value.stock,
      parsed.value.description,
      parsed.value.isActive ? 1 : 0,
      nowIso(),
      id,
    )

    return res.json({ item: getProductById(id) })
  } catch (error) {
    if (String(error?.message || '').includes('UNIQUE')) {
      return res.status(409).json({ error: 'SKU ja cadastrado.' })
    }
    return res.status(500).json({ error: 'Falha ao atualizar produto.' })
  }
})

app.delete('/api/owner/products/:id', requireOwner, (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID invalido.' })
  }

  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id)
  if (Number(result.changes) === 0) {
    return res.status(404).json({ error: 'Produto nao encontrado.' })
  }

  return res.status(204).send()
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})

function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`Rodando backend API online em http://localhost:${port}`)
  })
}

function getProductById(id) {
  return db.prepare(`
    SELECT id, name, sku, manufacturer, category, bike_model AS bikeModel, price, stock, description,
           is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
    FROM products
    WHERE id = ?
  `).get(id)
}

function validateProduct(body) {
  const input = body || {}
  const value = {
    name: String(input.name || '').trim(),
    sku: String(input.sku || '').trim().toUpperCase(),
    manufacturer: String(input.manufacturer || '').trim(),
    category: String(input.category || '').trim(),
    bikeModel: String(input.bikeModel || '').trim(),
    price: Number(input.price),
    stock: Number(input.stock),
    description: String(input.description || '').trim(),
    isActive:
      input.isActive === false || input.isActive === 0 || input.isActive === '0' || input.isActive === 'false'
        ? false
        : true,
  }

  if (value.name.length < 3) return { error: 'Nome do produto deve ter ao menos 3 caracteres.' }
  if (value.sku.length < 3) return { error: 'SKU deve ter ao menos 3 caracteres.' }
  if (value.manufacturer.length < 2) return { error: 'Fabricante obrigatorio.' }
  if (value.category.length < 2) return { error: 'Categoria obrigatoria.' }
  if (value.bikeModel.length < 2) return { error: 'Modelo/aplicacao obrigatorio.' }
  if (!Number.isFinite(value.price) || value.price < 0) return { error: 'Preco invalido.' }
  if (!Number.isInteger(value.stock) || value.stock < 0) return { error: 'Estoque invalido.' }

  return { value }
}

if (require.main === module) {
  startServer(PORT)
}

module.exports = {
  app,
  startServer,
}
