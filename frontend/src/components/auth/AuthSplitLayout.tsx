import type { ReactNode } from 'react'
import { Box, Grid, Paper, Stack, Typography } from '@mui/material'
import { motion, useReducedMotion } from 'motion/react'
import BrandTireStrip from '../common/BrandTireStrip'

type AuthSplitLayoutProps = {
  eyebrow: string
  title: string
  description: string
  heroTitle: string
  heroDescription: string
  heroBackground: string
  heroPanelTitle: string
  heroPanelText: string
  form: ReactNode
}

export default function AuthSplitLayout(props: AuthSplitLayoutProps) {
  const {
    eyebrow,
    title,
    description,
    heroTitle,
    heroDescription,
    heroBackground,
    heroPanelTitle,
    heroPanelText,
    form,
  } = props
  const reduceMotion = useReducedMotion()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'rgba(255,255,255,0.86)' }}>
      <BrandTireStrip compact />
      <Grid
        container
        component={motion.div}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        sx={{ minHeight: { xs: 'calc(100vh - 28px)', md: 'calc(100vh - 34px)' }, bgcolor: 'rgba(255,255,255,0.86)' }}
      >
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{
            background: heroBackground,
            color: '#fff',
            p: { xs: 2.5, md: 4.5 },
            display: 'flex',
            alignItems: 'center',
            borderRight: { md: '1px solid rgba(255,255,255,0.08)' },
          }}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -14 }}
            animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
          >
            <Stack spacing={2.25} sx={{ maxWidth: 460 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.76)', letterSpacing: '0.12em' }}>
                {heroTitle}
              </Typography>
              <Typography variant="h2" sx={{ color: '#fff', letterSpacing: '-0.03em', maxWidth: 420 }}>
                {heroDescription}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9, maxWidth: 420 }}>
                {description}
              </Typography>
              <Box
                sx={{
                  p: 2.2,
                  borderRadius: 2.5,
                  bgcolor: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Typography variant="subtitle2" sx={{ color: '#fff', mb: 0.5 }}>
                  {heroPanelTitle}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.82 }}>
                  {heroPanelText}
                </Typography>
              </Box>
            </Stack>
          </motion.div>
        </Grid>

        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{
            p: { xs: 2.5, md: 4.5 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(248,251,249,0.95) 100%)',
          }}
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 14 }}
            animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            style={{ width: '100%', maxWidth: 430 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.25, md: 3 },
                width: '100%',
                maxWidth: 430,
                borderRadius: 3,
                border: '1px solid rgba(12,22,44,0.08)',
                bgcolor: 'rgba(255,255,255,0.92)',
              }}
            >
              <Typography variant="caption" color="primary" sx={{ letterSpacing: '0.12em' }} gutterBottom>
                {eyebrow}
              </Typography>
              <Typography variant="h4" gutterBottom sx={{ letterSpacing: '-0.03em' }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {description}
              </Typography>
              {form}
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  )
}
