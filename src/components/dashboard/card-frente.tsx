import BarraProgresso from '@/components/ui/barra-progresso'
import { calcularFarol, calcularRitmoEsperado } from '@/lib/metas-utils'

interface LinhaFormato {
  rotulo: string
  entregue: number
  metaMensal: number
}

interface CardFrenteProps {
  nomeFrente: string
  linhas: LinhaFormato[]
  ehMesAtual: boolean
  hoje: Date
}

function CardFrente({ nomeFrente, linhas, ehMesAtual, hoje }: CardFrenteProps) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="font-medium">{nomeFrente}</p>
      {linhas.map((linha) => {
        const ritmoEsperado = calcularRitmoEsperado(linha.metaMensal, hoje)
        const farol = calcularFarol({
          entregue: linha.entregue,
          metaMensal: linha.metaMensal,
          ritmoEsperado,
          ehMesAtual,
        })

        return (
          <div key={linha.rotulo}>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{linha.rotulo}</span>
              <span>
                {linha.entregue}/{linha.metaMensal}
              </span>
            </div>
            <BarraProgresso
              percentual={linha.metaMensal > 0 ? (linha.entregue / linha.metaMensal) * 100 : 0}
              farol={farol}
            />
          </div>
        )
      })}
    </div>
  )
}

export default CardFrente
