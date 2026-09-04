import type { Session } from '@supabase/supabase-js'
import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

interface AuthContextValue {
  session: Session | null
  carregando: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSession(novaSessao)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ session, carregando }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider')
  }
  return context
}
