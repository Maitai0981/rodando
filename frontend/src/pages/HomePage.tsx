import { useEffect, useMemo, useRef, useState, type ElementType } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, m, useInView } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Clock,
  Headphones,
  MapPin,
  Phone,
  ShoppingCart,
  Star,
  Store,
  Truck,
  Shield,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ImageWithFallback } from '../shared/common/ImageWithFallback'
import { useCart } from '../shared/context/CartContext'
import { api, buildProductUrl } from '../shared/lib/api'
import { formatCurrency } from '../shared/lib'

const heroImage =
  'https://images.unsplash.com/photo-1738868191453-e3dec0a394e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3RvcmN5Y2xlJTIwZGFyayUyMGRyYW1hdGljJTIwcmFjaW5nfGVufDF8fHx8MTc3MzA2OTA0OHww&ixlib=rb-4.1.0&q=80&w=1080'
const partsImage =
  'https://images.unsplash.com/photo-1675247911627-0fb610250598?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3RvcmN5Y2xlJTIwZW5naW5lJTIwcGFydHMlMjBjbG9zZSUyMHVwJTIwbHV4dXJ5fGVufDF8fHx8MTc3MzA2OTA0OHww&ixlib=rb-4.1.0&q=80&w=1080'
const partsImage2 =
  'https://images.unsplash.com/photo-1663342850009-d85dc9329916?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3RvcmN5Y2xlJTIwYWNjZXNzb3JpZXMlMjBwcmVtaXVtJTIwYmxhY2slMjBnb2xkfGVufDF8fHx8MTc3MzA2OTA1Mnww&ixlib=rb-4.1.0&q=80&w=1080'
const shopImage =
  'https://lh3.googleusercontent.com/p/AF1QipOIJtyawLBJXkAdD3-zjal0bL54xaGKNWe2KFkU=w408-h544-k-no' 
function useScrollFadeIn<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  return { ref, isInView }
}

const features = [
  { icon: Store, title: 'Loja Física Ativa', desc: 'Retirada no balcão e suporte técnico presencial em Cascavel/PR.' },
  { icon: Truck, title: 'Entrega Ágil', desc: 'Despacho rápido para reduzir tempo de moto parada.' },
  { icon: Shield, title: 'Garantia Real', desc: 'Procedimento validado e política comercial transparente.' },
  { icon: Headphones, title: 'Consultoria Técnica', desc: 'Equipe orienta aplicação antes da compra.' },
]

const PARTICLES = [
  { className: 'w-[320px] h-[280px] left-[10%] top-[5%]', dx: 25, dy: -20, dur: 7 },
  { className: 'w-[200px] h-[240px] left-[55%] top-[60%]', dx: -30, dy: 18, dur: 9 },
  { className: 'w-[400px] h-[350px] left-[75%] top-[20%]', dx: 20, dy: 30, dur: 11 },
  { className: 'w-[160px] h-[180px] left-[30%] top-[75%]', dx: -15, dy: -25, dur: 8 },
  { className: 'w-[280px] h-[260px] left-[85%] top-[45%]', dx: 35, dy: -15, dur: 13 },
  { className: 'w-[220px] h-[200px] left-[45%] top-[10%]', dx: -20, dy: 22, dur: 10 },
]

function FeatureCard({ icon: Icon, title, desc, delay }: { icon: ElementType; title: string; desc: string; delay: number }) {
  const { ref, isInView } = useScrollFadeIn<HTMLDivElement>()
  return (
    <m.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, boxShadow: '0 20px 60px rgba(212,168,67,0.12)' }}
      className="group relative rounded-2xl p-6 cursor-default bg-white/[0.03] border border-[#d4a843]/10"
    >
      <m.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[linear-gradient(135deg,rgba(212,168,67,0.06),transparent)]"
      />
      <div className="relative z-10">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-[linear-gradient(135deg,rgba(212,168,67,0.2),rgba(212,168,67,0.05))] border border-[#d4a843]/25"
        >
          <Icon className="w-5 h-5 text-[#d4a843]" />
        </div>
        <h3 className="mb-2 text-[#f0ede8] font-semibold text-[0.95rem]">
          {title}
        </h3>
        <p className="text-sm leading-relaxed text-[#6b7280]">
          {desc}
        </p>
      </div>
    </m.div>
  )
}

