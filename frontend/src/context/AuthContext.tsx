import { createContext, startTransition, useContext, useEffect, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { api, ApiError, type AuthUser } from '../lib/api'

type SignInPayload = { email: string; password: string }
type SignUpPayload = {
  name: string
  email: string
  password: string
  cep: string
  addressStreet?: string
  addressCity?: string
  addressState?: string
}

type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

type AuthContextValue = {
  user: AuthUser | null
  status: AuthStatus
  refreshSession: () => Promise<AuthUser | null>
  signIn: (payload: SignInPayload) => Promise<AuthUser>
  signInOwner: (payload: SignInPayload) => Promise<AuthUser>
  signUp: (payload: SignUpPayload) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    let active = true

    void refresh().finally(() => {
      if (!active) return
    })

    return () => {
      active = false
    }
  }, [])

  async function refreshSession(): Promise<AuthUser | null> {
    return refresh()
  }

  async function refresh(): Promise<AuthUser | null> {
    try {
      const result = await api.me()
      if (!result.user) {
        startTransition(() => {
          setUser(null)
          setStatus('anonymous')
        })
        return null
      }
      startTransition(() => {
        setUser(result.user)
        setStatus('authenticated')
      })
      return result.user
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        startTransition(() => {
          setUser(null)
          setStatus('anonymous')
        })
        return null
      }
      startTransition(() => {
        setUser(null)
        setStatus('anonymous')
      })
      return null
    }
  }

  async function signIn(payload: SignInPayload): Promise<AuthUser> {
    const result = await api.signIn(payload)
    startTransition(() => {
      setUser(result.user)
      setStatus('authenticated')
    })
    return result.user
  }

  async function signUp(payload: SignUpPayload): Promise<AuthUser> {
    const result = await api.signUp(payload)
    startTransition(() => {
      setUser(result.user)
      setStatus('authenticated')
    })
    return result.user
  }

  async function signInOwner(payload: SignInPayload): Promise<AuthUser> {
    const result = await api.ownerSignIn(payload)
    startTransition(() => {
      setUser(result.user)
      setStatus('authenticated')
    })
    return result.user
  }

  async function logout(): Promise<void> {
    await api.logout()
    startTransition(() => {
      setUser(null)
      setStatus('anonymous')
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        refreshSession,
        signIn,
        signInOwner,
        signUp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
