import { Box, Grid, Paper, Stack, Typography } from '@mui/material'
import PublicLayout from '../layouts/PublicLayout'

const cards = [
  { title: 'Aro 18 Fina', app: '275-18 / 90/90-18 / 80/100-18 / 300-18' },
  { title: 'Aro 17 Fina', app: '250-17 / 60/100-17 / 225-17 / 275-17' },
  { title: 'Aro 14 Fina', app: '80/100-14 / 110/80-14 / 250-14 / 300-14' },
  { title: 'Aro 17 Larga', app: '300-17 / 130/70-17 / 140/70-17' },
  { title: 'Aro 18 Larga', app: '400-18 / 120/80-18 / 130/80-18' },
  { title: 'Aro 21 Larga', app: '90/90-21 / 80/100-21 / 275-21' }
]

export default function TechnicalPage() {
  return (
    <PublicLayout>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems={{ md: 'center' }} sx={{ mb: 6 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h2" color="info.main" gutterBottom>Medidas e aplicações</Typography>
          <Typography variant="body1" color="text.secondary">
            Ao selecionar uma câmara de ar para sua moto, utilize as medidas corretas para garantir segurança e performance.
          </Typography>
        </Box>
        <Box className="float-animation" sx={{ width: 120, height: 120, borderRadius: '50%', bgcolor: '#FFFFFF', display: 'grid', placeItems: 'center', border: '2px solid #FFCC00' }}>
          <Box component="img" src="/brand/rodando-mascot.svg" alt="Mascote" sx={{ width: 64, opacity: 0.8 }} />
        </Box>
      </Stack>

      <Grid container spacing={3}>
        {cards.map((item) => (
          <Grid size={{ xs: 12, md: 4 }} key={item.title}>
            <Paper elevation={0} sx={{ p: 3.5, borderRadius: 4, borderBottom: '4px solid #0B5F2A' }}>
              <Typography variant="subtitle2" color="primary">Câmara de Ar</Typography>
              <Typography variant="h6" sx={{ fontStyle: 'italic', color: '#0B3D91', mb: 2 }}>{item.title}</Typography>
              <Typography variant="caption" color="text.secondary">Aplicação</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{item.app}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </PublicLayout>
  )
}
