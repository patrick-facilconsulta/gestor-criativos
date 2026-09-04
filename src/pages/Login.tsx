import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthFrame from '@/components/AuthFrame'
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
    <AuthFrame title="Boas-vindas" description="Entre para acompanhar a produção criativa do seu time.">
      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-md border bg-white px-3 py-2.5 text-sm shadow-xs outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/15"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="senha" className="text-sm font-medium">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            required
            autoComplete="current-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            className="w-full rounded-md border bg-white px-3 py-2.5 text-sm shadow-xs outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/15"
          />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <Button type="submit" size="lg" disabled={enviando} className="w-full">
          {enviando ? 'Entrando...' : 'Entrar'}
        </Button>

        <Link
          to="/esqueci-senha"
          className="block text-center text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Esqueci minha senha
        </Link>
      </form>
    </AuthFrame>
  )
}

export default Login
