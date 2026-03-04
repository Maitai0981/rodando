import MuiSkeleton from '@mui/material/Skeleton'
import type { SkeletonProps } from '../types'

function mapVariant(variant: NonNullable<SkeletonProps['variant']>) {
  if (variant === 'rect') return 'rounded'
  if (variant === 'circle') return 'circular'
  return variant
}

export function Skeleton({ width = '100%', height, variant = 'text', animated = true, ...props }: SkeletonProps) {
  return (
    <MuiSkeleton
      {...props}
      variant={mapVariant(variant)}
      width={width}
      height={height}
      animation={animated ? 'wave' : false}
    />
  )
}
