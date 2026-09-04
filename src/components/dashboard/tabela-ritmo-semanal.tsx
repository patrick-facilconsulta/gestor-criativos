import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { calcularFarolSemanal } from '@/lib/metas-utils'
import type { Farol } from '@/lib/metas-utils'
import type { Criativo, Frente, Meta } from '@/types/database'

const CORES_FAROL: Record<Farol, string> = {
  verde: 'bg-green-50 text-green-800 ring-green-200',
  ambar: 'bg-amber-50 text-amber-800 ring-amber-200',
  vermelho: 'bg-red-50 text-red-800 ring-red-200',
}

interface TabelaRitmoSemanalProps {
  frentes: Frente[]
  metas: Meta[]
  semanaPorFrente: Map<string, Criativo[]>
}

function TabelaRitmoSemanal({ frentes, metas, semanaPorFrente }: TabelaRitmoSemanalProps) {
  return (
    <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/2 px-5">Frente</TableHead>
            <TableHead className="w-1/4 text-center">Vídeo</TableHead>
            <TableHead className="w-1/4 text-center">Estático</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {frentes.map((frente) => {
            const criativosDaFrente = semanaPorFrente.get(frente.id) ?? []
            const metasDaFrente = metas.filter((meta) => meta.frente_id === frente.id)
            const metaVideo = metasDaFrente.find((meta) => meta.formato === 'video')?.meta_semanal ?? 0
            const metaEstatico =
              metasDaFrente.find((meta) => meta.formato === 'estatico')?.meta_semanal ?? 0
            const entregueVideo = criativosDaFrente.filter((c) => c.formato === 'video').length
            const entregueEstatico = criativosDaFrente.filter((c) => c.formato === 'estatico').length

            return (
              <TableRow key={frente.id}>
                <TableCell className="truncate px-5 font-medium">{frente.nome}</TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex min-w-16 justify-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${CORES_FAROL[calcularFarolSemanal(entregueVideo, metaVideo)]}`}>
                    {entregueVideo}/{metaVideo}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex min-w-16 justify-center rounded-md px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${CORES_FAROL[calcularFarolSemanal(entregueEstatico, metaEstatico)]}`}>
                    {entregueEstatico}/{metaEstatico}
                  </span>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
  )
}

export default TabelaRitmoSemanal
