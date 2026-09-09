export type TomIndicador = 'video' | 'estatico' | 'neutro'

export interface Indicador {
  rotulo: string
  valor: string
  detalhe?: string
  tom?: TomIndicador
}

const CORES_TOM: Record<TomIndicador, string> = {
  video: 'text-[#0d559f]',
  estatico: 'text-amber-700',
  neutro: 'text-foreground',
}

// Faixa de números do topo. Fundo na cor da borda com 1px de gap desenha as
// divisórias sem precisar de border em cada célula.
function FaixaIndicadores({ indicadores }: { indicadores: Indicador[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
      {indicadores.map((indicador) => (
        <div key={indicador.rotulo} className="bg-card px-4 py-3">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">{indicador.rotulo}</p>
          <p
            className={`mt-1 text-2xl font-semibold tabular-nums ${CORES_TOM[indicador.tom ?? 'neutro']}`}
          >
            {indicador.valor}
          </p>
          {indicador.detalhe && (
            <p className="text-xs text-muted-foreground">{indicador.detalhe}</p>
          )}
        </div>
      ))}
    </div>
  )
}

export default FaixaIndicadores
