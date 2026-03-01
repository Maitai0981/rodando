import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Typography } from '@mui/material'

type ActionGuardDialogProps = {
  open: boolean
  title: string
  description: string
  impacts?: string[]
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'primary' | 'error' | 'warning' | 'info' | 'success'
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ActionGuardDialog({
  open,
  title,
  description,
  impacts = [],
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmColor = 'primary',
  loading = false,
  onCancel,
  onConfirm,
}: ActionGuardDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {impacts.length > 0 ? (
          <List dense sx={{ mt: 1 }}>
            {impacts.map((impact) => (
              <ListItem key={impact} disableGutters>
                <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={`• ${impact}`} />
              </ListItem>
            ))}
          </List>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading} color="inherit">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={loading} variant="contained" color={confirmColor}>
          {loading ? 'Processando...' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
