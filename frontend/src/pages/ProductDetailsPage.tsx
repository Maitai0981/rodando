import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, m } from 'framer-motion'
import { ChevronLeft, ChevronRight, Minus, Package, Plus, Share2, ShoppingCart, Star, Truck } from 'lucide-react'
import { api, ApiError, buildProductUrl, parseProductRouteId } from '../shared/lib/api'
import { useCart } from '../shared/context/CartContext'
import { useAuth } from '../shared/context/AuthContext'
import { ImageWithFallback } from '../shared/common/ImageWithFallback'
import { copyTextToClipboard, formatCurrency } from '../shared/lib'
import { getRecentlyViewed, trackView } from '../shared/hooks/useRecentlyViewed'

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-5 h-5' : 'w-3.5 h-3.5'
  return (
    <div role="img" className="flex gap-0.5" aria-label={`Nota ${rating.toFixed(1)} de 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sz} ${i < Math.round(rating) ? 'text-[#d4a843] fill-[#d4a843]' : 'text-[#374151]'}`}
        />
      ))}
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8 animate-pulse">
      <div className="space-y-3">
        <div className="rounded-2xl bg-white/[0.04] aspect-square" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="w-16 h-16 rounded-xl bg-white/[0.04]" />)}
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="h-6 w-24 rounded-full bg-white/[0.04]" />
          <div className="h-6 w-16 rounded-full bg-white/[0.04]" />
        </div>
        <div className="h-9 w-3/4 rounded-lg bg-white/[0.04]" />
        <div className="h-4 w-1/2 rounded-lg bg-white/[0.04]" />
        <div className="h-4 w-full rounded-lg bg-white/[0.04]" />
        <div className="h-4 w-5/6 rounded-lg bg-white/[0.04]" />
        <div className="h-10 w-1/3 rounded-lg bg-white/[0.04] mt-2" />
        <div className="h-px bg-white/[0.06]" />
        <div className="h-11 rounded-xl bg-white/[0.04]" />
        <div className="h-12 rounded-xl bg-white/[0.04]" />
        <div className="h-12 rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  )
}

