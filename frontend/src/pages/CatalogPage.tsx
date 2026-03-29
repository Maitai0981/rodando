import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, m, useInView } from 'framer-motion'
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  ShoppingCart,
  X,
} from 'lucide-react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ImageWithFallback } from '../shared/common/ImageWithFallback'
import { api, buildProductUrl } from '../shared/lib/api'
import { formatCurrency } from '../shared/lib'
import { useCart } from '../shared/context/CartContext'

const SEARCH_DEBOUNCE_MS = 300

const SORT_OPTIONS = [
  { label: 'Mais vendidos', value: 'best-sellers' },
  { label: 'Menor preço', value: 'price-asc' },
  { label: 'Maior preço', value: 'price-desc' },
  { label: 'Mais recentes', value: 'newest' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']

interface Filters {
  search: string
  category: string
  brand: string
  availability: 'Todos' | 'Disponível' | 'Indisponível'
  promo: 'Todas' | 'Em promoção'
  sort: SortValue
  priceMin: number
  priceMax: number
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  category: 'Todas',
  brand: 'Todas',
  availability: 'Todos',
  promo: 'Todas',
  sort: 'best-sellers',
  priceMin: 0,
  priceMax: 1200,
}

function buildPageRange(current: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: Array<number | '...'> = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

function ProductCard({
  product,
  onAddToCart,
  delay,
}: {
  product: { id: number; name: string; seoSlug?: string | null; manufacturer?: string | null; category?: string | null; price?: number | null; compareAtPrice?: number | null; stock?: number | null; imageUrl?: string | null }
  onAddToCart: (id: number) => void
  delay: number
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-40px' })
  const available = Number(product.stock || 0) > 0

  const handleAdd = () => {
    if (!available) return
    onAddToCart(product.id)
  }

  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -6 }}
      className="group relative rounded-2xl overflow-hidden flex flex-col bg-white/[0.03] border border-white/[0.06]"
    >
      <div className="relative h-44 overflow-hidden flex-shrink-0 bg-white/[0.02]">
        <ImageWithFallback
          src={product.imageUrl ?? undefined}
          alt={product.name}
          className="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/80 to-transparent" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {product.compareAtPrice ? (
            <span className="px-2 py-0.5 rounded-full text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold">
              Oferta
            </span>
          ) : null}
          {!available ? (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#f87171]">
              Indisponível
            </span>
          ) : null}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs mb-1.5 text-[#d4a843]">
          {(product.manufacturer || 'Rodando')} · {(product.category || 'Peças')}
        </p>
        <h3 className="text-sm mb-3 leading-snug flex-1 text-[#f0ede8] font-semibold">
          {product.name}
        </h3>

        <div className="mt-auto space-y-3">
          <div>
            {product.compareAtPrice ? (
              <p className="text-xs line-through text-[#374151]">
                {formatCurrency(Number(product.compareAtPrice))}
              </p>
            ) : null}
            <p className="text-lg text-[#d4a843] font-bold leading-none">
              {formatCurrency(Number(product.price || 0))}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              to={buildProductUrl(product)}
              className="flex-1 px-3 py-2 rounded-xl text-xs border border-white/[0.1] text-[#f0ede8] text-center font-semibold transition-colors hover:border-[#d4a843]/40 hover:text-[#d4a843]"
            >
              Ver produto
            </Link>
            <m.button
              onClick={handleAdd}
              disabled={!available}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold min-w-[110px] justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              whileHover={available ? { scale: 1.05, boxShadow: '0 0 15px rgba(212,168,67,0.4)' } : {}}
              whileTap={available ? { scale: 0.95 } : {}}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Adicionar
            </m.button>
          </div>
        </div>
      </div>
    </m.div>
  )
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const querySearch = searchParams.get('q') || ''
  const [filters, setFilters] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, search: querySearch }))
  const [searchInputValue, setSearchInputValue] = useState(querySearch)
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const perPage = 12
  const { addProduct } = useCart()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function goToPage(p: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (p <= 1) next.delete('page')
      else next.set('page', String(p))
      return next
    }, { replace: true })
  }

  const updateFilter = useCallback((key: keyof Filters, value: string | number) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('page')
      if (key === 'search') {
        const searchValue = String(value).trim()
        if (searchValue) next.set('q', searchValue)
        else next.delete('q')
      }
      return next
    }, { replace: true })
  }, [setSearchParams])

  const handleSearchChange = useCallback((value: string) => {
    setSearchInputValue(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateFilter('search', value)
    }, SEARCH_DEBOUNCE_MS)
  }, [updateFilter])

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
    setSearchInputValue('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('q')
      next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])

  useEffect(() => {
    setFilters((current) => {
      if (current.search === querySearch) return current
      return { ...current, search: querySearch }
    })
    setSearchInputValue(querySearch)
  }, [querySearch])

  // cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const handleSearchSubmit = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    updateFilter('search', searchInputValue)
  }, [searchInputValue, updateFilter])

  const hasActiveFilters =
    filters.category !== 'Todas' ||
    filters.brand !== 'Todas' ||
    filters.availability !== 'Todos' ||
    filters.promo !== 'Todas' ||
    filters.search !== '' ||
    filters.priceMin > 0 ||
    filters.priceMax < 1200

  const productQuery = useQuery({
    queryKey: ['catalog', filters, page],
    queryFn: () => api.listPublicProducts({
      page,
      pageSize: perPage,
      q: filters.search || undefined,
      category: filters.category !== 'Todas' ? filters.category : undefined,
      manufacturer: filters.brand !== 'Todas' ? filters.brand : undefined,
      minPrice: filters.priceMin > 0 ? filters.priceMin : undefined,
      maxPrice: filters.priceMax,
      inStock: filters.availability === 'Disponível' ? true : filters.availability === 'Indisponível' ? false : undefined,
      promo: filters.promo === 'Em promoção' ? true : undefined,
      sort: filters.sort,
    }),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
    retry: false,
  })
  const applyFilters = useCallback(() => {
    goToPage(1)
    void productQuery.refetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productQuery.refetch])

  const items = useMemo(() => productQuery.data?.items ?? [], [productQuery.data?.items])
  const meta = productQuery.data?.meta

  const categories = useMemo(() => ['Todas', ...Array.from(new Set(items.map((p) => p.category).filter(Boolean)))], [items])
  const brands = useMemo(() => ['Todas', ...Array.from(new Set(items.map((p) => p.manufacturer).filter(Boolean)))], [items])

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-10">
          <div className="flex items-center gap-2 text-xs mb-4 text-[#4b5563]">
            <Link to="/" className="hover:text-amber-400 transition-colors">Início</Link>
            <span>/</span>
            <span className="text-[#d4a843]">Catálogo</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-8 bg-[#d4a843]" />
            <span className="text-xs tracking-widest uppercase text-[#d4a843] font-semibold">Catálogo</span>
          </div>
          <h1 className="font-['Rajdhani'] text-[clamp(2rem,5vw,3rem)] font-bold text-[#f0ede8] leading-[1.1]">
            Catálogo de{' '}
            <span className="bg-gradient-to-br from-[#d4a843] to-[#f0c040] bg-clip-text text-transparent">
              Peças
            </span>
          </h1>
          <p className="mt-2 text-sm text-[#6b7280]">
            Filtre por categoria, fabricante, preço, promoção e disponibilidade.
          </p>
        </m.div>

        <div className="mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <label htmlFor="catalog-main-search" className="text-xs tracking-wider uppercase mb-2 block text-[#d4a843] font-semibold">
            Busca no catálogo
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b7280]" />
            <input
              id="catalog-main-search"
              data-testid="catalog-search-input"
              aria-label="Buscar produtos"
              type="text"
              placeholder="Produto, marca ou categoria..."
              value={searchInputValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchSubmit}
              className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
            />
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-3 mb-6">
          <m.button
            onClick={() => setSidebarOpen(true)}
            aria-label="Filtros e ordenacao"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-[#d4a843]/10 border border-[#d4a843]/25 text-[#d4a843] font-semibold"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {hasActiveFilters ? <span className="w-2 h-2 rounded-full bg-[#d4a843]" /> : null}
          </m.button>
          <select
            aria-label="Ordenação"
            value={filters.sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="flex-1 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value} className="bg-[#111118]">
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-6">
          <m.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="hidden lg:block w-64 flex-shrink-0"
          >
            <div className="sticky top-20 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#d4a843]" />
                  <span className="text-sm text-[#f0ede8] font-semibold">Filtros</span>
                </div>
                {hasActiveFilters ? (
                  <button onClick={clearFilters} className="text-xs flex items-center gap-1 text-[#d4a843]">
                    <X className="w-3 h-3" />
                    Limpar
                  </button>
                ) : null}
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs tracking-wider uppercase mb-2 block text-[#d4a843] font-semibold">Categoria</label>
                  <select
                    aria-label="Filtrar categoria"
                    value={filters.category}
                    onChange={(e) => updateFilter('category', e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-[#111118]">{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs tracking-wider uppercase mb-2 block text-[#d4a843] font-semibold">Fabricante</label>
                  <select
                    aria-label="Filtrar fabricante"
                    value={filters.brand}
                    onChange={(e) => updateFilter('brand', e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  >
                    {brands.map((b) => (
                      <option key={b} value={b} className="bg-[#111118]">{b}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs tracking-wider uppercase mb-2 block text-[#d4a843] font-semibold">Disponibilidade</label>
                  {['Todos', 'Disponível', 'Indisponível'].map((a) => (
                    <label key={a} className="flex items-center gap-2 py-1.5 cursor-pointer">
                      <button
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          filters.availability === a ? 'border-[#d4a843]' : 'border-[#374151]'
                        }`}
                        onClick={() => updateFilter('availability', a)}
                        aria-label={`Disponibilidade ${a}`}
                      >
                        {filters.availability === a ? <div className="w-2 h-2 rounded-full bg-[#d4a843]" /> : null}
                      </button>
                      <span className={`text-sm ${filters.availability === a ? 'text-[#d4a843]' : 'text-[#6b7280]'}`}>{a}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="text-xs tracking-wider uppercase mb-2 block text-[#d4a843] font-semibold">Promoções</label>
                  {['Todas', 'Em promoção'].map((p) => (
                    <label key={p} className="flex items-center gap-2 py-1.5 cursor-pointer">
                      <button
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          filters.promo === p ? 'border-[#d4a843]' : 'border-[#374151]'
                        }`}
                        onClick={() => updateFilter('promo', p)}
                        aria-label={`Promoção ${p}`}
                      >
                        {filters.promo === p ? <div className="w-2 h-2 rounded-full bg-[#d4a843]" /> : null}
                      </button>
                      <span className={`text-sm ${filters.promo === p ? 'text-[#d4a843]' : 'text-[#6b7280]'}`}>{p}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="text-xs tracking-wider uppercase mb-2 block text-[#d4a843] font-semibold">Faixa de preço</label>
                  <p className="text-sm mb-2 text-[#f0ede8] font-semibold">
                    {formatCurrency(filters.priceMin)} – {formatCurrency(filters.priceMax)}
                  </p>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min={0}
                      max={1200}
                      step={50}
                      value={filters.priceMin}
                      onChange={(e) => updateFilter('priceMin', Math.min(Number(e.target.value), filters.priceMax - 50))}
                      aria-label="Preço mínimo"
                      className="w-full accent-amber-400"
                    />
                    <input
                      type="range"
                      min={0}
                      max={1200}
                      step={50}
                      value={filters.priceMax}
                      onChange={(e) => updateFilter('priceMax', Math.max(Number(e.target.value), filters.priceMin + 50))}
                      aria-label="Preço máximo"
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          </m.aside>

          <AnimatePresence>
            {sidebarOpen ? (
              <>
                <m.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 lg:hidden bg-black/70"
                  onClick={() => setSidebarOpen(false)}
                />
                <m.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="fixed left-0 top-0 bottom-0 z-50 w-80 overflow-y-auto p-5 lg:hidden bg-[#111118] border-r border-[#d4a843]/15"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-[#d4a843]" />
                      <span className="text-[#f0ede8] font-semibold">Filtros</span>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="text-[#6b7280]" aria-label="Fechar filtros">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="text-xs tracking-wider uppercase mb-2 block text-[#d4a843] font-semibold">Categoria</label>
                      <select
                        aria-label="Filtrar categoria"
                        value={filters.category}
                        onChange={(e) => updateFilter('category', e.target.value)}
                        className="w-full py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                      >
                        {categories.map((c) => (
                          <option key={c} value={c} className="bg-[#111118]">{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs tracking-wider uppercase mb-2 block text-[#d4a843] font-semibold">Fabricante</label>
                      <select
                        aria-label="Filtrar fabricante"
                        value={filters.brand}
                        onChange={(e) => updateFilter('brand', e.target.value)}
                        className="w-full py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                      >
                        {brands.map((b) => (
                          <option key={b} value={b} className="bg-[#111118]">{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs tracking-wider uppercase mb-2 block text-[#d4a843] font-semibold">Faixa de preço</label>
                      <p className="text-sm mb-2 text-[#f0ede8] font-semibold">
                        {formatCurrency(filters.priceMin)} – {formatCurrency(filters.priceMax)}
                      </p>
                      <div className="space-y-2">
                        <input
                          type="range"
                          min={0}
                          max={1200}
                          step={50}
                          value={filters.priceMin}
                          onChange={(e) => updateFilter('priceMin', Math.min(Number(e.target.value), filters.priceMax - 50))}
                          aria-label="Preço mínimo"
                          className="w-full accent-amber-400"
                        />
                        <input
                          type="range"
                          min={0}
                          max={1200}
                          step={50}
                          value={filters.priceMax}
                          onChange={(e) => updateFilter('priceMax', Math.max(Number(e.target.value), filters.priceMin + 50))}
                          aria-label="Preço máximo"
                          className="w-full accent-amber-400"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {hasActiveFilters ? (
                        <button
                          onClick={clearFilters}
                          className="flex-1 py-2.5 rounded-xl text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171] font-semibold"
                        >
                          Limpar tudo
                        </button>
                      ) : null}
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="flex-1 py-2.5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </m.div>
              </>
            ) : null}
          </AnimatePresence>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs bg-[#d4a843]/10 text-[#d4a843] font-semibold border border-[#d4a843]/20">
                  {meta?.total ?? items.length} produto{(meta?.total ?? items.length) !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="hidden lg:flex items-center gap-2">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#6b7280]" />
                <select
                  aria-label="Ordenação"
                  value={filters.sort}
                  onChange={(e) => updateFilter('sort', e.target.value)}
                  className="py-1.5 px-3 rounded-lg text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value} className="bg-[#111118]">{s.label}</option>
                  ))}
                </select>
                <button
                  data-testid="catalog-apply-filters"
                  onClick={applyFilters}
                  className="py-1.5 px-3 rounded-lg text-xs border border-[#d4a843]/30 text-[#d4a843] bg-[#d4a843]/5 font-semibold"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>

            <AnimatePresence>
              {hasActiveFilters ? (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap gap-2 mb-4"
                >
                  {filters.category !== 'Todas' ? (
                    <m.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/20"
                    >
                      {filters.category}
                      <button onClick={() => updateFilter('category', 'Todas')} aria-label="Remover filtro de categoria">
                        <X className="w-3 h-3" />
                      </button>
                    </m.span>
                  ) : null}
                  {filters.brand !== 'Todas' ? (
                    <m.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/20"
                    >
                      {filters.brand}
                      <button onClick={() => updateFilter('brand', 'Todas')} aria-label="Remover filtro de fabricante">
                        <X className="w-3 h-3" />
                      </button>
                    </m.span>
                  ) : null}
                  {filters.search ? (
                    <m.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/20"
                    >
                      "{filters.search}"
                      <button onClick={() => updateFilter('search', '')} aria-label="Remover filtro de busca">
                        <X className="w-3 h-3" />
                      </button>
                    </m.span>
                  ) : null}
                </m.div>
              ) : null}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {productQuery.isError ? (
                <m.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#ef4444]/10 border border-[#ef4444]/20">
                    <X className="w-7 h-7 text-[#f87171]" />
                  </div>
                  <h3 className="mb-2 text-[#f0ede8] font-semibold">Não foi possível carregar o catálogo</h3>
                  <p className="text-sm mb-6 text-[#6b7280]">O backend respondeu com erro. Tente novamente em instantes.</p>
                  <m.button
                    onClick={() => void productQuery.refetch()}
                    className="px-5 py-2.5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(212,168,67,0.4)' }}
                  >
                    Tentar novamente
                  </m.button>
                </m.div>
              ) : items.length === 0 ? (
                <m.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-[#d4a843]/[0.08] border border-[#d4a843]/15">
                    <Search className="w-7 h-7 text-[#d4a843]" />
                  </div>
                  <h3 className="mb-2 text-[#f0ede8] font-semibold">Nenhum produto encontrado</h3>
                  <p className="text-sm mb-6 text-[#6b7280]">Ajuste os filtros ou limpe a busca para ver outros itens.</p>
                  <m.button
                    onClick={clearFilters}
                    className="px-5 py-2.5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                    whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(212,168,67,0.4)' }}
                  >
                    Limpar filtros
                  </m.button>
                </m.div>
              ) : (
                <m.div
                  key="grid"
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {items.map((p, i) => (
                    <ProductCard
                      key={p.id}
                      product={{
                        id: p.id,
                        name: p.name,
                        manufacturer: p.manufacturer,
                        category: p.category,
                        price: p.price,
                        compareAtPrice: p.compareAtPrice,
                        stock: p.stock,
                        imageUrl: p.imageUrl,
                      }}
                      onAddToCart={(id) => {
                        const match = items.find((item) => item.id === id)
                        if (match) {
                          void addProduct(match, 1)
                        }
                      }}
                      delay={i * 0.05}
                    />
                  ))}
                </m.div>
              )}
            </AnimatePresence>

            {meta && meta.totalPages > 1 ? (
              <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2 mt-10"
              >
                <m.button
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 bg-white/[0.05] border border-white/[0.08] text-[#f0ede8]"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </m.button>

                {buildPageRange(page, meta.totalPages).map((p, i) =>
                  p === '...' ? (
                    <span key={`ellipsis-${i}`} className="w-9 text-center text-sm text-[#4b5563]">…</span>
                  ) : (
                    <m.button
                      key={p}
                      onClick={() => goToPage(p)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                        page === p
                          ? 'bg-gradient-to-br from-[#d4a843] to-[#f0c040] text-black font-bold'
                          : 'bg-white/[0.05] border border-white/[0.08] text-[#f0ede8] font-normal'
                      }`}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                    >
                      {p}
                    </m.button>
                  )
                )}

                <m.button
                  onClick={() => goToPage(Math.min(meta.totalPages, page + 1))}
                  disabled={page === meta.totalPages}
                  className="w-9 h-9 rounded-xl flex items-center justify-center disabled:opacity-30 bg-white/[0.05] border border-white/[0.08] text-[#f0ede8]"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                >
                  <ChevronRight className="w-4 h-4" />
                </m.button>
              </m.div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
