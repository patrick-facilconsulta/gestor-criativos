import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { Alerta } from '@/lib/producao-utils'

// Substitui o bloco fixo "Antes de seguir o plano" do cronograma original: em vez
// de um texto escrito à mão, os avisos saem do estado real do mês.
function PainelAlertas({ alertas }: { alertas: Alerta[] }) {
  if (alertas.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-[#bfe3ca] bg-[#e9f6ee] px-4 py-3">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#187a3b]" />
        <p className="text-sm text-[#187a3b]">
          O plano do mês fecha: toda semana tem dia presencial e a meta de vídeos está
          distribuída.
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {alertas.map((alerta) => {
        const critico = alerta.nivel === 'critico'
        const Icone = critico ? AlertTriangle : Info

        return (
          <li
            key={alerta.texto}
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 ${
              critico
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <Icone className="mt-0.5 size-4 shrink-0" />
            <p className="text-sm">{alerta.texto}</p>
          </li>
        )
      })}
    </ul>
  )
}

export default PainelAlertas