export default function ProductDetailsPage() {
  const { idSlug = '' } = useParams()
  const navigate = useNavigate()
  const { addProduct } = useCart()
  const { status } = useAuth()
  const queryClient = useQueryClient()

  const parsed = useMemo(() => parseProductRouteId(idSlug), [idSlug])
  const [quantity, setQuantity] = useState(1)
  const [fitment, setFitment] = useState('')
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [shareCopied, setShareCopied] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
  const [activeTab, setActiveTab] = useState<'reviews' | 'related' | 'recent'>('reviews')
  const shareCopiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (shareCopiedTimerRef.current) clearTimeout(shareCopiedTimerRef.current)
    }
  }, [])

  const detailsQuery = useQuery({
    queryKey: ['product-details', parsed.id],
    enabled: Number.isInteger(parsed.id) && Number(parsed.id) > 0,
    queryFn: () => api.getPublicProduct(Number(parsed.id)),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const details = detailsQuery.data
  const item = details?.item

  const galleryImages = useMemo(() => {
    if (!details) return []
    const imgs: string[] = []
    if (details.gallery.mainUrl) imgs.push(details.gallery.mainUrl)
    const hoverUrl = (details.gallery as { mainUrl: string; hoverUrl?: string; extra?: string[] }).hoverUrl
    if (hoverUrl && hoverUrl !== details.gallery.mainUrl) imgs.push(hoverUrl)
    const extra = (details.gallery as { mainUrl: string; hoverUrl?: string; extra?: string[] }).extra ?? []
    for (const url of extra) {
      if (url && !imgs.includes(url)) imgs.push(url)
    }
    if (imgs.length === 0 && item?.imageUrl) imgs.push(item.imageUrl)
    return imgs
  }, [details, item?.imageUrl])

  const activeImageUrl = galleryImages[activeImageIndex] || item?.imageUrl || ''

  const safeFitmentOptions = useMemo(() => {
    const options = details?.compatibility?.fitments ?? []
    return options.length > 0 ? options : [{ label: 'Aplicação padrão', value: 'default' }]
  }, [details?.compatibility?.fitments])

  useEffect(() => {
    if (!item) return
    const canonical = buildProductUrl(item)
    if (canonical !== `/produto/${idSlug}`) {
      navigate(canonical, { replace: true })
    }
  }, [idSlug, item, navigate])

  useEffect(() => {
    if (!safeFitmentOptions.length) return
    setFitment((current) => current || safeFitmentOptions[0].value)
  }, [safeFitmentOptions])

  useEffect(() => {
    if (!item) return
    trackView({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.imageUrl,
      manufacturer: item.manufacturer,
      category: item.category,
      seoSlug: item.seoSlug,
      stock: item.stock,
      compareAtPrice: item.compareAtPrice,
    })
    setActiveImageIndex(0)
  }, [item])

  const recentlyViewed = useMemo(
    () => getRecentlyViewed().filter((p) => p.id !== item?.id).slice(0, 4),
    [item?.id],
  )

  const relatedQuery = useQuery({
    queryKey: ['product-related', item?.id, item?.category],
    enabled: Boolean(item?.id),
    queryFn: async () => {
      try {
        const result = await api.listPublicProducts({
          category: item?.category || undefined,
          sort: 'best-sellers',
          page: 1,
          pageSize: 4,
        })
        return result.items.filter((p) => Number(p.id) !== Number(item?.id)).slice(0, 3)
      } catch {
        return []
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const commentsQuery = useQuery({
    queryKey: ['product-comments', item?.id],
    enabled: Boolean(item?.id),
    queryFn: () => api.listComments({ productId: Number(item?.id), limit: 10 }),
    staleTime: 30_000,
  })

  const reviewMutation = useMutation({
    mutationFn: (payload: { productId: number; rating: number; message: string }) =>
      api.createComment(payload),
    onSuccess: () => {
      setReviewText('')
      setReviewRating(5)
      setReviewSubmitted(true)
      void queryClient.invalidateQueries({ queryKey: ['product-comments', item?.id] })
    },
  })

  async function handleAddToCart() {
    if (!item) return
    await addProduct(item, quantity)
  }

  async function handleShare() {
    await copyTextToClipboard(window.location.href)
    setShareCopied(true)
    if (shareCopiedTimerRef.current) clearTimeout(shareCopiedTimerRef.current)
    shareCopiedTimerRef.current = setTimeout(() => {
      setShareCopied(false)
      shareCopiedTimerRef.current = null
    }, 2000)
  }

  async function handleBuyNow() {
    if (!item) return
    await addProduct(item, quantity)
    if (status !== 'authenticated') {
      navigate('/auth?returnTo=/checkout')
      return
    }
    navigate('/checkout')
  }

  const inStock = Number(item?.stock || 0) > 0
  const lowStock = inStock && Number(item?.stock) <= 5
  const reviewCount = commentsQuery.data?.items?.length ?? details?.socialProof.totalReviews ?? 0

  if (!Number.isInteger(parsed.id) || Number(parsed.id) <= 0) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-[#f0ede8]">
            Produto inválido.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-28 lg:pb-16 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-6 text-[#4b5563]" aria-label="Navegação">
          <Link to="/" className="hover:text-amber-400 transition-colors">Início</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-amber-400 transition-colors">Catálogo</Link>
          <span>/</span>
          <span className="text-[#d4a843] truncate max-w-[240px]">{item?.name ?? 'Produto'}</span>
        </nav>

        {detailsQuery.error instanceof ApiError ? (
          <div className="p-4 rounded-xl mb-6 bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            {detailsQuery.error.message}
          </div>
        ) : null}

        {detailsQuery.isLoading || !item || !details ? (
          <ProductSkeleton />
        ) : (
          <m.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-8"
          >
            {/* ── Gallery ── */}
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] group">
                <ImageWithFallback
                  src={activeImageUrl}
                  alt={item.name}
                  className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="eager"
                />
                {galleryImages.length > 1 ? (
                  <>
                    <button
                      type="button"
                      aria-label="Imagem anterior"
                      onClick={() => setActiveImageIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Próxima imagem"
                      onClick={() => setActiveImageIndex((i) => (i + 1) % galleryImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {galleryImages.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          aria-label={`Ver imagem ${i + 1}`}
                          onClick={() => setActiveImageIndex(i)}
                          className={`rounded-full transition-all ${i === activeImageIndex ? 'w-4 h-1.5 bg-[#d4a843]' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>

              {galleryImages.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {galleryImages.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Ver imagem ${i + 1}`}
                      onClick={() => setActiveImageIndex(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                        i === activeImageIndex
                          ? 'border-[#d4a843]'
                          : 'border-white/[0.08] hover:border-white/20'
                      }`}
                    >
                      <ImageWithFallback src={url} alt={`${item.name} — foto ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Package className="w-4 h-4 text-[#d4a843] flex-shrink-0" />
                  <span className="text-xs text-[#9ca3af]">Retirada na loja disponível</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <Truck className="w-4 h-4 text-[#d4a843] flex-shrink-0" />
                  <span className="text-xs text-[#9ca3af]">Entrega via transportadora</span>
                </div>
              </div>
            </div>

            {/* ── Info panel ── */}
            <div className="space-y-5">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {item.category ? (
                  <span className="px-2.5 py-1 rounded-full text-xs bg-[#d4a843]/[0.12] border border-[#d4a843]/20 text-[#d4a843]">
                    {item.category}
                  </span>
                ) : null}
                {details.pricing.discountPercent > 0 ? (
                  <span className="px-2.5 py-1 rounded-full text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold">
                    {details.pricing.discountPercent}% OFF
                  </span>
                ) : null}
                {lowStock ? (
                  <span
                    data-testid="low-stock-badge"
                    className="px-2.5 py-1 rounded-full text-xs bg-amber-500/[0.15] border border-amber-500/30 text-amber-400"
                  >
                    Últimas {item.stock} unidades
                  </span>
                ) : null}
                {!inStock ? (
                  <span className="px-2.5 py-1 rounded-full text-xs bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
                    Indisponível
                  </span>
                ) : null}
              </div>

              {/* Name + manufacturer */}
              <div>
                <h1 className="text-2xl sm:text-3xl text-[#f0ede8] font-bold leading-tight">
                  {item.name}
                </h1>
                <p className="text-sm mt-1 text-[#6b7280]">
                  {item.manufacturer}{details.compatibility.bikeModel ? ` · ${details.compatibility.bikeModel}` : ''}
                </p>
              </div>

              {/* Rating */}
              {details.socialProof.totalReviews > 0 ? (
                <div className="flex items-center gap-2">
                  <StarRating rating={details.socialProof.averageRating} />
                  <span className="text-sm text-[#d4a843] font-semibold">{details.socialProof.averageRating.toFixed(1)}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reviews')}
                    className="text-xs text-[#6b7280] hover:text-[#d4a843] transition-colors"
                  >
                    ({details.socialProof.totalReviews} avaliação{details.socialProof.totalReviews !== 1 ? 'ões' : ''})
                  </button>
                </div>
              ) : null}

              {/* Description */}
              {item.description ? (
                <p className="text-sm text-[#9ca3af] leading-relaxed">{item.description}</p>
              ) : null}

              {/* Price */}
              <div className="flex items-end gap-3">
                <p className="text-3xl text-[#d4a843] font-bold leading-none">
                  {formatCurrency(Number(details.pricing.price))}
                </p>
                {details.pricing.compareAtPrice ? (
                  <p className="text-sm line-through text-[#374151] mb-0.5">
                    {formatCurrency(Number(details.pricing.compareAtPrice))}
                  </p>
                ) : null}
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Fitment */}
              <div>
                <label htmlFor="product-fitment" className="text-xs uppercase tracking-widest text-[#d4a843] block mb-2">
                  Compatibilidade
                </label>
                <select
                  id="product-fitment"
                  aria-label="Compatibilidade"
                  value={fitment}
                  onChange={(e) => setFitment(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                >
                  {safeFitmentOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#111118]">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#d4a843]">Quantidade</span>
                  {inStock ? (
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      {lowStock ? `Apenas ${item.stock} em estoque` : `${item.stock} em estoque`}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 bg-white/[0.04] rounded-xl border border-white/[0.08] px-2">
                  <button
                    type="button"
                    aria-label="Diminuir quantidade"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-8 h-10 flex items-center justify-center text-[#d4a843] disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-[#f0ede8] font-semibold">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Aumentar quantidade"
                    onClick={() => setQuantity((q) => Math.min(Number(item.stock || 0), q + 1))}
                    disabled={!inStock || quantity >= Number(item.stock)}
                    className="w-8 h-10 flex items-center justify-center text-[#d4a843] disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* CTAs */}
              <div className="space-y-2.5">
                <button
                  onClick={() => void handleAddToCart()}
                  disabled={!inStock}
                  className="w-full py-3.5 rounded-xl text-sm text-black flex items-center justify-center gap-2 bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold transition-opacity disabled:opacity-40"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {inStock ? 'Adicionar ao carrinho' : 'Sem estoque'}
                </button>
                <button
                  onClick={() => void handleBuyNow()}
                  disabled={!inStock}
                  className="w-full py-3 rounded-xl text-sm border border-[#d4a843]/40 text-[#d4a843] hover:bg-[#d4a843]/5 transition-colors disabled:opacity-40"
                >
                  Comprar agora
                </button>
              </div>

              <button
                type="button"
                data-testid="share-button"
                onClick={() => void handleShare()}
                className="flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#d4a843] transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                {shareCopied ? (
                  <span data-testid="share-copied-feedback">Link copiado!</span>
                ) : 'Compartilhar produto'}
              </button>

              <div className="h-px bg-white/[0.06]" />

              {/* Spec grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'SKU', value: item.sku },
                  { label: 'Categoria', value: item.category },
                  { label: 'Fabricante', value: item.manufacturer },
                  { label: 'Modelo', value: details.compatibility.bikeModel || undefined },
                ].filter((s) => s.value).map((spec) => (
                  <div key={spec.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <p className="text-xs text-[#6b7280] mb-0.5">{spec.label}</p>
                    <p className="text-xs text-[#f0ede8] font-semibold truncate">{spec.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </m.div>
        )}

        {/* ── Tabs section ── */}
        {item ? (
          <div className="mt-12">
            <div className="flex gap-1 border-b border-white/[0.08] mb-6 overflow-x-auto">
              {(
                [
                  { key: 'reviews' as const, label: `Avaliações${reviewCount > 0 ? ` (${reviewCount})` : ''}` },
                  { key: 'related' as const, label: 'Relacionados' },
                  ...(recentlyViewed.length > 0
                    ? [{ key: 'recent' as const, label: 'Vistos recentemente' }]
                    : []),
                ]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${
                    activeTab === tab.key
                      ? 'border-[#d4a843] text-[#d4a843]'
                      : 'border-transparent text-[#6b7280] hover:text-[#9ca3af]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'reviews' ? (
                <m.div
                  key="reviews"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {commentsQuery.data?.items && commentsQuery.data.items.length > 0 ? (
                    <div className="space-y-3 mb-8">
                      {commentsQuery.data.items.map((comment) => (
                        <div key={comment.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                            <span className="text-sm text-[#f0ede8] font-semibold">{comment.authorName}</span>
                            <div className="flex items-center gap-1.5">
                              <StarRating rating={comment.rating} />
                              <span className="text-xs text-[#6b7280]">{comment.rating}/5</span>
                            </div>
                          </div>
                          <p className="text-sm text-[#9ca3af]">{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : commentsQuery.isSuccess ? (
                    <p className="text-sm text-[#6b7280] mb-8">Nenhuma avaliação ainda. Seja o primeiro!</p>
                  ) : null}

                  {status === 'authenticated' ? (
                    reviewSubmitted ? (
                      <div className="p-4 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-sm">
                        Obrigado por avaliar!
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                        <h2 className="text-sm text-[#f0ede8] font-semibold mb-3">Deixe sua avaliação</h2>
                        <div className="flex gap-1 mb-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              aria-label={`Nota ${i + 1}`}
                              onClick={() => setReviewRating(i + 1)}
                              className="focus:outline-none"
                            >
                              <Star
                                className={`w-6 h-6 transition-colors ${i < reviewRating ? 'text-[#d4a843] fill-[#d4a843]' : 'text-[#374151] hover:text-[#d4a843]/50'}`}
                              />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder="Conte sua experiência com o produto..."
                          rows={3}
                          className="w-full py-2.5 px-3 rounded-xl text-sm outline-none resize-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] placeholder:text-[#4b5563]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!item || !reviewText.trim()) return
                            reviewMutation.mutate({ productId: item.id, rating: reviewRating, message: reviewText.trim() })
                          }}
                          disabled={reviewMutation.isPending || !reviewText.trim()}
                          className="mt-3 px-5 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold disabled:opacity-50"
                        >
                          {reviewMutation.isPending ? 'Enviando...' : 'Enviar avaliação'}
                        </button>
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-[#6b7280]">
                      <Link to="/auth" className="text-[#d4a843] hover:underline">Faça login</Link> para deixar uma avaliação.
                    </p>
                  )}
                </m.div>
              ) : activeTab === 'related' ? (
                <m.div
                  key="related"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {relatedQuery.data && relatedQuery.data.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {relatedQuery.data.map((related) => (
                        <div
                          key={related.id}
                          className="group rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-[#d4a843]/30 transition-colors"
                        >
                          <div className="relative h-44 overflow-hidden">
                            <ImageWithFallback
                              src={related.imageUrl}
                              alt={related.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f]/60 to-transparent" />
                          </div>
                          <div className="p-4">
                            <p className="text-xs text-[#d4a843] mb-1">{related.manufacturer}</p>
                            <h3 className="text-sm text-[#f0ede8] font-semibold leading-snug mb-3">{related.name}</h3>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-[#d4a843] font-bold">{formatCurrency(Number(related.price || 0))}</span>
                              <div className="flex gap-2">
                                <Link
                                  to={buildProductUrl(related)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs border border-white/[0.1] text-[#f0ede8] hover:border-[#d4a843]/40 transition-colors"
                                >
                                  Ver
                                </Link>
                                <button
                                  onClick={() => void addProduct(related, 1)}
                                  className="px-2.5 py-1.5 rounded-lg text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                                >
                                  + Carrinho
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[#6b7280]">Nenhum produto relacionado encontrado.</p>
                  )}
                </m.div>
              ) : activeTab === 'recent' ? (
                <m.div
                  key="recent"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  data-testid="recently-viewed-section"
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {recentlyViewed.map((p) => (
                      <Link
                        key={p.id}
                        to={buildProductUrl(p)}
                        className="group p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#d4a843]/30 transition-colors"
                      >
                        <div className="overflow-hidden rounded-xl mb-3 h-32">
                          <ImageWithFallback
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                        <h3 className="text-xs text-[#f0ede8] font-semibold leading-snug">{p.name}</h3>
                        <p className="text-xs mt-1 text-[#d4a843] font-bold">{formatCurrency(Number(p.price))}</p>
                      </Link>
                    ))}
                  </div>
                </m.div>
              ) : null}
            </AnimatePresence>
          </div>
        ) : null}

        {/* Back link */}
        <div className="mt-10">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#d4a843] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar ao catálogo
          </Link>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {item && inStock ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t border-white/[0.08] bg-[#0a0a0f]/95 backdrop-blur-sm px-4 py-3">
          <button
            aria-label="Compra rápida"
            onClick={() => void handleAddToCart()}
            className="w-full py-3 rounded-xl text-sm text-black flex items-center justify-center gap-2 bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
          >
            <ShoppingCart className="w-4 h-4" />
            Adicionar ao carrinho
          </button>
        </div>
      ) : null}
    </div>
  )
}
