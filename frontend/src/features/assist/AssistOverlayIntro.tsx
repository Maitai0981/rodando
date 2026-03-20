import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Typography } from '@mui/material'
import { useAssist } from '../../shared/context/AssistContext'

export function AssistOverlayIntro() {
  const { enabled, activeRoute, activeRouteState, markOverlaySeen } = useAssist()

  const open = enabled
    && Boolean(activeRoute)
    && Boolean(activeRoute?.overlayIntro?.length)
    && !activeRouteState.overlaySeen

  if (!activeRoute) return null

  return (
    <Dialog
      open={open}
      onClose={() => markOverlaySeen(activeRoute.key)}
      maxWidth="sm"
      fullWidth
      aria-labelledby="assist-overlay-title"
      data-testid="assist-overlay-intro"
    >
      <DialogTitle id="assist-overlay-title">Guia rápido: {activeRoute.title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.2 }}>
          Siga estes passos curtos para evitar erro e concluir mais rápido.
        </Typography>
        <List dense disablePadding>
          {activeRoute.overlayIntro.slice(0, 3).map((line, index) => (
            <ListItem key={`${activeRoute.key}-overlay-${index}`} disableGutters>
              <ListItemText
                primaryTypographyProps={{ variant: 'body2' }}
                primary={`${index + 1}. ${line}`}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => markOverlaySeen(activeRoute.key)} color="inherit">
          Pular agora
        </Button>
        <Button onClick={() => markOverlaySeen(activeRoute.key)} variant="contained" color="primary" autoFocus>
          Entendi
        </Button>
      </DialogActions>
    </Dialog>
  )
}
