import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setEnviando(true)

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })

    setEnviando(false)
    // Não revelamos se o e-mail existe ou não na base, por segurança.
    setEnviado(true)
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Esqueci minha senha</h1>

        {enviado ? (
          <p className="text-sm text-muted-foreground">
            Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" disabled={enviando} className="w-full">
              {enviando ? 'Enviando...' : 'Enviar link de recuperação'}
            </Button>
          </form>
        )}

        <Link
          to="/login"
          className="block text-center text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    </div>
  )
}

export default EsqueciSenha
