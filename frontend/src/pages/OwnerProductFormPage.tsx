import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
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
  imageUrl: string
  hoverImageUrl: string
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
  imageUrl: '',
  hoverImageUrl: '',
  description: '',
  isActive: true,
}

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
  const [uploadingMain, setUploadingMain] = useState(false)
  const [uploadingHover, setUploadingHover] = useState(false)
  const [loadedProduct, setLoadedProduct] = useState<Product | null>(null)

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
          imageUrl: item.imageUrl || '',
          hoverImageUrl: item.hoverImageUrl || '',
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
      imageUrl: form.imageUrl.trim(),
      hoverImageUrl: form.hoverImageUrl.trim(),
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

  async function handleLocalImageUpload(kind: 'main' | 'hover', file?: File) {
    if (!file) return
    const setUploading = kind === 'main' ? setUploadingMain : setUploadingHover
    setUploading(true)
    setUploadError(null)

    try {
      const { item } = await api.uploadOwnerImage(file)
      setForm((prev) =>
        kind === 'main'
          ? { ...prev, imageUrl: item.publicUrl }
          : { ...prev, hoverImageUrl: item.publicUrl },
      )
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : 'Falha ao enviar imagem local.')
    } finally {
      setUploading(false)
    }
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

                <div>
                  <label htmlFor="owner-product-image-url" className="text-xs uppercase tracking-widest text-[#d4a843]">
                    URL da imagem
                  </label>
                  <input
                    id="owner-product-image-url"
                    aria-label="URL da imagem"
                    title="URL da imagem"
                    data-testid="owner-product-image-url"
                    placeholder="https://... ou upload local"
                    value={form.imageUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                    className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  />
                  <p className="text-xs mt-1 text-[#6b7280]">Obrigatoria para produto ativo na vitrine publica.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <label
                    data-testid="owner-product-main-upload-button"
                    className={`px-3 py-2 rounded-xl text-xs cursor-pointer border border-white/[0.12] text-[#e5e7eb] ${uploadingMain ? 'opacity-60' : ''}`}
                  >
                    {uploadingMain ? 'Enviando imagem...' : 'Enviar imagem local'}
                    <input
                      hidden
                      accept="image/*"
                      type="file"
                      aria-label="Enviar imagem local"
                      title="Enviar imagem local"
                      data-testid="owner-product-main-upload-input"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0]
                        void handleLocalImageUpload('main', file)
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                  {form.imageUrl ? (
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl text-xs border border-white/[0.12] text-[#e5e7eb]"
                      onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                    >
                      Limpar imagem
                    </button>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="owner-product-hover-image-url" className="text-xs uppercase tracking-widest text-[#d4a843]">
                    URL da imagem hover (opcional)
                  </label>
                  <input
                    id="owner-product-hover-image-url"
                    aria-label="URL da imagem hover"
                    title="URL da imagem hover"
                    data-testid="owner-product-hover-image-url"
                    placeholder="https://... ou upload local"
                    value={form.hoverImageUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, hoverImageUrl: e.target.value }))}
                    className="w-full mt-2 py-2.5 px-3 rounded-xl text-sm outline-none bg-white/[0.05] border border-white/[0.1] text-[#f0ede8]"
                  />
                  <p className="text-xs mt-1 text-[#6b7280]">Quando preenchida, substitui a imagem principal no hover dos cards.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <label
                    data-testid="owner-product-hover-upload-button"
                    className={`px-3 py-2 rounded-xl text-xs cursor-pointer border border-white/[0.12] text-[#e5e7eb] ${uploadingHover ? 'opacity-60' : ''}`}
                  >
                    {uploadingHover ? 'Enviando imagem hover...' : 'Enviar imagem hover local'}
                    <input
                      hidden
                      accept="image/*"
                      type="file"
                      aria-label="Enviar imagem hover local"
                      title="Enviar imagem hover local"
                      data-testid="owner-product-hover-upload-input"
                      onChange={(event) => {
                        const file = event.currentTarget.files?.[0]
                        void handleLocalImageUpload('hover', file)
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                  {form.hoverImageUrl ? (
                    <button
                      type="button"
                      className="px-3 py-2 rounded-xl text-xs border border-white/[0.12] text-[#e5e7eb]"
                      onClick={() => setForm((prev) => ({ ...prev, hoverImageUrl: '' }))}
                    >
                      Limpar hover
                    </button>
                  ) : null}
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
                  <Line label="Imagem" value={form.imageUrl ? 'Configurada' : 'Sem imagem'} />
                  <Line label="Imagem hover" value={form.hoverImageUrl ? 'Configurada' : 'Nao informada'} />
                </div>
              )}
            </div>

            <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
              <p className="text-xs uppercase tracking-widest text-[#d4a843]">Preview da imagem</p>
              <div
                className="mt-3 rounded-xl flex items-center justify-center overflow-hidden border border-white/[0.08] bg-[#111118]/60 min-h-[180px]"
              >
                {form.imageUrl ? (
                  <img
                    key={form.imageUrl}
                    src={form.imageUrl}
                    alt={form.name || 'Preview do produto'}
                    className="w-full h-[180px] object-contain p-4"
                    onError={(event) => {
                      ;(event.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <span className="text-sm text-[#6b7280]">Informe uma URL para visualizar.</span>
                )}
              </div>
            </div>

            {form.isActive && !form.imageUrl.trim() ? (
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
