import BarraProgresso from '@/components/ui/barra-progresso'
import { calcularFarol, calcularRitmoEsperado } from '@/lib/metas-utils'

interface CardTotalProps {
  titulo: string
  entregue: number
  metaMensal: number
  ehMesAtual: boolean
  hoje: Date
}

function CardTotal({ titulo, entregue, metaMensal, ehMesAtual, hoje }: CardTotalProps) {
  const ritmoEsperado = calcularRitmoEsperado(metaMensal, hoje)
  const farol = calcularFarol({ entregue, metaMensal, ritmoEsperado, ehMesAtual })
  const percentual = metaMensal > 0 ? (entregue / metaMensal) * 100 : 0

  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-3xl font-semibold">
        {entregue}
        <span className="text-base font-normal text-muted-foreground"> / {metaMensal}</span>
      </p>
      <p className="text-sm text-muted-foreground">{percentual.toFixed(0)}%</p>
      <div className="mt-3">
        <BarraProgresso percentual={percentual} farol={farol} />
      </div>
      {ehMesAtual && (
        <p className="mt-2 text-xs text-muted-foreground">Ritmo esperado até hoje: {ritmoEsperado}</p>
      )}
    </div>
  )
}

export default CardTotal
