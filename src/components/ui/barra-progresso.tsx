import type { Farol } from '@/lib/metas-utils'

const CORES_FAROL: Record<Farol, string> = {
  verde: 'bg-green-600',
  ambar: 'bg-amber-500',
  vermelho: 'bg-red-600',
}

const ROTULOS_FAROL: Record<Farol, string> = {
  verde: 'No ritmo',
  ambar: 'Atenção',
  vermelho: 'Abaixo do ritmo',
}

interface BarraProgressoProps {
  percentual: number
  farol: Farol
}

function BarraProgresso({ percentual, farol }: BarraProgressoProps) {
  const largura = Math.max(0, Math.min(100, percentual))

  return (
    <div className="space-y-1">
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${CORES_FAROL[farol]}`} style={{ width: `${largura}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{ROTULOS_FAROL[farol]}</span>
    </div>
  )
}

export default BarraProgresso
