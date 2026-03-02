import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link as RouterLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  FormControlLabel,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import OwnerLayout from '../layouts/OwnerLayout'
import { api, ApiError, type Product } from '../lib/api'
import { useAssist } from '../context/AssistContext'
import { AssistHintInline } from '../components/assist'

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
      <Stack spacing={3}>
        <Stack spacing={1.5}>
          <Breadcrumbs separator={<NavigateNextRoundedIcon sx={{ fontSize: 16 }} />} aria-label="breadcrumb">
            <Typography component={RouterLink} to="/owner/dashboard" variant="body2" color="text.secondary">
              Dashboard
            </Typography>
            <Typography component={RouterLink} to="/owner/products" variant="body2" color="text.secondary">
              Produtos
            </Typography>
            <Typography variant="body2" color="text.primary">
              {pageTitle}
            </Typography>
          </Breadcrumbs>

          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h3">{pageTitle}</Typography>
              <Typography variant="body2" color="text.secondary">
                {isCreate
                  ? 'Cadastre um novo item de moto no catalogo.'
                  : 'Atualize dados tecnicos, estoque e status do produto.'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.25}>
              <Button component={RouterLink} to="/owner/products" variant="outlined" startIcon={<ArrowBackRoundedIcon />}>
                Voltar
              </Button>
              <Button
                data-testid="owner-product-save-button"
                type="submit"
                form="owner-product-form"
                variant="contained"
                color="primary"
                startIcon={<SaveRoundedIcon />}
                disabled={saving || loading}
              >
                {saving ? 'Salvando...' : isCreate ? 'Criar produto' : 'Salvar alteracoes'}
              </Button>
            </Stack>
          </Stack>
        </Stack>

        {error ? <Alert severity="error">{error}</Alert> : null}

        <Grid container spacing={3} alignItems="stretch">
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper elevation={0} sx={{ p: { xs: 2.5, md: 3 }, borderRadius: 3 }}>
              {loading ? (
                <Stack spacing={2}>
                  <Skeleton variant="rounded" height={56} />
                  <Skeleton variant="rounded" height={56} />
                  <Skeleton variant="rounded" height={56} />
                  <Skeleton variant="rounded" height={120} />
                </Stack>
              ) : (
                <Box component="form" id="owner-product-form" onSubmit={handleSubmit}>
                  <Stack spacing={2}>
                    <AssistHintInline tipId="owner-product-form-tip-image" routeKey="owner-products">
                      Produto ativo sem imagem principal não entra na vitrine pública.
                    </AssistHintInline>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        inputProps={{ 'data-testid': 'owner-product-name' }}
                        label="Nome do produto"
                        fullWidth
                        required
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                      <TextField
                        inputProps={{ 'data-testid': 'owner-product-sku' }}
                        label="SKU"
                        fullWidth
                        required
                        value={form.sku}
                        onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        inputProps={{ 'data-testid': 'owner-product-manufacturer' }}
                        label="Fabricante"
                        fullWidth
                        required
                        value={form.manufacturer}
                        onChange={(e) => setForm((prev) => ({ ...prev, manufacturer: e.target.value }))}
                      />
                      <TextField
                        inputProps={{ 'data-testid': 'owner-product-category' }}
                        label="Categoria"
                        fullWidth
                        required
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                      />
                    </Stack>

                    <TextField
                      inputProps={{ 'data-testid': 'owner-product-bike-model' }}
                      label="Modelo / Aplicacao"
                      fullWidth
                      required
                      value={form.bikeModel}
                      onChange={(e) => setForm((prev) => ({ ...prev, bikeModel: e.target.value }))}
                    />

                    <TextField
                      inputProps={{ 'data-testid': 'owner-product-image-url' }}
                      label="URL da imagem"
                      fullWidth
                      placeholder="https://... ou upload local"
                      value={form.imageUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                      helperText="Obrigatoria para produto ativo na vitrine publica."
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        component="label"
                        variant="outlined"
                        disabled={uploadingMain}
                        data-testid="owner-product-main-upload-button"
                      >
                        {uploadingMain ? 'Enviando imagem...' : 'Enviar imagem local'}
                        <input
                          hidden
                          accept="image/*"
                          type="file"
                          data-testid="owner-product-main-upload-input"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0]
                            void handleLocalImageUpload('main', file)
                            event.currentTarget.value = ''
                          }}
                        />
                      </Button>
                      {form.imageUrl ? (
                        <Button
                          variant="text"
                          color="inherit"
                          onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                        >
                          Limpar imagem
                        </Button>
                      ) : null}
                    </Stack>

                    <TextField
                      inputProps={{ 'data-testid': 'owner-product-hover-image-url' }}
                      label="URL da imagem hover (opcional)"
                      fullWidth
                      placeholder="https://... ou upload local"
                      value={form.hoverImageUrl}
                      onChange={(e) => setForm((prev) => ({ ...prev, hoverImageUrl: e.target.value }))}
                      helperText="Quando preenchida, substitui a imagem principal no hover dos cards."
                    />
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <Button
                        component="label"
                        variant="outlined"
                        disabled={uploadingHover}
                        data-testid="owner-product-hover-upload-button"
                      >
                        {uploadingHover ? 'Enviando imagem hover...' : 'Enviar imagem hover local'}
                        <input
                          hidden
                          accept="image/*"
                          type="file"
                          data-testid="owner-product-hover-upload-input"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0]
                            void handleLocalImageUpload('hover', file)
                            event.currentTarget.value = ''
                          }}
                        />
                      </Button>
                      {form.hoverImageUrl ? (
                        <Button
                          variant="text"
                          color="inherit"
                          onClick={() => setForm((prev) => ({ ...prev, hoverImageUrl: '' }))}
                        >
                          Limpar hover
                        </Button>
                      ) : null}
                    </Stack>

                    {uploadError ? <Alert severity="error">{uploadError}</Alert> : null}

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        label="Preco"
                        type="number"
                        inputProps={{ min: 0, step: '0.01', 'data-testid': 'owner-product-price' }}
                        fullWidth
                        required
                        value={form.price}
                        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                      />
                      <TextField
                        label="Custo"
                        type="number"
                        inputProps={{ min: 0, step: '0.01', 'data-testid': 'owner-product-cost' }}
                        fullWidth
                        required
                        value={form.cost}
                        onChange={(e) => setForm((prev) => ({ ...prev, cost: e.target.value }))}
                      />
                      <TextField
                        label="Estoque"
                        type="number"
                        inputProps={{ min: 0, step: '1', 'data-testid': 'owner-product-stock' }}
                        fullWidth
                        required
                        value={form.stock}
                        onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        label="Estoque minimo"
                        type="number"
                        inputProps={{ min: 0, step: '1', 'data-testid': 'owner-product-minimum-stock' }}
                        fullWidth
                        required
                        value={form.minimumStock}
                        onChange={(e) => setForm((prev) => ({ ...prev, minimumStock: e.target.value }))}
                      />
                      <TextField
                        label="Ponto de reposicao"
                        type="number"
                        inputProps={{ min: 0, step: '1', 'data-testid': 'owner-product-reorder-point' }}
                        fullWidth
                        required
                        value={form.reorderPoint}
                        onChange={(e) => setForm((prev) => ({ ...prev, reorderPoint: e.target.value }))}
                      />
                    </Stack>

                    <TextField
                      inputProps={{ 'data-testid': 'owner-product-description' }}
                      label="Descricao"
                      multiline
                      minRows={4}
                      fullWidth
                      value={form.description}
                      onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    />

                    <FormControlLabel
                      control={
                        <Switch
                          checked={form.isActive}
                          onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                        />
                      }
                      label="Produto ativo no catalogo publico"
                    />
                  </Stack>
                </Box>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={3}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'rgba(44,209,100,0.1)',
                      color: 'primary.main',
                    }}
                  >
                    <Inventory2RoundedIcon fontSize="small" />
                  </Box>
                  <Typography variant="h6">Resumo</Typography>
                </Stack>

                {loading ? (
                  <Stack spacing={1.2}>
                    <Skeleton height={22} />
                    <Skeleton height={22} />
                    <Skeleton height={22} />
                  </Stack>
                ) : (
                  <Stack spacing={1.1}>
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
                  </Stack>
                )}
              </Paper>

              <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Preview da imagem
                </Typography>
                <Box
                  sx={{
                    borderRadius: 2.5,
                    border: '1px solid rgba(0,0,0,0.08)',
                    bgcolor: 'rgba(247,250,248,0.95)',
                    minHeight: 180,
                    display: 'grid',
                    placeItems: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {form.imageUrl ? (
                    <Box
                      component="img"
                      key={form.imageUrl}
                      src={form.imageUrl}
                      alt={form.name || 'Preview do produto'}
                      sx={{ width: '100%', height: 180, objectFit: 'contain', p: 1.25 }}
                      onError={(event) => {
                        ;(event.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Informe uma URL para visualizar.
                    </Typography>
                  )}
                </Box>
              </Paper>

              {form.isActive && !form.imageUrl.trim() ? (
                <Alert severity="warning">
                  Produto ativo sem imagem nao pode ser publicado na vitrine.
                </Alert>
              ) : null}

              {!isCreate && loadedProduct ? (
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Metadados
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2" color="text.secondary">
                      Criado em: {new Date(loadedProduct.createdAt).toLocaleString('pt-BR')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ultima atualizacao: {new Date(loadedProduct.updatedAt).toLocaleString('pt-BR')}
                    </Typography>
                  </Stack>
                </Paper>
              ) : null}
            </Stack>
          </Grid>
        </Grid>
      </Stack>
    </OwnerLayout>
  )
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  )
}
