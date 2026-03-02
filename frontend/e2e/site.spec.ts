import { expect, test } from '@playwright/test'
import { API_BASE, ensureOwnerSession, resetE2EData } from './helpers/session'

let cleanupSentinelName = ''

test.afterEach(async ({ request }) => {
  await resetE2EData(request)
})

async function ensureHighlightsAvailable(request: Parameters<typeof ensureOwnerSession>[0], minimumOffers = 4) {
  await ensureOwnerSession(request)

  const productsResponse = await request.get(`${API_BASE}/api/products?page=1&pageSize=40&sort=name-asc`)
  expect(productsResponse.ok()).toBeTruthy()
  const payload = await productsResponse.json()
  const items = Array.isArray(payload?.items) ? payload.items : []
  expect(items.length).toBeGreaterThan(0)

  const targetProducts = items.slice(0, Math.min(minimumOffers, items.length))
  for (const product of targetProducts) {
    const price = Number(product?.price || 0)
    const productId = Number(product?.id || 0)
    if (!Number.isFinite(price) || !Number.isInteger(productId) || productId <= 0) continue

    const offer = await request.post(`${API_BASE}/api/owner/offers`, {
      data: {
        productId,
        badge: 'Oferta E2E',
        description: 'Oferta ativa para validar grade de destaques em linha unica.',
        compareAtPrice: Number((price + 20).toFixed(2)),
        isActive: true,
      },
    })

    if (offer.status() === 409) continue
    expect(offer.ok()).toBeTruthy()
  }
}

test('fluxo real: catalogo, pesquisa, mochila, compra e comentario', async ({ page, request }) => {
  const suffix = Date.now()
  const customerEmail = `customer_e2e_${suffix}@rodando.local`

  await ensureOwnerSession(request)
  const ownerApi = request

  const sku = `E2E-${suffix}`
  const createdProduct = await ownerApi.post(`${API_BASE}/api/owner/products`, {
    data: {
      name: `Produto E2E ${suffix}`,
      sku,
      manufacturer: 'QA Factory',
      category: 'Teste',
      bikeModel: 'CG 160',
      price: 199.9,
      stock: 12,
      imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=1200&q=80',
      hoverImageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
      description: 'Item real criado no teste E2E.',
      isActive: true,
    },
  })
  expect(createdProduct.ok()).toBeTruthy()
  const productPayload = await createdProduct.json()
  const productId = Number(productPayload.item.id)

  const createdOffer = await ownerApi.post(`${API_BASE}/api/owner/offers`, {
    data: {
      productId,
      badge: 'Oferta E2E',
      description: 'Oferta real criada durante o teste E2E.',
      compareAtPrice: 249.9,
      isActive: true,
    },
  })
  expect(createdOffer.ok()).toBeTruthy()
  const offersResponse = await request.get(`${API_BASE}/api/offers`)
  expect(offersResponse.ok()).toBeTruthy()
  const offersPayload = await offersResponse.json()
  expect(Array.isArray(offersPayload.items)).toBeTruthy()
  expect(offersPayload.items.some((offer: { productId: number }) => Number(offer.productId) === productId)).toBeTruthy()

  await page.goto('/catalog')
  await page.getByLabel('Buscar produto').fill(`Produto E2E ${suffix}`)
  await page.getByRole('button', { name: 'Aplicar filtros' }).first().click()
  await expect(page.getByText(`Produto E2E ${suffix}`).first()).toBeVisible()

  await page.getByTestId(`catalog-add-${productId}`).click()
  await page.goto('/cart')
  await expect(page.getByText(`Produto E2E ${suffix}`)).toBeVisible()

  await page.getByRole('button', { name: 'Ir para checkout' }).click()
  await expect(page).toHaveURL(/\/auth/)

  const customerSignup = await page.request.post(`${API_BASE}/api/auth/signup`, {
    data: {
      name: 'Cliente E2E',
      email: customerEmail,
      password: '123456',
      cep: '01001-000',
      addressStreet: 'Praca da Se',
      addressCity: 'Sao Paulo',
      addressState: 'SP',
    },
  })
  expect(customerSignup.ok()).toBeTruthy()

  await page.goto('/cart')
  await expect(page.getByText(`Produto E2E ${suffix}`)).toBeVisible()
  await page.getByRole('button', { name: 'Ir para checkout' }).click()
  await expect(page.getByText('Pedido #')).toBeVisible()

  await page.goto('/catalog')
  await page.getByLabel('Buscar produto').fill(`Produto E2E ${suffix}`)
  await page.getByRole('button', { name: 'Aplicar filtros' }).first().click()
  await page.getByRole('button', { name: 'Avaliar' }).first().click()
  await page.getByTestId('catalog-review-message-input').fill(`Comentario real E2E ${suffix} para validar persistencia.`)
  await page.getByTestId('catalog-review-submit-button').click()
  await expect(page.getByRole('dialog', { name: 'Avaliar produto' }).getByText('Avaliacao publicada com sucesso.')).toBeVisible()
})

