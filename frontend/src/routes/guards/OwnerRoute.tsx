import type { PropsWithChildren } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../shared/context/AuthContext'

export function OwnerRoute({ children }: PropsWithChildren) {
  const { status, user } = useAuth()

  if (status === 'loading') {
    return (
      <div className="min-h-screen grid place-items-center gap-3 bg-[#0a0a0f] text-[#9ca3af]">
        <div className="w-6 h-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
        <span className="text-sm">Validando acesso...</span>
      </div>
    )
  }

  if (status !== 'authenticated') {
    return <Navigate to="/owner" replace />
  }

  if (user?.role !== 'owner') {
    return <Navigate to="/" replace />
  }

  return children != null ? <>{children}</> : <Outlet />
}
