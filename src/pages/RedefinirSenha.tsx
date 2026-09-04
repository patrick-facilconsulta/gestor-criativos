import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthFrame from '@/components/AuthFrame'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

function RedefinirSenha() {
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro(null)

    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.')
      return
    }

    setSalvando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setSalvando(false)

    if (error) {
      setErro('Não foi possível salvar a nova senha. O link pode ter expirado — peça um novo em "Esqueci minha senha".')
      return
    }

    navigate('/criativos')
  }

  return (
    <AuthFrame title="Definir nova senha" description="Escolha uma senha segura para continuar usando a plataforma.">
      <form onSubmit={handleSubmit} className="space-y-5">

        <div className="space-y-2">
          <label htmlFor="senha" className="text-sm font-medium">
            Nova senha
          </label>
          <input
            id="senha"
            type="password"
            required
            autoComplete="new-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            className="w-full rounded-md border bg-white px-3 py-2.5 text-sm shadow-xs outline-none transition-shadow focus:border-primary focus:ring-3 focus:ring-primary/15"
          />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <Button type="submit" size="lg" disabled={salvando} className="w-full">
          {salvando ? 'Salvando...' : 'Salvar nova senha'}
        </Button>
      </form>
    </AuthFrame>
  )
}

export default RedefinirSenha