test('nao-funcional: sem erro de console e carregamento rapido de navegacao', async ({ page }) => {
  const errors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (!text.includes('favicon') && !text.includes('404')) {
        errors.push(text)
      }
    }
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const homeTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    return nav ? nav.domContentLoadedEventEnd : 0
  })
  expect(homeTiming).toBeLessThan(5000)

  await page.goto('/catalog')
  await expect(page.getByText('Catalogo de pecas')).toBeVisible()

  const catalogTiming = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    return nav ? nav.domContentLoadedEventEnd : 0
  })
  expect(catalogTiming).toBeLessThan(5000)

  expect(errors).toEqual([])
})

test('home institucional: sem overflow horizontal e secao de loja fisica compacta', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')

  await expect(page.getByTestId('home-hero-section')).toBeVisible()
  await expect(page.getByTestId('home-catalog-cta')).toBeVisible()
  await expect(page.getByTestId('home-contact-section')).toBeVisible()
<<<<<<< HEAD
  await expect(page.getByAltText(/Foto da loja/i)).toBeVisible()
=======
  await expect(page.getByAltText('Foto da loja física Rodando Moto Center')).toBeVisible()
>>>>>>> 00d9f8b1cd49468b71d5f26d93d4a98448814a55

  const hasGlobalOverflow = await page.evaluate(() => {
    const root = document.documentElement
    return root.scrollWidth - root.clientWidth > 1
  })
  expect(hasGlobalOverflow).toBeFalsy()

  const contactHeight = await page.locator('[data-testid="home-contact-section"]').evaluate((el) =>
    Math.round(el.getBoundingClientRect().height)
  )
  expect(contactHeight).toBeLessThan(900)
})

test('destaques da semana: quantidade respeita uma unica linha por breakpoint', async ({ page }) => {
  await ensureHighlightsAvailable(page.request, 4)

  await page.setViewportSize({ width: 1536, height: 900 })
  await page.goto('/')
  let xlCount = 0
  await expect
    .poll(async () => {
      xlCount = await page.getByTestId('home-highlight-card').count()
      return xlCount
    })
    .toBeGreaterThan(0)
  expect(xlCount).toBeGreaterThan(0)
  expect(xlCount).toBeLessThanOrEqual(4)

  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')
  let smCount = 0
  await expect
    .poll(async () => {
      smCount = await page.getByTestId('home-highlight-card').count()
      return smCount
    })
    .toBeGreaterThan(0)
  expect(smCount).toBeLessThanOrEqual(2)

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  let xsCount = 0
  await expect
    .poll(async () => {
      xsCount = await page.getByTestId('home-highlight-card').count()
      return xsCount
    })
    .toBeGreaterThan(0)
  expect(xsCount).toBeLessThanOrEqual(1)
})

test('desktop: bottom nav mobile nao aparece em paginas publicas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })

  await page.goto('/')
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden()

  await page.goto('/catalog')
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden()

  await page.goto('/cart')
  await expect(page.getByTestId('mobile-bottom-nav')).toBeHidden()
})

test('mobile: home, catalogo e mochila sem corte no topo e sem overflow horizontal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })

  await page.goto('/catalog')
  await expect(page.getByText('Catalogo de pecas')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Filtros e ordenacao' })).toBeVisible()
  await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible()
  await expect(page.getByTestId('mobile-nav-home')).toBeVisible()
  await expect(page.getByTestId('mobile-nav-catalog')).toBeVisible()
  await expect(page.getByTestId('mobile-nav-cart')).toBeVisible()
  await expect(page.getByTestId('mobile-nav-account')).toBeVisible()
  const navBackground = await page.getByTestId('mobile-bottom-nav').evaluate((el) => {
    const navSurface = el.firstElementChild as HTMLElement | null
    return getComputedStyle(navSurface || (el as HTMLElement)).backgroundColor
  })
  const navAlphaMatch = navBackground.match(/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*([0-9.]+)\s*\)/i)
  const navAlpha = navAlphaMatch ? Number(navAlphaMatch[1]) : 1
  expect(navAlpha).toBeGreaterThan(0.9)
  let hasGlobalOverflow = await page.evaluate(() => {
    const root = document.documentElement
    return root.scrollWidth - root.clientWidth > 1
  })
  expect(hasGlobalOverflow).toBeFalsy()

  await page.getByTestId('mobile-nav-cart').click()
  await expect(page).toHaveURL(/\/cart/)
  await expect(page.getByText('Itens selecionados')).toBeVisible()
  await expect(page.getByText('Resumo')).toBeVisible()
  hasGlobalOverflow = await page.evaluate(() => {
    const root = document.documentElement
    return root.scrollWidth - root.clientWidth > 1
  })
  expect(hasGlobalOverflow).toBeFalsy()

  await page.getByTestId('mobile-nav-home').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId('home-hero-section')).toBeVisible()
  await expect(page.getByTestId('home-contact-section')).toBeVisible()
  hasGlobalOverflow = await page.evaluate(() => {
    const root = document.documentElement
    return root.scrollWidth - root.clientWidth > 1
  })
  expect(hasGlobalOverflow).toBeFalsy()
})

