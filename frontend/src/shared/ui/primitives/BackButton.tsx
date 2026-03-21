import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export function BackButton({ label = 'Voltar' }: { label?: string }) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-1 text-sm text-[#a0a0a0] hover:text-[#d4a843] transition-colors mb-4"
    >
      <ChevronLeft className="w-4 h-4" />
      {label}
    </button>
  )
}
