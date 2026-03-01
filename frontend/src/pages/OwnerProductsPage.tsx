import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded'
import OwnerLayout from '../layouts/OwnerLayout'
import { api, ApiError, type OwnerOfferItem, type Product } from '../lib/api'
import { useAssist } from '../context/AssistContext'
import { AssistHintInline } from '../components/assist'

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
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 2 }}>
        <Stack spacing={0.4}>
          <Typography variant="h4" sx={{ color: 'text.primary' }}>
            Produtos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestao operacional de cadastro, vitrine e ofertas.
          </Typography>
        </Stack>
        <Button
          component={RouterLink}
          to="/owner/products/new"
          variant="contained"
          color="primary"
          startIcon={<AddRoundedIcon />}
          onClick={() => completeStep('open-create', 'owner-products')}
        >
          Novo produto
        </Button>
      </Stack>

      <AssistHintInline tipId="owner-products-tip-image" routeKey="owner-products">
        Dica: para publicar na vitrine, mantenha produto ativo com imagem principal válida.
      </AssistHintInline>

      {pendingImageRows.length > 0 ? (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button
              component={RouterLink}
              to={`/owner/products/${pendingImageRows[0].id}/edit`}
              size="small"
              color="warning"
            >
              Corrigir agora
            </Button>
          }
        >
          {pendingImageRows.length} produto(s) ativos sem imagem de vitrine. Eles ficam ocultos no catalogo publico.
        </Alert>
      ) : null}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} sx={{ mb: 1.5 }}>
        <TextField
          inputProps={{ 'data-testid': 'owner-products-search-input' }}
          fullWidth
          size="small"
          placeholder="Buscar por nome, SKU, fabricante ou categoria"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void loadProducts(query)
            }
          }}
        />
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <Select
            data-testid="owner-products-status-filter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            displayEmpty
            inputProps={{ 'aria-label': 'Filtrar status de produtos' }}
          >
            <MenuItem value="all">Todos os status</MenuItem>
            <MenuItem value="active">Ativos</MenuItem>
            <MenuItem value="inactive">Inativos</MenuItem>
            <MenuItem value="pending-image">Ativos sem imagem</MenuItem>
            <MenuItem value="critical-stock">Estoque critico ({'<='} 5)</MenuItem>
          </Select>
        </FormControl>
        <Button data-testid="owner-products-search-button" variant="outlined" color="primary" onClick={() => void loadProducts(query)}>
          Buscar
        </Button>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Paper elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'background.paper' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Produto</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Preco</TableCell>
              <TableCell>Estoque</TableCell>
              <TableCell>Vitrine</TableCell>
              <TableCell>Oferta</TableCell>
              <TableCell align="right">Acoes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Carregando produtos...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Nenhum produto encontrado.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : pagedRows.map((item) => {
                const offer = offersByProductId.get(item.id)
                const hasImage = String(item.imageUrl || '').trim().length > 0
                const stock = Number(item.stock)

                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.manufacturer} • {item.bikeModel}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>R$ {Number(item.price).toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={stock}
                        color={stock <= 5 ? 'error' : 'default'}
                        variant={stock <= 5 ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={!item.isActive ? 'Inativo' : hasImage ? 'Publicado' : 'Sem imagem'}
                        color={!item.isActive ? 'default' : hasImage ? 'success' : 'warning'}
                        variant={hasImage ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      {offer ? (
                        <Stack spacing={0.3}>
                          <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 700 }}>
                            {offer.badge}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            R$ {Number(offer.compareAtPrice).toFixed(2)} • {offer.isActive ? 'Ativa' : 'Inativa'}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Sem oferta
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.4} justifyContent="flex-end">
                        <Button
                          data-testid={`owner-edit-${item.id}`}
                          size="small"
                          component={RouterLink}
                          to={`/owner/products/${item.id}/edit`}
                          startIcon={<EditRoundedIcon />}
                        >
                          Editar
                        </Button>
                        <Button data-testid={`owner-delete-${item.id}`} size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => setDeleteTarget(item)}>
                          Excluir
                        </Button>
                        {offer ? (
                          <>
                            <Button data-testid={`owner-offer-edit-${item.id}`} size="small" color="primary" startIcon={<LocalOfferRoundedIcon />} onClick={() => void handleEditOffer(item, offer)}>
                              Oferta
                            </Button>
                            <Button data-testid={`owner-offer-remove-${item.id}`} size="small" color="warning" onClick={() => void handleDeleteOffer(offer)}>
                              Remover
                            </Button>
                          </>
                        ) : (
                          <Button data-testid={`owner-offer-create-${item.id}`} size="small" color="success" startIcon={<LocalOfferRoundedIcon />} onClick={() => void handleCreateOffer(item)}>
                            Criar oferta
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })}
          </TableBody>
        </Table>
      </Paper>

      {filteredRows.length > OWNER_PAGE_SIZE ? (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination
            data-testid="owner-products-pagination"
            page={safePage}
            count={pageCount}
            color="primary"
            onChange={(_event, value) => setPage(value)}
          />
        </Stack>
      ) : null}

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast(null)}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>

      <Dialog
        data-testid="owner-delete-dialog"
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (deleteModeLoading) return
          setDeleteTarget(null)
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Remover produto</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              Escolha como deseja remover <strong>{deleteTarget?.name}</strong>.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Arquivar remove o item da vitrine e preserva historico. Excluir definitivo remove o produto quando nao ha pedidos vinculados.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            data-testid="owner-delete-cancel-button"
            onClick={() => setDeleteTarget(null)}
            disabled={Boolean(deleteModeLoading)}
          >
            Cancelar
          </Button>
          <Button
            data-testid="owner-delete-archive-button"
            variant="outlined"
            color="primary"
            onClick={() => void handleDeleteConfirm('archive')}
            disabled={Boolean(deleteModeLoading)}
          >
            {deleteModeLoading === 'archive' ? 'Arquivando...' : 'Arquivar'}
          </Button>
          <Button
            data-testid="owner-delete-hard-button"
            variant="contained"
            color="error"
            onClick={() => void handleDeleteConfirm('hard')}
            disabled={Boolean(deleteModeLoading)}
          >
            {deleteModeLoading === 'hard' ? 'Excluindo...' : 'Excluir definitivo'}
          </Button>
        </DialogActions>
      </Dialog>
    </OwnerLayout>
  )
}