test('transicao direcional por origem e destino', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await expect(page.locator('[data-route-direction="fade"]')).toBeVisible()

  await page.getByTestId('header-nav-catalog').click()
  await expect(page).toHaveURL(/\/catalog/)
  await expect(page.locator('[data-route-direction="left"]')).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('[data-route-direction="right"]')).toBeVisible()

  await page.getByTestId('header-nav-catalog').click()
  await expect(page).toHaveURL(/\/catalog/)
  await page.getByTestId('header-account-button').click()
  await expect(page).toHaveURL(/\/auth/)
  await page.getByRole('link', { name: '/owner/login' }).click()
  await expect(page).toHaveURL(/\/owner\/login/)
  await expect(page.locator('[data-route-direction="fade"]')).toBeVisible()
})

test('auth: setas de voltar estao visiveis e retornam para home', async ({ page }) => {
  await page.goto('/auth')
  await expect(page.getByLabel('Voltar para a página inicial')).toBeVisible()
  await page.getByLabel('Voltar para a página inicial').click()
  await expect(page).toHaveURL(/\/$/)

  await page.goto('/auth/signup')
  await expect(page.getByLabel('Voltar para a página inicial')).toBeVisible()
  await page.getByLabel('Voltar para a página inicial').click()
  await expect(page).toHaveURL(/\/$/)

  await page.goto('/owner/login')
  await expect(page.getByLabel('Voltar para a página inicial')).toBeVisible()
  await page.getByLabel('Voltar para a página inicial').click()
  await expect(page).toHaveURL(/\/$/)
})

test('owner dashboard: tabela sem corte lateral e acoes visiveis', async ({ page }) => {
  await ensureOwnerSession(page.request)

  await page.setViewportSize({ width: 1366, height: 900 })
  await page.goto('/owner/dashboard')

  await expect(page.getByRole('heading', { name: 'Dashboard de produtos' })).toBeVisible()
  await expect(page.getByText('Acoes').first()).toBeVisible()
  await expect(page.getByTestId('owner-dashboard-table-scroll')).toBeVisible()

  const hasGlobalOverflow = await page.evaluate(() => {
    const root = document.documentElement
    return root.scrollWidth - root.clientWidth > 1
  })
  expect(hasGlobalOverflow).toBeFalsy()
})

test('cleanup e2e: produtos criados em um teste nao persistem para o teste seguinte', async ({ request }) => {
  await ensureOwnerSession(request)
  const suffix = Date.now()
  cleanupSentinelName = `Cleanup Sentinel ${suffix}`
  const created = await request.post(`${API_BASE}/api/owner/products`, {
    data: {
      name: cleanupSentinelName,
      sku: `CLEAN-${suffix}`,
      manufacturer: 'QA Cleanup',
      category: 'Teste',
      bikeModel: 'CG 160',
      price: 59.9,
      stock: 8,
      imageUrl: 'https://images.unsplash.com/photo-1621947081720-86970823b77a?auto=format&fit=crop&w=900&q=80',
      description: 'Produto para validar limpeza automatica entre testes.',
      isActive: true,
    },
  })
  expect(created.ok()).toBeTruthy()
})

test('cleanup e2e: estado inicial nao contem produto sentinela do teste anterior', async ({ page }) => {
  expect(cleanupSentinelName).not.toEqual('')
  await page.goto('/catalog')
  await page.getByLabel('Buscar produto').fill(cleanupSentinelName)
  await page.getByRole('button', { name: 'Aplicar filtros' }).first().click()
  await expect(page.getByText('Nenhum produto encontrado')).toBeVisible()
})
