import type { ResumoSemana } from '@/lib/producao-utils'
import type { TipoDia } from '@/types/database'
import CardDia from './card-dia'

interface SemanaCronogramaProps {
  resumo: ResumoSemana
  onAlternarTipo: (data: string, tipo: TipoDia) => void
  onAbrirPauta: (data: string) => void
  desabilitado: boolean
}

function SemanaCronograma({
  resumo,
  onAlternarTipo,
  onAbrirPauta,
  desabilitado,
}: SemanaCronogramaProps) {
  const semPresencial = resumo.metaVideo > 0 && resumo.diasPresenciais.length === 0

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-1.5">
        <h3 className="text-sm font-semibold">{resumo.semana.rotulo}</h3>
        <span className="text-xs text-muted-foreground">{resumo.semana.intervaloLabel}</span>
        <span className="ml-auto flex gap-3 text-xs tabular-nums">
          <span className="text-[#0d559f]">{resumo.metaVideo} vídeos</span>
          <span className="text-amber-700">{resumo.metaEstatico} estáticos</span>
          <span className="text-muted-foreground">
            {resumo.diasPresenciais.length}{' '}
            {resumo.diasPresenciais.length === 1 ? 'presencial' : 'presenciais'}
          </span>
        </span>
      </div>

      {semPresencial && (
        <p className="rounded-md bg-red-50 px-3 py-1.5 text-xs text-red-800">
          Nenhum dia presencial nesta semana — os {resumo.metaVideo} vídeos não têm como ser
          gravados assim.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {resumo.dias.map((dia) => (
          <CardDia
            key={dia.dia.dataISO}
            resumo={dia}
            desabilitado={desabilitado}
            onAlternarTipo={(tipo) => onAlternarTipo(dia.dia.dataISO, tipo)}
            onAbrirPauta={() => onAbrirPauta(dia.dia.dataISO)}
          />
        ))}
      </div>
    </section>
  )
}

export default SemanaCronograma