function HomeProductCard({
  product,
  delay,
  onAddToCart,
}: {
  product: { id: number; name: string; seoSlug?: string | null; price: number; manufacturer?: string | null; category?: string | null; imageUrl?: string | null; compareAtPrice?: number | null }
  delay: number
  onAddToCart: (productId: number) => void
}) {
  const { ref, isInView } = useScrollFadeIn<HTMLDivElement>()
  const [added, setAdded] = useState(false)
  const addedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (addedTimerRef.current) clearTimeout(addedTimerRef.current)
    }
  }, [])

  const handleAdd = () => {
    onAddToCart(product.id)
    setAdded(true)
    if (addedTimerRef.current) clearTimeout(addedTimerRef.current)
    addedTimerRef.current = setTimeout(() => {
      setAdded(false)
      addedTimerRef.current = null
    }, 1500)
  }

  return (
    <m.div
      ref={ref}
      data-testid="home-highlight-card"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.6, delay }}
      whileHover={{ y: -8 }}
      className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06]"
    >
      <div className="relative h-44 overflow-hidden bg-white/[0.03]">
        <ImageWithFallback
          src={product.imageUrl || (product.id % 2 === 0 ? partsImage2 : partsImage)}
          alt={product.name}
          className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.03]"
        />
        {product.compareAtPrice && product.compareAtPrice > product.price ? (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040]">
            -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
          </div>
        ) : null}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center bg-black/50"
        >
          <Link to={buildProductUrl({ id: product.id, name: product.name, seoSlug: product.seoSlug ?? undefined })}>
            <m.button
              className="px-4 py-2 rounded-full text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-semibold"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
            >
              Ver produto
            </m.button>
          </Link>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs mb-1 text-[#d4a843]">
          {(product.manufacturer || 'Rodando')} · {product.category || 'Peças'}
        </p>
        <h3 className="text-sm mb-3 leading-snug text-[#f0ede8] font-semibold">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <div>
            {product.compareAtPrice ? (
              <p className="text-xs line-through text-[#4b5563]">
                {formatCurrency(Number(product.compareAtPrice))}
              </p>
            ) : null}
            <p className="text-lg text-[#d4a843] font-bold">
              {formatCurrency(Number(product.price))}
            </p>
          </div>
          <m.button
            onClick={handleAdd}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-black font-bold transition-colors ${added ? 'bg-[#22c55e]/85' : 'bg-gradient-to-br from-[#d4a843] to-[#f0c040]'}`}
            whileHover={{ scale: 1.06, boxShadow: '0 0 15px rgba(212,168,67,0.4)' }}
            whileTap={{ scale: 0.95 }}
          >
            <AnimatePresence mode="wait">
              {added ? (
                <m.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  ✓
                </m.span>
              ) : (
                <m.span key="cart" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <ShoppingCart className="w-3.5 h-3.5" />
                </m.span>
              )}
            </AnimatePresence>
            {added ? 'Adicionado!' : 'Adicionar'}
          </m.button>
        </div>
      </div>
    </m.div>
  )
}

export default function HomePage() {
  const heroRef = useRef(null)
  const { addProduct } = useCart()

  const { ref: featRef, isInView: featInView } = useScrollFadeIn()
  const { ref: prodsRef, isInView: prodsInView } = useScrollFadeIn()
  const { ref: catsRef, isInView: catsInView } = useScrollFadeIn()
  const { ref: testimonRef, isInView: testimonInView } = useScrollFadeIn()
  const { ref: localRef, isInView: localInView } = useScrollFadeIn()
  const [highlightLimit, setHighlightLimit] = useState(4)

  useEffect(() => {
    const getLimit = () => {
      if (window.matchMedia('(min-width: 1536px)').matches) return 4
      if (window.matchMedia('(min-width: 1280px)').matches) return 4
      if (window.matchMedia('(min-width: 1024px)').matches) return 3
      if (window.matchMedia('(min-width: 640px)').matches) return 2
      return 1
    }
    const update = () => setHighlightLimit(getLimit())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const highlightsQuery = useQuery({
    queryKey: ['home-highlights'],
    queryFn: () => api.listCatalogHighlights(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const catalogQuery = useQuery({
    queryKey: ['home-catalog-categories'],
    queryFn: () => api.listCatalogCategories(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const commentsQuery = useQuery({
    queryKey: ['home-comments'],
    queryFn: () => api.listComments({ limit: 6 }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const highlightItems = useMemo(() => highlightsQuery.data?.items ?? [], [highlightsQuery.data?.items])
  const highlightProducts = useMemo(
    () => highlightItems.slice(0, highlightLimit),
    [highlightItems, highlightLimit],
  )
  const categories = useMemo(
    () => (catalogQuery.data?.items ?? []).slice(0, 6),
    [catalogQuery.data?.items],
  )
  const comments = useMemo(() => commentsQuery.data?.items ?? [], [commentsQuery.data?.items])
  const commentsSummary = commentsQuery.data?.summary
  const commentsSummaryLabel = commentsQuery.isError
    ? 'Avaliações indisponíveis no momento'
    : `Nota média ${Number(commentsSummary?.averageRating || 0).toFixed(1)} • ${commentsSummary?.totalReviews || 0} avaliações`

  return (
    <div>
      <section ref={heroRef} data-testid="home-hero-section" className="relative min-h-screen flex items-center overflow-hidden bg-[#0a0a0f]">
        <m.div className="absolute inset-0">
          <ImageWithFallback src={heroImage} alt="Motocicleta premium" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,15,0.97)_0%,rgba(10,10,15,0.7)_50%,rgba(10,10,15,0.3)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(10,10,15,1)_0%,transparent_50%)]" />
        </m.div>

        {PARTICLES.map((p, i) => (
          <m.div
            key={i}
            className={`absolute rounded-full pointer-events-none blur-[40px] bg-[radial-gradient(circle,rgba(212,168,67,0.07)_0%,transparent_70%)] ${p.className}`}
            animate={{ x: [0, p.dx, 0], y: [0, p.dy, 0] }}
            transition={{ duration: p.dur, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        <m.div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
          <div className="max-w-2xl">
            <m.div
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex items-center gap-2 mb-6"
            >
              <div className="h-px w-8 bg-[#d4a843]" />
              <span className="text-xs tracking-widest uppercase text-[#d4a843] font-semibold">
                Cascavel · Paraná
              </span>
            </m.div>

            <m.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mb-6 font-['Rajdhani'] text-[clamp(2.4rem,6vw,4.5rem)] font-bold leading-[1.1] text-[#f0ede8]"
            >
              <span
                className="bg-gradient-to-br from-[#d4a843] to-[#f0c040] bg-clip-text text-transparent"
              >
                Rodando
              </span>{' '}
                te ajudando a continuar rodando
            </m.h1>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-wrap gap-3 mb-12"
            >
              <Link to="/catalog">
                <m.button
                  data-testid="home-catalog-cta"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(212,168,67,0.5)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Ver Catálogo
                  <ArrowRight className="w-4 h-4" />
                </m.button>
              </Link>
              <m.a
                href="https://wa.me/5545999634779"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm bg-white/[0.06] border border-white/[0.15] text-[#f0ede8] font-semibold"
                whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
                whileTap={{ scale: 0.97 }}
              >
                <Phone className="w-4 h-4" />
                Atendimento via WhatsApp
              </m.a>
            </m.div>

            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 1 }}
              className="flex flex-wrap gap-5"
            >
              {[
                { icon: Star, label: 'Avaliações reais' },
                { icon: Store, label: 'Loja física em Cascavel' },
                { icon: Truck, label: 'Entrega e retirada rápidas' },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-[#d4a843]" />
                  <span className="text-xs text-[#6b7280]">
                    {label}
                  </span>
                </div>
              ))}
            </m.div>
          </div>
        </m.div>

        <m.button
          type="button"
          data-testid="home-next-section-trigger"
          aria-label="Proxima secao"
          onClick={() => featRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-xs tracking-widest uppercase text-[#d4a843]/50">
            Explorar
          </span>
          <div className="w-px h-8 bg-gradient-to-b from-[#d4a843]/50 to-transparent" />
        </m.button>
      </section>

      <section ref={featRef} className="py-24 bg-[#0d0d14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={featInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="mb-16"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#d4a843]" />
              <span className="text-xs tracking-widest uppercase text-[#d4a843] font-semibold">
                Institucional
              </span>
            </div>
            <h2 className="font-['Rajdhani'] text-[clamp(1.8rem,4vw,2.8rem)] font-bold text-[#f0ede8]">
              Por que escolher a{' '}
              <span
                className="bg-gradient-to-br from-[#d4a843] to-[#f0c040] bg-clip-text text-transparent"
              >
                RODANDO?
              </span>
            </h2>
            <p className="mt-3 text-sm max-w-lg leading-relaxed text-[#6b7280]">
              Combinamos estoque extenso, atendimento especializado e estrutura local para reduzir dúvidas e agilizar sua compra.
            </p>
          </m.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      <section ref={prodsRef} className="py-24 bg-[#0a0a0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={prodsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="flex items-end justify-between mb-12"
          >
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-px w-8 bg-[#d4a843]" />
                <span className="text-xs tracking-widest uppercase text-[#d4a843] font-semibold">
                  Seleção Comercial
                </span>
              </div>
              <h2 className="font-['Rajdhani'] text-[clamp(1.8rem,4vw,2.8rem)] font-bold text-[#f0ede8]">
                Destaques da semana
              </h2>
              <p className="mt-2 text-sm text-[#6b7280]">
                Produtos com alto giro e condições de compra imediata.
              </p>
            </div>
            <Link to="/catalog">
              <m.button
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm border border-[#d4a843]/30 text-[#d4a843] bg-[#d4a843]/5 font-semibold"
                whileHover={{ background: 'rgba(212,168,67,0.12)', scale: 1.03 }}
              >
                Ver catálogo completo
                <ChevronRight className="w-4 h-4" />
              </m.button>
            </Link>
          </m.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {highlightProducts.map((product, i) => (
              <HomeProductCard
                key={product.id}
                product={{
                  id: product.id,
                  name: product.name,
                  seoSlug: product.seoSlug,
                  price: Number(product.price || 0),
                  manufacturer: product.manufacturer,
                  category: product.category,
                  imageUrl: product.imageUrl,
                  compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
                }}
                delay={i * 0.1}
                onAddToCart={(id) => {
                  const match = highlightProducts.find((item) => item.id === id)
                  if (match) {
                    void addProduct(match, 1)
                  }
                }}
              />
            ))}
            {highlightsQuery.isError ? (
              <div className="col-span-full rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 p-4 text-sm text-[#f87171]">
                <p>Não foi possível carregar os destaques agora.</p>
                <Link to="/catalog" className="mt-2 inline-block text-xs text-[#d4a843]">
                  Abrir catálogo mesmo assim
                </Link>
              </div>
            ) : null}
            {highlightProducts.length === 0 && !highlightsQuery.isError ? (
              <div data-testid="home-highlights-empty-state" className="col-span-full text-sm text-[#6b7280]">
                <p>Nenhum destaque disponível no momento.</p>
                <Link to="/catalog" className="text-xs text-[#d4a843]">
                  Ir ao catálogo
                </Link>
              </div>
            ) : null}
          </div>

          <m.div
            initial={{ opacity: 0 }}
            animate={prodsInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center sm:hidden"
          >
            <Link to="/catalog">
              <button
                className="px-6 py-2.5 rounded-xl text-sm border border-[#d4a843]/30 text-[#d4a843] bg-[#d4a843]/5 font-semibold"
              >
                Ver catálogo completo
              </button>
            </Link>
          </m.div>
        </div>
      </section>

      <section ref={catsRef} className="py-20 bg-[#0d0d14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={catsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#d4a843]" />
              <span className="text-xs tracking-widest uppercase text-[#d4a843] font-semibold">
                Categorias
              </span>
            </div>
            <h2 className="font-['Rajdhani'] text-[clamp(1.6rem,4vw,2.4rem)] font-bold text-[#f0ede8]">
              Encontre rápido por categoria
            </h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Filtre por tipo de peça e agilize a escolha do item certo.
            </p>
          </m.div>

          {catalogQuery.isError ? (
            <div className="p-6 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 text-[#f87171]">
              <p className="text-sm">O catálogo está temporariamente indisponível.</p>
              <Link to="/catalog" className="text-xs text-[#d4a843]">
                Tentar carregar no catálogo
              </Link>
            </div>
          ) : categories.length === 0 && !catalogQuery.isLoading ? (
            <div data-testid="home-categories-empty-state" className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[#6b7280]">
              <p className="text-sm">Nenhuma categoria disponível no momento.</p>
              <Link to="/catalog" className="text-xs text-[#d4a843]">
                Ver catálogo geral
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <m.div key={category.name} whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(212,168,67,0.1)' }} transition={{ duration: 0.2 }}>
                <Link
                  to={`/catalog?category=${encodeURIComponent(category.name)}`}
                  className="p-5 rounded-2xl flex items-center justify-between bg-white/[0.03] border border-white/[0.06] hover:border-[#d4a843]/30 text-[#f0ede8] transition-colors group/cat"
                >
                  <div>
                    <p className="text-sm font-semibold">{category.name}</p>
                    <p className="text-xs text-[#6b7280]">{category.count} {category.count === 1 ? 'item' : 'itens'}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#d4a843] transition-transform group-hover/cat:translate-x-1" />
                </Link>
              </m.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section ref={testimonRef} className="py-24 bg-[#0d0d14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={testimonInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-[#d4a843]" />
              <span className="text-xs tracking-widest uppercase text-[#d4a843] font-semibold">
                Avaliações verificadas
              </span>
            </div>
            <h2 className="font-['Rajdhani'] text-[clamp(1.8rem,4vw,2.8rem)] font-bold text-[#f0ede8]">
              O que clientes estão dizendo
            </h2>
            <p className="mt-2 text-sm text-[#6b7280]">
              Feedback real para você decidir com mais segurança.
            </p>
            <div className="mt-3 text-xs text-[#d4a843]">{commentsSummaryLabel}</div>
          </m.div>

          {commentsQuery.isError ? (
            <div className="p-6 rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/10 text-[#f87171]">
              <p className="text-sm">As avaliações não puderam ser carregadas no momento.</p>
              <Link to="/catalog" className="text-xs text-[#d4a843]">
                Continuar para o catálogo
              </Link>
            </div>
          ) : comments.length === 0 && !commentsQuery.isLoading ? (
            <div data-testid="home-reviews-empty-state" className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[#6b7280]">
              <p className="text-sm">Nenhuma avaliação registrada ainda.</p>
              <Link to="/catalog" className="text-xs text-[#d4a843]">
                Avaliar no catálogo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {comments.map((t, i) => (
                <m.div
                  key={t.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={testimonInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.7, delay: i * 0.15 }}
                  whileHover={{ y: -5, boxShadow: '0 20px 50px rgba(212,168,67,0.1)' }}
                  className="p-6 rounded-2xl bg-white/[0.03] border border-[#d4a843]/10"
                >
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-current text-[#d4a843]" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed mb-5 text-[#9ca3af]">
                    "{t.message}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold">
                      {t.authorName?.[0] || 'R'}
                    </div>
                    <div>
                      <p className="text-sm text-[#f0ede8] font-semibold">
                        {t.authorName || 'Cliente'}
                      </p>
                      <p className="text-xs text-[#4b5563]">
                        {t.productName || 'Compra verificada'}
                      </p>
                    </div>
                  </div>
                </m.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section ref={localRef} className="py-24 bg-[#f5f0e8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <m.div
              initial={{ opacity: 0, x: -40 }}
              animate={localInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px w-8 bg-[#d4a843]" />
                <span className="text-xs tracking-widest uppercase text-[#d4a843] font-semibold">
                  Presença Local
                </span>
              </div>
              <h2 className="font-['Rajdhani'] text-[clamp(1.8rem,4vw,2.8rem)] font-bold text-[#1a1007] leading-[1.15]">
                Loja física e atendimento comercial
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[#5a5040] max-w-[400px]">
                Atendimento de segunda a sexta, retirada local e suporte rápido para orçamento e validação de aplicação.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  {
                    title: 'Atendimento local com horário comercial',
                    items: ['Seg a Sex, 08h às 18h', 'Retirada no balcão e suporte técnico para compra certa'],
                  },
                  {
                    title: 'Suporte para compra sem erro de aplicação',
                    items: ['Validação de compatibilidade antes do pedido.', 'Confirmação de estoque em tempo real para retirada ou envio.'],
                  },
                ].map((block, i) => (
                  <m.div
                    key={block.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={localInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.3 + i * 0.15 }}
                    className="p-5 rounded-xl bg-white border border-[#e5ddd0] shadow-sm"
                  >
                    <h4 className="text-sm mb-2 text-[#1a1007] font-semibold">
                      {block.title}
                    </h4>
                    {block.items.map((item) => (
                      <p key={item} className="flex items-start gap-2 text-xs mt-1.5 text-[#5a5040]">
                        <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[#d4a843]" />
                        {item}
                      </p>
                    ))}
                  </m.div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <m.a
                  href="https://wa.me/5545999634779"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(212,168,67,0.4)' }}
                >
                  <Phone className="w-4 h-4" />
                  Falar com vendedor
                </m.a>
                <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm bg-white border border-[#e5ddd0] text-[#5a5040]">
                  <Clock className="w-4 h-4 text-[#d4a843]" />
                  <span>~5 min. de resposta</span>
                </div>
              </div>
            </m.div>

            <m.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={localInView ? { opacity: 1, x: 0, scale: 1 } : {}}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-2xl overflow-hidden border border-[#d4a843]/15">
                <ImageWithFallback src={shopImage} alt="Foto da loja física Rodando Moto Center" className="w-full h-80 lg:h-96 object-cover" />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={localInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.6 }}
                className="absolute bottom-5 left-5 right-5 p-4 rounded-xl bg-black/85 border border-[#d4a843]/20 backdrop-blur-[12px]"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 flex-shrink-0 text-[#d4a843]" />
                  <div>
                    <p className="text-sm text-[#f0ede8] font-semibold">
                      Av. Brasil, 8708 - Cascavel - PR
                    </p>
                    <p className="text-xs text-[#6b7280]">
                      Segunda a sexta, 08h às 18h
                    </p>
                  </div>
                </div>
              </m.div>
              <div className="absolute -inset-1 rounded-2xl -z-10 blur-xl opacity-20 bg-[linear-gradient(135deg,#d4a843,transparent)]" />
            </m.div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#0d0d14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-3xl overflow-hidden p-10 lg:p-16 text-center bg-[linear-gradient(135deg,rgba(212,168,67,0.12),rgba(212,168,67,0.04),rgba(10,10,15,0.8))] border border-[#d4a843]/20"
          >
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(212,168,67,0.08)_0%,transparent_70%)]" />
            <h2 className="font-['Rajdhani'] text-[clamp(2rem,5vw,3.5rem)] font-bold text-[#f0ede8]">
              Sua moto merece o{' '}
              <span className="bg-gradient-to-br from-[#d4a843] to-[#f0c040] bg-clip-text text-transparent">
                melhor
              </span>
            </h2>
            <p className="mt-3 text-sm text-[#6b7280]">
              Acesse o catálogo e encontre exatamente o que você precisa.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <Link to="/catalog">
                <m.button
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(212,168,67,0.5)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Explorar catálogo
                  <ArrowRight className="w-4 h-4" />
                </m.button>
              </Link>
            </div>
          </m.div>
        </div>
      </section>
    </div>
  )
}
