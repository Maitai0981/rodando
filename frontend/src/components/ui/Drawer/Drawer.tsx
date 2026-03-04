import MuiDrawer from '@mui/material/Drawer'
import type { DrawerProps as MuiDrawerProps } from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { CloseRoundedIcon } from '@/ui/primitives/Icon'

export interface UiDrawerProps extends Omit<MuiDrawerProps, 'children'> {
  headerTitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function UiDrawer({
  headerTitle,
  children,
  footer,
  onClose,
  PaperProps,
  ...props
}: UiDrawerProps) {
  return (
    <MuiDrawer
      {...props}
      onClose={onClose}
      PaperProps={{
        ...PaperProps,
        sx: [
          {
            width: 'min(82vw, 332px)',
          },
          ...(Array.isArray(PaperProps?.sx) ? PaperProps.sx : [PaperProps?.sx]),
        ],
      }}
    >
      <Stack sx={{ height: '100%' }}>
        {headerTitle ? (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="subtitle1">{headerTitle}</Typography>
            <IconButton aria-label="Fechar menu" onClick={(event) => onClose?.(event, 'escapeKeyDown')}>
              <CloseRoundedIcon size="md" />
            </IconButton>
          </Stack>
        ) : null}
        <Stack sx={{ p: 2, flexGrow: 1 }}>{children}</Stack>
        {footer ? (
          <Stack sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>{footer}</Stack>
        ) : null}
      </Stack>
    </MuiDrawer>
  )
}
