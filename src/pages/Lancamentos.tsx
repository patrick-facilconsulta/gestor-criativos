import { useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Circle, ExternalLink, Loader2, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useContinuarLancamento, useLancamentosMeta, type LancamentoDetalhado, type ResultadoLancamento } from '@/hooks/use-meta'
import {
  botaoSugerido,
  linkConjuntoNoGerenciador,
  situacaoLancamento,
  textoProgresso,
  type SituacaoLancamento,
} from '@/lib/lancamentos-meta'

// O que o sistema fez no Meta a cada lançamento, etapa por etapa. Atualiza
// sozinho enquanto algum está rodando. Só leitura: quem grava é a função
// lancar-no-meta (e "Continuar" chama a mesma função).

const SELO: Record<SituacaoLancamento, { rotulo: string; classe: string }> = {
  rodando: { rotulo: 'Em andamento', classe: 'bg-[#e1efff] text-[#0d559f]' },
  interrompido: { rotulo: 'Parou no meio', classe: 'bg-amber-50 text-amber-800' },
  erro: { rotulo: 'Parou com erro', classe: 'bg-red-50 text-red-700' },
  concluido: { rotulo: 'Concluído · tudo pausado', classe: 'bg-[#e9f6ee] text-[#187a3b]' },
}

type EstadoEtapa = 'feito' | 'agora' | 'parado' | 'falta'

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const reais = (valor: number) => Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function Etapa({ estado, titulo, detalhe }: { estado: EstadoEtapa; titulo: string; detalhe?: ReactNode }) {
  const icone =
    estado === 'feito' ? <CheckCircle2 className="size-4 text-[#21a453]" />
    : estado === 'agora' ? <Loader2 className="size-4 animate-spin text-[#0d559f]" />
    : estado === 'parado' ? <AlertTriangle className="size-4 text-amber-600" />
    : <Circle className="size-4 text-muted-foreground/50" />
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0">{icone}</span>
      <div className="min-w-0">
        <p className={`text-sm ${estado === 'falta' ? 'text-muted-foreground' : 'font-medium'}`}>{titulo}</p>
        {detalhe && <div className="mt-0.5 text-xs text-muted-foreground">{detalhe}</div>}
      </div>
    </li>
  )
}

