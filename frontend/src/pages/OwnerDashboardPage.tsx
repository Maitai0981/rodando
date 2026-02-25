import { useEffect, useState } from 'react'
import { Alert, Box, Button, Grid, Paper, Stack, Typography } from '@mui/material'
import OwnerLayout from '../layouts/OwnerLayout'
import { api, ApiError } from '../lib/api'

type Metrics = {
  totalProducts: number
  activeProducts: number
  stockTotal: number
  lowStockProducts: number
  averagePrice: number
}

export default function OwnerDashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    api.ownerDashboard()
      .then((data) => {
        if (!active) return
        setMetrics(data.metrics)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof ApiError ? err.message : 'Falha ao carregar dashboard.')
      })

    return () => {
      active = false
    }
  }, [])

  const cards = [
    { label: 'Produtos ativos', value: metrics?.activeProducts ?? 0, helper: 'Disponiveis no catalogo' },
    { label: 'Produtos totais', value: metrics?.totalProducts ?? 0, helper: 'Itens cadastrados' },
    { label: 'Estoque total', value: metrics?.stockTotal ?? 0, helper: 'Soma de unidades' },
    { label: 'Baixo estoque', value: metrics?.lowStockProducts ?? 0, helper: 'Com 5 unidades ou menos' },
  ]

  return (
    <OwnerLayout>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h3">Dashboard</Typography>
          <Typography variant="body2" color="text.secondary">Visao geral do catalogo e operacoes.</Typography>
        </Box>
        <Button variant="contained" color="primary">Atualizar indicadores</Button>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Grid container spacing={3}>
        {cards.map((item) => (
          <Grid size={{ xs: 12, md: 3 }} key={item.label}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, borderColor: '#DDE3F2' }}>
              <Typography variant="subtitle2" color="text.secondary">{item.label}</Typography>
              <Typography variant="h4">{item.value}</Typography>
              <Typography variant="caption" color="text.secondary">{item.helper}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, borderColor: '#DDE3F2', minHeight: 260 }}>
            <Typography variant="h6" gutterBottom>Resumo financeiro do catalogo</Typography>
            <Box sx={{ height: 200, borderRadius: 2, bgcolor: '#F3F6FF', display: 'grid', placeItems: 'center' }}>
              <Stack spacing={0.5} alignItems="center">
                <Typography variant="body2" color="text.secondary">Preco medio cadastrado</Typography>
                <Typography variant="h3">R$ {(metrics?.averagePrice ?? 0).toFixed(2)}</Typography>
              </Stack>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, borderColor: '#DDE3F2', minHeight: 260 }}>
            <Typography variant="h6" gutterBottom>Alertas</Typography>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">• Produtos com baixo estoque: {metrics?.lowStockProducts ?? 0}</Typography>
              <Typography variant="body2" color="text.secondary">• Produtos ativos: {metrics?.activeProducts ?? 0}</Typography>
              <Typography variant="body2" color="text.secondary">• Total de estoque: {metrics?.stockTotal ?? 0}</Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </OwnerLayout>
  )
}
