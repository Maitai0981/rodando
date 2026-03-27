import MuiAlert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import type { ToastProps } from '../types'

function mapTone(tone: NonNullable<ToastProps['tone']>) {
  if (tone === 'error') return 'error'
  if (tone === 'warning') return 'warning'
  if (tone === 'success') return 'success'
  return 'info'
}

export function Toast({
  open,
  tone = 'info',
  title,
  message,
  onClose,
  durationMs,
}: ToastProps) {
  const effectiveDuration = durationMs ?? (tone === 'error' ? 5000 : 2800)
  return (
    <Snackbar open={open} autoHideDuration={effectiveDuration} onClose={onClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <MuiAlert
        severity={mapTone(tone)}
        onClose={onClose}
        variant="filled"
        role="status"
        aria-live="polite"
        sx={{ minWidth: 300 }}
      >
        {title ? <strong>{title}: </strong> : null}
        {message}
      </MuiAlert>
    </Snackbar>
  )
}
