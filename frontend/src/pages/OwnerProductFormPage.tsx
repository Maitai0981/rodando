import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, GripVertical, ImagePlus, Trash2, Upload } from 'lucide-react'
import OwnerLayout from '../shared/layout/OwnerLayout'
import { api, ApiError, type Product } from '../shared/lib/api'
import { useAssist } from '../shared/context/AssistContext'
import { AssistHintInline } from '../features/assist'

type ProductForm = {
  name: string
  sku: string
  manufacturer: string
  category: string
  bikeModel: string
  price: string
  cost: string
  stock: string
  minimumStock: string
  reorderPoint: string
  images: string[]
  description: string
  isActive: boolean
}

const emptyForm: ProductForm = {
  name: '',
  sku: '',
  manufacturer: '',
  category: '',
  bikeModel: '',
  price: '',
  cost: '',
  stock: '',
  minimumStock: '5',
  reorderPoint: '10',
  images: [''],
  description: '',
  isActive: true,
}

const IMAGE_SLOT_LABELS = ['Principal', 'Hover', 'Extra 1', 'Extra 2', 'Extra 3', 'Extra 4']

export default function OwnerProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { completeStep } = useAssist()

  const isCreate = location.pathname.endsWith('/new')
  const productId = isCreate ? null : Number(id)

  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [loadedProduct, setLoadedProduct] = useState<Product | null>(null)
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const pageTitle = useMemo(() => (isCreate ? 'Novo produto' : 'Editar produto'), [isCreate])

  useEffect(() => {
    if (isCreate) {
      setLoading(false)
      setLoadedProduct(null)
      setForm(emptyForm)
      return
    }

    if (!productId || Number.isNaN(productId)) {
      setError('ID de produto invalido.')
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)
    setUploadError(null)

    api.getOwnerProduct(productId)
      .then(({ item }) => {
        if (!active) return
        setLoadedProduct(item)
        const imgs: string[] = []
        if (item.imageUrl) imgs.push(item.imageUrl)
        if (item.hoverImageUrl) imgs.push(item.hoverImageUrl)
        if (imgs.length === 0) imgs.push('')
        setForm({
          name: item.name,
          sku: item.sku,
          manufacturer: item.manufacturer,
          category: item.category,
          bikeModel: item.bikeModel,
          price: String(item.price),
          cost: String(item.cost ?? 0),
          stock: String(item.stock),
          minimumStock: String(item.minimumStock ?? 5),
          reorderPoint: String(item.reorderPoint ?? 10),
          images: imgs,
          description: item.description,
          isActive: Boolean(item.isActive),
        })
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof ApiError ? err.message : 'Falha ao carregar produto.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [isCreate, productId])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const filledImages = form.images.map((u) => u.trim()).filter(Boolean)
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      manufacturer: form.manufacturer.trim(),
      category: form.category.trim(),
      bikeModel: form.bikeModel.trim(),
      price: Number(form.price),
      cost: Number(form.cost || 0),
      stock: Number(form.stock),
      minimumStock: Number(form.minimumStock || 0),
      reorderPoint: Number(form.reorderPoint || 0),
      imageUrl: filledImages[0] ?? '',
      hoverImageUrl: filledImages[1] ?? '',
      description: form.description.trim(),
      isActive: form.isActive,
    }

    try {
      if (isCreate) {
        const { item } = await api.createProduct(payload)
        completeStep('save-valid', 'owner-products')
        if (payload.isActive && payload.imageUrl) {
          completeStep('published-with-image', 'owner-products')
        }
        navigate(`/owner/products/${item.id}/edit`, {
          replace: true,
          state: { toast: 'Produto criado com sucesso.' },
        })
        return
      }

      if (!productId) {
        throw new ApiError('ID de produto invalido.', 400)
      }

      const { item } = await api.updateProduct(productId, payload)
      completeStep('save-valid', 'owner-products')
      if (payload.isActive && payload.imageUrl) {
        completeStep('published-with-image', 'owner-products')
      }
      setLoadedProduct(item)
      navigate('/owner/products', {
        state: { toast: 'Produto atualizado com sucesso.' },
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao salvar produto.')
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(slotIndex: number, file?: File) {
    if (!file) return
    setUploadingSlot(slotIndex)
    setUploadError(null)

    try {
      const { item } = await api.uploadOwnerImage(file)
      setForm((prev) => {
        const next = [...prev.images]
        next[slotIndex] = item.publicUrl
        return { ...prev, images: next }
      })
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Falha ao enviar imagem.')
    } finally {
      setUploadingSlot(null)
    }
  }

  function setImageUrl(slotIndex: number, url: string) {
    setForm((prev) => {
      const next = [...prev.images]
      next[slotIndex] = url
      return { ...prev, images: next }
    })
  }

  function removeImageSlot(slotIndex: number) {
    setForm((prev) => {
      const next = prev.images.filter((_, i) => i !== slotIndex)
      return { ...prev, images: next.length > 0 ? next : [''] }
    })
  }

  function addImageSlot() {
    setForm((prev) => ({ ...prev, images: [...prev.images, ''] }))
  }

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <nav className="flex items-center gap-2 text-xs text-[#6b7280]">
            <Link to="/owner/dashboard" className="hover:text-amber-400 transition-colors">Dashboard</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/owner/products" className="hover:text-amber-400 transition-colors">Produtos</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#d4a843]">{pageTitle}</span>
          </nav>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-xl text-[#f0ede8] font-bold">{pageTitle}</h1>
              <p className="text-sm text-[#6b7280]">
                {isCreate
                  ? 'Cadastre um novo item de moto no catalogo.'
                  : 'Atualize dados tecnicos, estoque e status do produto.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/owner/products"
                className="px-4 py-2 rounded-xl text-sm border border-white/[0.15] text-[#e5e7eb]"
              >
                Voltar
              </Link>
              <button
                data-testid="owner-product-save-button"
                type="submit"
                form="owner-product-form"
                className={`px-4 py-2 rounded-xl text-sm text-black bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold ${saving || loading ? 'opacity-70' : ''}`}
                disabled={saving || loading}
              >
                {saving ? 'Salvando...' : isCreate ? 'Criar produto' : 'Salvar alteracoes'}
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
          <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-12 rounded-xl bg-white/[0.06]" />
                <div className="h-12 rounded-xl bg-white/[0.06]" />
                <div className="h-12 rounded-xl bg-white/[0.06]" />
                <div className="h-32 rounded-xl bg-white/[0.06]" />
              </div>
            ) : (
              <form id="owner-product-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-[#6b7280]">
                  <AssistHintInline tipId="owner-product-form-tip-image" routeKey="owner-products">
                    Produto ativo sem imagem principal nao entra na vitrine publica.
                  </AssistHintInline>
                  <span>Imagem principal e necessaria para aparecer na vitrine.</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="owner-product-name" className="text-xs uppercase tracking-widest text-[#d4a843]">
                      Nome do produto
                    </label>
                    <input
                      id="owner-product-name"
                      aria-label="Nome do produto"
                      title="Nome do produto"
                      data-testid="owner-product-name"
                      required
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="owner-product-sku" className="text-xs uppercase tracking-widest text-[#d4a843]">
                      SKU
                    </label>
                    <input
                      id="owner-product-sku"
                      aria-label="SKU"
                      title="SKU"
                      data-testid="owner-product-sku"
                      required
                      value={form.sku}
                      onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="owner-product-manufacturer" className="text-xs uppercase tracking-widest text-[#d4a843]">
                      Fabricante
                    </label>
                    <input
                      id="owner-product-manufacturer"
                      aria-label="Fabricante"
                      title="Fabricante"
                      data-testid="owner-product-manufacturer"
                      required
                      value={form.manufacturer}
                      onChange={(e) => setForm((prev) => ({ ...prev, manufacturer: e.target.value }))}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="owner-product-category" className="text-xs uppercase tracking-widest text-[#d4a843]">
                      Categoria
                    </label>
                    <input
                      id="owner-product-category"
                      aria-label="Categoria"
                      title="Categoria"
                      data-testid="owner-product-category"
                      required
                      value={form.category}
                      onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="owner-product-bike-model" className="text-xs uppercase tracking-widest text-[#d4a843]">
                    Modelo / Aplicacao
                  </label>
                  <input
                    id="owner-product-bike-model"
                    aria-label="Modelo ou aplicacao"
                    title="Modelo ou aplicacao"
                    data-testid="owner-product-bike-model"
                    required
                    value={form.bikeModel}
                    onChange={(e) => setForm((prev) => ({ ...prev, bikeModel: e.target.value }))}
                    className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  />
                </div>

                {/* ── Galeria de imagens ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-[#d4a843]">Galeria de imagens</p>
                      <p className="text-xs mt-0.5 text-[#6b7280]">
                        1ª = principal · 2ª = hover nos cards · demais = galeria no produto
                      </p>
                    </div>
                    {form.images.length < 6 ? (
                      <button
                        type="button"
                        onClick={addImageSlot}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-[#d4a843]/40 text-[#d4a843] hover:bg-[#d4a843]/10 transition-colors"
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        Adicionar imagem
                      </button>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {form.images.map((url, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden"
                      >
                        {/* Preview */}
                        <div className="relative h-28 flex items-center justify-center bg-[#111118]/60">
                          {url ? (
                            <img
                              src={url}
                              alt={`Imagem ${idx + 1}`}
                              className="w-full h-full object-contain p-2"
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2' }}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-[#4b5563]">
                              <GripVertical className="w-5 h-5" />
                              <span className="text-xs">Vazio</span>
                            </div>
                          )}

                          {/* Slot label badge */}
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#0a0a0f]/80 text-[#d4a843]">
                            {IMAGE_SLOT_LABELS[idx] ?? `Extra ${idx - 1}`}
                          </span>

                          {/* Delete */}
                          {form.images.length > 1 ? (
                            <button
                              type="button"
                              aria-label={`Remover imagem ${idx + 1}`}
                              onClick={() => removeImageSlot(idx)}
                              className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-[#ef4444]/20 text-[#f87171] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          ) : null}
                        </div>

                        {/* URL input + upload */}
                        <div className="p-2 space-y-1.5">
                          <input
                            type="text"
                            aria-label={`URL da imagem ${idx + 1}`}
                            placeholder="https://..."
                            value={url}
                            onChange={(e) => setImageUrl(idx, e.target.value)}
                            className="w-full py-1.5 px-2 rounded-lg text-xs outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8] placeholder-[#4b5563]"
                          />
                          <label
                            className={`flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs cursor-pointer border border-white/[0.1] text-[#9ca3af] hover:text-[#f0ede8] hover:border-white/[0.2] transition-colors ${uploadingSlot === idx ? 'opacity-60 pointer-events-none' : ''}`}
                          >
                            <Upload className="w-3 h-3" />
                            {uploadingSlot === idx ? 'Enviando...' : 'Upload'}
                            <input
                              ref={(el) => { fileInputRefs.current[idx] = el }}
                              hidden
                              accept="image/*"
                              type="file"
                              onChange={(event) => {
                                const file = event.currentTarget.files?.[0]
                                void handleImageUpload(idx, file)
                                event.currentTarget.value = ''
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {uploadError ? (
                  <div className="p-3 rounded-lg text-sm bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#f87171]">
                    {uploadError}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="owner-product-price" className="text-xs uppercase tracking-widest text-[#d4a843]">
                      Preco
                    </label>
                    <input
                      id="owner-product-price"
                      aria-label="Preco"
                      title="Preco"
                      data-testid="owner-product-price"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={form.price}
                      onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="owner-product-cost" className="text-xs uppercase tracking-widest text-[#d4a843]">
                      Custo
                    </label>
                    <input
                      id="owner-product-cost"
                      aria-label="Custo"
                      title="Custo"
                      data-testid="owner-product-cost"
                      type="number"
                      min={0}
                      step="0.01"
                      required
                      value={form.cost}
                      onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="owner-product-stock" className="text-xs uppercase tracking-widest text-[#d4a843]">
                      Estoque
                    </label>
                    <input
                      id="owner-product-stock"
                      aria-label="Estoque"
                      title="Estoque"
                      data-testid="owner-product-stock"
                      type="number"
                      min={0}
                      step="1"
                      required
                      value={form.stock}
                      onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="owner-product-minimum-stock" className="text-xs uppercase tracking-widest text-[#d4a843]">
                      Estoque minimo
                    </label>
                    <input
                      id="owner-product-minimum-stock"
                      aria-label="Estoque minimo"
                      title="Estoque minimo"
                      data-testid="owner-product-minimum-stock"
                      type="number"
                      min={0}
                      step="1"
                      required
                      value={form.minimumStock}
                      onChange={(e) => setForm((prev) => ({ ...prev, minimumStock: e.target.value }))}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                    />
                  </div>
                  <div>
                    <label htmlFor="owner-product-reorder-point" className="text-xs uppercase tracking-widest text-[#d4a843]">
                      Ponto de reposicao
                    </label>
                    <input
                      id="owner-product-reorder-point"
                      aria-label="Ponto de reposicao"
                      title="Ponto de reposicao"
                      data-testid="owner-product-reorder-point"
                      type="number"
                      min={0}
                      step="1"
                      required
                      value={form.reorderPoint}
                      onChange={(e) => setForm((prev) => ({ ...prev, reorderPoint: e.target.value }))}
                      className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="owner-product-description" className="text-xs uppercase tracking-widest text-[#d4a843]">
                    Descricao
                  </label>
                  <textarea
                    id="owner-product-description"
                    aria-label="Descricao"
                    title="Descricao"
                    data-testid="owner-product-description"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-[#f0ede8]">
                  <input
                    type="checkbox"
                    aria-label="Produto ativo no catalogo publico"
                    title="Produto ativo no catalogo publico"
                    checked={form.isActive}
                    onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Produto ativo no catalogo publico
                </label>
              </form>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
              <p className="text-sm mb-3 text-[#f0ede8] font-semibold">Resumo</p>
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 rounded bg-white/[0.06]" />
                  <div className="h-4 rounded bg-white/[0.06]" />
                  <div className="h-4 rounded bg-white/[0.06]" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Line label="Status" value={form.isActive ? 'Ativo' : 'Inativo'} />
                  <Line label="SKU" value={form.sku || '-'} />
                  <Line label="Preco" value={form.price ? `R$ ${Number(form.price || 0).toFixed(2)}` : '-'} />
                  <Line label="Custo" value={form.cost ? `R$ ${Number(form.cost || 0).toFixed(2)}` : '-'} />
                  <Line
                    label="Margem"
                    value={Number(form.price || 0) > 0 ? `${(((Number(form.price || 0) - Number(form.cost || 0)) / Number(form.price || 0)) * 100).toFixed(1)}%` : '-'}
                  />
                  <Line label="Estoque" value={form.stock || '-'} />
                  <Line label="Estoque minimo" value={form.minimumStock || '-'} />
                  <Line label="Reposicao" value={form.reorderPoint || '-'} />
                  <Line label="Imagens" value={`${form.images.filter(Boolean).length} configurada(s)`} />
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs uppercase tracking-widest text-[#d4a843]">Preview principal</p>
              <div className="mt-3 rounded-xl flex items-center justify-center overflow-hidden border border-white/[0.08] bg-[#111118]/60 min-h-[180px]">
                {form.images[0] ? (
                  <img
                    key={form.images[0]}
                    src={form.images[0]}
                    alt={form.name || 'Preview do produto'}
                    className="w-full h-[180px] object-contain p-4"
                    onError={(event) => {
                      ;(event.currentTarget as HTMLImageElement).style.opacity = '0.2'
                    }}
                  />
                ) : (
                  <span className="text-sm text-[#6b7280]">Sem imagem principal.</span>
                )}
              </div>
            </div>

            {form.isActive && !form.images[0]?.trim() ? (
              <div className="p-3 rounded-lg text-sm bg-[#eab308]/[0.12] border border-[#eab308]/20 text-[#facc15]">
                Produto ativo sem imagem nao pode ser publicado na vitrine.
              </div>
            ) : null}

            {!isCreate && loadedProduct ? (
              <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
                <p className="text-xs uppercase tracking-widest text-[#d4a843]">Metadados</p>
                <div className="mt-2 space-y-2 text-sm text-[#9ca3af]">
                  <p>Criado em: {new Date(loadedProduct.createdAt).toLocaleString('pt-BR')}</p>
                  <p>Ultima atualizacao: {new Date(loadedProduct.updatedAt).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </OwnerLayout>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-[#9ca3af]">
      <span>{label}</span>
      <span className="text-[#f0ede8] font-semibold text-right">{value}</span>
    </div>
  )
}
