import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImageOff, RefreshCw, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import ModalAnuncio from '@/components/desempenho/modal-anuncio'
import LeituraVisual from '@/components/desempenho/leitura-visual'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFrentes } from '@/hooks/use-frentes'
import { useDesempenhoMeta, useMetaConfiguracao, useSincronizarMeta, type DesempenhoAnuncio } from '@/hooks/use-meta'
import { formatarDataISO } from '@/lib/date-utils'

// Resultados dos anúncios do Meta (só leitura), por anúncio, no período.
// Regras de leitura: comparar só campanhas de cadastro, sem formulário
// instantâneo; custo por cadastro de referência = gasto total ÷ cadastros
// (pool); anúncio com gasto abaixo de 2× essa referência tem pouco dado.

const PERIODOS = [7, 30, 90] as const
const HORAS_PARA_ATUALIZAR = 12

type Coluna = 'gasto' | 'resultados' | 'cpl' | 'ctr' | 'cadClique' | 'cadVisita'

const reais = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const porcento = (valor: number | null) => (valor === null ? '—' : `${(valor * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`)

// Primeiro dia do período (o dia de hoje conta como um dos dias)
function inicioDoPeriodo(dias: number) {
  const data = new Date()
  data.setDate(data.getDate() - (dias - 1))
  return formatarDataISO(data)
}

function metricas(a: DesempenhoAnuncio) {
  return {
    cpl: a.resultados > 0 ? a.gasto / a.resultados : null,
    ctr: a.impressoes > 0 ? a.cliques_link / a.impressoes : null,
    cadClique: a.cliques_link > 0 ? a.resultados / a.cliques_link : null,
    cadVisita: a.visitas_lp > 0 ? a.resultados / a.visitas_lp : null,
  }
}

