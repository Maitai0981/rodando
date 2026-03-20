import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import OwnerLayout from '../shared/layout/OwnerLayout'
import { api, ApiError, type OwnerOfferItem, type Product } from '../shared/lib/api'
import { useAssist } from '../shared/context/AssistContext'
import { AssistHintInline } from '../features/assist'

const OWNER_PAGE_SIZE = 10

type StatusFilter = 'all' | 'active' | 'inactive' | 'pending-image' | 'critical-stock'

export default function OwnerProductsPage() {
  const { completeStep } = useAssist()
  const location = useLocation()
  const [rows, setRows] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [offersByProductId, setOffersByProductId] = useState<Map<number, OwnerOfferItem>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>((location.state as { toast?: string } | null)?.toast ?? null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleteModeLoading, setDeleteModeLoading] = useState<'archive' | 'hard' | null>(null)

  const loadProducts = useCallback(async (search: string) => {
    setLoading(true)
    setError(null)
    try {
      const [productsResult, offersResult] = await Promise.all([
        api.listOwnerProducts(search),
        api.listOwnerOffers(),
      ])
      const offersMap = new Map<number, OwnerOfferItem>()
      for (const offer of offersResult.items) offersMap.set(Number(offer.productId), offer)
      startTransition(() => {
        setRows(productsResult.items)
        setOffersByProductId(offersMap)
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar produtos.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProducts(deferredQuery)
    }, 220)
    return () => window.clearTimeout(timeoutId)
  }, [deferredQuery, loadProducts])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, deferredQuery])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  async function handleDeleteConfirm(mode: 'archive' | 'hard') {
    if (!deleteTarget) return
    setDeleteModeLoading(mode)
    try {
      await api.deleteProduct(deleteTarget.id, mode)
      if (mode === 'hard') {
        startTransition(() => setRows((prev) => prev.filter((row) => row.id !== deleteTarget.id)))
        setToast('Produto excluido com sucesso.')
      } else {
        await loadProducts(query)
        setToast('Produto arquivado com sucesso.')
      }
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao excluir produto.')
    } finally {
      setDeleteModeLoading(null)
    }
  }

  async function handleCreateOffer(product: Product) {
    const compareAtPrompt = window.prompt(
      `Preco comparativo para ${product.name} (atual: ${Number(product.price).toFixed(2)}):`,
      Number(product.price * 1.15).toFixed(2),
    )
    if (compareAtPrompt === null) return
    const compareAtPrice = Number(compareAtPrompt.replace(',', '.'))
    if (!Number.isFinite(compareAtPrice) || compareAtPrice <= Number(product.price)) {
      setError('Preco comparativo precisa ser maior que o preco do produto.')
      return
    }

    const badge = String(window.prompt('Badge da oferta:', 'Oferta') ?? '').trim()
    if (!badge) return
    const description = String(window.prompt('Descricao curta da oferta:', 'Condicao especial por tempo limitado.') ?? '').trim()

    try {
      await api.createOwnerOffer({
        productId: product.id,
        badge,
        description,
        compareAtPrice,
        isActive: true,
      })
      await loadProducts(query)
      setToast('Oferta criada com sucesso.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao criar oferta.')
    }
  }

  async function handleEditOffer(product: Product, offer: OwnerOfferItem) {
    const compareAtPrompt = window.prompt(
      `Atualizar preco comparativo para ${product.name}:`,
      Number(offer.compareAtPrice).toFixed(2),
    )
    if (compareAtPrompt === null) return
    const compareAtPrice = Number(compareAtPrompt.replace(',', '.'))
    if (!Number.isFinite(compareAtPrice) || compareAtPrice <= Number(product.price)) {
      setError('Preco comparativo precisa ser maior que o preco do produto.')
      return
    }

    const badge = String(window.prompt('Badge da oferta:', offer.badge) ?? '').trim()
    if (!badge) return
    const description = String(window.prompt('Descricao da oferta:', offer.description || '') ?? '').trim()
    const shouldActivate = window.confirm('Manter oferta ativa? Clique em OK para ativa ou Cancelar para inativa.')

    try {
      await api.updateOwnerOffer(offer.id, {
        productId: product.id,
        badge,
        description,
        compareAtPrice,
        isActive: shouldActivate,
        startsAt: offer.startsAt || null,
        endsAt: offer.endsAt || null,
      })
      await loadProducts(query)
      setToast('Oferta atualizada com sucesso.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao atualizar oferta.')
    }
  }

  async function handleDeleteOffer(offer: OwnerOfferItem) {
    const confirmed = window.confirm(`Remover a oferta do produto ${offer.productName}?`)
    if (!confirmed) return
    try {
      await api.deleteOwnerOffer(offer.id)
      await loadProducts(query)
      setToast('Oferta removida com sucesso.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao remover oferta.')
    }
  }

  const pendingImageRows = useMemo(
    () => rows.filter((row) => Boolean(row.isActive) && String(row.imageUrl || '').trim().length === 0),
    [rows],
  )

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const isActive = Boolean(row.isActive)
      const hasImage = String(row.imageUrl || '').trim().length > 0
      const stock = Number(row.stock)
      switch (statusFilter) {
        case 'active':
          return isActive
        case 'inactive':
          return !isActive
        case 'pending-image':
          return isActive && !hasImage
        case 'critical-stock':
          return stock <= 5
        case 'all':
        default:
          return true
      }
    })
  }, [rows, statusFilter])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / OWNER_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pagedRows = filteredRows.slice((safePage - 1) * OWNER_PAGE_SIZE, safePage * OWNER_PAGE_SIZE)

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl text-[#f0ede8] font-bold">Produtos</h1>
            <p className="text-sm text-[#9ca3af]">
              Gestao operacional de cadastro, vitrine e ofertas.
            </p>
          </div>
          <Link
            to="/owner/products/new"
            className="h-11 px-5 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold inline-flex items-center"
            onClick={() => completeStep('open-create', 'owner-products')}
          >
            Novo produto
          </Link>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
          <AssistHintInline tipId="owner-products-tip-image" routeKey="owner-products">
            Dica: para publicar na vitrine, mantenha produto ativo com imagem principal valida.
          </AssistHintInline>
          <span>Produtos ativos com imagem valida aparecem no catalogo publico.</span>
        </div>

        {pendingImageRows.length > 0 ? (
          <div className="p-3 rounded-xl text-sm bg-[#eab308]/[0.12] border border-[#eab308]/20 text-[#facc15]">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <p>
                {pendingImageRows.length} produto(s) ativos sem imagem de vitrine. Eles ficam ocultos no catalogo publico.
              </p>
              <Link
                to={`/owner/products/${pendingImageRows[0].id}/edit`}
                className="h-9 px-3 rounded-full text-xs border border-[#eab308]/40 text-[#facc15] inline-flex items-center"
              >
                Corrigir agora
              </Link>
            </div>
          </div>
        ) : null}

        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3 items-end">
            <div className="space-y-1">
              <label htmlFor="owner-products-search" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Busca
              </label>
              <input
                id="owner-products-search"
                data-testid="owner-products-search-input"
                placeholder="Buscar por nome, SKU, fabricante ou categoria"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void loadProducts(query)
                  }
                }}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="owner-products-status" className="text-[11px] uppercase tracking-widest text-[#f0c040]">
                Status
              </label>
              <select
                id="owner-products-status"
                data-testid="owner-products-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className="w-full h-11 px-3 rounded-xl text-sm outline-none bg-white/[0.06] border border-white/[0.12] text-[#f0ede8]"
              >
                <option value="all" className="bg-[#111118]">Todos os status</option>
                <option value="active" className="bg-[#111118]">Ativos</option>
                <option value="inactive" className="bg-[#111118]">Inativos</option>
                <option value="pending-image" className="bg-[#111118]">Ativos sem imagem</option>
                <option value="critical-stock" className="bg-[#111118]">Estoque critico ({'<='} 5)</option>
              </select>
            </div>
            <button
              data-testid="owner-products-search-button"
              onClick={() => void loadProducts(query)}
              className="h-11 px-4 rounded-xl text-sm border border-[#d4a843]/40 text-[#d4a843]"
            >
              Buscar
            </button>
          </div>
        </div>

        {error ? (
          <div className="p-3 rounded-xl text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            {error}
          </div>
        ) : null}

        <div className="rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.08]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-[#9ca3af]">
              <thead className="bg-white/[0.05]">
                <tr className="text-left text-[#a1a1aa]">
                  <th className="py-3 px-3">Produto</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">Categoria</th>
                  <th className="py-3 px-3">Preco</th>
                  <th className="py-3 px-3">Estoque</th>
                  <th className="py-3 px-3">Vitrine</th>
                  <th className="py-3 px-3">Oferta</th>
                  <th className="py-3 px-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-4 px-3 text-[#9ca3af]">Carregando produtos...</td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 px-3 text-[#9ca3af]">Nenhum produto encontrado.</td>
                  </tr>
                ) : (
                  pagedRows.map((item, index) => {
                    const offer = offersByProductId.get(item.id)
                    const hasImage = String(item.imageUrl || '').trim().length > 0
                    const stock = Number(item.stock)
                    const stockCritical = stock <= 5
                    const isInactive = !item.isActive

                    return (
                      <tr
                        key={item.id}
                        className={`border-t border-white/[0.06] ${index % 2 === 1 ? 'bg-white/[0.01]' : ''} hover:bg-white/[0.03]`}
                      >
                        <td className="py-3 px-3">
                          <div className="text-sm text-[#f0ede8] font-semibold">{item.name}</div>
                          <div className="text-xs text-[#6b7280]">{item.manufacturer} • {item.bikeModel}</div>
                        </td>
                        <td className="py-3 px-3">{item.sku}</td>
                        <td className="py-3 px-3">{item.category}</td>
                        <td className="py-3 px-3">R$ {Number(item.price).toFixed(2)}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${stockCritical ? 'bg-[#ef4444]/15 border border-[#ef4444]/30 text-[#f87171]' : 'bg-white/[0.06] border border-white/[0.08] text-[#cbd5f5]'}`}
                          >
                            {stock}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              isInactive
                                ? 'bg-white/[0.06] border border-white/[0.1] text-[#cbd5f5]'
                                : hasImage
                                  ? 'bg-[#22c55e]/15 border border-[#22c55e]/25 text-[#22c55e]'
                                  : 'bg-[#eab308]/15 border border-[#eab308]/25 text-[#facc15]'
                            }`}
                          >
                            {!item.isActive ? 'Inativo' : hasImage ? 'Publicado' : 'Sem imagem'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {offer ? (
                            <div className="space-y-0.5">
                              <div className="text-xs text-[#f0ede8] font-bold">{offer.badge}</div>
                              <div className="text-xs text-[#6b7280]">
                                R$ {Number(offer.compareAtPrice).toFixed(2)} • {offer.isActive ? 'Ativa' : 'Inativa'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#6b7280]">Sem oferta</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              data-testid={`owner-edit-${item.id}`}
                              to={`/owner/products/${item.id}/edit`}
                              className="h-8 px-3 rounded-full text-[11px] border border-white/[0.12] text-[#e5e7eb] inline-flex items-center"
                            >
                              Editar
                            </Link>
                            <button
                              data-testid={`owner-delete-${item.id}`}
                              onClick={() => setDeleteTarget(item)}
                              className="h-8 px-3 rounded-full text-[11px] border border-[#ef4444]/40 text-[#f87171]"
                            >
                              Excluir
                            </button>
                            {offer ? (
                              <>
                                <button
                                  data-testid={`owner-offer-edit-${item.id}`}
                                  onClick={() => void handleEditOffer(item, offer)}
                                  className="h-8 px-3 rounded-full text-[11px] border border-[#d4a843]/40 text-[#d4a843]"
                                >
                                  Oferta
                                </button>
                                <button
                                  data-testid={`owner-offer-remove-${item.id}`}
                                  onClick={() => void handleDeleteOffer(offer)}
                                  className="h-8 px-3 rounded-full text-[11px] border border-[#facc15]/40 text-[#facc15]"
                                >
                                  Remover
                                </button>
                              </>
                            ) : (
                              <button
                                data-testid={`owner-offer-create-${item.id}`}
                                onClick={() => void handleCreateOffer(item)}
                                className="h-8 px-3 rounded-full text-[11px] border border-[#22c55e]/40 text-[#22c55e]"
                              >
                                Criar oferta
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {filteredRows.length > OWNER_PAGE_SIZE ? (
          <div data-testid="owner-products-pagination" className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1}
              className="w-9 h-9 rounded-xl text-xs disabled:opacity-40 border border-white/[0.1] text-[#e5e7eb]"
            >
              {'<'}
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => (
              <button
                key={value}
                onClick={() => setPage(value)}
                className={`w-9 h-9 rounded-xl text-xs ${safePage === value ? 'bg-gradient-to-br from-[#d4a843] to-[#f0c040] text-black font-bold' : 'border border-white/[0.1] text-[#e5e7eb] font-medium'}`}
              >
                {value}
              </button>
            ))}
            <button
              onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
              disabled={safePage === pageCount}
              className="w-9 h-9 rounded-xl text-xs disabled:opacity-40 border border-white/[0.1] text-[#e5e7eb]"
            >
              {'>'}
            </button>
          </div>
        ) : null}

        {toast ? (
          <div className="p-3 rounded-xl text-sm bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
            {toast}
          </div>
        ) : null}

        {deleteTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/65"
              onClick={() => {
                if (deleteModeLoading) return
                setDeleteTarget(null)
              }}
            />
            <div
              data-testid="owner-delete-dialog"
              className="relative z-10 w-full max-w-md rounded-2xl p-5 bg-[#111118] border border-white/[0.08] text-[#f0ede8]"
            >
              <h3 className="text-sm font-bold">Remover produto</h3>
              <p className="text-sm mt-2 text-[#9ca3af]">
                Escolha como deseja remover <strong>{deleteTarget?.name}</strong>.
              </p>
              <p className="text-xs mt-2 text-[#6b7280]">
                Arquivar remove o item da vitrine e preserva historico. Excluir definitivo remove o produto quando nao ha pedidos vinculados.
              </p>
              <div className="flex flex-wrap justify-end gap-2 mt-5">
                <button
                  data-testid="owner-delete-cancel-button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={Boolean(deleteModeLoading)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-white/[0.12] text-[#e5e7eb]"
                >
                  Cancelar
                </button>
                <button
                  data-testid="owner-delete-archive-button"
                  onClick={() => void handleDeleteConfirm('archive')}
                  disabled={Boolean(deleteModeLoading)}
                  className="px-3 py-1.5 rounded-lg text-xs border border-[#d4a843]/40 text-[#d4a843]"
                >
                  {deleteModeLoading === 'archive' ? 'Arquivando...' : 'Arquivar'}
                </button>
                <button
                  data-testid="owner-delete-hard-button"
                  onClick={() => void handleDeleteConfirm('hard')}
                  disabled={Boolean(deleteModeLoading)}
                  className="px-3 py-1.5 rounded-lg text-xs bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#f87171]"
                >
                  {deleteModeLoading === 'hard' ? 'Excluindo...' : 'Excluir definitivo'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </OwnerLayout>
  )
}
