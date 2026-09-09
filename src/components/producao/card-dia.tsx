import { Check, Image, Video } from 'lucide-react'
import { ROTULO_TIPO_DIA } from '@/lib/constantes'
import type { ResumoDia } from '@/lib/producao-utils'
import type { TipoDia } from '@/types/database'

interface CardDiaProps {
  resumo: ResumoDia
  onAlternarTipo: (tipo: TipoDia) => void
  onAbrirPauta: () => void
  desabilitado: boolean
}

function CardDia({ resumo, onAlternarTipo, onAbrirPauta, desabilitado }: CardDiaProps) {
  const { dia, tipo, metaVideo, metaEstatico, pauta, captados, pautaEmDiaHome } = resumo

  // Fim de semana e dias do mês vizinho: presença apenas visual, para a grade não
  // ficar torta. Não recebem meta e não têm o que marcar.
  if (dia.ehFimDeSemana || dia.ehDeOutroMes) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 px-3 py-2 opacity-50">
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-semibold tabular-nums">{dia.diaDoMes}</span>
          <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
            {dia.rotuloDiaSemana}
          </span>
        </div>
      </div>
    )
  }

  const presencial = tipo === 'presencial'

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border bg-card px-3 py-2.5 shadow-sm ${
        dia.ehHoje ? 'border-[#2f88ed] ring-1 ring-[#2f88ed]' : 'border-border'
      }`}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tabular-nums">{dia.diaDoMes}</span>
        <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
          {dia.rotuloDiaSemana}
        </span>
        {dia.ehHoje && (
          <span className="ml-auto text-[10px] font-semibold tracking-wide text-[#0d559f] uppercase">
            Hoje
          </span>
        )}
      </div>

      <div className="flex overflow-hidden rounded-full border border-border">
        {(['presencial', 'home'] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            disabled={desabilitado}
            onClick={() => onAlternarTipo(opcao)}
            className={`flex-1 px-1.5 py-1 text-[10px] font-semibold tracking-wide uppercase transition-colors disabled:opacity-50 ${
              tipo === opcao
                ? opcao === 'presencial'
                  ? 'bg-[#0d559f] text-white'
                  : 'bg-muted text-muted-foreground'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            {ROTULO_TIPO_DIA[opcao]}
          </button>
        ))}
      </div>

      <div className="space-y-1 text-xs">
        {presencial && (
          <p className="flex items-center gap-1.5 text-[#0d559f]">
            <Video className="size-3.5 shrink-0" />
            <span className="font-medium tabular-nums">
              {pauta.length} / {metaVideo}
            </span>
            <span className="text-muted-foreground">na pauta</span>
          </p>
        )}

        {captados > 0 && (
          <p className="flex items-center gap-1.5 text-[#187a3b]">
            <Check className="size-3.5 shrink-0" />
            <span className="font-medium tabular-nums">{captados}</span>
            <span>captados</span>
          </p>
        )}

        {pautaEmDiaHome && (
          <p className="text-amber-700">
            {pauta.length} {pauta.length === 1 ? 'vídeo' : 'vídeos'} em dia de home office
          </p>
        )}

        {metaEstatico > 0 && (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Image className="size-3.5 shrink-0" />
            <span className="tabular-nums">{metaEstatico}</span>
            <span>estáticos</span>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onAbrirPauta}
        className="mt-auto rounded-md border border-border py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {pauta.length > 0 ? 'Ver pauta' : 'Montar pauta'}
      </button>
    </div>
  )
}

export default CardDia
