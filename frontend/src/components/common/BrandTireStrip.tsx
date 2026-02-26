import { Box } from '@mui/material'
import { motion, useReducedMotion } from 'motion/react'
import TireTrackStripe from './TireTrackStripe'

type BrandTireStripProps = {
  bleed?: boolean
  compact?: boolean
  mt?: number | string | { xs?: number | string; sm?: number | string; md?: number | string; lg?: number | string }
  mb?: number | string | { xs?: number | string; sm?: number | string; md?: number | string; lg?: number | string }
  rounded?: boolean
}

export default function BrandTireStrip({
  bleed = false,
  compact = true,
  mt = 0,
  mb = 0,
  rounded = false,
}: BrandTireStripProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'relative',
          mx: bleed ? { xs: -1.5, sm: -2.5, md: -3 } : 0,
          mt,
          mb,
          height: compact ? { xs: 28, md: 34 } : { xs: 36, md: 46 },
          overflow: 'hidden',
          borderRadius: rounded ? { xs: 0, md: 2 } : 0,
          pointerEvents: 'none',
          borderTop: '1px solid rgba(255,255,255,0.035)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'linear-gradient(180deg, rgba(11,11,11,0.9) 0%, rgba(11,11,11,0.96) 42%, rgba(11,11,11,0.92) 100%)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.015), inset 0 -1px 0 rgba(255,255,255,0.015)',
          '&::after': {
            content: '""',
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'linear-gradient(90deg, rgba(11,11,11,0.12) 0%, rgba(11,11,11,0) 10%, rgba(11,11,11,0) 90%, rgba(11,11,11,0.12) 100%)',
          },
        }}
      >
        <TireTrackStripe
          w={2400}
          h={140}
          bg="transparent"
          ink="#0b0b0b"
          rubber="#f2f2ea"
          speed={reduceMotion ? 22 : 170}
          wearOpacity={0.62}
          seed={9}
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: 'calc(100% + 240px)',
            transform: 'translate(-50%, -50%)',
            opacity: compact ? 0.54 : 0.62,
            filter: 'none',
            pointerEvents: 'none',
          }}
        />
      </Box>
    </motion.div>
  )
}
