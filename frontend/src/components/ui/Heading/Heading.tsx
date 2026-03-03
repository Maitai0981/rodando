import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

export interface UiHeadingProps {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  sx?: SxProps<Theme>
}

export function UiHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  sx,
}: UiHeadingProps) {
  return (
    <Stack
      spacing={1}
      sx={[
        {
          textAlign: align,
          maxWidth: align === 'center' ? 720 : undefined,
          mx: align === 'center' ? 'auto' : 0,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {eyebrow ? (
        <Typography variant="overline" color="primary">
          {eyebrow}
        </Typography>
      ) : null}
      <Typography component="h2" variant="h2">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body1" color="text.secondary">
          {description}
        </Typography>
      ) : null}
    </Stack>
  )
}
