import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Phone,
  Plus,
  ShoppingCart,
  Tag,
  Trash2,
  Truck,
  Package,
  Shield,
  Zap,
} from 'lucide-react'
import { useCart } from '../shared/context/CartContext'
import { useAuth } from '../shared/context/AuthContext'
import { api, ApiError, type CheckoutDeliveryMethod } from '../shared/lib/api'
import { formatCurrency } from '../shared/lib'
import { ImageWithFallback } from '../shared/common/ImageWithFallback'

const partsImage =
  'https://images.unsplash.com/photo-1675247911627-0fb610250598?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxtb3RvcmN5Y2xlJTIwZW5naW5lJTIwcGFydHMlMjBjbG9zZSUyMHVwJTIwbHV4dXJ5fGVufDF8fHx8MTc3MzA2OTA0OHww&ixlib=rb-4.1.0&q=80&w=1080'

export default function CartPage() {
  const navigate = useNavigate()
  const { status } = useAuth()
  const { items, itemCount, total, updateQty, removeItem, clear, loading } = useCart()
  const [deliveryMethod, setDeliveryMethod] = useState<CheckoutDeliveryMethod>('pickup')
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [coupon, setCoupon] = useState('')
  const [removing, setRemoving] = useState<number | null>(null)
  const [stockWarning, setStockWarning] = useState<number | null>(null)
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stockWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current)
      if (stockWarningTimerRef.current) clearTimeout(stockWarningTimerRef.current)
    }
  }, [])

  const addressesQuery = useQuery({
    queryKey: ['cart-addresses'],
    queryFn: () => api.listAddresses(),
    enabled: status === 'authenticated' && items.length > 0,
  })

  const addresses = useMemo(() => addressesQuery.data?.items ?? [], [addressesQuery.data?.items])

  useEffect(() => {
    if (addresses.length === 0) {
      setSelectedAddressId(null)
      return
    }
    const preferred = addresses.find((address) => address.isDefault) || addresses[0]
    setSelectedAddressId((current) => current || preferred.id)
  }, [addresses])

  const quoteQuery = useQuery({
    queryKey: ['cart-shipping-quote', deliveryMethod, selectedAddressId, itemCount, total],
    queryFn: () => api.quoteOrder({ deliveryMethod, addressId: selectedAddressId }),
    enabled:
      status === 'authenticated' &&
      items.length > 0 &&
      deliveryMethod === 'delivery' &&
      Number.isInteger(selectedAddressId),
  })

  const subtotal = total
  const discount = 0
  const shipping = useMemo(() => {
    if (items.length === 0) return 0
    if (deliveryMethod === 'pickup') return 0
    if (quoteQuery.data?.quote) return Number(quoteQuery.data.quote.shippingCost || 0)
    return null
  }, [deliveryMethod, items.length, quoteQuery.data?.quote])
  const finalTotal = subtotal - discount + (shipping ?? 0)
  const shippingMessage = useMemo(() => {
    if (deliveryMethod === 'pickup') {
      return 'Retirada na loja sem custo de frete.'
    }
    if (status !== 'authenticated') {
      return 'Faça login para calcular o frete de entrega com o seu endereço.'
    }
    if (addresses.length === 0) {
      return 'Cadastre um endereço na sua conta para calcular o frete.'
    }
    if (quoteQuery.isLoading) {
      return 'Calculando frete...'
    }
    if (quoteQuery.error instanceof ApiError) {
      return quoteQuery.error.message
    }
    if (quoteQuery.data?.quote) {
      const quote = quoteQuery.data.quote
      if (quote.freeShippingApplied) {
        return `Frete grátis. Entrega estimada em ${quote.etaDays ?? 1} dia(s).`
      }
      return `Entrega estimada em ${quote.etaDays ?? 1} dia(s) para ${Number(quote.distanceKm || 0).toFixed(1)} km.`
    }
    return 'Selecione um endereço para calcular o frete.'
  }, [addresses.length, deliveryMethod, quoteQuery.data?.quote, quoteQuery.error, quoteQuery.isLoading, status])

  const handleUpdateQty = async (productId: number, quantity: number) => {
    const { truncated } = await updateQty(productId, quantity)
    if (truncated) {
      setStockWarning(productId)
      if (stockWarningTimerRef.current) clearTimeout(stockWarningTimerRef.current)
      stockWarningTimerRef.current = setTimeout(() => {
        setStockWarning(null)
        stockWarningTimerRef.current = null
      }, 3000)
    }
  }

  const canCheckout = items.length > 0 && !loading

  const handleRemove = (id: number) => {
    setRemoving(id)
    if (removeTimerRef.current) clearTimeout(removeTimerRef.current)
    removeTimerRef.current = setTimeout(() => {
      void removeItem(id)
      setRemoving(null)
      removeTimerRef.current = null
    }, 300)
  }

  const goToCheckout = () => {
    if (!canCheckout) return
    if (status !== 'authenticated') {
      navigate('/auth?returnTo=/checkout')
      return
    }
    navigate('/checkout')
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-10">
          <div className="flex items-center gap-2 text-xs mb-4 text-[#4b5563]">
            <Link to="/" className="hover:text-amber-400 transition-colors">Início</Link>
            <span>/</span>
            <span className="text-[#d4a843]">Carrinho</span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px w-8 bg-[#d4a843]" />
            <span className="text-xs tracking-widest uppercase text-[#d4a843] font-semibold">Mochila</span>
          </div>
          <h1 className="font-['Rajdhani'] text-[clamp(2rem,5vw,3rem)] font-bold text-[#f0ede8] leading-[1.1]">
            Itens{' '}
            <span className="bg-gradient-to-br from-[#d4a843] to-[#f0c040] bg-clip-text text-transparent">
              selecionados
            </span>
          </h1>
          <p className="mt-2 text-sm text-[#6b7280]">{status === 'authenticated' ? 'Sincronizada com sua conta.' : 'Local neste navegador.'}</p>
        </m.div>

        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center justify-between mb-6">
          <Link to="/catalog">
            <m.button
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-white/[0.04] border border-white/[0.08] text-[#a0a0a0] font-medium"
              whileHover={{ scale: 1.03, color: '#f0ede8' }}
              whileTap={{ scale: 0.97 }}
            >
              <ArrowLeft className="w-4 h-4" />
              Continuar comprando
            </m.button>
          </Link>
          {items.length > 0 ? (
            <m.button
              onClick={() => void clear()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm bg-[#ef4444]/[0.08] border border-[#ef4444]/[0.15] text-[#f87171] font-medium"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar
            </m.button>
          ) : null}
        </m.div>

        {items.length === 0 ? (
          <m.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="flex flex-col lg:flex-row gap-6">
            <m.div className="flex-1 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white/[0.02] border border-white/[0.06]">
              <m.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-[#d4a843]/[0.08] border border-[#d4a843]/[0.15]"
              >
                <ShoppingCart className="w-9 h-9 text-[#d4a843]" />
              </m.div>
              <h3 className="mb-2 text-[#f0ede8] font-semibold text-[1.1rem]">Sua mochila está vazia</h3>
              <p className="text-sm mb-8 text-[#6b7280] max-w-[280px]">Adicione produtos para iniciar o checkout.</p>
              <Link to="/catalog">
                <m.button
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                  whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(212,168,67,0.4)' }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Zap className="w-4 h-4" />
                  Ir para o catálogo
                </m.button>
              </Link>
            </m.div>

            <div className="lg:w-80 xl:w-96">
              <div className="rounded-2xl p-6 bg-white/[0.02] border border-white/[0.06]">
                <h2 className="mb-5 text-[#f0ede8] font-semibold">Resumo</h2>
                <div className="space-y-3 mb-5">
                  {[['Itens', '0'], ['Subtotal', 'R$ 0,00']].map(([label, value]) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-[#6b7280]">{label}</span>
                      <span className="text-[#9ca3af]">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 mb-5 border-t border-white/[0.06]">
                  <div className="flex justify-between">
                    <span className="text-sm text-[#f0ede8] font-semibold">Total</span>
                    <span className="text-[#d4a843] font-bold text-[1.2rem]">R$ 0,00</span>
                  </div>
                </div>
                <button disabled className="w-full py-3.5 rounded-xl text-sm text-black opacity-40 cursor-not-allowed bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold">
                  Finalizar pedido
                </button>
              </div>
            </div>
          </m.div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-3">
              <AnimatePresence>
                {items.map((item, i) => (
                  <m.div
                    key={item.productId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: removing === item.productId ? 0 : 1, x: removing === item.productId ? -40 : 0 }}
                    exit={{ opacity: 0, x: -40, height: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-2xl group bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white/[0.04]">
                      <ImageWithFallback src={item.imageUrl || partsImage} alt={item.name} className="w-full h-full object-cover opacity-60" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs mb-0.5 text-[#d4a843]">{item.manufacturer} · {item.category}</p>
                      <p className="text-sm mb-1 truncate text-[#f0ede8] font-semibold">{item.name}</p>
                      <p className="text-base text-[#d4a843] font-bold">
                        {formatCurrency(Number(item.price) * Number(item.quantity))}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1 rounded-xl overflow-hidden bg-white/[0.05] border border-white/[0.08]">
                        <m.button
                          aria-label="Diminuir quantidade"
                          onClick={() => Number(item.quantity) > 1 ? void handleUpdateQty(item.productId, Number(item.quantity) - 1) : handleRemove(item.productId)}
                          className="w-8 h-8 flex items-center justify-center text-[#6b7280]"
                          whileHover={{ color: '#d4a843', background: 'rgba(212,168,67,0.1)' }}
                          whileTap={{ scale: 0.85 }}
                        >
                          <Minus className="w-3 h-3" />
                        </m.button>
                        <span className="w-6 text-center text-sm text-[#f0ede8] font-semibold">
                          {item.quantity}
                        </span>
                        <m.button
                          aria-label="Aumentar quantidade"
                          onClick={() => void handleUpdateQty(item.productId, Number(item.quantity) + 1)}
                          className="w-8 h-8 flex items-center justify-center text-[#6b7280]"
                          whileHover={{ color: '#d4a843', background: 'rgba(212,168,67,0.1)' }}
                          whileTap={{ scale: 0.85 }}
                        >
                          <Plus className="w-3 h-3" />
                        </m.button>
                      </div>
                      {stockWarning === item.productId && (
                        <span className="text-xs text-amber-400">Estoque máximo atingido</span>
                      )}

                      <m.button
                        aria-label="Remover item"
                        onClick={() => handleRemove(item.productId)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#ef4444]/10 text-[#f87171]"
                        whileHover={{ scale: 1.1, background: 'rgba(239,68,68,0.2)' }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </m.button>
                    </div>
                  </m.div>
                ))}
              </AnimatePresence>

              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { icon: Shield, label: 'Compra segura' },
                  { icon: Truck, label: 'Entrega rápida' },
                  { icon: Package, label: 'Retirada no balcão' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-2 p-3 rounded-xl text-center bg-white/[0.02] border border-white/[0.05]">
                    <Icon className="w-4 h-4 text-[#d4a843]" />
                    <span className="text-xs text-[#6b7280]">{label}</span>
                  </div>
                ))}
              </m.div>
            </div>

            <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="lg:w-80 xl:w-96 space-y-4">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="w-4 h-4 text-[#d4a843]" />
                  <span className="text-sm text-[#f0ede8] font-semibold">Entrega e frete</span>
                </div>

                <div className="flex gap-2 mb-4">
                  {[
                    { label: 'Retirada', value: 'pickup' },
                    { label: 'Entrega', value: 'delivery' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setDeliveryMethod(option.value as CheckoutDeliveryMethod)}
                      className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                        deliveryMethod === option.value
                          ? 'bg-gradient-to-br from-[#d4a843] to-[#f0c040] text-black'
                          : 'bg-white/[0.04] border border-white/[0.08] text-[#9ca3af]'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {deliveryMethod === 'delivery' ? (
                  <div className="space-y-3">
                    {status === 'authenticated' && addresses.length > 0 ? (
                      <div>
                        <label htmlFor="cart-address" className="text-xs uppercase tracking-widest text-[#d4a843]">
                          Endereço
                        </label>
                        <select
                          id="cart-address"
                          value={selectedAddressId ?? ''}
                          onChange={(event) => setSelectedAddressId(Number(event.target.value) || null)}
                          className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.04] border border-white/[0.08] text-[#f0ede8]"
                        >
                          <option value="" className="bg-[#111118]">Selecione</option>
                          {addresses.map((address) => (
                            <option key={address.id} value={address.id} className="bg-[#111118]">
                              {address.label || address.street} - {address.city}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <p className="text-xs text-[#6b7280]">{shippingMessage}</p>
                  </div>
                ) : (
                  <p className="text-xs text-[#6b7280]">{shippingMessage}</p>
                )}
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] opacity-50">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-[#d4a843]" />
                  <span className="text-sm text-[#f0ede8] font-semibold">Cupom de desconto</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Em breve"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    disabled
                    className="flex-1 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.04] border border-white/[0.08] text-[#f0ede8] cursor-not-allowed"
                  />
                  <button
                    disabled
                    className="px-4 py-2.5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold cursor-not-allowed"
                  >
                    OK
                  </button>
                </div>
                <p className="text-xs mt-2 text-[#4b5563]">Cupons disponíveis em breve.</p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <h2 className="mb-5 pb-3 text-[#f0ede8] font-semibold border-b border-white/[0.06]">
                  Resumo do pedido
                </h2>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b7280]">Itens ({itemCount})</span>
                    <span className="text-[#9ca3af]">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#22c55e]">Desconto (10%)</span>
                      <span className="text-[#22c55e]">-{formatCurrency(discount)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b7280]">Frete</span>
                    <span className={shipping === 0 ? 'text-[#22c55e]' : 'text-[#9ca3af]'}>
                      {shipping === null ? 'Calcular no endereço' : shipping === 0 ? 'Grátis' : formatCurrency(shipping)}
                    </span>
                  </div>
                  <p className="text-xs text-[#4b5563]">{shippingMessage}</p>
                </div>

                <div className="pt-4 pb-5 border-t border-white/[0.06]">
                  <div className="flex justify-between items-end">
                    <span className="text-[#f0ede8] font-semibold">{shipping === null ? 'Total parcial' : 'Total'}</span>
                    <div className="text-right">
                      <p className="text-[#d4a843] font-bold text-[1.4rem] leading-none">
                        {formatCurrency(finalTotal)}
                      </p>
                      <p className="text-xs mt-0.5 text-[#4b5563]">em até 12x no cartão</p>
                    </div>
                  </div>
                </div>

                <m.button
                  onClick={goToCheckout}
                  className={`w-full py-3.5 rounded-xl text-sm text-black flex items-center justify-center gap-2 bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${canCheckout ? '' : 'opacity-50'}`}
                  whileHover={canCheckout ? { scale: 1.03, boxShadow: '0 0 30px rgba(212,168,67,0.5)' } : {}}
                  whileTap={canCheckout ? { scale: 0.97 } : {}}
                  disabled={!canCheckout}
                >
                  Finalizar pedido
                  <ArrowRight className="w-4 h-4" />
                </m.button>

                <m.a
                  href="https://wa.me/5545999634779"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-3 py-3 rounded-xl text-sm flex items-center justify-center gap-2 bg-white/[0.04] border border-white/[0.08] text-[#9ca3af] font-medium"
                  whileHover={{ color: '#f0ede8', background: 'rgba(255,255,255,0.07)' }}
                >
                  <Phone className="w-4 h-4 text-[#d4a843]" />
                  Pedir via WhatsApp
                </m.a>
              </div>
            </m.div>
          </div>
        )}
      </div>
    </div>
  )
}

