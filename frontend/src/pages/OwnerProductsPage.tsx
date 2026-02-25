import { useEffect, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  Alert,
  Button,
  Paper,
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
import OwnerLayout from '../layouts/OwnerLayout'
import { api, ApiError, type Product } from '../lib/api'

export default function OwnerProductsPage() {
  const location = useLocation()
  const [rows, setRows] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>((location.state as { toast?: string } | null)?.toast ?? null)

  useEffect(() => {
    void loadProducts()
  }, [])

  async function loadProducts(search = query) {
    setLoading(true)
    setError(null)
    try {
      const result = await api.listOwnerProducts(search)
      setRows(result.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar produtos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(`Excluir o produto ${product.name}?`)
    if (!confirmed) return

    try {
      await api.deleteProduct(product.id)
      setRows((prev) => prev.filter((row) => row.id !== product.id))
      setToast('Produto excluido com sucesso.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao excluir produto.')
    }
  }

  return (
    <OwnerLayout>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ md: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <BoxTitle />
        <Button component={RouterLink} to="/owner/products/new" variant="contained" color="primary" startIcon={<AddRoundedIcon />}>
          Novo produto
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          fullWidth
          placeholder="Buscar por nome, SKU, fabricante ou categoria"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void loadProducts()
            }
          }}
        />
        <Button variant="outlined" color="primary" onClick={() => void loadProducts()}>
          Buscar
        </Button>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Paper elevation={0} sx={{ p: 0, borderRadius: 3, borderColor: '#DDE3F2', overflow: 'hidden' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Fabricante</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Aplicacao</TableCell>
              <TableCell>Preco</TableCell>
              <TableCell>Estoque</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Acoes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Carregando produtos...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    Nenhum produto encontrado.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 600 }}>{item.name}</Typography>
                  </TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell>{item.manufacturer}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.bikeModel}</TableCell>
                  <TableCell>R$ {Number(item.price).toFixed(2)}</TableCell>
                  <TableCell>{item.stock}</TableCell>
                  <TableCell>{Boolean(item.isActive) ? 'Ativo' : 'Inativo'}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      component={RouterLink}
                      to={`/owner/products/${item.id}/edit`}
                      startIcon={<EditRoundedIcon />}
                    >
                      Editar
                    </Button>
                    <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={() => void handleDelete(item)}>
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast(null)}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>
    </OwnerLayout>
  )
}

function BoxTitle() {
  return (
    <Stack spacing={0.5}>
      <Typography variant="h3">Produtos</Typography>
      <Typography variant="body2" color="text.secondary">CRUD completo de produtos de motos (lista + pagina de edicao).</Typography>
    </Stack>
  )
}
