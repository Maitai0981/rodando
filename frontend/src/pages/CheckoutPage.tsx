import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, ApiError, friendlyError, type CheckoutDeliveryMethod, type PaymentMethod } from '../shared/lib/api'
import { useAuth } from '../shared/context/AuthContext'
import { useCart } from '../shared/context/CartContext'
import { copyTextToClipboard, formatCurrency } from '../shared/lib'
import { CheckCircle } from 'lucide-react'
import { BackButton } from '../shared/ui/primitives/BackButton'

type CheckoutPayment = {
  provider?: string
  status?: string
  externalId?: string
  paymentIntentId?: string
  clientSecret?: string
  checkoutUrl?: string | null
  qrCode?: string | null
  pix?: string | null
  simulated?: boolean
  simulationReason?: string | null
}

export default function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { status, user } = useAuth()
  const { items, total, itemCount, refresh } = useCart()

  const [deliveryMethod, setDeliveryMethod] = useState<CheckoutDeliveryMethod>('pickup')
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [recipientName, setRecipientName] = useState('')
  const [recipientDocument, setRecipientDocument] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card_credit')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [syncingPayment, setSyncingPayment] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [pixFeedback, setPixFeedback] = useState<string | null>(null)
  const [checkoutOrderId, setCheckoutOrderId] = useState<number | null>(null)
  const [checkoutPayment, setCheckoutPayment] = useState<CheckoutPayment | null>(null)
  const [showBackWarning, setShowBackWarning] = useState(false)
  const handledMercadoPagoTokenRef = useRef<string | null>(null)
  const completingMercadoPagoRef = useRef(false)
  const mercadoPagoStatus = searchParams.get('mpStatus') || searchParams.get('status')
  const mercadoPagoToken = searchParams.get('token') || searchParams.get('payment_id') || searchParams.get('collection_id')

  const addressesQuery = useQuery({
    queryKey: ['checkout-addresses'],
    queryFn: () => api.listAddresses(),
    enabled: status === 'authenticated',
  })

  const quoteQuery = useQuery({
    queryKey: ['checkout-quote', deliveryMethod, selectedAddressId, total, itemCount],
    queryFn: () => api.quoteOrder({ deliveryMethod, addressId: selectedAddressId }),
    enabled: status === 'authenticated' && items.length > 0 && (deliveryMethod === 'pickup' || Number.isInteger(selectedAddressId)),
  })

  useEffect(() => {
    if (status === 'anonymous') {
      const returnPath = searchParams.toString() ? `/checkout?${searchParams.toString()}` : '/checkout'
      navigate(`/auth?returnTo=${encodeURIComponent(returnPath)}`, { replace: true })
    }
  }, [navigate, status, searchParams])

  useEffect(() => {
    setRecipientName(user?.name || '')
    setRecipientDocument(user?.document || '')
    setRecipientPhone(user?.phone || '')
  }, [user?.document, user?.name, user?.phone])

  useEffect(() => {
    const addresses = addressesQuery.data?.items ?? []
    if (addresses.length === 0) {
      setSelectedAddressId(null)
      return
    }
    const preferred = addresses.find((address) => address.isDefault) || addresses[0]
    setSelectedAddressId((current) => current || preferred.id)
  }, [addressesQuery.data?.items])

  useEffect(() => {
    if (status !== 'authenticated') return
    const canCompleteFromReturn =
      Boolean(mercadoPagoToken) &&
      mercadoPagoStatus !== 'cancelled' &&
      mercadoPagoStatus !== 'failure'
    if (!canCompleteFromReturn || !mercadoPagoToken || completingMercadoPagoRef.current) return
    if (handledMercadoPagoTokenRef.current === mercadoPagoToken) return

    handledMercadoPagoTokenRef.current = mercadoPagoToken
    completingMercadoPagoRef.current = true
    setError(null)
    setSuccessMessage('Confirmando pagamento Mercado Pago...')

    void (async () => {
      try {
        const result = await api.completeMercadoPagoOrder(mercadoPagoToken)
        setCheckoutOrderId(result.order.id)
        setCheckoutPayment((result.payment || {}) as CheckoutPayment)
        if (result.order.paymentStatus === 'authorized' || result.order.paymentStatus === 'paid') {
          await refresh()
          navigate(`/orders/${result.order.id}`, { replace: true })
        } else {
          setStep(1)
          setSuccessMessage(`Pedido #${result.order.id} ainda esta aguardando confirmacao do pagamento.`)
          setSearchParams({}, { replace: true })
        }
      } catch (err) {
        handledMercadoPagoTokenRef.current = null
        setError(friendlyError(err, 'Falha ao concluir pagamento Mercado Pago.'))
      } finally {
        completingMercadoPagoRef.current = false
      }
    })()
  }, [mercadoPagoStatus, mercadoPagoToken, navigate, refresh, setSearchParams, status])

  useEffect(() => {
    if (mercadoPagoStatus !== 'cancelled') return
    setError('Pagamento Mercado Pago cancelado pelo cliente.')
    setSearchParams({}, { replace: true })
  }, [mercadoPagoStatus, setSearchParams])

  const addresses = addressesQuery.data?.items ?? []
  const shippingCost = Number(quoteQuery.data?.quote?.shippingCost || 0)
  const finalTotal = total + shippingCost
  const pixQrImageSrc = checkoutPayment?.pix
    ? checkoutPayment.pix.startsWith('data:')
      ? checkoutPayment.pix
      : `data:image/png;base64,${checkoutPayment.pix}`
    : null

  const deliveryBlockers = useMemo(() => {
    const missing: string[] = []
    if (items.length === 0) missing.push('Carrinho vazio')
    if (!recipientName.trim()) missing.push('Informar nome do destinatario')
    if (deliveryMethod === 'delivery' && addresses.length === 0) missing.push('Cadastrar endereco para entrega')
    if (deliveryMethod === 'delivery' && !selectedAddressId) missing.push('Selecionar endereco')
    return missing
  }, [addresses.length, deliveryMethod, items.length, recipientName, selectedAddressId])

  const paymentBlockers = useMemo(() => {
    const missing: string[] = []
    if (!paymentMethod) missing.push('Selecionar metodo de pagamento')
    return missing
  }, [paymentMethod])

  async function createCheckout() {
    if (loading || checkoutOrderId) return
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const result = await api.checkoutOrder({
        deliveryMethod,
        addressId: deliveryMethod === 'delivery' ? selectedAddressId : null,
        recipientName,
        recipientDocument,
        recipientPhone,
        paymentMethod,
      })
      setCheckoutOrderId(result.order.id)
      const payment = (result.payment || {}) as CheckoutPayment
      setCheckoutPayment(payment)
      setPixFeedback(null)
      if (!(result.order.paymentStatus === 'authorized' || result.order.paymentStatus === 'paid')) {
        const waitingMessage =
          paymentMethod === 'pix'
            ? `Pedido #${result.order.id} aguardando pagamento via Pix.`
            : `Pedido #${result.order.id} aguardando aprovacao do pagamento com cartao.`
        setSuccessMessage(waitingMessage)
      } else {
        await refresh()
        setStep(2)
        setSuccessMessage(`Pedido #${result.order.id} confirmado com sucesso.`)
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.code) {
        setPendingOrderId(Number(err.code))
      } else {
        setPendingOrderId(null)
      }
      setError(friendlyError(err, 'Falha ao finalizar pedido.'))
    } finally {
      setLoading(false)
    }
  }

  async function cancelPendingAndRetry() {
    if (!pendingOrderId || loading) return
    setLoading(true)
    setError(null)
    try {
      await api.cancelOrder(pendingOrderId)
      setPendingOrderId(null)
      await createCheckout()
    } catch (err) {
      setError(friendlyError(err, 'Falha ao cancelar pedido pendente.'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyPixCode() {
    const pixCode = String(checkoutPayment?.qrCode || '').trim()
    if (!pixCode) return
    try {
      await copyTextToClipboard(pixCode)
      setPixFeedback('Codigo Pix copiado.')
    } catch (err) {
      setPixFeedback(friendlyError(err, 'Nao foi possivel copiar o codigo Pix.'))
    }
  }

  async function handleSyncPayment() {
    if (!checkoutOrderId || syncingPayment) return
    setSyncingPayment(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const result = await api.syncOrderPayment(checkoutOrderId)
      setCheckoutPayment((result.payment || {}) as CheckoutPayment)
      if (result.order.paymentStatus === 'authorized' || result.order.paymentStatus === 'paid') {
        await refresh()
        setStep(2)
        setSuccessMessage(`Pedido #${result.order.id} confirmado com sucesso.`)
      } else {
        setSuccessMessage(`Pedido #${result.order.id} ainda aguarda confirmacao do gateway.`)
      }
    } catch (err) {
      setError(friendlyError(err, 'Nao foi possivel atualizar o status do pagamento.'))
    } finally {
      setSyncingPayment(false)
    }
  }

  const steps = ['Entrega', 'Pagamento', 'Revisao']
  const canAdvanceDelivery = deliveryBlockers.length === 0
  const canAdvancePayment = paymentBlockers.length === 0

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <BackButton
          label="Voltar ao carrinho"
          onClick={step > 0 && !checkoutOrderId ? () => setShowBackWarning(true) : undefined}
        />
        {showBackWarning ? (
          <div className="mb-4 p-3 rounded-lg text-sm bg-amber-500/10 border border-amber-500/20 text-amber-400 flex flex-wrap items-center justify-between gap-3">
            <span>Sair agora vai descartar o progresso do checkout. Deseja continuar?</span>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => { setShowBackWarning(false); navigate(-1) }}
                className="px-3 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-300 font-bold"
              >
                Sim, sair
              </button>
              <button
                onClick={() => setShowBackWarning(false)}
                className="px-3 py-1 rounded-lg text-xs border border-white/[0.12] text-[#f0ede8]"
              >
                Ficar
              </button>
            </div>
          </div>
        ) : null}
        <div className="mb-6">
          <h1 className="text-2xl text-[#f0ede8] font-bold">Checkout</h1>
          <p className="text-sm text-[#6b7280]">Finalize sua compra em etapas rápidas.</p>
        </div>

        <div className="flex items-center gap-1 mb-8">
          {steps.map((label, index) => (
            <div key={label} className="flex items-center gap-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step > index
                      ? 'bg-[#22c55e] text-white'
                      : step === index
                      ? 'bg-gradient-to-br from-[#d4a843] to-[#f0c040] text-black'
                      : 'bg-white/[0.08] text-[#6b7280]'
                  }`}
                >
                  {step > index ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step >= index ? 'text-[#d4a843]' : 'text-[#6b7280]'}`}>{label}</span>
              </div>
              {index < steps.length - 1 ? (
                <div className={`h-px w-8 mx-1 transition-colors duration-300 ${step > index ? 'bg-[#22c55e]' : 'bg-white/[0.1]'}`} />
              ) : null}
            </div>
          ))}
        </div>

        {error ? (
          <div className="mb-4 p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            {error}
            {pendingOrderId ? (
              <button
                onClick={cancelPendingAndRetry}
                disabled={loading}
                className="mt-2 block w-full text-center py-1.5 px-3 rounded bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#f87171] font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Cancelando...' : 'Cancelar pedido pendente e tentar novamente'}
              </button>
            ) : null}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-4 p-3 rounded-lg text-sm bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
            {successMessage}
          </div>
        ) : null}

        {step === 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-sm mb-3 text-[#f0ede8] font-semibold">Entrega</h2>
              <div className="flex gap-2 mb-4">
                {['pickup', 'delivery'].map((method) => (
                  <button
                    type="button"
                    key={method}
                    onClick={() => setDeliveryMethod(method as CheckoutDeliveryMethod)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                      deliveryMethod === method
                        ? 'bg-gradient-to-br from-[#d4a843] to-[#f0c040] text-black'
                        : 'bg-white/[0.05] text-[#9ca3af]'
                    }`}
                  >
                    {method === 'pickup' ? 'Retirada' : 'Entrega'}
                  </button>
                ))}
              </div>

              {deliveryMethod === 'delivery' ? (
                <div className="space-y-3 mb-4">
                  <label htmlFor="checkout-address" className="text-xs uppercase tracking-widest text-[#d4a843]">
                    Endereco
                  </label>
                  <select
                    id="checkout-address"
                    aria-label="Endereco"
                    title="Endereco"
                    value={selectedAddressId ?? ''}
                    onChange={(e) => setSelectedAddressId(Number(e.target.value) || null)}
                    className="w-full py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  >
                    <option value="" className="bg-[#111118]">Selecione</option>
                    {addresses.map((address) => (
                      <option key={address.id} value={address.id} className="bg-[#111118]">
                        {address.label || address.street} - {address.city}
                      </option>
                    ))}
                  </select>
                  {addresses.length === 0 ? (
                    <p className="text-xs text-[#f87171]">Cadastre um endereco no perfil.</p>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'Nome do destinatario', value: recipientName, onChange: setRecipientName },
                  { label: 'Documento', value: recipientDocument, onChange: setRecipientDocument },
                  { label: 'Telefone', value: recipientPhone, onChange: setRecipientPhone },
                ].map((field) => {
                  const fieldId = `checkout-${field.label.toLowerCase().replace(/\s+/g, '-')}`
                  return (
                    <div key={field.label}>
                      <label htmlFor={fieldId} className="text-xs uppercase tracking-widest text-[#d4a843]">
                        {field.label}
                      </label>
                      <input
                        id={fieldId}
                        aria-label={field.label}
                        title={field.label}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-sm mb-3 text-[#f0ede8] font-semibold">Resumo</h2>
              <div className="space-y-2 text-sm text-[#9ca3af]">
                <div className="flex justify-between"><span>Itens</span><span>{itemCount}</span></div>
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
                <div className="flex justify-between"><span>Frete</span><span>{formatCurrency(shippingCost)}</span></div>
                <div className="flex justify-between text-[#d4a843] font-bold"><span>Total</span><span>{formatCurrency(finalTotal)}</span></div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-sm mb-3 text-[#f0ede8] font-semibold">Metodo de pagamento</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { label: 'Cartao', value: 'card_credit' },
                  { label: 'Pix', value: 'pix' },
                ].map((method) => (
                  <button
                    type="button"
                    key={method.value}
                    onClick={() => !checkoutOrderId && setPaymentMethod(method.value as PaymentMethod)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                      paymentMethod === method.value
                        ? 'bg-gradient-to-br from-[#d4a843] to-[#f0c040] text-black'
                        : 'bg-white/[0.05] text-[#9ca3af]'
                    } ${checkoutOrderId && paymentMethod !== method.value ? 'opacity-50' : ''}`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
              <p className="mb-4 text-xs text-[#6b7280]">
                {paymentMethod === 'pix'
                  ? 'O Pix gera QR Code e codigo copiavel. O pedido so avanca quando o pagamento for confirmado pelo gateway.'
                  : 'O pagamento com cartao sera finalizado no checkout hospedado do Mercado Pago. Cartoes seguem as configuracoes habilitadas na sua conta.'}
              </p>

              {!checkoutOrderId ? (
                <>
                  <button
                    type="button"
                    onClick={() => void createCheckout()}
                    className={`w-full py-3 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${loading || !canAdvancePayment ? 'opacity-60' : ''}`}
                    disabled={loading || !canAdvancePayment}
                  >
                    {loading ? 'Gerando pagamento...' : 'Gerar pagamento'}
                  </button>
                  {paymentBlockers.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {paymentBlockers.map((msg) => (
                        <li key={msg} className="text-xs text-[#f87171]">• {msg}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}

              {checkoutOrderId && checkoutPayment ? (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm mb-2 text-[#f0ede8] font-semibold">
                    {paymentMethod === 'pix' ? 'Pix gerado' : 'Checkout Mercado Pago gerado'}
                  </h3>
                  <div className="rounded-xl border border-[#d4a843]/20 bg-[#d4a843]/10 p-3 text-xs text-[#d4a843]">
                    {paymentMethod === 'pix'
                      ? 'O pedido fica pendente ate o Pix ser pago e confirmado pelo gateway.'
                      : 'O pagamento sera finalizado em uma nova aba do Mercado Pago. Apos concluir, o status sera confirmado automaticamente. Se nao redirecionar, clique em Atualizar status.'}
                  </div>
                  {checkoutPayment.simulated ? (
                    <div className="rounded-xl border border-[#38bdf8]/20 bg-[#38bdf8]/10 p-3 text-xs text-[#7dd3fc]">
                      Pix em modo de desenvolvimento. Esse QR nao liquida no gateway real.
                    </div>
                  ) : null}
                  {paymentMethod === 'pix' ? (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                      <div className="flex flex-col items-center gap-4">
                        {pixQrImageSrc ? (
                          <img
                            src={pixQrImageSrc}
                            alt="QR Code Pix do pedido"
                            className="h-52 w-52 rounded-xl border border-white/[0.08] bg-white p-3 object-contain"
                          />
                        ) : (
                          <div className="flex h-52 w-52 items-center justify-center rounded-xl border border-dashed border-white/[0.12] text-center text-xs text-[#6b7280]">
                            QR Code indisponivel neste momento.
                          </div>
                        )}
                        <div className="w-full space-y-2">
                          <p className="text-xs uppercase tracking-widest text-[#d4a843]">Codigo Pix</p>
                          <div className="rounded-xl border border-white/[0.08] bg-[#0f1118] p-3 text-xs leading-relaxed text-[#f0ede8] break-all">
                            {checkoutPayment.qrCode || 'Codigo Pix indisponivel.'}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void handleCopyPixCode()}
                              disabled={!checkoutPayment.qrCode}
                              className="px-3 py-2 rounded-lg text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold disabled:opacity-60"
                            >
                              Copiar codigo Pix
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSyncPayment()}
                              disabled={syncingPayment}
                              className="px-3 py-2 rounded-lg text-xs border border-white/[0.12] text-[#f0ede8] disabled:opacity-60"
                            >
                              {syncingPayment ? 'Atualizando...' : 'Atualizar status'}
                            </button>
                            {checkoutPayment.checkoutUrl ? (
                              <a
                                href={checkoutPayment.checkoutUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-2 rounded-lg text-xs border border-[#d4a843]/40 text-[#d4a843]"
                              >
                                Abrir no gateway
                              </a>
                            ) : null}
                          </div>
                          {pixFeedback ? <p className="text-xs text-[#22c55e]">{pixFeedback}</p> : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/orders/${checkoutOrderId}`}
                      className="px-3 py-2 rounded-lg text-xs border border-[#d4a843]/40 text-[#d4a843]"
                    >
                      Ver pedido pendente
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleSyncPayment()}
                      disabled={syncingPayment}
                      className="px-3 py-2 rounded-lg text-xs border border-white/[0.12] text-[#f0ede8] disabled:opacity-60"
                    >
                      {syncingPayment ? 'Atualizando...' : 'Atualizar status'}
                    </button>
                    {paymentMethod !== 'pix' && checkoutPayment.checkoutUrl ? (
                      <a
                        href={checkoutPayment.checkoutUrl}
                        {...(import.meta.env.VITE_MOCK_PAYMENT_PROVIDERS !== '1' && { target: '_blank', rel: 'noreferrer' })}
                        className="px-3 py-2 rounded-lg text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                      >
                        Ir para o Mercado Pago
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-sm mb-3 text-[#f0ede8] font-semibold">Resumo</h2>
              <div className="space-y-2 text-sm text-[#9ca3af]">
                <div className="flex justify-between"><span>Itens</span><span>{itemCount}</span></div>
                <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(total)}</span></div>
                <div className="flex justify-between"><span>Frete</span><span>{formatCurrency(shippingCost)}</span></div>
                <div className="flex justify-between text-[#d4a843] font-bold"><span>Total</span><span>{formatCurrency(finalTotal)}</span></div>
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h2 className="text-lg mb-2 text-[#f0ede8] font-bold">Pedido confirmado</h2>
            <p className="text-sm text-[#6b7280]">Pagamento confirmado. Acompanhe os detalhes na sua area de pedidos.</p>
            <div className="mt-4 flex gap-2">
              <Link to={checkoutOrderId ? `/orders/${checkoutOrderId}` : '/orders'} className="px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold">
                Ver pedido
              </Link>
              <Link to="/catalog" className="px-4 py-2 rounded-xl text-sm border border-[#d4a843]/40 text-[#d4a843]">
                Voltar ao catalogo
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="px-3 py-2 rounded-xl text-sm border border-[#d4a843]/40 text-[#d4a843]"
            >
              Voltar
            </button>
          ) : (
            <div />
          )}
          {step === 0 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${canAdvanceDelivery ? '' : 'opacity-60'}`}
              disabled={!canAdvanceDelivery}
            >
              Continuar
            </button>
          ) : null}
          {step === 1 && checkoutOrderId ? (
            <span className="text-xs text-[#6b7280]">
              {paymentMethod === 'pix'
                ? 'Aguardando a confirmacao do Pix. Se voce ja pagou, use Atualizar status.'
                : 'Aguardando aprovacao do Mercado Pago. Se o retorno automatico falhar, use Atualizar status.'}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
