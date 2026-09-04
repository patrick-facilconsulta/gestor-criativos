import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

function Login() {
  const { session, carregando } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!carregando && session) {
    return <Navigate to="/criativos" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)
    setEnviando(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    setEnviando(false)

    if (error) {
      setErro('E-mail ou senha inválidos.')
      return
    }

    navigate('/criativos')
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Entrar</h1>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="senha" className="text-sm">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Entrando...' : 'Entrar'}
        </Button>

        <Link
          to="/esqueci-senha"
          className="block text-center text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </form>
    </div>
  )
}

export default Login