// substituido: os criativos entraram num lançamento mais novo; continuar este
// lançaria os mesmos criativos de novo, num conjunto separado
function CartaoLancamento({ lancamento, substituido }: { lancamento: LancamentoDetalhado; substituido: boolean }) {
  const [progresso, setProgresso] = useState<ResultadoLancamento | null>(null)
  const continuar = useContinuarLancamento(setProgresso)
  const situacao: SituacaoLancamento = continuar.isPending ? 'rodando' : situacaoLancamento(lancamento, lancamento.objetos)
  const parado = situacao === 'erro' || situacao === 'interrompido'
  const historico = parado && substituido
  const selo = historico ? { rotulo: 'Substituído por um lançamento mais novo', classe: 'bg-muted text-muted-foreground' } : SELO[situacao]

  const total = lancamento.criativo_ids.length
  const comCriativo = new Set(lancamento.objetos.filter((o) => o.tipo === 'adcreative').map((o) => o.criativo_id))
  const conjunto = lancamento.objetos.find((o) => o.tipo === 'adset')
  const anuncios = lancamento.objetos.filter((o) => o.tipo === 'ad')
  // Etapa atual = a primeira que falta (1 criativos, 2 conjunto, 3 anúncios, 4 fim)
  const atual = comCriativo.size < total ? 1 : !conjunto ? 2 : anuncios.length < total ? 3 : 4
  const estado = (etapa: number): EstadoEtapa =>
    etapa < atual || situacao === 'concluido' ? 'feito'
    : etapa > atual ? 'falta'
    : situacao === 'rodando' ? 'agora'
    : 'parado'

  function continuarLancamento() {
    setProgresso(null)
    continuar.mutate(
      { lancamentoId: lancamento.id, botao: botaoSugerido(lancamento.criativos) },
      {
        onSuccess: () => toast.success('Lançamento concluído. Tudo pausado: ative no Gerenciador quando revisar.'),
        onError: (erro) => toast.error(erro.message),
      },
    )
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold break-words">{lancamento.nome_teste}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {dataHora(lancamento.created_at)}
            {lancamento.criado_por ? ` · ${lancamento.criado_por.split('@')[0]}` : ''} · {reais(lancamento.orcamento_diario)}/dia · {total} criativo(s)
          </p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${selo.classe}`}>
          {situacao === 'rodando' && <Loader2 className="size-3.5 animate-spin" />}
          {selo.rotulo}
        </span>
      </div>

      <ol className="mt-4 space-y-3">
        <Etapa
          estado={estado(1)}
          titulo={`Criativos enviados ao Meta: ${comCriativo.size} de ${total}`}
          detalhe="Imagens (quadrado e stories), textos e link. Sozinhos não aparecem para ninguém."
        />
        <Etapa
          estado={estado(2)}
          titulo='Conjunto novo na campanha "[FÁBRICA] Testes"'
          detalhe={
            conjunto ? (
              <>
                {conjunto.nome} ·{' '}
                <a href={linkConjuntoNoGerenciador(conjunto.meta_id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-[#0d559f] hover:underline">
                  abrir no Gerenciador <ExternalLink className="size-3" />
                </a>
              </>
            ) : (
              'Pausado, com o público copiado do conjunto escolhido.'
            )
          }
        />
        <Etapa
          estado={estado(3)}
          titulo={`Anúncios criados, pausados: ${anuncios.length} de ${total}`}
          detalhe={anuncios.length ? anuncios.map((a) => a.nome).join(', ') : undefined}
        />
      </ol>

      {situacao === 'erro' && lancamento.erro && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">O que o Meta respondeu</p>
          <p className="mt-1">{lancamento.erro}</p>
        </div>
      )}
      {situacao === 'interrompido' && !historico && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Parou no meio, sem erro do Meta: a conexão caiu ou a janela foi fechada antes de terminar.
        </div>
      )}

      {historico && (
        <p className="mt-4 text-xs text-muted-foreground">
          Os criativos deste lançamento entraram num lançamento mais novo (acima). Este fica só como histórico.
        </p>
      )}

      {((parado && !historico) || continuar.isPending) && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={continuar.isPending} onClick={continuarLancamento}>
            {continuar.isPending ? <Loader2 className="animate-spin" /> : <Play />}
            {continuar.isPending ? textoProgresso(progresso) : 'Continuar de onde parou'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {continuar.isPending ? 'Pode levar alguns minutos. Deixe esta página aberta.' : 'Usa os mesmos dados e não refaz o que já foi criado. Tudo nasce pausado.'}
          </p>
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-medium text-[#0d559f]">Ver os criativos deste lançamento</summary>
        <ul className="mt-2 space-y-1">
          {lancamento.criativos.map((criativo) => {
            const anuncio = anuncios.find((a) => a.criativo_id === criativo.id)
            return (
              <li key={criativo.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-md bg-[#f7faff] px-3 py-1.5 text-sm">
                <span className="min-w-0 truncate">{criativo.titulo}</span>
                <span className="text-xs text-muted-foreground">
                  {anuncio
                    ? `${anuncio.nome} · ${criativo.meta_status === 'ACTIVE' ? 'ativo' : 'pausado'}`
                    : comCriativo.has(criativo.id)
                      ? 'criativo pronto, falta o anúncio'
                      : 'ainda não enviado'}
                </span>
              </li>
            )
          })}
        </ul>
      </details>
    </article>
  )
}

function Lancamentos() {
  const { data: lancamentos, isLoading, isError } = useLancamentosMeta()
  const algumRodando = lancamentos?.some((l) => situacaoLancamento(l, l.objetos) === 'rodando')

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium text-[#0d559f]">Meta Ads</p>
        <h1 className="mt-1 text-3xl font-bold tracking-normal">Lançamentos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O que o sistema criou no Meta a cada lançamento, etapa por etapa. Tudo nasce pausado, numa campanha separada; a equipe ativa no Gerenciador.
        </p>
        {algumRodando && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-[#0d559f]">
            <Loader2 className="size-3.5 animate-spin" />
            Atualizando sozinho enquanto um lançamento está em andamento.
          </p>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando lançamentos...</p>
      ) : isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar os lançamentos.</p>
      ) : !lancamentos?.length ? (
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
          Nenhum lançamento ainda. Selecione estáticos aprovados em{' '}
          <Link to="/entregas" className="font-medium text-[#0d559f] hover:underline">Entregas</Link> e clique em &quot;Lançar no Meta&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {lancamentos.map((lancamento) => (
            <CartaoLancamento
              key={lancamento.id}
              lancamento={lancamento}
              substituido={lancamentos.some(
                (outro) => outro.created_at > lancamento.created_at && outro.criativo_ids.some((id) => lancamento.criativo_ids.includes(id)),
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Lancamentos
