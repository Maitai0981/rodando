import MuiAlert from '@mui/material/Alert'
import Typography from '@mui/material/Typography'
import type { AlertProps } from '../types'

function mapTone(tone: NonNullable<AlertProps['tone']>) {
  if (tone === 'error') return 'error'
  if (tone === 'warning') return 'warning'
  if (tone === 'success') return 'success'
  return 'info'
}

export function Alert({ tone = 'info', title, children, ...props }: AlertProps) {
  return (
    <MuiAlert
      className={props.className}
      id={props.id}
      style={props.style}
      severity={mapTone(tone)}
      variant="outlined"
      role="alert"
      aria-live="polite"
    >
      {title ? <Typography component="p" sx={{ fontWeight: 700, mb: 0.4 }}>{title}</Typography> : null}
      {children}
    </MuiAlert>
  )
}
