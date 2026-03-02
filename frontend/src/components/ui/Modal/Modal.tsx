import Dialog from '@mui/material/Dialog'
import type { DialogProps } from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

export interface UiModalProps extends Omit<DialogProps, 'title'> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export function UiModal({
  title,
  description,
  actions,
  children,
  ...props
}: UiModalProps) {
  return (
    <Dialog fullWidth maxWidth="sm" {...props}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        ) : null}
        {children}
      </DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </Dialog>
  )
}
