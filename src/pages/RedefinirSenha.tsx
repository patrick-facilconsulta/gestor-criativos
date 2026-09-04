import type { FormEvent } from 'react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="flex min-h-svh items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Definir nova senha</h1>

        <div className="space-y-1">
          <label htmlFor="senha" className="text-sm">
            Nova senha
          </label>
          <input
            id="senha"
            type="password"
            required
            autoComplete="new-password"
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <Button type="submit" disabled={salvando} className="w-full">
          {salvando ? 'Salvando...' : 'Salvar nova senha'}
        </Button>
      </form>
    </div>
  )
}

export default RedefinirSenha
