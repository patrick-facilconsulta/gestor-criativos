import { useState } from 'react'
import { Coins, Factory, History, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import CartaoVariacao from '@/components/fabrica/cartao-variacao'
import FormularioGeracao from '@/components/fabrica/formulario-geracao'
import {
  useBaseFabrica,
  useGeracoes,
  useGerarCriativos,
  useLotes,
  usePontosConceito,
  type PedidoGeracao,
} from '@/hooks/use-fabrica'
import { useFrentes } from '@/hooks/use-frentes'
import { formatarDolares, formatarReais, formatarTokens, nomeDoModelo } from '@/lib/fabrica'
import type { FabricaGeracao, FabricaLote } from '@/types/database'

interface Lote {
  id: string
  criadoEm: string
  geracoes: FabricaGeracao[]
}

// Agrupa as gerações do histórico pelo clique que as criou
function agruparLotes(geracoes: FabricaGeracao[]): Lote[] {
  const lotes = new Map<string, Lote>()
  for (const geracao of geracoes) {
    const lote = lotes.get(geracao.lote_id)
    if (lote) {
      lote.geracoes.push(geracao)
    } else {
      lotes.set(geracao.lote_id, { id: geracao.lote_id, criadoEm: geracao.created_at, geracoes: [geracao] })
    }
  }
  // Dentro do lote, na ordem em que foram gerados
  for (const lote of lotes.values()) {
    lote.geracoes.sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  }
  return [...lotes.values()]
}

// Modelo, tokens e custo de uma rodada
function ResumoCusto({ lote }: { lote: FabricaLote }) {
  const tokensEntrada = lote.tokens_entrada + lote.tokens_cache_escrita + lote.tokens_cache_leitura
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-sm">
      <span className="flex items-center gap-1.5 font-medium">
        <Coins className="size-4 text-[#0d559f]" /> {formatarReais(lote.custo_brl)}
        <span className="font-normal text-muted-foreground">({formatarDolares(lote.custo_usd)})</span>
      </span>
      <span className="text-muted-foreground">
        <span className="text-foreground">{nomeDoModelo(lote.modelo)}</span> · {formatarTokens(tokensEntrada + lote.tokens_saida)} tokens (
        {formatarTokens(tokensEntrada)} de entrada, sendo {formatarTokens(lote.tokens_cache_leitura)} em cache, e{' '}
        {formatarTokens(lote.tokens_saida)} de saída)
      </span>
      <span className="text-xs text-muted-foreground">
        Estimativa. Dólar a {formatarReais(lote.cotacao_dolar)} · R$ {(lote.custo_brl / Math.max(lote.quantidade, 1)).toFixed(2).replace('.', ',')} por variação
      </span>
    </div>
  )
}

