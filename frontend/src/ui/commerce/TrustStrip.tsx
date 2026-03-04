import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { LocalShippingRoundedIcon, SupportAgentRoundedIcon, VerifiedRoundedIcon } from '@/ui/primitives/Icon'

const TRUST_ITEMS = [
  {
    title: 'Compra segura',
    note: 'Produtos com procedencia validada e politica transparente.',
    icon: VerifiedRoundedIcon,
  },
  {
    title: 'Envio rapido',
    note: 'Despacho agil para reduzir tempo de moto parada.',
    icon: LocalShippingRoundedIcon,
  },
  {
    title: 'Suporte tecnico',
    note: 'Atendimento consultivo para aplicacao correta.',
    icon: SupportAgentRoundedIcon,
  },
]

export function TrustStrip() {
  return (
    <Grid container spacing={1.2}>
      {TRUST_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <Grid key={item.title} size={{ xs: 12, md: 4 }}>
            <Paper elevation={0} sx={{ p: 1.4, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Stack direction="row" spacing={1}>
                <Icon tone="warning" size="md" />
                <Stack spacing={0.4}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{item.note}</Typography>
                </Stack>
              </Stack>
            </Paper>
          </Grid>
        )
      })}
    </Grid>
  )
}
