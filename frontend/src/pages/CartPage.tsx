import { Box, Button, Grid, Paper, Stack, Typography } from '@mui/material'
import PublicLayout from '../layouts/PublicLayout'

export default function CartPage() {
  return (
    <PublicLayout>
      <Typography variant="h2" color="info.main" gutterBottom>Meu carrinho</Typography>
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={3}>
            {[1, 2].map((item) => (
              <Paper key={item} elevation={0} sx={{ p: 3, borderRadius: 4 }}>
                <Grid container spacing={3} alignItems="center">
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Box sx={{ width: 96, height: 96, bgcolor: '#F3F6F1', borderRadius: 3 }} />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="h6" color="info.main">Câmara de Ar Aro 18 Fina</Typography>
                    <Typography variant="body2" color="text.secondary">Aplicação: 275-18 / 90/90-18</Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                      <Button size="small" variant="outlined">-</Button>
                      <Button size="small" variant="outlined">1</Button>
                      <Button size="small" variant="outlined">+</Button>
                      <Button size="small" color="error">Remover</Button>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Typography variant="h6" sx={{ color: '#0B5F2A' }}>R$ 49,90</Typography>
                  </Grid>
                </Grid>
              </Paper>
            ))}
            <Button variant="text" color="primary">Continuar comprando peças</Button>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 4, position: { lg: 'sticky' }, top: { lg: 120 } }}>
            <Typography variant="h6" color="info.main" gutterBottom>Resumo do pedido</Typography>
            <Stack spacing={2} sx={{ mb: 3 }}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                <Typography variant="body2">R$ 99,80</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Frete</Typography>
                <Typography variant="body2" color="primary">Grátis</Typography>
              </Stack>
            </Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">Total</Typography>
              <Typography variant="h4" sx={{ color: '#0B5F2A' }}>R$ 99,80</Typography>
            </Stack>
            <Button fullWidth variant="contained" color="primary" size="large">Finalizar compra</Button>
            <Box className="float-animation" sx={{ mt: 4, display: 'grid', placeItems: 'center' }}>
              <Box component="img" src="/brand/rodando-mascot.svg" alt="Mascote" sx={{ width: 80, opacity: 0.35 }} />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Seu mascote cuidando do pedido
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </PublicLayout>
  )
}
