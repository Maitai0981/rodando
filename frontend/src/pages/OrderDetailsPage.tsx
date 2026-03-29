import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, friendlyError } from '../shared/lib/api'
import { useAuth } from '../shared/context/AuthContext'
import { useAssist } from '../shared/context/AssistContext'
import { copyTextToClipboard, formatCurrency } from '../shared/lib'

const ORDER_STATUS_LABEL: Record<string, string> = {
  created: 'Criado',
  confirmed: 'Confirmado',
  processing: 'Em processamento',
  paid: 'Pago',
  shipped: 'Enviado',
  delivered: 'Entregue',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando',
  requires_action: 'Ação necessária',
  authorized: 'Autorizado',
  paid: 'Pago',
  rejected: 'Rejeitado',
  expired: 'Expirado',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
}

const DELIVERY_METHOD_LABEL: Record<string, string> = {
  pickup: 'Retirada',
  delivery: 'Entrega',
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card_credit: 'Cartão de crédito',
  card_debit: 'Cartão de débito',
  pix: 'Pix',
}

export default function OrderDetailsPage() {
  const { status } = useAuth()
  const { completeStep } = useAssist()
  const params = useParams()
  const queryClient = useQueryClient()
  const id = Number(params.id)
  const isValidId = Number.isInteger(id) && id > 0
  const [cancelFeedback, setCancelFeedback] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [syncingPayment, setSyncingPayment] = useState(false)
  const [pixFeedback, setPixFeedback] = useState<string | null>(null)
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const orderQuery = useQuery({
    queryKey: ['order-details', id],
    queryFn: () => api.getOrder(id),
    enabled: status === 'authenticated' && isValidId,
  })

  const order = orderQuery.data?.item

  useEffect(() => {
    if (order?.events?.length) {
      completeStep('timeline-viewed', 'order-details')
    }
  }, [completeStep, order?.events?.length])

  async function handleCopyPixCode() {
    const pixCode = String(order?.payment?.qrCode || '').trim()
    if (!pixCode) return
    try {
      await copyTextToClipboard(pixCode)
      setPixFeedback('Codigo Pix copiado.')
    } catch (err) {
      setPixFeedback(friendlyError(err, 'Nao foi possivel copiar o codigo Pix.'))
    }
  }

  function canCancelOrder() {
    if (!order) return false
    return order.status === 'created' && ['pending', 'requires_action', 'rejected', 'expired'].includes(String(order.paymentStatus || 'pending'))
  }

  async function handleCancelOrder() {
    if (!order || cancelling) return
    setCancelling(true)
    setCancelFeedback(null)
    setCancelError(null)
    try {
      await api.cancelOrder(order.id)
      await Promise.all([
        orderQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ['orders-list'] }),
        queryClient.invalidateQueries({ queryKey: ['bag'] }),
      ])
      setCancelFeedback(`Pedido #${order.id} cancelado.`)
    } catch (err) {
      setCancelError(friendlyError(err, 'Nao foi possivel cancelar o pedido.'))
    } finally {
      setCancelling(false)
    }
  }

  async function handleSyncPayment() {
    if (!order || syncingPayment) return
    setSyncingPayment(true)
    setPaymentFeedback(null)
    setPaymentError(null)
    try {
      const result = await api.syncOrderPayment(order.id)
      await Promise.all([
        orderQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ['orders-list'] }),
        queryClient.invalidateQueries({ queryKey: ['bag'] }),
      ])
      if (result.order.paymentStatus === 'authorized' || result.order.paymentStatus === 'paid') {
        setPaymentFeedback(`Pagamento do pedido #${order.id} confirmado.`)
      } else {
        setPaymentFeedback(`Pagamento do pedido #${order.id} ainda aguarda confirmacao do gateway.`)
      }
    } catch (err) {
      setPaymentError(friendlyError(err, 'Nao foi possivel atualizar o status do pagamento.'))
    } finally {
      setSyncingPayment(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#9ca3af]">
            Carregando...
          </div>
        </div>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <h1 className="text-2xl mb-2 text-[#f0ede8] font-bold">Detalhe do pedido</h1>
            <p className="text-sm mb-4 text-[#6b7280]">Faça login para visualizar este pedido.</p>
            <Link to={`/auth?returnTo=/orders/${id}`} className="inline-flex px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!isValidId) {
    return (
      <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-4 rounded-xl bg-[#d4a843]/[0.08] border border-[#d4a843]/20 text-[#d4a843]">
            Pedido inválido.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 bg-[#0a0a0f]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl text-[#f0ede8] font-bold">Pedido #{id}</h1>
          <Link to="/orders" className="px-3 py-1.5 rounded-lg text-xs border border-[#d4a843]/40 text-[#d4a843]">
            Voltar
          </Link>
        </div>

        {orderQuery.isLoading ? (
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[#9ca3af]">
            Carregando pedido...
          </div>
        ) : null}

        {orderQuery.isError ? (
          <div className="p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            Não foi possível carregar os detalhes do pedido.
          </div>
        ) : null}
        {cancelFeedback ? (
          <div className="mb-4 p-4 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
            {cancelFeedback}
          </div>
        ) : null}
        {cancelError ? (
          <div className="mb-4 p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            {cancelError}
          </div>
        ) : null}
        {paymentFeedback ? (
          <div className="mb-4 p-4 rounded-xl bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
            {paymentFeedback}
          </div>
        ) : null}
        {paymentError ? (
          <div className="mb-4 p-4 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            {paymentError}
          </div>
        ) : null}

        {order ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-sm mb-2 text-[#f0ede8] font-semibold">Resumo</h2>
              <div className="space-y-1 text-sm text-[#9ca3af]">
                <p>Status: <strong className="text-[#f0ede8]">{ORDER_STATUS_LABEL[order.status] ?? order.status}</strong></p>
                <p>Pagamento: <strong className="text-[#f0ede8]">{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</strong>{order.paymentMethod ? ` • ${PAYMENT_METHOD_LABEL[order.paymentMethod] ?? order.paymentMethod}` : ''}</p>
                <p>Entrega: <strong className="text-[#f0ede8]">{DELIVERY_METHOD_LABEL[order.deliveryMethod] ?? order.deliveryMethod}</strong> • ETA: <strong className="text-[#f0ede8]">{order.etaDays ?? 1} dia(s)</strong></p>
                <p>Subtotal: {formatCurrency(order.subtotal)}</p>
                <p>Frete: {formatCurrency(order.shipping)}</p>
                <p className="text-[#d4a843] font-bold">Total: {formatCurrency(order.total)}</p>
              </div>
              {canCancelOrder() ? (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => void handleCancelOrder()}
                    disabled={cancelling}
                    className="px-3 py-2 rounded-lg text-xs border border-[#ef4444]/40 text-[#f87171] disabled:opacity-60"
                  >
                    {cancelling ? 'Cancelando...' : 'Cancelar pedido'}
                  </button>
                </div>
              ) : null}
            </div>

            {order.payment?.provider === 'mercado_pago' && order.payment && (order.paymentStatus === 'pending' || order.paymentStatus === 'requires_action') ? (
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                <h2 className="text-sm mb-2 text-[#f0ede8] font-semibold">
                  {order.paymentMethod === 'pix' ? 'Pagamento via Pix' : 'Pagamento via Mercado Pago'}
                </h2>
                {order.paymentMethod === 'pix' ? (
                  <>
                    <p className="text-xs text-[#9ca3af]">
                      O pedido permanece pendente ate a confirmacao do Pix.
                    </p>
                    {order.payment.simulated ? (
                      <div className="mt-3 rounded-xl border border-[#38bdf8]/20 bg-[#38bdf8]/10 p-3 text-xs text-[#7dd3fc]">
                        Pix em modo de desenvolvimento. Esse QR nao liquida no gateway real.
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start">
                      {order.payment.pix ? (
                        <img
                          src={order.payment.pix.startsWith('data:') ? order.payment.pix : `data:image/png;base64,${order.payment.pix}`}
                          alt="QR Code Pix do pedido"
                          className="w-full max-w-[176px] aspect-square rounded-xl border border-white/[0.08] bg-white p-3 object-contain"
                        />
                      ) : null}
                      <div className="flex-1 space-y-2">
                        <p className="text-xs uppercase tracking-widest text-[#d4a843]">Codigo Pix</p>
                        <div className="rounded-xl border border-white/[0.08] bg-[#0f1118] p-3 text-xs leading-relaxed text-[#f0ede8] break-all">
                          {order.payment.qrCode || 'Codigo Pix indisponivel.'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCopyPixCode()}
                            disabled={!order.payment.qrCode}
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
                          {order.payment.checkoutUrl ? (
                            <a
                              href={order.payment.checkoutUrl}
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
                  </>
                ) : (
                  <>
                    <p className="text-xs text-[#9ca3af]">
                      O pedido permanece pendente ate a aprovacao no checkout do Mercado Pago.
                    </p>
                    {order.payment.checkoutUrl ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <a
                          href={order.payment.checkoutUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex px-3 py-2 rounded-lg text-xs text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold"
                        >
                          Continuar no Mercado Pago
                        </a>
                        <button
                          type="button"
                          onClick={() => void handleSyncPayment()}
                          disabled={syncingPayment}
                          className="px-3 py-2 rounded-lg text-xs border border-white/[0.12] text-[#f0ede8] disabled:opacity-60"
                        >
                          {syncingPayment ? 'Atualizando...' : 'Atualizar status'}
                        </button>
                      </div>
                    ) : null}
                    <p className="text-xs mt-2 text-[#6b7280]">
                      Se o retorno automatico falhar no ambiente local, use Atualizar status depois de pagar.
                    </p>
                  </>
                )}
              </div>
            ) : null}

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-sm mb-2 text-[#f0ede8] font-semibold">Itens</h2>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={`${item.orderId}-${item.productId}`} className="flex justify-between items-center text-sm">
                    <span className="text-[#9ca3af]">{item.name} • {item.quantity}x</span>
                    <span className="text-[#f0ede8] font-semibold">{formatCurrency(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <h2 className="text-sm mb-2 text-[#f0ede8] font-semibold">Timeline</h2>
              <div className="space-y-3">
                {order.events.map((event) => (
                  <div key={event.id} className="text-sm">
                    <p className="text-[#f0ede8] font-semibold">{event.title}</p>
                    <p className="text-xs text-[#6b7280]">{new Date(event.createdAt).toLocaleString('pt-BR')} • {PAYMENT_STATUS_LABEL[event.status] ?? ORDER_STATUS_LABEL[event.status] ?? event.status}</p>
                    <p className="text-xs text-[#9ca3af]">{event.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
