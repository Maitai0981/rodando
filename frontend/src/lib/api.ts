export type AuthUser = {
  id: number
  name: string
  email: string
  role: 'owner' | 'customer'
  createdAt: string
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
  description: string
  isActive: number | boolean
  createdAt: string
  updatedAt: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const API_BASE = import.meta.env.VITE_API_URL || ''

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? await response.json() : null

  if (!response.ok) {
    const message = payload?.error || payload?.message || `Erro HTTP ${response.status}`
    throw new ApiError(message, response.status)
  }

  return payload as T
}

export const api = {
  health: () => apiRequest<{ status: string; timestamp: string }>('/api/health'),
  me: () => apiRequest<{ user: AuthUser }>('/api/auth/me'),
  signIn: (payload: { email: string; password: string }) =>
    apiRequest<{ message: string; user: AuthUser }>('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  signUp: (payload: { name: string; email: string; password: string }) =>
    apiRequest<{ message: string; user: AuthUser }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () =>
    apiRequest<{ message: string }>('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
  listPublicProducts: (query = '') =>
    apiRequest<{ items: Product[] }>(`/api/products${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  ownerDashboard: () =>
    apiRequest<{
      metrics: {
        totalProducts: number
        activeProducts: number
        stockTotal: number
        lowStockProducts: number
        averagePrice: number
      }
    }>('/api/owner/dashboard'),
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
  deleteProduct: (id: number) =>
    fetch(`${API_BASE}/api/owner/products/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    }).then(async (res) => {
      if (!res.ok) {
        let message = `Erro HTTP ${res.status}`
        try {
          const json = await res.json()
          message = json?.error || message
        } catch {
          // noop
        }
        throw new ApiError(message, res.status)
      }
    }),
}
