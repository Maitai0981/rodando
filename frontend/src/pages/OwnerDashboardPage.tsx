import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import OwnerLayout from '../shared/layout/OwnerLayout'
import { api, friendlyError, type OwnerDashboardParams, type OwnerDashboardResponse } from '../shared/lib/api'
import { useAssist } from '../shared/context/AssistContext'

type SortDirection = 'asc' | 'desc'

type SortBy = OwnerDashboardParams['sortBy']

const DASHBOARD_PAGE_SIZE = 20

const defaultFilters: OwnerDashboardParams = {
  period: 'month',
  status: 'all',
  sortBy: 'revenue',
  direction: 'desc',
  page: 1,
  pageSize: DASHBOARD_PAGE_SIZE,
}

function formatDateInput(value: string | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function toCurrency(value: number | undefined) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
}

export default function OwnerDashboardPage() {
  const { completeStep } = useAssist()
  const [filters, setFilters] = useState<OwnerDashboardParams>(defaultFilters)
  const [dashboard, setDashboard] = useState<OwnerDashboardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const latestRequestRef = useRef(0)
  const kpiStepMarkedRef = useRef(false)

  const categoryOptions = useMemo(() => dashboard?.facets?.categories || [], [dashboard?.facets?.categories])
  const manufacturerOptions = useMemo(() => dashboard?.facets?.manufacturers || [], [dashboard?.facets?.manufacturers])

  const loadDashboard = useCallback(async (nextFilters: OwnerDashboardParams) => {
    const requestId = Date.now() + Math.random()
    latestRequestRef.current = requestId
    setLoading(true)
    setError(null)
    try {
      const data = await api.ownerDashboard(nextFilters)
      if (latestRequestRef.current !== requestId) return
      setDashboard(data)
    } catch (err) {
      if (latestRequestRef.current !== requestId) return
      setError(friendlyError(err, 'Falha ao carregar dashboard de produtos.'))
    } finally {
      if (latestRequestRef.current === requestId) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!dashboard || kpiStepMarkedRef.current) return
    kpiStepMarkedRef.current = true
    completeStep('kpi-read', 'owner-dashboard')
  }, [dashboard, completeStep])

  useEffect(() => {
    void loadDashboard(filters)
  }, [filters, loadDashboard])

  const handleFilterChange = useCallback((patch: Partial<OwnerDashboardParams>) => {
    setFilters((prev) => ({ ...prev, ...patch, page: 1 }))
  }, [])

  const handlePeriodChange = useCallback((period: OwnerDashboardParams['period']) => {
    setFilters((prev) => {
      if (period !== 'custom') {
        return { ...prev, period, startAt: undefined, endAt: undefined, page: 1 }
      }

      const now = new Date()
      const start = new Date(now)
      start.setDate(now.getDate() - 29)
      return {
        ...prev,
        period: 'custom',
        startAt: prev.startAt || start.toISOString(),
        endAt: prev.endAt || now.toISOString(),
        page: 1,
      }
    })
    completeStep('period-filter', 'owner-dashboard')
  }, [completeStep])

  const handleSort = useCallback((sortBy: SortBy) => {
    setFilters((prev) => {
      const currentSortBy = prev.sortBy || 'revenue'
      const currentDirection = (prev.direction || 'desc') as SortDirection
      const nextDirection: SortDirection = currentSortBy === sortBy && currentDirection === 'desc' ? 'asc' : 'desc'
      return { ...prev, sortBy, direction: nextDirection, page: 1 }
    })
  }, [])

  const handleExportCsv = useCallback(async () => {
    setExporting(true)
    setError(null)
    try {
      const data = await api.ownerDashboard({ ...filters, page: 1, pageSize: 500 })
      const rows = data.products.items
      const header = [
        'SKU',
        'Nome',
        'Categoria',
        'Fabricante',
        'Preco',
        'Custo',
        'MargemPercentual',
        'Estoque',
        'EstoqueMinimo',
        'Reposicao',
        'UnidadesVendidas',
        'Receita',
        'Conversao',
        'Views',
        'AddToCart',
        'CheckoutStart',
        'Compras',
        'RatingMedio',
        'Avaliacoes',
        'Status',
      ]
      const toCsvValue = (value: string | number | null | undefined) => {
        const safe = String(value ?? '')
        if (safe.includes(',') || safe.includes('"') || safe.includes('\n')) {
          return `"${safe.replace(/"/g, '""')}"`
        }
        return safe
      }
      const body = rows.map((row) => [
        row.sku,
        row.name,
        row.category,
        row.manufacturer,
        row.price.toFixed(2),
        row.cost.toFixed(2),
        row.marginPercent.toFixed(2),
        row.stock,
        row.minimumStock,
        row.reorderPoint,
        row.unitsSold,
        row.revenue.toFixed(2),
        row.conversionRate.toFixed(2),
        row.views,
        row.addToCart,
        row.checkoutStart,
        row.purchases,
        row.averageRating.toFixed(2),
        row.reviewCount,
        row.status,
      ].map(toCsvValue).join(','))

      const csv = [header.join(','), ...body].join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `dashboard-produtos-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError(friendlyError(err, 'Falha ao exportar CSV.'))
    } finally {
      setExporting(false)
    }
  }, [filters])

  const metrics = dashboard?.metrics
  const products = dashboard?.products.items || []
  const productMeta = dashboard?.products.meta
  const periodIsCustom = (filters.period || 'month') === 'custom'
  const metricsDelta = metrics?.metricDelta

  const metricCards = [
    { label: 'Receita', value: toCurrency(metrics?.revenueTotal), delta: metricsDelta?.revenueTotal },
    { label: 'Ticket medio', value: toCurrency(metrics?.ticketAverage), delta: metricsDelta?.ticketAverage },
    { label: 'Lucro bruto', value: toCurrency(metrics?.grossProfitTotal) },
    { label: 'Unidades vendidas', value: String(metrics?.unitsSold || 0), delta: metricsDelta?.unitsSold },
    { label: 'Margem media', value: `${Number(metrics?.averageMargin || 0).toFixed(1)}%`, delta: metricsDelta?.averageMargin },
    { label: 'Conversao media', value: `${Number(metrics?.averageConversion || 0).toFixed(2)}%`, delta: metricsDelta?.averageConversion },
    { label: 'Avaliacao media', value: Number(metrics?.averageRating || 0).toFixed(2), delta: metricsDelta?.averageRating },
  ]

  return (
    <OwnerLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl space-y-1">
            <h1 className="text-2xl text-[#f0ede8] font-bold">Dashboard de produtos</h1>
            <p className="text-sm text-[#9ca3af]">
              Analise performance, estoque, margem e funil para cada item do catalogo.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              data-testid="owner-dashboard-export-csv-button"
              className={`h-11 px-4 rounded-xl text-sm border border-[#d4a843]/40 text-[#d4a843] ${
                exporting ? 'opacity-60' : 'opacity-100'
              }`}
              disabled={exporting || loading}
              onClick={handleExportCsv}
            >
              {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <button
              className={`h-11 px-5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${
                loading ? 'opacity-60' : 'opacity-100'
              }`}
              disabled={loading}
              onClick={() => void loadDashboard(filters)}
            >
              Atualizar
            </button>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <label htmlFor="owner-dashboard-period" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Periodo
              </label>
              <select
                id="owner-dashboard-period"
                aria-label="Periodo"
                title="Periodo"
                value={filters.period || 'month'}
                onChange={(event) => handlePeriodChange(event.target.value as OwnerDashboardParams['period'])}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              >
                <option value="day" className="bg-[#111118]">Ultimo dia</option>
                <option value="week" className="bg-[#111118]">Ultimos 7 dias</option>
                <option value="month" className="bg-[#111118]">Ultimos 30 dias</option>
                <option value="custom" className="bg-[#111118]">Personalizado</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="owner-dashboard-status" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Status
              </label>
              <select
                id="owner-dashboard-status"
                aria-label="Status"
                title="Status"
                value={filters.status || 'all'}
                onChange={(event) => handleFilterChange({ status: event.target.value as OwnerDashboardParams['status'] })}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              >
                <option value="all" className="bg-[#111118]">Todos</option>
                <option value="active" className="bg-[#111118]">Ativo</option>
                <option value="draft" className="bg-[#111118]">Rascunho/Inativo</option>
                <option value="out-of-stock" className="bg-[#111118]">Sem estoque</option>
                <option value="critical" className="bg-[#111118]">Estoque critico</option>
                <option value="missing-image" className="bg-[#111118]">Sem imagem</option>
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="owner-dashboard-category" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Categoria
              </label>
              <select
                id="owner-dashboard-category"
                aria-label="Categoria"
                title="Categoria"
                value={filters.category || ''}
                onChange={(event) => handleFilterChange({ category: String(event.target.value || '') })}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              >
                <option value="" className="bg-[#111118]">Categoria</option>
                {categoryOptions.map((item) => (
                  <option key={item} value={item} className="bg-[#111118]">{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="owner-dashboard-brand" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Marca
              </label>
              <select
                id="owner-dashboard-brand"
                aria-label="Marca"
                title="Marca"
                value={filters.manufacturer || ''}
                onChange={(event) => handleFilterChange({ manufacturer: String(event.target.value || '') })}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              >
                <option value="" className="bg-[#111118]">Marca</option>
                {manufacturerOptions.map((item) => (
                  <option key={item} value={item} className="bg-[#111118]">{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="owner-dashboard-search" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Busca
              </label>
              <input
                id="owner-dashboard-search"
                aria-label="Busca"
                title="Busca"
                placeholder="SKU ou nome"
                value={filters.q || ''}
                onChange={(event) => handleFilterChange({ q: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  void loadDashboard({ ...filters, page: 1 })
                }}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              />
            </div>
          </div>
          {periodIsCustom ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <label htmlFor="owner-dashboard-start" className="sr-only">Data inicial</label>
                <input
                  id="owner-dashboard-start"
                  type="date"
                  aria-label="Data inicial"
                  title="Data inicial"
                  value={formatDateInput(filters.startAt)}
                  onChange={(event) => {
                    const value = event.target.value
                    handleFilterChange({ startAt: value ? `${value}T00:00:00.000Z` : undefined })
                  }}
                  className="h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
                />
              </div>
              <div>
                <label htmlFor="owner-dashboard-end" className="sr-only">Data final</label>
                <input
                  id="owner-dashboard-end"
                  type="date"
                  aria-label="Data final"
                  title="Data final"
                  value={formatDateInput(filters.endAt)}
                  onChange={(event) => {
                    const value = event.target.value
                    handleFilterChange({ endAt: value ? `${value}T23:59:59.999Z` : undefined })
                  }}
                  className="h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
                />
              </div>
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="p-3 rounded-xl text-sm bg-[#d4a843]/[0.1] border border-[#d4a843]/30 text-[#f0c040]">
            Carregando dashboard...
          </div>
        ) : null}
        {error ? (
          <div className="p-3 rounded-xl text-sm bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#f87171]">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {metricCards.map((metric) => (
            <div key={metric.label} className="relative min-h-[120px] p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#d4a843]/70 via-transparent to-transparent" />
              <p className="text-[11px] uppercase tracking-widest text-[#f0c040]">{metric.label}</p>
              <p className="text-2xl text-[#f0ede8] font-bold">{metric.value}</p>
              {typeof metric.delta === 'number' ? (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    metric.delta >= 0 ? 'bg-[#22c55e]/15 text-[#22c55e]' : 'bg-[#f87171]/15 text-[#f87171]'
                  }`}
                >
                  {metric.delta >= 0 ? '+' : ''}{metric.delta.toFixed(1)}% vs periodo anterior
                </span>
              ) : null}
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm text-[#f0ede8] font-semibold">Produtos</h2>
              <p className="text-xs text-[#6b7280]">Resumo por SKU</p>
            </div>
            <button
              className="text-xs text-[#d4a843] hover:text-[#f0c040]"
              onClick={() => handleSort('revenue')}
            >
              Ordenar por receita
            </button>
          </div>
          <div data-testid="owner-dashboard-table-scroll" className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-xs text-[#9ca3af]">
              <thead className="bg-white/[0.05]">
                <tr className="text-left text-[#a1a1aa]">
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">Estoque</th>
                  <th className="py-3 px-3">Receita</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => (
                  <tr
                    key={product.id}
                    className={`border-t border-white/[0.06] ${index % 2 === 1 ? 'bg-white/[0.01]' : ''} hover:bg-white/[0.03]`}
                  >
                    <td className="py-3 px-3">
                      <Link to={`/owner/products/${product.id}/edit`} className="text-[#f0ede8] font-semibold">
                        {product.name}
                      </Link>
                    </td>
                    <td className="py-3 px-3">{product.sku}</td>
                    <td className="py-3 px-3">{product.stock}</td>
                    <td className="py-3 px-3 text-[#d4a843] font-semibold">{toCurrency(product.revenue)}</td>
                    <td className="py-3 px-3">{product.status}</td>
                  </tr>
                ))}
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#9ca3af]">
                      Nenhum produto encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {productMeta ? (
            <div className="mt-3 text-xs text-[#6b7280]">
              Pagina {productMeta.page} de {productMeta.totalPages} • {productMeta.total} itens
            </div>
          ) : null}
        </div>
      </div>
    </OwnerLayout>
  )
}
