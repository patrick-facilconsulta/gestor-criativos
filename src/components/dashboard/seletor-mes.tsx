import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface MesSelecionado {
  ano: number
  mes: number // 1-12
}

interface SeletorMesProps {
  mesSelecionado: MesSelecionado
  onMudarMes: (mes: MesSelecionado) => void
}

const NOMES_MES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function SeletorMes({ mesSelecionado, onMudarMes }: SeletorMesProps) {
  function irParaMesAnterior() {
    if (mesSelecionado.mes === 1) {
      onMudarMes({ ano: mesSelecionado.ano - 1, mes: 12 })
    } else {
      onMudarMes({ ano: mesSelecionado.ano, mes: mesSelecionado.mes - 1 })
    }
  }

  function irParaProximoMes() {
    if (mesSelecionado.mes === 12) {
      onMudarMes({ ano: mesSelecionado.ano + 1, mes: 1 })
    } else {
      onMudarMes({ ano: mesSelecionado.ano, mes: mesSelecionado.mes + 1 })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon-sm" onClick={irParaMesAnterior} title="Mês anterior">
        <ChevronLeft />
      </Button>
      <span className="w-36 text-center text-sm font-medium">
        {NOMES_MES[mesSelecionado.mes - 1]} {mesSelecionado.ano}
      </span>
      <Button variant="outline" size="icon-sm" onClick={irParaProximoMes} title="Próximo mês">
        <ChevronRight />
      </Button>
    </div>
  )
}

export default SeletorMes
