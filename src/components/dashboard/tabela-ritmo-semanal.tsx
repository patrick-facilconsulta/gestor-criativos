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
  verde: 'bg-green-50 text-green-800',
  ambar: 'bg-amber-50 text-amber-800',
  vermelho: 'bg-red-50 text-red-800',
}

interface TabelaRitmoSemanalProps {
  frentes: Frente[]
  metas: Meta[]
  semanaPorFrente: Map<string, Criativo[]>
}

function TabelaRitmoSemanal({ frentes, metas, semanaPorFrente }: TabelaRitmoSemanalProps) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">Ritmo semanal</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Frente</TableHead>
            <TableHead>Vídeo</TableHead>
            <TableHead>Estático</TableHead>
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
                <TableCell>{frente.nome}</TableCell>
                <TableCell className={CORES_FAROL[calcularFarolSemanal(entregueVideo, metaVideo)]}>
                  {entregueVideo}/{metaVideo}
                </TableCell>
                <TableCell
                  className={CORES_FAROL[calcularFarolSemanal(entregueEstatico, metaEstatico)]}
                >
                  {entregueEstatico}/{metaEstatico}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default TabelaRitmoSemanal
