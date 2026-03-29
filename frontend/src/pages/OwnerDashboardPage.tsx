import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart2,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  DollarSign,
  Download,
  Eye,
  Package,
  Pencil,
  Percent,
  RefreshCw,
  ShoppingCart,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
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

function DeltaBadge({ delta }: { delta: number }) {
  const positive = delta >= 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
        positive
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-red-500/15 text-red-400'
      }`}
    >
      {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {positive ? '+' : ''}{delta.toFixed(1)}%
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active:        { label: 'Ativo',        className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    draft:         { label: 'Rascunho',     className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' },
    inactive:      { label: 'Inativo',      className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' },
    'out-of-stock':{ label: 'Sem estoque',  className: 'bg-red-500/15 text-red-400 border-red-500/20' },
    critical:      { label: 'Crítico',      className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  }
  const cfg = map[status] ?? { label: status, className: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  )
}

function SortHeader({
  label,
  field,
  currentSort,
  direction,
  onSort,
}: {
  label: string
  field: SortBy
  currentSort: SortBy
  direction: SortDirection
  onSort: (f: SortBy) => void
}) {
  const active = currentSort === field
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="flex items-center gap-1 text-left whitespace-nowrap hover:text-[#f0ede8] transition-colors"
    >
      {label}
      {active
        ? direction === 'desc'
          ? <ChevronDown className="w-3 h-3 text-[#d4a843]" />
          : <ChevronUp className="w-3 h-3 text-[#d4a843]" />
        : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
    </button>
  )
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
      if (latestRequestRef.current === requestId) setLoading(false)
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
      const rows = data.products?.items ?? []
      const header = ['SKU','Nome','Categoria','Fabricante','Preco','Custo','MargemPercentual','Estoque','EstoqueMinimo','Reposicao','UnidadesVendidas','Receita','Conversao','Views','AddToCart','CheckoutStart','Compras','RatingMedio','Avaliacoes','Status']
      const toCsvValue = (value: string | number | null | undefined) => {
        const safe = String(value ?? '')
        return safe.includes(',') || safe.includes('"') || safe.includes('\n') ? `"${safe.replace(/"/g, '""')}"` : safe
      }
      const body = rows.map((row) => [
        row.sku, row.name, row.category, row.manufacturer,
        Number(row.price ?? 0).toFixed(2), Number(row.cost ?? 0).toFixed(2), Number(row.marginPercent ?? 0).toFixed(2),
        row.stock, row.minimumStock, row.reorderPoint,
        row.unitsSold, Number(row.revenue ?? 0).toFixed(2), Number(row.conversionRate ?? 0).toFixed(2),
        row.views, row.addToCart, row.checkoutStart, row.purchases,
        Number(row.averageRating ?? 0).toFixed(2), row.reviewCount, row.status,
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
  const products = dashboard?.products?.items ?? []
  const productMeta = dashboard?.products?.meta
  const periodIsCustom = (filters.period || 'month') === 'custom'
  const metricsDelta = metrics?.metricDelta
  const currentSort = (filters.sortBy || 'revenue') as SortBy
  const currentDirection = (filters.direction || 'desc') as SortDirection

  const alertProducts = useMemo(
    () => products.filter((p) => p.stock === 0 || p.stock <= (p.reorderPoint ?? 0)),
    [products],
  )

  const funnelTotals = useMemo(() => {
    const views = products.reduce((s, p) => s + (p.views || 0), 0)
    const addToCart = products.reduce((s, p) => s + (p.addToCart || 0), 0)
    const checkoutStart = products.reduce((s, p) => s + (p.checkoutStart || 0), 0)
    const purchases = products.reduce((s, p) => s + (p.purchases || 0), 0)
    return [
      { label: 'Visualizações', value: views, icon: Eye, pct: 100 },
      { label: 'Adicionou ao carrinho', value: addToCart, icon: ShoppingCart, pct: views > 0 ? Math.round((addToCart / views) * 100) : 0 },
      { label: 'Iniciou checkout', value: checkoutStart, icon: BarChart2, pct: views > 0 ? Math.round((checkoutStart / views) * 100) : 0 },
      { label: 'Compras', value: purchases, icon: Package, pct: views > 0 ? Math.round((purchases / views) * 100) : 0 },
    ]
  }, [products])

  const kpiCards = [
    {
      label: 'Receita total',
      value: toCurrency(metrics?.revenueTotal),
      delta: metricsDelta?.revenueTotal,
      icon: DollarSign,
      accent: 'text-[#d4a843]',
      iconBg: 'bg-[#d4a843]/10',
    },
    {
      label: 'Ticket médio',
      value: toCurrency(metrics?.ticketAverage),
      delta: metricsDelta?.ticketAverage,
      icon: TrendingUp,
      accent: 'text-emerald-400',
      iconBg: 'bg-emerald-400/10',
    },
    {
      label: 'Lucro bruto',
      value: toCurrency(metrics?.grossProfitTotal),
      delta: undefined,
      icon: Percent,
      accent: 'text-sky-400',
      iconBg: 'bg-sky-400/10',
    },
    {
      label: 'Unidades vendidas',
      value: String(metrics?.unitsSold || 0),
      delta: metricsDelta?.unitsSold,
      icon: Package,
      accent: 'text-violet-400',
      iconBg: 'bg-violet-400/10',
    },
    {
      label: 'Margem média',
      value: `${Number(metrics?.averageMargin || 0).toFixed(1)}%`,
      delta: metricsDelta?.averageMargin,
      icon: BarChart2,
      accent: 'text-amber-400',
      iconBg: 'bg-amber-400/10',
    },
    {
      label: 'Conversão média',
      value: `${Number(metrics?.averageConversion || 0).toFixed(2)}%`,
      delta: metricsDelta?.averageConversion,
      icon: ShoppingCart,
      accent: 'text-pink-400',
      iconBg: 'bg-pink-400/10',
    },
    {
      label: 'Avaliação média',
      value: Number(metrics?.averageRating || 0).toFixed(2),
      delta: metricsDelta?.averageRating,
      icon: Star,
      accent: 'text-yellow-400',
      iconBg: 'bg-yellow-400/10',
    },
  ]

  return (
    <OwnerLayout>
      <div className="space-y-6">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#f0ede8]">Visão Geral</h1>
            <p className="mt-0.5 text-xs text-[#6b7280]">
              Performance de vendas, estoque, margem e funil de conversão por SKU.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              data-testid="owner-dashboard-export-csv-button"
              onClick={() => void handleExportCsv()}
              disabled={exporting || loading}
              className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs border border-white/[0.1] text-[#9ca3af] hover:text-[#f0ede8] hover:border-white/[0.2] transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Exportando…' : 'Exportar CSV'}
            </button>
            <button
              onClick={() => void loadDashboard(filters)}
              disabled={loading}
              className="flex items-center gap-2 h-9 px-3 rounded-lg text-xs bg-[#d4a843]/10 border border-[#d4a843]/30 text-[#d4a843] hover:bg-[#d4a843]/15 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* ── Filtros ──────────────────────────────────────────── */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label htmlFor="owner-dashboard-period" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">Período</label>
              <select
                id="owner-dashboard-period"
                aria-label="Periodo"
                title="Periodo"
                value={filters.period || 'month'}
                onChange={(e) => handlePeriodChange(e.target.value as OwnerDashboardParams['period'])}
                className="w-full h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
              >
                <option value="day" className="bg-[#111118]">Último dia</option>
                <option value="week" className="bg-[#111118]">Últimos 7 dias</option>
                <option value="month" className="bg-[#111118]">Últimos 30 dias</option>
                <option value="custom" className="bg-[#111118]">Personalizado</option>
              </select>
            </div>
            <div>
              <label htmlFor="owner-dashboard-status" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">Status</label>
              <select
                id="owner-dashboard-status"
                aria-label="Status"
                title="Status"
                value={filters.status || 'all'}
                onChange={(e) => handleFilterChange({ status: e.target.value as OwnerDashboardParams['status'] })}
                className="w-full h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
              >
                <option value="all" className="bg-[#111118]">Todos</option>
                <option value="active" className="bg-[#111118]">Ativo</option>
                <option value="draft" className="bg-[#111118]">Rascunho</option>
                <option value="out-of-stock" className="bg-[#111118]">Sem estoque</option>
                <option value="critical" className="bg-[#111118]">Estoque crítico</option>
                <option value="missing-image" className="bg-[#111118]">Sem imagem</option>
              </select>
            </div>
            <div>
              <label htmlFor="owner-dashboard-category" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">Categoria</label>
              <select
                id="owner-dashboard-category"
                aria-label="Categoria"
                title="Categoria"
                value={filters.category || ''}
                onChange={(e) => handleFilterChange({ category: String(e.target.value || '') })}
                className="w-full h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
              >
                <option value="" className="bg-[#111118]">Todas</option>
                {categoryOptions.map((item) => (
                  <option key={item} value={item} className="bg-[#111118]">{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="owner-dashboard-brand" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">Marca</label>
              <select
                id="owner-dashboard-brand"
                aria-label="Marca"
                title="Marca"
                value={filters.manufacturer || ''}
                onChange={(e) => handleFilterChange({ manufacturer: String(e.target.value || '') })}
                className="w-full h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
              >
                <option value="" className="bg-[#111118]">Todas</option>
                {manufacturerOptions.map((item) => (
                  <option key={item} value={item} className="bg-[#111118]">{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="owner-dashboard-search" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">Busca</label>
              <input
                id="owner-dashboard-search"
                aria-label="Busca"
                title="Busca"
                placeholder="SKU ou nome…"
                value={filters.q || ''}
                onChange={(e) => handleFilterChange({ q: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void loadDashboard({ ...filters, page: 1 }) } }}
                className="w-full h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] placeholder:text-[#4b5563]"
              />
            </div>
          </div>
          {periodIsCustom ? (
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/[0.06]">
              <div>
                <label htmlFor="owner-dashboard-start" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">De</label>
                <input
                  id="owner-dashboard-start"
                  type="date"
                  aria-label="Data inicial"
                  value={formatDateInput(filters.startAt)}
                  onChange={(e) => handleFilterChange({ startAt: e.target.value ? `${e.target.value}T00:00:00.000Z` : undefined })}
                  className="h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                />
              </div>
              <div>
                <label htmlFor="owner-dashboard-end" className="block text-[10px] uppercase tracking-widest text-[#6b7280] mb-1">Até</label>
                <input
                  id="owner-dashboard-end"
                  type="date"
                  aria-label="Data final"
                  value={formatDateInput(filters.endAt)}
                  onChange={(e) => handleFilterChange({ endAt: e.target.value ? `${e.target.value}T23:59:59.999Z` : undefined })}
                  className="h-9 px-2.5 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                />
              </div>
            </div>
          ) : null}
        </div>

        {/* ── Feedback ─────────────────────────────────────────── */}
        {error ? (
          <div className="flex items-center gap-2 p-3 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-400">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        ) : null}

        {/* ── Alertas de estoque ───────────────────────────────── */}
        {alertProducts.length > 0 && !loading ? (
          <div className="p-4 rounded-xl bg-amber-500/[0.07] border border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-amber-400">
                {alertProducts.length} produto{alertProducts.length !== 1 ? 's' : ''} com estoque crítico ou zerado
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {alertProducts.map((p) => (
                <Link
                  key={p.id}
                  to={`/owner/products/${p.id}/edit`}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:border-amber-500/40 transition-colors"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${p.stock === 0 ? 'bg-red-400' : 'bg-amber-400'}`} />
                  {p.name} — {p.stock === 0 ? 'zerado' : `${p.stock} un.`}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── KPI Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {kpiCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.label}
                className="relative p-4 rounded-xl bg-white/[0.04] border border-white/[0.07] overflow-hidden"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#d4a843]/50 via-transparent to-transparent" />
                <div className="flex items-start justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-[#6b7280] leading-tight">{card.label}</p>
                  <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                    <Icon className={`w-3.5 h-3.5 ${card.accent}`} />
                  </div>
                </div>
                <p className={`text-xl font-bold ${loading ? 'text-[#374151]' : 'text-[#f0ede8]'}`}>
                  {loading ? '—' : card.value}
                </p>
                {typeof card.delta === 'number' && !loading ? (
                  <div className="mt-2">
                    <DeltaBadge delta={card.delta} />
                    <span className="ml-1.5 text-[10px] text-[#4b5563]">vs anterior</span>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* ── Funil de conversão ───────────────────────────────── */}
        {products.length > 0 && !loading ? (
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <h2 className="text-xs font-semibold text-[#f0ede8] mb-4">Funil de conversão — período selecionado</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {funnelTotals.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={step.label} className="relative">
                    {i > 0 ? (
                      <div className="hidden sm:block absolute -left-1.5 top-1/2 -translate-y-1/2 text-[#374151] text-lg">›</div>
                    ) : null}
                    <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center">
                      <Icon className="w-4 h-4 text-[#d4a843] mx-auto mb-2" />
                      <p className="text-lg font-bold text-[#f0ede8]">{step.value.toLocaleString('pt-BR')}</p>
                      <p className="text-[10px] text-[#6b7280] mt-0.5">{step.label}</p>
                      {i > 0 ? (
                        <span className="mt-1.5 inline-block px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-[#9ca3af]">
                          {step.pct}% do topo
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* ── Tabela de produtos ───────────────────────────────── */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-sm font-semibold text-[#f0ede8]">Produtos</h2>
              {productMeta ? (
                <p className="text-[11px] text-[#6b7280] mt-0.5">
                  {productMeta.total} itens · página {productMeta.page} de {productMeta.totalPages}
                </p>
              ) : null}
            </div>
          </div>

          <div data-testid="owner-dashboard-table-scroll" className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-xs">
              <thead>
                <tr className="text-[#6b7280] border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="py-2.5 px-4 font-medium text-left">Produto</th>
                  <th className="py-2.5 px-3 font-medium text-left">
                    <SortHeader label="Estoque" field="stock" currentSort={currentSort} direction={currentDirection} onSort={handleSort} />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-left">
                    <SortHeader label="Vendas" field="unitsSold" currentSort={currentSort} direction={currentDirection} onSort={handleSort} />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-left">
                    <SortHeader label="Receita" field="revenue" currentSort={currentSort} direction={currentDirection} onSort={handleSort} />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-left">
                    <SortHeader label="Margem" field="margin" currentSort={currentSort} direction={currentDirection} onSort={handleSort} />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-left">
                    <SortHeader label="Conversão" field="conversion" currentSort={currentSort} direction={currentDirection} onSort={handleSort} />
                  </th>
                  <th className="py-2.5 px-3 font-medium text-left">Views</th>
                  <th className="py-2.5 px-3 font-medium text-left">Avaliação</th>
                  <th className="py-2.5 px-3 font-medium text-left">Status</th>
                  <th className="py-2.5 px-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const stockCritical = product.stock === 0 || product.stock <= (product.reorderPoint ?? 0)
                  const stockWarn = !stockCritical && product.stock <= (product.minimumStock ?? 0)
                  return (
                    <tr
                      key={product.id}
                      className="border-t border-white/[0.04] hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#f0ede8] leading-snug">{product.name}</p>
                        <p className="text-[10px] text-[#4b5563] mt-0.5">{product.sku} · {product.manufacturer}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`flex items-center gap-1 font-semibold ${
                          stockCritical ? 'text-red-400' : stockWarn ? 'text-amber-400' : 'text-[#9ca3af]'
                        }`}>
                          {stockCritical || stockWarn ? <AlertTriangle className="w-3 h-3" /> : null}
                          {product.stock}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#9ca3af]">{product.unitsSold}</td>
                      <td className="py-3 px-3 font-semibold text-[#d4a843]">{toCurrency(product.revenue)}</td>
                      <td className="py-3 px-3">
                        <span className={`font-semibold ${(product.marginPercent ?? 0) >= 30 ? 'text-emerald-400' : (product.marginPercent ?? 0) >= 15 ? 'text-amber-400' : 'text-red-400'}`}>
                          {Number(product.marginPercent ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#9ca3af]">{Number(product.conversionRate ?? 0).toFixed(2)}%</td>
                      <td className="py-3 px-3 text-[#9ca3af]">{Number(product.views ?? 0).toLocaleString('pt-BR')}</td>
                      <td className="py-3 px-3">
                        {product.averageRating > 0 ? (
                          <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                            <Star className="w-3 h-3 fill-current" />
                            {product.averageRating.toFixed(1)}
                            <span className="text-[#4b5563] font-normal">({product.reviewCount})</span>
                          </span>
                        ) : (
                          <span className="text-[#374151]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          to={`/owner/products/${product.id}/edit`}
                          className="flex items-center justify-center w-7 h-7 rounded-lg border border-white/[0.08] text-[#6b7280] hover:text-[#f0ede8] hover:border-white/[0.18] transition-colors"
                          aria-label={`Editar ${product.name}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {products.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[#4b5563]">
                      Nenhum produto encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : null}
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-[#4b5563]">
                      Carregando…
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {productMeta && productMeta.totalPages > 1 ? (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <button
                disabled={productMeta.page <= 1}
                onClick={() => handleFilterChange({ page: productMeta.page - 1 })}
                className="h-8 px-3 rounded-lg text-xs border border-white/[0.08] text-[#9ca3af] hover:text-[#f0ede8] hover:border-white/[0.18] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Anterior
              </button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(productMeta.totalPages, 7) }, (_, i) => {
                  const page = i + 1
                  return (
                    <button
                      key={page}
                      onClick={() => handleFilterChange({ page })}
                      className={`w-8 h-8 rounded-lg text-xs transition-colors ${
                        page === productMeta.page
                          ? 'bg-[#d4a843]/20 border border-[#d4a843]/40 text-[#d4a843] font-semibold'
                          : 'border border-white/[0.08] text-[#6b7280] hover:text-[#f0ede8] hover:border-white/[0.18]'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}
                {productMeta.totalPages > 7 ? (
                  <span className="flex items-center px-1 text-[#4b5563] text-xs">…{productMeta.totalPages}</span>
                ) : null}
              </div>
              <button
                disabled={productMeta.page >= productMeta.totalPages}
                onClick={() => handleFilterChange({ page: productMeta.page + 1 })}
                className="h-8 px-3 rounded-lg text-xs border border-white/[0.08] text-[#9ca3af] hover:text-[#f0ede8] hover:border-white/[0.18] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Próxima →
              </button>
            </div>
          ) : null}
        </div>

      </div>
    </OwnerLayout>
  )
}
