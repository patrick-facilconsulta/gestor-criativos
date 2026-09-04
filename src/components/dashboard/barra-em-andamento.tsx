import { useNavigate } from 'react-router-dom'
import type { StatusEmAndamento } from '@/hooks/use-contagem-em-andamento'
import { ROTULO_STATUS } from '@/lib/constantes'

interface BarraEmAndamentoProps {
  contagem: Record<StatusEmAndamento, number>
}

const STATUS_LISTA: StatusEmAndamento[] = ['backlog', 'producao', 'revisao']

const CORES: Record<StatusEmAndamento, string> = {
  backlog: 'bg-slate-400',
  producao: 'bg-blue-500',
  revisao: 'bg-purple-500',
}

function BarraEmAndamento({ contagem }: BarraEmAndamentoProps) {
  const navigate = useNavigate()
  const total = contagem.backlog + contagem.producao + contagem.revisao

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Em andamento</p>
      <div className="flex h-6 w-full gap-0.5">
        {STATUS_LISTA.map((status) => {
          const largura = total > 0 ? (contagem[status] / total) * 100 : 0
          if (largura === 0) return null
          return <div key={status} className={`h-full rounded-full ${CORES[status]}`} style={{ width: `${largura}%` }} />
        })}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        {STATUS_LISTA.map((status) => (
          <button
            key={status}
            type="button"
            className="flex items-center gap-1.5 underline-offset-2 hover:underline"
            onClick={() => navigate(`/criativos?status=${status}`)}
          >
            <span className={`size-2.5 rounded-full ${CORES[status]}`} />
            {ROTULO_STATUS[status]}: {contagem[status]}
          </button>
        ))}
      </div>
    </div>
  )
}

export default BarraEmAndamento
