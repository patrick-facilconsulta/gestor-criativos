import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSalvarMetas } from '@/hooks/use-metas'
import { ROTULO_FORMATO } from '@/lib/constantes'
import type { Frente, Meta } from '@/types/database'

const ORDEM_FORMATO = ['video', 'estatico']

interface TabelaMetasProps {
  metas: Meta[]
  frentes: Frente[]
}

interface ValoresEditaveis {
  [metaId: string]: { meta_semanal: string; meta_mensal: string }
}

function valoresIniciais(metas: Meta[]): ValoresEditaveis {
  const valores: ValoresEditaveis = {}
  for (const meta of metas) {
    valores[meta.id] = {
      meta_semanal: String(meta.meta_semanal),
      meta_mensal: String(meta.meta_mensal),
    }
  }
  return valores
}

function TabelaMetas({ metas, frentes }: TabelaMetasProps) {
  const [valores, setValores] = useState<ValoresEditaveis>(() => valoresIniciais(metas))
  const salvarMetas = useSalvarMetas()

  useEffect(() => {
    setValores(valoresIniciais(metas))
  }, [metas])

  const nomePorFrenteId = new Map(frentes.map((frente) => [frente.id, frente.nome]))
  const ordemPorFrenteId = new Map(frentes.map((frente) => [frente.id, frente.ordem]))

  const metasOrdenadas = [...metas].sort((a, b) => {
    const ordemA = ordemPorFrenteId.get(a.frente_id) ?? 0
    const ordemB = ordemPorFrenteId.get(b.frente_id) ?? 0
    if (ordemA !== ordemB) return ordemA - ordemB
    return ORDEM_FORMATO.indexOf(a.formato) - ORDEM_FORMATO.indexOf(b.formato)
  })

  function atualizarCampo(metaId: string, campo: 'meta_semanal' | 'meta_mensal', valor: string) {
    setValores((atual) => ({
      ...atual,
      [metaId]: { ...atual[metaId], [campo]: valor },
    }))
  }

  async function handleSalvar() {
    const metasEditadas = metas.map((meta) => ({
      id: meta.id,
      meta_semanal: Number(valores[meta.id]?.meta_semanal ?? meta.meta_semanal),
      meta_mensal: Number(valores[meta.id]?.meta_mensal ?? meta.meta_mensal),
    }))

    await salvarMetas.mutateAsync(metasEditadas)
  }

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Frente</TableHead>
            <TableHead>Formato</TableHead>
            <TableHead>Meta semanal</TableHead>
            <TableHead>Meta mensal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {metasOrdenadas.map((meta) => (
            <TableRow key={meta.id}>
              <TableCell>{nomePorFrenteId.get(meta.frente_id) ?? '—'}</TableCell>
              <TableCell>{ROTULO_FORMATO[meta.formato]}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={valores[meta.id]?.meta_semanal ?? ''}
                  onChange={(event) => atualizarCampo(meta.id, 'meta_semanal', event.target.value)}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  className="w-24"
                  value={valores[meta.id]?.meta_mensal ?? ''}
                  onChange={(event) => atualizarCampo(meta.id, 'meta_mensal', event.target.value)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button onClick={handleSalvar} disabled={salvarMetas.isPending}>
        {salvarMetas.isPending ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}

export default TabelaMetas
