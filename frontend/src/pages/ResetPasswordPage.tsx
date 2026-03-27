// Este fluxo foi migrado para ForgotPasswordPage (código OTP por email).
// Esta rota redireciona para manter compatibilidade com links antigos.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  useEffect(() => { navigate('/auth/forgot-password', { replace: true }) }, [navigate])
  return null
}
