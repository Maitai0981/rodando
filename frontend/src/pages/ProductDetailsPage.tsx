import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Minus, Plus, Share2, ShoppingCart, Star } from 'lucide-react'
import { api, ApiError, buildProductUrl, parseProductRouteId } from '../shared/lib/api'
import { useCart } from '../shared/context/CartContext'
import { useAuth } from '../shared/context/AuthContext'
import { ImageWithFallback } from '../shared/common/ImageWithFallback'
import { copyTextToClipboard, formatCurrency } from '../shared/lib'
import { getRecentlyViewed, trackView } from '../shared/hooks/useRecentlyViewed'

const productMediaBackdropUrl =
  'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?auto=format&fit=crop&w=1400&q=80'

export default function ProductDetailsPage() {
  const { idSlug = '' } = useParams()
  const navigate = useNavigate()
  const { addProduct } = useCart()
  const { status } = useAuth()
  const queryClient = useQueryClient()

  const parsed = useMemo(() => parseProductRouteId(idSlug), [idSlug])
  const [quantity, setQuantity] = useState(1)
  const [fitment, setFitment] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewSubmitted, setReviewSubmitted] = useState(false)
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
    retry: false,
  })

  const details = detailsQuery.data
  const item = details?.item

  const safeFitmentOptions = useMemo(() => {
    const options = details?.compatibility?.fitments ?? []
    return options.length > 0 ? options : [{ label: 'Aplicacao padrao', value: 'default' }]
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
        return result.items.filter((product) => Number(product.id) !== Number(item?.id)).slice(0, 3)
      } catch {
        return []
      }
    },
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
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs mb-6 text-[#4b5563]">
          <Link to="/" className="hover:text-amber-400 transition-colors">Início</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-amber-400 transition-colors">Catálogo</Link>
          <span>/</span>
          <span className="text-[#d4a843]">Produto</span>
        </div>

        {detailsQuery.error instanceof ApiError ? (
          <div className="p-4 rounded-xl mb-6 bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            {detailsQuery.error.message}
          </div>
        ) : null}

        {detailsQuery.isLoading || !item || !details ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 rounded-2xl bg-white/[0.04]" />
            <div className="h-96 rounded-2xl bg-white/[0.04]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06]">
              <div className="absolute inset-0 opacity-20">
                <ImageWithFallback src={productMediaBackdropUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="relative z-10 p-4">
                <ImageWithFallback src={details.gallery.mainUrl || item.imageUrl} alt={item.name} className="w-full h-96 object-cover rounded-xl" />
              </div>
            </div>

            <div className="rounded-2xl p-6 bg-white/[0.03] border border-white/[0.06]">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 rounded-full text-xs bg-[#d4a843]/[0.12] text-[#d4a843]">
                  {item.category}
                </span>
                {details.pricing.discountPercent > 0 ? (
                  <span className="px-2 py-1 rounded-full text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040]">
                    {details.pricing.discountPercent}% OFF
                  </span>
                ) : null}
                {Number(item.stock) > 0 && Number(item.stock) <= 5 ? (
                  <span
                    data-testid="low-stock-badge"
                    className="px-2 py-1 rounded-full text-xs bg-amber-500/[0.15] border border-amber-500/30 text-amber-400"
                  >
                    Últimas {item.stock} unidades
                  </span>
                ) : null}
              </div>

              <h1 className="text-2xl sm:text-3xl mb-2 text-[#f0ede8] font-bold">
                {item.name}
              </h1>
              <p className="text-sm mb-4 text-[#6b7280]">
                {item.manufacturer} · {details.compatibility.bikeModel}
              </p>
              <p className="text-sm mb-4 text-[#9ca3af]">{item.description}</p>

              <div className="flex items-center gap-3 mb-4">
                <p className="text-2xl text-[#d4a843] font-bold">{formatCurrency(Number(details.pricing.price))}</p>
                {details.pricing.compareAtPrice ? (
                  <p className="text-sm line-through text-[#4b5563]">{formatCurrency(Number(details.pricing.compareAtPrice))}</p>
                ) : null}
              </div>

              <div className="mb-4">
                <label htmlFor="product-fitment" className="text-xs uppercase tracking-widest text-[#d4a843]">
                  Compatibilidade
                </label>
                <select
                  id="product-fitment"
                  aria-label="Compatibilidade"
                  title="Compatibilidade"
                  value={fitment}
                  onChange={(e) => setFitment(e.target.value)}
                  className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                >
                  {safeFitmentOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#111118]">{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between mb-6">
                <span className="text-sm text-[#6b7280]">Quantidade</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Diminuir quantidade"
                    title="Diminuir quantidade"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.06] text-[#d4a843]"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-[#f0ede8]">{quantity}</span>
                  <button
                    type="button"
                    aria-label="Aumentar quantidade"
                    title="Aumentar quantidade"
                    onClick={() => setQuantity((q) => Math.min(Number(item.stock || 0), q + 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/[0.06] text-[#d4a843]"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => void handleAddToCart()}
                  className={`flex-1 min-w-[180px] px-5 py-3 rounded-xl text-sm text-black flex items-center justify-center gap-2 bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${Number(item.stock) > 0 ? '' : 'opacity-50'}`}
                  disabled={Number(item.stock) <= 0}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Adicionar ao carrinho
                </button>
                <button
                  onClick={() => void handleBuyNow()}
                  className="flex-1 min-w-[180px] px-5 py-3 rounded-xl text-sm border border-[#d4a843]/40 text-[#d4a843]"
                >
                  Comprar agora
                </button>
              </div>
              <button
                type="button"
                data-testid="share-button"
                onClick={() => void handleShare()}
                className="mt-2 flex items-center gap-1.5 text-xs text-[#6b7280] hover:text-[#d4a843] transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                {shareCopied ? (
                  <span data-testid="share-copied-feedback">Link copiado!</span>
                ) : 'Compartilhar'}
              </button>

              <div className="mt-6 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-[#d4a843]" />
                  <span className="text-sm text-[#f0ede8] font-semibold">Confianca de compra</span>
                </div>
                <p className="text-xs text-[#9ca3af]">
                  Avaliacao media {details.socialProof.averageRating.toFixed(1)} com {details.socialProof.totalReviews} comentario(s).
                </p>
                <p className="text-xs mt-2 text-[#6b7280]">SKU: {item.sku}</p>
              </div>
            </div>
          </div>
        )}

        {relatedQuery.data && relatedQuery.data.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-xl mb-4 text-[#f0ede8] font-bold">Relacionados</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedQuery.data.map((related) => (
                <div key={related.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                  <ImageWithFallback src={related.imageUrl} alt={related.name} className="w-full h-40 object-cover rounded-xl mb-3" />
                  <h3 className="text-sm mb-1 text-[#f0ede8] font-semibold">{related.name}</h3>
                  <p className="text-xs mb-3 text-[#6b7280]">{related.manufacturer}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#d4a843] font-bold">{formatCurrency(Number(related.price || 0))}</span>
                    <button
                      onClick={() => void addProduct(related, 1)}
                      className="px-3 py-1.5 rounded-lg text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {item ? (
          <div className="mt-12" id="avaliacoes">
            <h2 className="text-xl mb-6 text-[#f0ede8] font-bold">Avaliações</h2>

            {commentsQuery.data?.items && commentsQuery.data.items.length > 0 ? (
              <div className="space-y-4 mb-8">
                {commentsQuery.data.items.map((comment) => (
                  <div key={comment.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-[#f0ede8] font-semibold">{comment.authorName}</span>
                      <div className="flex gap-0.5" aria-label={`Nota ${comment.rating} de 5`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < comment.rating ? 'text-[#d4a843] fill-[#d4a843]' : 'text-[#374151]'}`}
                          />
                        ))}
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
                <div className="p-4 rounded-xl bg-[#d4a843]/10 border border-[#d4a843]/20 text-[#d4a843] text-sm">
                  Obrigado por avaliar!
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <h3 className="text-sm text-[#f0ede8] font-semibold mb-3">Deixe sua avaliação</h3>
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
                          className={`w-6 h-6 ${i < reviewRating ? 'text-[#d4a843] fill-[#d4a843]' : 'text-[#374151]'}`}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Conte sua experiência com o produto..."
                    rows={3}
                    className="w-full py-2.5 px-3 rounded-xl text-sm outline-none resize-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
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
          </div>
        ) : null}

        {recentlyViewed.length > 0 ? (
          <div className="mt-12" data-testid="recently-viewed-section">
            <h2 className="text-xl mb-4 text-[#f0ede8] font-bold">Vistos recentemente</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentlyViewed.map((p) => (
                <Link
                  key={p.id}
                  to={buildProductUrl(p)}
                  className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#d4a843]/30 transition-colors"
                >
                  <ImageWithFallback src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover rounded-xl mb-3" />
                  <h3 className="text-xs text-[#f0ede8] font-semibold leading-snug">{p.name}</h3>
                  <p className="text-xs mt-1 text-[#d4a843] font-bold">{formatCurrency(Number(p.price))}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8">
          <Link to="/catalog" className="inline-flex items-center gap-2 text-sm text-[#d4a843]">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao catálogo
          </Link>
        </div>
      </div>
    </div>
  )
}
