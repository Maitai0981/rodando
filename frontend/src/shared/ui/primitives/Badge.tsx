import type { UiTone } from '../types'
import type { ReactNode } from 'react'

const toneClasses: Record<UiTone, string> = {
  default: 'bg-white/[0.06] text-[#9ca3af] border border-white/[0.1]',
  accent: 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/30',
  gold: 'bg-[#d4a843]/10 text-[#d4a843] border border-[#d4a843]/30',
  success: 'bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20',
  warning: 'bg-amber-500/[0.15] text-amber-400 border border-amber-500/30',
  danger: 'bg-[#ef4444]/10 text-[#f87171] border border-[#ef4444]/20',
  neutral: 'bg-white/[0.04] text-[#6b7280] border border-white/[0.08]',
}

export function Badge({
  label,
  tone = 'default',
}: {
  label: string
  tone?: UiTone
}) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${toneClasses[tone]}`}>
      {label}
    </span>
  )
}

export function CounterBadge({
  content,
  children,
}: {
  content: number
  children: ReactNode
}) {
  return (
    <span className="relative inline-flex">
      {children}
      {content > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-[#d4a843] text-black text-[10px] font-black px-1">
          {content > 99 ? '99+' : content}
        </span>
      ) : null}
    </span>
  )
}
