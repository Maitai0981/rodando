import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function BackButton({
  label = 'Voltar',
  fallback = '/',
  onClick,
}: {
  label?: string
  fallback?: string
  onClick?: () => void
}) {
  const navigate = useNavigate()

  function handleClick() {
    if (onClick) {
      onClick()
      return
    }
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-sm text-[#a0a0a0] hover:text-[#d4a843] transition-colors mb-4"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </button>
  )
}
