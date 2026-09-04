import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { useAdicionarFrente, useAlternarFrenteAtiva, useRenomearFrente } from '@/hooks/use-frentes'
import type { Frente } from '@/types/database'

interface LinhaFrenteProps {
  frente: Frente
}

function LinhaFrente({ frente }: LinhaFrenteProps) {
  const [nome, setNome] = useState(frente.nome)
  const renomear = useRenomearFrente()
  const alternarAtiva = useAlternarFrenteAtiva()

  function salvarNomeSeMudou() {
    const nomeAparado = nome.trim()
    if (nomeAparado !== '' && nomeAparado !== frente.nome) {
      renomear.mutate({ id: frente.id, nome: nomeAparado })
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Input
        value={nome}
        onChange={(event) => setNome(event.target.value)}
        onBlur={salvarNomeSeMudou}
        className="max-w-64"
      />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={frente.ativa}
          onCheckedChange={(valor) => alternarAtiva.mutate({ id: frente.id, ativa: valor === true })}
        />
        Ativa
      </label>
    </div>
  )
}

interface ListaFrentesProps {
  frentes: Frente[]
}

function ListaFrentes({ frentes }: ListaFrentesProps) {
  const [novoNome, setNovoNome] = useState('')
  const adicionarFrente = useAdicionarFrente()

  async function handleAdicionar(event: FormEvent) {
    event.preventDefault()

    if (novoNome.trim() === '') {
      return
    }

    await adicionarFrente.mutateAsync(novoNome.trim())
    setNovoNome('')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {frentes.map((frente) => (
          <LinhaFrente key={frente.id} frente={frente} />
        ))}
      </div>

      <form onSubmit={handleAdicionar} className="flex gap-2">
        <Input
          placeholder="Nome da nova frente"
          value={novoNome}
          onChange={(event) => setNovoNome(event.target.value)}
          className="max-w-64"
        />
        <Button type="submit" disabled={adicionarFrente.isPending}>
          Adicionar frente
        </Button>
      </form>
    </div>
  )
}

export default ListaFrentes
