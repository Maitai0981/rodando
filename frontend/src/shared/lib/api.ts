export type AuthUser = {
  id: number
  name: string
  email: string
  role: 'owner' | 'customer'
  phone?: string | null
  document?: string | null
  cep: string | null
  addressStreet: string | null
  addressCity: string | null
  addressState: string | null
  addresses?: AddressItem[]
  defaultAddressId?: number | null
  createdAt: string
}

export type AddressItem = {
  id: number
  userId: number
  label: string
  cep: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  reference: string
  lat: number | null
  lng: number | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type CheckoutDeliveryMethod = 'pickup' | 'delivery'
export type PaymentMethod = 'card_credit' | 'card_debit' | 'pix'

export type AssistScope = 'public' | 'owner'

export type AssistChecklistState = Record<string, boolean>

export type AssistRouteState = {
  id: number
  userId: number
  scope: AssistScope
  routeKey: string
  checklistState: AssistChecklistState
  dismissedTips: string[]
  overlaySeen: boolean
  updatedAt: string
}

export type OrderQuote = {
  deliveryMethod: CheckoutDeliveryMethod
  shippingCost: number
  distanceKm: number
  etaDays: number
  ruleApplied: string
  freeShippingApplied: boolean
}

export type Product = {
  id: number
  name: string
  sku: string
  manufacturer: string
  category: string
  bikeModel: string
  price: number
  stock: number
  imageUrl: string
  hoverImageUrl?: string
  description: string
  cost?: number
  minimumStock?: number
  reorderPoint?: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  totalSold?: number
  compareAtPrice?: number | null
  offerBadge?: string | null
  offerEndsAt?: string | null
  discountPercent?: number
  seoSlug?: string | null
  seoMetaTitle?: string | null
  seoMetaDescription?: string | null
}

export type ProductDetails = {
  item: Product
  gallery: {
    mainUrl: string
    hoverUrl: string
    extra: string[]
  }
  pricing: {
    price: number
    compareAtPrice: number | null
    discountPercent: number
  }
  availability: {
    stock: number
    isActive: boolean
    urgencyLabel: string | null
  }
  compatibility: {
    bikeModel: string
    fitments: Array<{ label: string; value: string }>
  }
  seo: {
    slug: string
    metaTitle: string
    metaDescription: string
  }
  socialProof: {
    averageRating: number
    totalReviews: number
  }
}

export type VariantSelection = {
  fitment: string | null
  quantity: number
}

export type OwnerDashboardParams = {
  period?: 'day' | 'week' | 'month' | 'custom'
  startAt?: string
  endAt?: string
  category?: string
  manufacturer?: string
  status?: 'all' | 'active' | 'draft' | 'inactive' | 'out-of-stock' | 'critical' | 'missing-image'
  q?: string
  sortBy?: 'sku' | 'name' | 'price' | 'cost' | 'margin' | 'stock' | 'unitsSold' | 'revenue' | 'conversion' | 'rating' | 'status' | 'updatedAt'
  direction?: 'asc' | 'desc'
  page?: number
  pageSize?: number
}

export type OwnerDashboardProduct = {
  id: number
  sku: string
  name: string
  manufacturer: string
  category: string
  bikeModel: string
  price: number
  cost: number
  marginPercent: number
  markupPercent: number
  grossProfit: number
  stock: number
  minimumStock: number
  reorderPoint: number
  stockHealth: 'critical' | 'low' | 'healthy'
  unitsSold: number
  orderCount: number
  revenue: number
  conversionRate: number
  averageRating: number
  reviewCount: number
  returnRate: number
  returnedUnits: number
  returnCount: number
  openComplaints: number
  views: number
  clicks: number
  addToCart: number
  checkoutStart: number
  purchases: number
  ctr: number
  addToCartRate: number
  checkoutAbandonmentRate: number
  sellThroughRate: number
  daysOfInventory: number | null
  status: string
  isActive: boolean
  imageUrl: string
  hasOffer: boolean
  compareAtPrice: number | null
  discountPercent: number
  offerBadge: string | null
  offerEndsAt: string | null
  createdAt: string
  updatedAt: string
  lastSaleAt: string | null
}

export type OwnerDashboardResponse = {
  filters: {
    period: string
    startAt: string
    endAt: string
    category: string | null
    manufacturer: string | null
    status: string
    q: string
    sortBy: string
    direction: string
    page: number
    pageSize: number
  }
  metrics: {
    totalProducts: number
    activeProducts: number
    inactiveProducts: number
    outOfStockProducts: number
    criticalStockProducts: number
    lowStockProducts: number
    stockTotal: number
    unitsSold: number
    revenueTotal: number
    grossProfitTotal: number
    ticketAverage: number
    averagePrice: number
    averageMargin: number
    averageConversion: number
    productsMissingImage: number
    totalOffers: number
    activeOffers: number
    totalComments: number
    averageRating: number
    totalReturns: number
    returnedUnits: number
    openComplaints: number
    metricDelta?: {
      revenueTotal?: number
      ticketAverage?: number
      unitsSold?: number
      averageMargin?: number
      averageConversion?: number
      outOfStockProducts?: number
      criticalStockProducts?: number
      averageRating?: number
    }
  }
  rankings: {
    topRevenue: Array<Record<string, unknown>>
    topUnits: Array<Record<string, unknown>>
    topMargin: Array<Record<string, unknown>>
    highReturnRate: Array<Record<string, unknown>>
    lowConversion: Array<Record<string, unknown>>
  }
  inventory: {
    criticalStock: Array<Record<string, unknown>>
    lowStock: Array<Record<string, unknown>>
    stagnant: Array<Record<string, unknown>>
    overstock: Array<Record<string, unknown>>
  }
  funnel: {
    views: number
    clicks: number
    addToCart: number
    checkoutStart: number
    purchases: number
    ctr: number
    addToCartRate: number
    purchaseRate: number
    abandonmentRate: number
  }
  quality?: {
    topReturnReasons: Array<{ label: string; total: number }>
    complaintsBySeverity: Array<{ severity: string; total: number }>
    complaintsOpen: number
  }
  facets?: {
    categories: string[]
    manufacturers: string[]
    statuses: string[]
  }
  trend: Array<{ date: string; revenue: number; units: number }>
  products: {
    items: OwnerDashboardProduct[]
    meta: { page: number; pageSize: number; total: number; totalPages: number }
  }
}

export type BagItem = {
  productId: number
  quantity: number
  name: string
  sku: string
  manufacturer: string
  category: string
  bikeModel: string
  price: number
  stock: number
  imageUrl: string
  hoverImageUrl?: string
  description: string
  isActive: boolean
}

export type OrderSummary = {
  id: number
  status: string
  total: number
  subtotal?: number
  shipping?: number
  paymentStatus?: string
  paymentMethod?: PaymentMethod | null
  deliveryMethod?: CheckoutDeliveryMethod
  etaDays?: number | null
  distanceKm?: number | null
  itemCount?: number
  createdAt: string
  updatedAt?: string
}

export type OrderEventItem = {
  id: number
  status: string
  title: string
  description: string
  source: string
  createdAt: string
}

export type OrderDetails = {
  id: number
  status: string
  subtotal: number
  shipping: number
  total: number
  paymentStatus: string
  paymentMethod: PaymentMethod | null
  deliveryMethod: CheckoutDeliveryMethod
  etaDays: number | null
  distanceKm: number | null
  createdAt: string
  updatedAt: string
  recipientName: string
  recipientDocument: string | null
  recipientPhone: string | null
  address: {
    cep: string | null
    street: string | null
    number: string | null
    complement: string | null
    district: string | null
    city: string | null
    state: string | null
  }
  items: Array<{
    orderId: number
    productId: number
    quantity: number
    unitPrice: number
    lineTotal: number
    name: string
    sku: string
    imageUrl: string
  }>
  events: OrderEventItem[]
  payment: {
    provider: string
    method?: PaymentMethod | null
    externalId: string | null
    providerPaymentIntentId?: string | null
    status: string
    amount: number
    checkoutUrl?: string | null
    qrCode?: string | null
    pix?: string | null
    simulated?: boolean
    simulationReason?: string | null
    createdAt: string
    updatedAt: string
  } | null
  fiscal: {
    status: string
    documentType: string
    number: string | null
    series: string | null
    accessKey: string | null
    xmlUrl: string | null
    pdfUrl: string | null
    updatedAt: string
  } | null
}

export type OwnerSettings = {
  ownerUserId: number | null
  salesAlertEmail: string
  salesAlertWhatsapp: string
  storeName: string
  storeCnpj: string
  storeIe: string
  storeAddressStreet: string
  storeAddressNumber: string
  storeAddressComplement: string
  storeAddressDistrict: string
  storeAddressCity: string
  storeAddressState: string
  storeAddressCep: string
  storeLat: number
  storeLng: number
  freeShippingGlobalMin: number
  taxProfile: string
  taxPercent: number
  gatewayFeePercent: number
  gatewayFixedFee: number
  operationalPercent: number
  packagingCost: number
  blockBelowMinimum: boolean
  createdAt: string | null
  updatedAt: string | null
}

export type ShippingPromotion = {
  id: number
  name: string
  scope: 'product' | 'category' | 'global'
  productId: number | null
  productName?: string | null
  categoryId: number | null
  categoryName?: string | null
  isFreeShipping: boolean
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  isRunning: boolean
  createdAt: string | null
  updatedAt: string | null
}

export type OwnerOrderSummary = OrderSummary & {
  paymentStatus: string
  deliveryMethod: CheckoutDeliveryMethod
  subtotal: number
  shipping: number
  etaDays: number | null
  distanceKm: number | null
  deliveryCity: string | null
  deliveryState: string | null
  customer: {
    id: number
    name: string
    email: string
  }
}

export type OfferItem = {
  id: number
  productId: number
  badge: string
  description: string
  compareAtPrice: number
  startsAt?: string | null
  endsAt?: string | null
  updatedAt: string
  name: string
  sku: string
  manufacturer: string
  category: string
  bikeModel: string
  price: number
  stock: number
  imageUrl: string
  hoverImageUrl?: string
  productDescription: string
  isActive: number | boolean
  discountPercent: number
}

export type CommentItem = {
  id: number
  userId: number
  productId: number
  authorName: string
  rating: number
  message: string
  productName: string
  productImageUrl: string
  createdAt: string
  updatedAt: string
}

export type CommentsSummary = {
  totalReviews: number
  averageRating: number
}

export type ProductListParams = {
  q?: string
  category?: string
  manufacturer?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  promo?: boolean
  sort?: 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'newest' | 'best-sellers' | 'discount-desc'
  page?: number
  pageSize?: number
  onlyWithImage?: boolean
}

export type OwnerOfferItem = {
  id: number
  productId: number
  badge: string
  description: string
  compareAtPrice: number
  isActive: boolean
  startsAt?: string | null
  endsAt?: string | null
  createdAt: string
  updatedAt: string
  productName: string
  productSku: string
  productPrice: number
  productStock: number
  productIsActive: boolean
}

export type OwnerReturnItem = {
  id: number
  productId: number
  productName: string
  productSku: string
  orderId: number | null
  userId: number | null
  quantity: number
  reasonCode: string | null
  reasonLabel: string
  reasonDetail: string
  status: string
  ownerNotes: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export type OwnerComplaintItem = {
  id: number
  userId: number | null
  productId: number | null
  productName: string | null
  productSku: string | null
  orderId: number | null
  title: string
  message: string
  severity: 'low' | 'medium' | 'high'
  status: string
  ownerNotes: string
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
}

export type OwnerAuditLogItem = {
  id: number
  ownerUserId: number
  ownerName: string
  actionType: string
  entityType: string
  entityId: number | null
  before: Record<string, unknown>
  after: Record<string, unknown>
  createdAt: string
}

export type OwnerUploadImageItem = {
  id: number
  ownerUserId: number
  storageKey: string
  publicUrl: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export class ApiError extends Error {
  status: number
  code?: string
  details?: unknown

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function buildProductUrl(product: Pick<Product, 'id' | 'name' | 'seoSlug'>) {
  const rawSlug = String(product.seoSlug || product.name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `/produto/${product.id}-${rawSlug || 'produto'}`
}

export function parseProductRouteId(idSlug: string) {
  const value = String(idSlug || '')
  const match = value.match(/^(\d+)(?:-(.*))?$/)
  if (!match) {
    return { id: null, slug: '' }
  }
  return {
    id: Number(match[1]),
    slug: String(match[2] || '').trim().toLowerCase(),
  }
}

const API_BASE = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')

const REQUEST_TIMEOUT_MS = 20_000

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      ...init,
      signal: init?.signal ?? controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('A requisição demorou demais. Verifique sua conexão.', 408)
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Erro HTTP ${response.status}`
    throw new ApiError(message, response.status, payload?.code, payload)
  }

  return payload as T
}

export const api = {
  health: () => apiRequest<{ status: string; timestamp: string }>('/api/health'),
  me: () => apiRequest<{ user: AuthUser | null }>('/api/auth/me'),
  getAssistState: (scope?: AssistScope) => {
    const query = new URLSearchParams()
    if (scope) query.set('scope', scope)
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return apiRequest<{ items: AssistRouteState[] }>(`/api/ux/assist/state${suffix}`)
  },
  updateAssistState: (payload: {
    scope: AssistScope
    routeKey: string
    checklistState?: AssistChecklistState
    dismissedTips?: string[]
    overlaySeen?: boolean
  }) =>
    apiRequest<{ item: AssistRouteState }>('/api/ux/assist/state', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  resetAssistState: (scope?: AssistScope) => {
    const query = new URLSearchParams()
    if (scope) query.set('scope', scope)
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return apiRequest<{ ok: boolean; scope: AssistScope | null }>(`/api/ux/assist/reset${suffix}`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
  },
  signIn: (payload: { email: string; password: string }) =>
    apiRequest<{ message: string; user: AuthUser }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  ownerSignIn: (payload: { email: string; password: string }) =>
    apiRequest<{ message: string; user: AuthUser }>('/api/auth/owner/signin', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  signUp: (payload: {
    name: string
    email: string
    password: string
    cep: string
    addressStreet?: string
    addressCity?: string
    addressState?: string
  }) =>
    apiRequest<{ message: string; user: AuthUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateProfile: (payload: { name: string; phone?: string; document?: string }) =>
    apiRequest<{ user: AuthUser; defaultAddressId?: number | null; addresses?: AddressItem[] }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  listAddresses: () =>
    apiRequest<{ items: AddressItem[]; defaultAddressId: number | null }>('/api/auth/addresses'),
  createAddress: (payload: Omit<AddressItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    apiRequest<{ item: AddressItem }>('/api/auth/addresses', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAddress: (id: number, payload: Omit<AddressItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) =>
    apiRequest<{ item: AddressItem }>(`/api/auth/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  setDefaultAddress: (id: number) =>
    apiRequest<{ items: AddressItem[]; defaultAddressId: number }>(`/api/auth/addresses/${id}/default`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    }),
  deleteAddress: (id: number) =>
    apiRequest<void>(`/api/auth/addresses/${id}`, { method: 'DELETE' }),
  logout: () =>
    apiRequest<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  listPublicProducts: (params: ProductListParams = {}) => {
    const query = new URLSearchParams()
    if (params.q) query.set('q', params.q)
    if (params.category) query.set('category', params.category)
    if (params.manufacturer) query.set('manufacturer', params.manufacturer)
    if (typeof params.minPrice === 'number') query.set('minPrice', String(params.minPrice))
    if (typeof params.maxPrice === 'number') query.set('maxPrice', String(params.maxPrice))
    if (typeof params.inStock === 'boolean') query.set('inStock', String(params.inStock))
    if (typeof params.promo === 'boolean') query.set('promo', String(params.promo))
    if (params.sort) query.set('sort', params.sort)
    if (typeof params.page === 'number') query.set('page', String(params.page))
    if (typeof params.pageSize === 'number') query.set('pageSize', String(params.pageSize))
    if (typeof params.onlyWithImage === 'boolean') query.set('onlyWithImage', String(params.onlyWithImage))

    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return apiRequest<{ items: Product[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }>(`/api/products${suffix}`)
  },
  getPublicProduct: (id: number) =>
    apiRequest<ProductDetails>(`/api/products/${id}`),
  listCatalogHighlights: () =>
    apiRequest<{ items: Product[] }>('/api/catalog/highlights'),
  listCatalogCategories: () =>
    apiRequest<{ items: { name: string; count: number }[] }>('/api/catalog/categories'),
  listCatalogRecommendations: (params: { limit?: number; exclude?: number[] } = {}) => {
    const query = new URLSearchParams()
    if (typeof params.limit === 'number') query.set('limit', String(params.limit))
    if (params.exclude && params.exclude.length > 0) query.set('exclude', params.exclude.join(','))
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return apiRequest<{ items: Product[] }>(`/api/catalog/recommendations${suffix}`)
  },
  listOffers: () =>
    apiRequest<{ items: OfferItem[] }>('/api/offers'),
  listComments: (params: { limit?: number; productId?: number } = {}) => {
    const query = new URLSearchParams()
    query.set('limit', String(params.limit ?? 12))
    if (typeof params.productId === 'number') query.set('productId', String(params.productId))
    return apiRequest<{ items: CommentItem[]; summary: CommentsSummary; summaryByProduct?: CommentsSummary | null }>(`/api/comments?${query.toString()}`)
  },
  createComment: (payload: { productId: number; rating: number; message: string }) =>
    apiRequest<{ item: CommentItem }>('/api/comments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getBag: () =>
    apiRequest<{ items: BagItem[]; total: number; freeShippingTarget?: number }>('/api/bag'),
  addBagItem: (payload: { productId: number; quantity?: number }) =>
    apiRequest<{ items: BagItem[] }>('/api/bag/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateBagItem: (productId: number, quantity: number) =>
    apiRequest<{ items: BagItem[] }>(`/api/bag/items/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),
  removeBagItem: (productId: number) =>
    apiRequest<void>(`/api/bag/items/${productId}`, { method: 'DELETE' }),
  clearBag: () =>
    apiRequest<void>('/api/bag', { method: 'DELETE' }),
  quoteOrder: (payload: { deliveryMethod: CheckoutDeliveryMethod; addressId?: number | null }) =>
    apiRequest<{ quote: OrderQuote }>('/api/orders/quote', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  checkoutOrder: (payload: {
    deliveryMethod?: CheckoutDeliveryMethod
    addressId?: number | null
    recipientName?: string
    recipientDocument?: string
    recipientPhone?: string
    paymentMethod?: PaymentMethod
  } = {}) =>
    apiRequest<{ order: OrderSummary; payment?: Record<string, unknown> }>('/api/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  completeMercadoPagoOrder: (token: string) =>
    apiRequest<{ order: OrderSummary; payment?: Record<string, unknown> }>('/api/payments/mercadopago/complete', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),
  listOrders: () =>
    apiRequest<{ items: OrderSummary[] }>('/api/orders'),
  getOrder: (id: number) =>
    apiRequest<{ item: OrderDetails }>(`/api/orders/${id}`),
  listOrderEvents: (id: number) =>
    apiRequest<{ items: OrderEventItem[] }>(`/api/orders/${id}/events`),
  syncOrderPayment: (id: number) =>
    apiRequest<{ order: OrderSummary; payment?: Record<string, unknown>; synced?: boolean }>(`/api/orders/${id}/payment/sync`, {
      method: 'POST',
    }),
  cancelOrder: (id: number) =>
    apiRequest<{ ok: boolean }>(`/api/orders/${id}/cancel`, {
      method: 'POST',
    }),
  ownerDashboard: (params: OwnerDashboardParams = {}) => {
    const query = new URLSearchParams()
    if (params.period) query.set('period', params.period)
    if (params.startAt) query.set('startAt', params.startAt)
    if (params.endAt) query.set('endAt', params.endAt)
    if (params.category) query.set('category', params.category)
    if (params.manufacturer) query.set('manufacturer', params.manufacturer)
    if (params.status) query.set('status', params.status)
    if (params.q) query.set('q', params.q)
    if (params.sortBy) query.set('sortBy', params.sortBy)
    if (params.direction) query.set('direction', params.direction)
    if (typeof params.page === 'number') query.set('page', String(params.page))
    if (typeof params.pageSize === 'number') query.set('pageSize', String(params.pageSize))
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return apiRequest<OwnerDashboardResponse>(`/api/owner/dashboard${suffix}`)
  },
  listOwnerOffers: () =>
    apiRequest<{ items: OwnerOfferItem[] }>('/api/owner/offers'),
  getOwnerSettings: () =>
    apiRequest<{ item: OwnerSettings }>('/api/owner/settings'),
  updateOwnerSettings: (payload: OwnerSettings) =>
    apiRequest<{ item: OwnerSettings }>('/api/owner/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  listShippingPromotions: () =>
    apiRequest<{ items: ShippingPromotion[] }>('/api/owner/shipping-promotions'),
  createShippingPromotion: (payload: {
    name: string
    scope: 'product' | 'category' | 'global'
    productId?: number | null
    categoryId?: number | null
    isFreeShipping?: boolean
    startsAt?: string | null
    endsAt?: string | null
    isActive?: boolean
  }) =>
    apiRequest<{ item: ShippingPromotion }>('/api/owner/shipping-promotions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateShippingPromotion: (id: number, payload: {
    name: string
    scope: 'product' | 'category' | 'global'
    productId?: number | null
    categoryId?: number | null
    isFreeShipping?: boolean
    startsAt?: string | null
    endsAt?: string | null
    isActive?: boolean
  }) =>
    apiRequest<{ item: ShippingPromotion }>(`/api/owner/shipping-promotions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteShippingPromotion: (id: number) =>
    apiRequest<void>(`/api/owner/shipping-promotions/${id}`, { method: 'DELETE' }),
  listOwnerOrders: (params: {
    status?: string
    paymentStatus?: string
    deliveryMethod?: string
    city?: string
    customer?: string
    limit?: number
  } = {}) => {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus)
    if (params.deliveryMethod) query.set('deliveryMethod', params.deliveryMethod)
    if (params.city) query.set('city', params.city)
    if (params.customer) query.set('customer', params.customer)
    if (typeof params.limit === 'number') query.set('limit', String(params.limit))
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return apiRequest<{ items: OwnerOrderSummary[] }>(`/api/owner/orders${suffix}`)
  },
  getOwnerOrder: (id: number) =>
    apiRequest<{ item: Record<string, unknown> }>(`/api/owner/orders/${id}`),
  updateOwnerOrderStatus: (id: number, status: string) =>
    apiRequest<{ ok: boolean }>(`/api/owner/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  getOwnerOrderAnalytics: (period: 'day' | 'week' | 'month' = 'month') =>
    apiRequest<{
      periodDays: number
      metrics: Record<string, number>
      byCity: Array<{ city: string; total: number }>
      byMethod: Array<{ method: string; total: number }>
    }>(`/api/owner/analytics/orders?period=${encodeURIComponent(period)}`),
  createOwnerOffer: (payload: {
    productId: number
    badge?: string
    description?: string
    compareAtPrice: number
    isActive?: boolean
    startsAt?: string | null
    endsAt?: string | null
  }) =>
    apiRequest<{ item: OwnerOfferItem }>('/api/owner/offers', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateOwnerOffer: (
    id: number,
    payload: {
      productId: number
      badge?: string
      description?: string
      compareAtPrice: number
      isActive?: boolean
      startsAt?: string | null
      endsAt?: string | null
    },
  ) =>
    apiRequest<{ item: OwnerOfferItem }>(`/api/owner/offers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteOwnerOffer: (id: number) =>
    apiRequest<void>(`/api/owner/offers/${id}`, { method: 'DELETE' }),
  listOwnerReturns: (params: { status?: string; productId?: number; limit?: number } = {}) => {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (typeof params.productId === 'number') query.set('productId', String(params.productId))
    if (typeof params.limit === 'number') query.set('limit', String(params.limit))
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return apiRequest<{ items: OwnerReturnItem[] }>(`/api/owner/returns${suffix}`)
  },
  createOwnerReturn: (payload: {
    productId: number
    quantity?: number
    reasonCode: string
    reasonDetail?: string
    orderId?: number | null
    userId?: number | null
  }) =>
    apiRequest<{ item: OwnerReturnItem }>('/api/owner/returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateOwnerReturn: (id: number, payload: { status: string; ownerNotes?: string }) =>
    apiRequest<{ item: OwnerReturnItem }>(`/api/owner/returns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  listOwnerComplaints: (params: { status?: string; productId?: number; limit?: number } = {}) => {
    const query = new URLSearchParams()
    if (params.status) query.set('status', params.status)
    if (typeof params.productId === 'number') query.set('productId', String(params.productId))
    if (typeof params.limit === 'number') query.set('limit', String(params.limit))
    const suffix = query.size > 0 ? `?${query.toString()}` : ''
    return apiRequest<{ items: OwnerComplaintItem[] }>(`/api/owner/complaints${suffix}`)
  },
  createOwnerComplaint: (payload: {
    productId?: number | null
    userId?: number | null
    orderId?: number | null
    title: string
    message: string
    severity?: 'low' | 'medium' | 'high'
  }) =>
    apiRequest<{ item: OwnerComplaintItem }>('/api/owner/complaints', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateOwnerComplaint: (id: number, payload: { status: string; ownerNotes?: string }) =>
    apiRequest<{ item: OwnerComplaintItem }>(`/api/owner/complaints/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  listOwnerAuditLogs: (limit = 50) =>
    apiRequest<{ items: OwnerAuditLogItem[] }>(`/api/owner/audit-logs?limit=${encodeURIComponent(String(limit))}`),
  uploadOwnerImage: async (file: File) => {
    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch(`${API_BASE}/api/owner/uploads`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    const isJson = response.headers.get('content-type')?.includes('application/json')
    const payload = isJson ? await response.json() : null

    if (!response.ok) {
      const message = payload?.error || payload?.message || `Erro HTTP ${response.status}`
      throw new ApiError(message, response.status)
    }

    return payload as { item: OwnerUploadImageItem }
  },
  listOwnerProducts: (query = '') =>
    apiRequest<{ items: Product[] }>(`/api/owner/products${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  getOwnerProduct: (id: number) =>
    apiRequest<{ item: Product }>(`/api/owner/products/${id}`),
  createProduct: (payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiRequest<{ item: Product }>('/api/owner/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateProduct: (id: number, payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiRequest<{ item: Product }>(`/api/owner/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteProduct: (id: number, mode: 'hard' | 'archive' = 'hard') =>
    apiRequest<{ item?: Product; archived?: boolean } | null>(
      `/api/owner/products/${id}?mode=${encodeURIComponent(mode)}`,
      { method: 'DELETE' },
    ),
}
