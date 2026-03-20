import Box from '@mui/material/Box'
import type { PropsWithChildren } from 'react'

export function Section({ children, id }: PropsWithChildren<{ id?: string }>) {
  return (
    <Box id={id} component="section" sx={{ py: { xs: 2.2, md: 3.5 } }}>
      {children}
    </Box>
  )
}