function Cabecalho({
  coluna,
  ordem,
  onOrdenar,
  children,
}: {
  coluna: Coluna
  ordem: { coluna: Coluna; desc: boolean }
  onOrdenar: (coluna: Coluna) => void
  children: string
}) {
  return (
    <TableHead className="text-right">
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onOrdenar(coluna)}>
        {children}
        {ordem.coluna === coluna && (ordem.desc ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
      </button>
    </TableHead>
  )
}

function Desempenho() {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30)
  const [conceito, setConceito] = useState('todos')
  const [origem, setOrigem] = useState<'todas' | 'fabrica' | 'conta'>('todas')
  const [soCadastro, setSoCadastro] = useState(true)
  const [ordem, setOrdem] = useState<{ coluna: Coluna; desc: boolean }>({ coluna: 'gasto', desc: true })
  // Anúncio aberto na janela grande (pelo id: os dados vêm sempre da lista atual)
  const [anuncioAbertoId, setAnuncioAbertoId] = useState<string | null>(null)

  const desde = inicioDoPeriodo(dias)
  const { data: anuncios, isLoading, isError } = useDesempenhoMeta(desde)
  const { data: config } = useMetaConfiguracao()
  const { data: frentes } = useFrentes()
  const sincronizar = useSincronizarMeta()
  const nomesFrente = new Map(frentes?.map((f) => [f.id, f.nome]))

  // Atualiza sozinho ao abrir, se a última leitura tem mais de 12 horas
  const jaTentou = useRef(false)
  useEffect(() => {
    if (!config || jaTentou.current) return
    const ultima = config.ultima_sincronizacao ? new Date(config.ultima_sincronizacao).getTime() : 0
    if (Date.now() - ultima > HORAS_PARA_ATUALIZAR * 3_600_000) {
      jaTentou.current = true
      sincronizar.mutate(undefined, { onError: (erro) => toast.error(erro.message) })
    }
  }, [config, sincronizar])

  const filtrados = useMemo(
    () =>
      (anuncios ?? []).filter(
        (a) =>
          (!soCadastro || (a.objetivo === 'OUTCOME_LEADS' && !a.formulario_instantaneo)) &&
          (origem === 'todas' || a.origem === origem) &&
          (conceito === 'todos' || (conceito === 'sem' ? !a.conceito_id : a.conceito_id === conceito)),
      ),
    [anuncios, soCadastro, origem, conceito],
  )

  const total = filtrados.reduce(
    (s, a) => ({
      gasto: s.gasto + a.gasto,
      resultados: s.resultados + a.resultados,
      cliques: s.cliques + a.cliques_link,
      visitas: s.visitas + a.visitas_lp,
    }),
    { gasto: 0, resultados: 0, cliques: 0, visitas: 0 },
  )
  const cplPool = total.resultados > 0 ? total.gasto / total.resultados : null
  const gastoMinimo = cplPool ? 2 * cplPool : 0

  const ordenados = [...filtrados].sort((a, b) => {
    const va = ordem.coluna === 'gasto' || ordem.coluna === 'resultados' ? a[ordem.coluna] : metricas(a)[ordem.coluna]
    const vb = ordem.coluna === 'gasto' || ordem.coluna === 'resultados' ? b[ordem.coluna] : metricas(b)[ordem.coluna]
    // Sem valor (ex.: sem cadastro) vai sempre para o fim
    if (va === null) return 1
    if (vb === null) return -1
    return ordem.desc ? vb - va : va - vb
  })

  // Testes da Fábrica: um por conjunto criado pelo sistema
  const testes = useMemo(() => {
    const grupos = new Map<string, DesempenhoAnuncio[]>()
    for (const a of (anuncios ?? []).filter((x) => x.origem === 'fabrica')) {
      const chave = a.conjunto_nome ?? a.conjunto_id ?? 'Sem conjunto'
      grupos.set(chave, [...(grupos.get(chave) ?? []), a])
    }
    return [...grupos.entries()]
  }, [anuncios])

  function ordenarPor(coluna: Coluna) {
    setOrdem((atual) => ({ coluna, desc: atual.coluna === coluna ? !atual.desc : coluna !== 'cpl' }))
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0d559f]">Meta Ads · só leitura</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">Desempenho</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Resultado de cada anúncio da conta. É também o que a IA da Fábrica estuda antes de gerar.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {sincronizar.isPending
              ? 'Atualizando com o Meta...'
              : config?.ultima_sincronizacao
                ? `Atualizado em ${new Date(config.ultima_sincronizacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
                : 'Ainda não atualizado'}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={sincronizar.isPending}
            onClick={() =>
              sincronizar.mutate(undefined, {
                onSuccess: (r) => toast.success(`Resultados atualizados (${r.anuncios} anúncios).`),
                onError: (erro) => toast.error(erro.message),
              })
            }
          >
            <RefreshCw className={sincronizar.isPending ? 'animate-spin' : undefined} />
            Atualizar agora
          </Button>
        </div>
      </div>

      <LeituraVisual />

      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS.map((p) => (
          <Button key={p} size="sm" variant={dias === p ? 'default' : 'outline'} aria-pressed={dias === p} onClick={() => setDias(p)}>
            {p} dias
          </Button>
        ))}
        <Select value={conceito} onValueChange={setConceito}>
          <SelectTrigger size="sm" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os conceitos</SelectItem>
            {frentes?.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
            <SelectItem value="sem">Sem conceito identificado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={origem} onValueChange={(v) => setOrigem(v as typeof origem)}>
          <SelectTrigger size="sm" className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda a conta</SelectItem>
            <SelectItem value="fabrica">Só da Fábrica</SelectItem>
            <SelectItem value="conta">Fora da Fábrica</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant={soCadastro ? 'default' : 'outline'} aria-pressed={soCadastro} onClick={() => setSoCadastro(!soCadastro)}>
          Só campanhas de cadastro
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Gasto', reais(total.gasto)],
          ['Cadastros', total.resultados.toLocaleString('pt-BR')],
          ['Custo por cadastro', cplPool ? reais(cplPool) : '—'],
          ['Cadastro por clique', porcento(total.cliques ? total.resultados / total.cliques : null)],
          ['Cadastro por visita', porcento(total.visitas ? total.resultados / total.visitas : null)],
        ].map(([rotulo, valor]) => (
          <div key={rotulo} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{rotulo}</p>
            <p className="mt-1 text-xl font-semibold">{valor}</p>
          </div>
        ))}
      </div>
      {!soCadastro && (
        <p className="-mt-5 text-xs text-amber-700">
          Atenção: com campanhas de alcance e formulário instantâneo juntas, custo e conversão da conta não são comparáveis.
        </p>
      )}

      {testes.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Testes da Fábrica</h2>
          <p className="mt-1 text-sm text-muted-foreground">Cada conjunto criado pelo sistema, com o anúncio de menor custo por cadastro em destaque (só com volume suficiente).</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {testes.map(([conjunto, itens]) => {
              const comVolume = itens.filter((a) => a.gasto >= gastoMinimo && a.resultados > 0)
              const vencedor = comVolume.sort((a, b) => a.gasto / a.resultados - b.gasto / b.resultados)[0]
              return (
                <div key={conjunto} className="rounded-md border border-border p-3">
                  <p className="truncate text-sm font-medium">{conjunto}</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {itens.map((a) => (
                      <li key={a.ad_id} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1 truncate">
                          {a === vencedor && <Trophy className="size-3.5 shrink-0 text-amber-600" />}
                          {a.nome}
                        </span>
                        <span className="shrink-0 text-muted-foreground">
                          {reais(a.gasto)} · {a.resultados} cad. · {a.resultados ? reais(a.gasto / a.resultados) : '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {!vencedor && <p className="mt-2 text-xs text-muted-foreground">Ainda sem volume para apontar um vencedor.</p>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando resultados...</p>
        ) : isError ? (
          <p className="p-6 text-sm text-destructive">Não foi possível carregar os resultados.</p>
        ) : ordenados.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            {config?.ultima_sincronizacao ? 'Nenhum anúncio com gasto neste filtro.' : 'Clique em "Atualizar agora" para buscar os resultados do Meta.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Anúncio</TableHead>
                <TableHead>Conceito</TableHead>
                <Cabecalho coluna="gasto" ordem={ordem} onOrdenar={ordenarPor}>Gasto</Cabecalho>
                <Cabecalho coluna="resultados" ordem={ordem} onOrdenar={ordenarPor}>Cadastros</Cabecalho>
                <Cabecalho coluna="cpl" ordem={ordem} onOrdenar={ordenarPor}>Custo/cad.</Cabecalho>
                <Cabecalho coluna="ctr" ordem={ordem} onOrdenar={ordenarPor}>CTR link</Cabecalho>
                <Cabecalho coluna="cadClique" ordem={ordem} onOrdenar={ordenarPor}>Cad./clique</Cabecalho>
                <Cabecalho coluna="cadVisita" ordem={ordem} onOrdenar={ordenarPor}>Cad./visita</Cabecalho>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordenados.map((a) => {
                const m = metricas(a)
                const poucoDado = a.gasto < gastoMinimo
                return (
                  <TableRow key={a.ad_id} className={poucoDado ? 'text-muted-foreground' : undefined}>
                    <TableCell className="max-w-96">
                      <button
                        type="button"
                        title="Ver o anúncio em tamanho grande"
                        className="flex w-full items-center gap-3 text-left"
                        onClick={() => setAnuncioAbertoId(a.ad_id)}
                      >
                        {a.imagem_url || a.thumbnail_url ? (
                          <img src={a.imagem_url || a.thumbnail_url!} alt="" className="size-12 shrink-0 rounded object-cover ring-[#0d559f] transition hover:ring-2" loading="lazy" />
                        ) : (
                          <span className="grid size-12 shrink-0 place-items-center rounded bg-muted"><ImageOff className="size-4" /></span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground hover:underline">
                            {a.nome}
                            {a.origem === 'fabrica' && <span className="ml-2 rounded-full bg-[#e1efff] px-2 py-0.5 text-[10px] font-medium text-[#0d559f]">Fábrica</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {a.campanha_nome} › {a.conjunto_nome}
                            {a.status_efetivo && a.status_efetivo !== 'ACTIVE' ? ` · ${a.status_efetivo.toLowerCase()}` : ''}
                            {poucoDado ? ' · pouco dado' : ''}
                          </p>
                        </div>
                      </button>
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.conceito_id ? (
                        <>
                          {nomesFrente.get(a.conceito_id)}
                          {!a.frente_id && <span className="block text-[10px] text-muted-foreground">definido à mão</span>}
                        </>
                      ) : (
                        <button type="button" className="text-[#0d559f] hover:underline" onClick={() => setAnuncioAbertoId(a.ad_id)}>
                          Definir
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{reais(a.gasto)}</TableCell>
                    <TableCell className="text-right">{a.resultados.toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="text-right">{m.cpl === null ? '—' : reais(m.cpl)}</TableCell>
                    <TableCell className="text-right">{porcento(m.ctr)}</TableCell>
                    <TableCell className="text-right">{porcento(m.cadClique)}</TableCell>
                    <TableCell className="text-right">{porcento(m.cadVisita)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <ModalAnuncio
        anuncio={anuncios?.find((a) => a.ad_id === anuncioAbertoId) ?? null}
        frentes={frentes ?? []}
        onFechar={() => setAnuncioAbertoId(null)}
      />
    </div>
  )
}

export default Desempenho
