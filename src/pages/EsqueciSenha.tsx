import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthFrame from '@/components/AuthFrame'
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
    <AuthFrame title="Recuperar acesso" description="Informe seu e-mail para receber as instruções de recuperação.">
      <div className="space-y-5">

        {enviado ? (
          <p className="text-sm text-muted-foreground">
            Se esse e-mail estiver cadastrado, enviamos um link para redefinir a senha.
          </p>
        ) : (
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
            <Button type="submit" size="lg" disabled={enviando} className="w-full">
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
    </AuthFrame>
  )
}

export default EsqueciSenha
