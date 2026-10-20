import { ImageOff, TrendingDown, TrendingUp } from 'lucide-react'
import { useAnunciosResumo } from '@/hooks/use-meta'
import type { AprendizadoRodada as Aprendizado } from '@/types/database'

const reais = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Props {
  aprendizado: Aprendizado | null
  onAbrirAnuncio: (adId: string) => void
}

function Lista({
  itens,
  tom,
  anuncios,
  onAbrirAnuncio,
}: {
  itens: { ad_id: string; nome: string; cpl: number }[]
  tom: 'bom' | 'ruim'
  anuncios: ReturnType<typeof useAnunciosResumo>['data']
  onAbrirAnuncio: (adId: string) => void
}) {
  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {itens.map((item) => {
        const anuncio = anuncios?.get(item.ad_id)
        const imagem = anuncio?.imagem_url || anuncio?.thumbnail_url
        return (
          <li key={item.ad_id} className="shrink-0">
            <button
              type="button"
              title={`Ver ${item.nome}`}
              onClick={() => onAbrirAnuncio(item.ad_id)}
              className="flex w-28 flex-col gap-1 rounded-md p-1 text-left transition-colors hover:bg-[#f7faff]"
            >
              {imagem ? (
                <img src={imagem} alt="" loading="lazy" className="aspect-square w-full rounded object-cover" />
              ) : (
                <span className="grid aspect-square w-full place-items-center rounded bg-muted"><ImageOff className="size-4" /></span>
              )}
              <span className="truncate text-[11px] font-medium">{item.nome}</span>
              <span className={`text-[11px] ${tom === 'bom' ? 'text-[#187a3b]' : 'text-[#b42318]'}`}>
                {reais(item.cpl)} /cadastro
                {anuncio?.tipo_midia === 'video' && <span className="text-muted-foreground"> · vídeo</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// O que a IA recebeu do desempenho no Meta nesta rodada: os melhores anúncios do
// conceito (para seguir) e os piores (para evitar). Clique abre o anúncio.
function AprendizadoRodada({ aprendizado, onAbrirAnuncio }: Props) {
  const melhores = aprendizado?.melhores ?? []
  const piores = aprendizado?.piores ?? []
  const { data: anuncios } = useAnunciosResumo([...melhores, ...piores].map((a) => a.ad_id))

  if (!aprendizado) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Esta rodada não usou dados de desempenho do Meta (foi gerada antes da conexão).
      </p>
    )
  }
  if (melhores.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Sem dados suficientes neste conceito para comparar ({aprendizado.anuncios_elegiveis} anúncio(s) com volume nos últimos {aprendizado.dias} dias).
        A IA seguiu só a base de conhecimento.
      </p>
    )
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold">Esta rodada aprendeu com</h3>
        <p className="text-xs text-muted-foreground">
          Anúncios do conceito com volume nos últimos {aprendizado.dias} dias. Referência da conta: {reais(aprendizado.cpl_conta)} por cadastro.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1 text-xs font-medium text-[#187a3b]"><TrendingUp className="size-3.5" /> Melhores (seguir o padrão)</p>
          <Lista itens={melhores} tom="bom" anuncios={anuncios} onAbrirAnuncio={onAbrirAnuncio} />
        </div>
        {piores.length > 0 && (
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-1 text-xs font-medium text-[#b42318]"><TrendingDown className="size-3.5" /> Piores (evitar o padrão)</p>
            <Lista itens={piores} tom="ruim" anuncios={anuncios} onAbrirAnuncio={onAbrirAnuncio} />
          </div>
        )}
      </div>
    </section>
  )
}

export default AprendizadoRodada
