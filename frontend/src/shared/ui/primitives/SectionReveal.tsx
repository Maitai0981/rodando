import type { MotionRevealProps } from './MotionReveal'
import { MotionReveal } from './MotionReveal'

export type SectionRevealProps = MotionRevealProps

export function SectionReveal(props: SectionRevealProps) {
  return <MotionReveal {...props} />
}

