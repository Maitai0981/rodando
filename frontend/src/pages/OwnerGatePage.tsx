import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../shared/context/AuthContext'

export default function OwnerGatePage() {
  const navigate = useNavigate()
  const { user, status } = useAuth()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (user?.role === 'owner') {
      navigate('/owner/dashboard', { replace: true })
    }
  }, [navigate, status, user])

  const checking = status === 'loading'

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-[#0a0a0f]">
      <div className="p-6 rounded-2xl w-full max-w-lg bg-white/[0.03] border border-white/[0.06]">
        <p className="text-xs uppercase tracking-widest text-[#d4a843] font-semibold">Owner Access</p>
        <h1 className="text-2xl mt-2 text-[#f0ede8] font-bold">Area administrativa de produtos</h1>
        <p className="text-sm mt-2 text-[#6b7280]">O acesso ao painel e feito em rota dedicada para owner.</p>

        {checking ? (
          <div className="mt-4 p-3 rounded-lg text-sm bg-[#d4a843]/[0.08] border border-[#d4a843]/20 text-[#d4a843]">
            Verificando sessao atual...
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Link to="/owner/login" className="flex-1 px-4 py-2 rounded-xl text-sm text-black text-center bg-gradient-to-br from-[#d4a843] to-[#f0c040] font-bold">
            Entrar como owner
          </Link>
          <Link to="/auth" className="flex-1 px-4 py-2 rounded-xl text-sm text-center border border-[#d4a843]/40 text-[#d4a843]">
            Area de cliente
          </Link>
        </div>
      </div>
    </div>
  )
}
