import { useState } from 'react'
import type { FormEvent } from 'react'
import { Mail, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'

const ADMIN_EMAIL = 'patrick@facilconsulta.com.br'

function ConvidarUsuario() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (session?.user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return null
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setEnviando(true)

    const { error } = await supabase.functions.invoke('convidar-usuario', {
      body: {
        email: email.trim(),
        redirectTo: `${window.location.origin}/redefinir-senha`,
      },
    })

    setEnviando(false)

    if (error) {
      toast.error('Não foi possível enviar o convite. O e-mail pode já estar cadastrado.')
      return
    }

    setEmail('')
    toast.success('Convite enviado por e-mail.')
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#e1efff] text-[#0d559f]">
          <UserPlus className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Usuários</h2>
          <p className="mt-1 text-sm text-muted-foreground">Envie um convite para uma pessoa acessar o sistema.</p>
        </div>
      </div>

      <form className="mt-5 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end" onSubmit={handleSubmit}>
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="email-novo-usuario">E-mail do novo usuário</Label>
          <Input
            id="email-novo-usuario"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={enviando || email.trim() === ''}>
          <Mail />
          {enviando ? 'Enviando...' : 'Enviar convite'}
        </Button>
      </form>
    </section>
  )
}

export default ConvidarUsuario