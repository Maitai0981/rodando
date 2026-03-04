import { useMemo, useState } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import { ChevronLeftRoundedIcon, ChevronRightRoundedIcon } from '@/ui/primitives/Icon'
import { ResponsiveImage } from '../primitives/ResponsiveImage'

export function ProductGallery({
  mainUrl,
  hoverUrl,
  extra = [],
  alt,
}: {
  mainUrl: string
  hoverUrl?: string | null
  extra?: string[]
  alt: string
}) {
  const images = useMemo(() => {
    const uniq = new Set<string>()
    for (const image of [mainUrl, hoverUrl || '', ...extra]) {
      const value = String(image || '').trim()
      if (value) uniq.add(value)
    }
    return Array.from(uniq)
  }, [mainUrl, hoverUrl, extra])

  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = images[activeIndex] || mainUrl

  function prev() {
    setActiveIndex((current) => (current <= 0 ? images.length - 1 : current - 1))
  }

  function next() {
    setActiveIndex((current) => (current >= images.length - 1 ? 0 : current + 1))
  }

  return (
    <Stack spacing={1.2}>
      <Box sx={{ position: 'relative', borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'grey.100', minHeight: { xs: 260, md: 420 } }}>
        <ResponsiveImage
          src={activeImage}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          sizes="(max-width: 900px) 100vw, 60vw"
        />
        {images.length > 1 ? (
          <>
            <IconButton aria-label="Imagem anterior" onClick={prev} sx={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.92)' }}>
              <ChevronLeftRoundedIcon size="md" />
            </IconButton>
            <IconButton aria-label="Proxima imagem" onClick={next} sx={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', bgcolor: 'rgba(255,255,255,0.92)' }}>
              <ChevronRightRoundedIcon size="md" />
            </IconButton>
          </>
        ) : null}
      </Box>

      {images.length > 1 ? (
        <Grid container spacing={1}>
          {images.map((image, index) => (
            <Grid key={`${image}-${index}`} size={{ xs: 3 }}>
              <Box
                component="button"
                onClick={() => setActiveIndex(index)}
                aria-label={`Imagem ${index + 1}`}
                sx={{
                  display: 'block',
                  p: 0,
                  width: '100%',
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '2px solid',
                  borderColor: index === activeIndex ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  background: 'transparent',
                }}
              >
                <ResponsiveImage
                  src={image}
                  alt={`${alt} miniatura ${index + 1}`}
                  sizes="(max-width: 900px) 25vw, 8vw"
                  sx={{ width: '100%', aspectRatio: '1 / 1' }}
                />
              </Box>
            </Grid>
          ))}
        </Grid>
      ) : null}
    </Stack>
  )
}
