import { useEffect, useState } from 'react'
import { Alert, Badge, Box, Button, Grid, Paper, Stack, TextField, Typography } from '@mui/material'
import PublicLayout from '../layouts/PublicLayout'
import { api, ApiError, type Product } from '../lib/api'

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadProducts()
  }, [])

  async function loadProducts(search = query) {
    setLoading(true)
    setError(null)
    try {
      const result = await api.listPublicProducts(search)
      setProducts(result.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao carregar catalogo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicLayout>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 3 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, position: { lg: 'sticky' }, top: { lg: 120 } }}>
            <Box className="float-animation" sx={{ height: 120, display: 'grid', placeItems: 'center' }}>
              <Box component="img" src="/brand/rodando-mascot.svg" alt="Mascote" sx={{ width: 80, opacity: 0.65 }} />
            </Box>
            <Typography variant="h6" sx={{ color: 'primary.main' }}>Encontre sua peca</Typography>
            <TextField fullWidth placeholder="Nome, categoria, fabricante..." sx={{ mt: 2 }} value={query} onChange={(e) => setQuery(e.target.value)} />
            <Button fullWidth variant="contained" color="primary" sx={{ mt: 2 }} onClick={() => void loadProducts()}>
              Filtrar
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Produtos exibidos: {products.length}
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 9 }}>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

          <Grid container spacing={3}>
            {loading ? (
              <Grid size={12}>
                <Paper elevation={0} sx={{ p: 4, borderRadius: 3 }}>
                  <Typography variant="body2" color="text.secondary">Carregando catalogo...</Typography>
                </Paper>
              </Grid>
            ) : products.length === 0 ? (
              <Grid size={12}>
                <Paper elevation={0} sx={{ p: 4, borderRadius: 3 }}>
                  <Typography variant="body2" color="text.secondary">Nenhum produto encontrado para este filtro.</Typography>
                </Paper>
              </Grid>
            ) : (
              products.map((item) => (
                <Grid size={{ xs: 12, md: 6, xl: 4 }} key={item.id}>
                  <Paper elevation={0} sx={{ p: 3, borderRadius: 3, position: 'relative', height: '100%' }}>
                    <Badge
                      badgeContent={item.stock > 0 ? `${item.stock} un.` : 'Sem estoque'}
                      color="secondary"
                      sx={{
                        position: 'absolute',
                        top: 16,
                        left: 16,
                        '& .MuiBadge-badge': {
                          bgcolor: item.stock > 0 ? '#D9F3E6' : '#FBE4E4',
                          color: item.stock > 0 ? '#0F6138' : '#9D2222',
                          fontWeight: 700,
                          fontSize: 10,
                          borderRadius: 2,
                          padding: '6px 8px'
                        }
                      }}
                    />
                    <Box sx={{ height: 160, bgcolor: '#F3F1E9', borderRadius: 3, display: 'grid', placeItems: 'center', mb: 2 }}>
                      <Box sx={{ width: 64, height: 64, borderRadius: '50%', border: '2px dashed rgba(0,39,118,0.28)' }} />
                    </Box>
                    <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>{item.category}</Typography>
                    <Typography variant="h6" sx={{ color: 'info.main', mb: 1 }}>{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {item.manufacturer} • {item.bikeModel}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {item.description}
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                      <Typography variant="h5" sx={{ color: 'info.main' }}>R$ {Number(item.price).toFixed(2)}</Typography>
                    </Stack>
                    <Button fullWidth variant="outlined" color="primary" disabled={item.stock <= 0}>Comprar</Button>
                  </Paper>
                </Grid>
              ))
            )}
          </Grid>
        </Grid>
      </Grid>
    </PublicLayout>
  )
}
