import { Button, Paper, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

type TaskEmptyStateGuideProps = {
  title: string
  description: string
  ctaLabel: string
  onCtaClick?: () => void
  ctaComponent?: ReactNode
}

export function TaskEmptyStateGuide({
  title,
  description,
  ctaLabel,
  onCtaClick,
  ctaComponent,
}: TaskEmptyStateGuideProps) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.8, md: 2.2 },
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        textAlign: 'center',
      }}
    >
      <Stack spacing={1.1} alignItems="center">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {ctaComponent || (
          <Button variant="contained" color="primary" onClick={onCtaClick}>
            {ctaLabel}
          </Button>
        )}
      </Stack>
    </Paper>
  )
}
