import type { ReactNode } from 'react'
import { BarChart3, FileUp, LogOut, Settings2, Sparkles } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import logoPrimario from '../../docs/Logotipo primário.svg'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const navegacao = [
  { to: '/criativos', label: 'Criativos', icon: Sparkles },
  { to: '/entregas', label: 'Entregas', icon: FileUp },
  { to: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings2 },
]

function AppShell({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const email = session?.user.email ?? 'Conta'

  return (
    <div className="min-h-svh bg-[#f7faff]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[#dce6f2] bg-white lg:flex">
        <div className="flex h-20 items-center px-6">
          <img src={logoPrimario} alt="Fácil Consulta" className="h-10 w-auto" />
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 pt-4">
          {navegacao.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#e1efff] text-[#0d559f]'
                    : 'text-[#596579] hover:bg-[#f0f5fb] hover:text-[#0e1628]'
                }`
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-[#dce6f2] p-4">
          <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start text-muted-foreground"
            onClick={() => supabase.auth.signOut()}
          >
            <LogOut />
            Sair
          </Button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-[#dce6f2] bg-white/95 px-4 backdrop-blur lg:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
          <img src={logoPrimario} alt="Fácil Consulta" className="h-8 w-auto" />
          <Button variant="ghost" size="icon" title="Sair" onClick={() => supabase.auth.signOut()}>
            <LogOut />
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-2">
          {navegacao.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${
                  isActive ? 'bg-[#e1efff] text-[#0d559f]' : 'text-muted-foreground'
                }`
              }
            >
              <Icon className="size-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">{children}</main>
    </div>
  )
}

export default AppShell