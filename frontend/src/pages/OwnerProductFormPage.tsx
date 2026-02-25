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

type ProductForm = {
  name: string
  sku: string
  manufacturer: string
  category: string
  bikeModel: string
  price: string
  stock: string
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
  stock: '',
  description: '',
  isActive: true,
}

export default function OwnerProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const isCreate = location.pathname.endsWith('/new')
  const productId = isCreate ? null : Number(id)

  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
          stock: String(item.stock),
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
      stock: Number(form.stock),
      description: form.description.trim(),
      isActive: form.isActive,
    }

    try {
      if (isCreate) {
        const { item } = await api.createProduct(payload)
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
            <Typography variant="body2" color="info.main">
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
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        label="Nome do produto"
                        fullWidth
                        required
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                      <TextField
                        label="SKU"
                        fullWidth
                        required
                        value={form.sku}
                        onChange={(e) => setForm((prev) => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                      />
                    </Stack>

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        label="Fabricante"
                        fullWidth
                        required
                        value={form.manufacturer}
                        onChange={(e) => setForm((prev) => ({ ...prev, manufacturer: e.target.value }))}
                      />
                      <TextField
                        label="Categoria"
                        fullWidth
                        required
                        value={form.category}
                        onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                      />
                    </Stack>

                    <TextField
                      label="Modelo / Aplicacao"
                      fullWidth
                      required
                      value={form.bikeModel}
                      onChange={(e) => setForm((prev) => ({ ...prev, bikeModel: e.target.value }))}
                    />

                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                      <TextField
                        label="Preco"
                        type="number"
                        inputProps={{ min: 0, step: '0.01' }}
                        fullWidth
                        required
                        value={form.price}
                        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                      />
                      <TextField
                        label="Estoque"
                        type="number"
                        inputProps={{ min: 0, step: '1' }}
                        fullWidth
                        required
                        value={form.stock}
                        onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                      />
                    </Stack>

                    <TextField
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
                      bgcolor: 'rgba(0,156,59,0.1)',
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
                    <Line label="Estoque" value={form.stock || '-'} />
                  </Stack>
                )}
              </Paper>

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
      <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 600, textAlign: 'right' }}>
        {value}
      </Typography>
    </Stack>
  )
}