function formatarMomento(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function Fabrica() {
  const { data: base, isLoading, isError } = useBaseFabrica()
  const { data: frentes } = useFrentes({ apenasAtivas: true })
  const { data: geracoes } = useGeracoes()
  const { data: lotesComCusto } = useLotes()
  const { data: pontos } = usePontosConceito()
  const gerar = useGerarCriativos()
  const [loteSelecionado, setLoteSelecionado] = useState<string | null>(null)

  const lotes = agruparLotes(geracoes ?? [])
  const loteAtual = lotes.find((lote) => lote.id === loteSelecionado) ?? lotes[0]
  const custoPorLote = new Map((lotesComCusto ?? []).map((lote) => [lote.id, lote]))
  const custoAtual = loteAtual ? custoPorLote.get(loteAtual.id) : undefined

  // Gasto do mês corrente com a IA
  const inicioDoMes = new Date()
  inicioDoMes.setDate(1)
  inicioDoMes.setHours(0, 0, 0, 0)
  const lotesDoMes = (lotesComCusto ?? []).filter((lote) => new Date(lote.created_at) >= inicioDoMes)
  const gastoDoMes = lotesDoMes.reduce((total, lote) => total + lote.custo_brl, 0)

  function gerarCriativos(pedido: PedidoGeracao) {
    gerar.mutate(pedido, {
      onSuccess: (novas) => {
        setLoteSelecionado(novas[0]?.lote_id ?? null)
        toast.success(`${novas.length} variação(ões) gerada(s).`)
      },
      onError: (erro) => toast.error(erro.message),
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0d559f]">Criativos sob demanda</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">Fábrica de criativos</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Escolha conceito, narrativa e ângulo. A IA escreve as variações a partir da base de conhecimento de vendas; layout e cores você troca na hora. Estáticos saem em quadrado e stories.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/fabrica/base">
            <Settings2 />
            Editar base
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando a base da fábrica...</p>
      ) : isError || !base ? (
        <p className="text-sm text-destructive">Não foi possível carregar a base da fábrica.</p>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="h-fit space-y-6 xl:sticky xl:top-8">
            <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-[linear-gradient(135deg,#0a2c53,#061c36)] text-white">
                  <Factory className="size-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-[#0d559f]">Nova leva</p>
                  <h2 className="font-heading text-base font-semibold">Gerar criativos</h2>
                </div>
              </div>
              {frentes && frentes.length > 0 ? (
                <FormularioGeracao
                  base={base}
                  frentes={frentes}
                  pontos={pontos ?? []}
                  gerando={gerar.isPending}
                  onGerar={gerarCriativos}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Carregando conceitos...</p>
              )}
            </section>

            {lotes.length > 0 && (
              <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><History className="size-4" /> Gerados antes</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Gasto com IA neste mês: <span className="font-medium text-foreground">{formatarReais(gastoDoMes)}</span> em{' '}
                  {lotesDoMes.length} rodada(s)
                </p>
                <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1">
                  {lotes.map((lote) => {
                    const conceito = base.conceitos.find((c) => c.id === lote.geracoes[0].conceito_id)
                    const custo = custoPorLote.get(lote.id)
                    return (
                      <li key={lote.id}>
                        <button
                          type="button"
                          onClick={() => setLoteSelecionado(lote.id)}
                          className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[#f7faff] ${
                            loteAtual?.id === lote.id ? 'bg-[#eaf3ff]' : ''
                          }`}
                        >
                          <span className="block truncate font-medium">{conceito?.nome ?? 'Ângulo removido'}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatarMomento(lote.criadoEm)} · {lote.geracoes.length} variação(ões)
                            {custo && ` · ${formatarReais(custo.custo_brl)} · ${nomeDoModelo(custo.modelo)}`}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </aside>

          <section>
            {gerar.isPending ? (
              <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-[#b9cee6] bg-[#f7faff] p-6 text-center">
                <div>
                  <Factory className="mx-auto size-8 animate-pulse text-[#0d559f]" />
                  <p className="mt-3 font-medium">A fábrica está escrevendo as variações...</p>
                  <p className="mt-1 text-sm text-muted-foreground">Costuma levar entre 20 segundos e 1 minuto.</p>
                </div>
              </div>
            ) : loteAtual ? (
              <div className="space-y-4">
                {custoAtual && <ResumoCusto lote={custoAtual} />}
                <div className="grid gap-6 lg:grid-cols-2">
                  {loteAtual.geracoes.map((geracao, indice) => (
                    <CartaoVariacao key={geracao.id} geracao={geracao} base={base} numero={indice + 1} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid min-h-72 place-items-center rounded-lg border border-dashed border-[#b9cee6] bg-[#f7faff] p-6 text-center">
                <div>
                  <Factory className="mx-auto size-8 text-[#0d559f]" />
                  <p className="mt-3 font-medium">Nenhum criativo gerado ainda</p>
                  <p className="mt-1 text-sm text-muted-foreground">Escolha as opções ao lado e clique em "Gerar criativos".</p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default Fabrica
