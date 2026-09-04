import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import AppShell from '@/components/AppShell'
import { useAuth } from '@/lib/auth-context'

function RotaProtegida({ children }: { children: ReactNode }) {
  const { session, carregando } = useAuth()

  if (carregando) {
    return <p className="p-6">Carregando...</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <AppShell>{children}</AppShell>
}

export default RotaProtegida
