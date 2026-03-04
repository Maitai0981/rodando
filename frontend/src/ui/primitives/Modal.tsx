import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import type { ModalProps } from '../types'

function getMaxWidth(size: NonNullable<ModalProps['size']>) {
  if (size === 'sm') return 'sm'
  if (size === 'lg') return 'lg'
  return 'md'
}

export function Modal({ open, title, onClose, size = 'md', actions, children }: ModalProps) {
  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          onClose()
        }
      }}
      maxWidth={getMaxWidth(size)}
      fullWidth
      aria-modal="true"
      role="dialog"
    >
      {title ? <DialogTitle>{title}</DialogTitle> : null}
      <DialogContent>{children}</DialogContent>
      {actions ? <DialogActions>{actions}</DialogActions> : null}
    </Dialog>
  )
}
