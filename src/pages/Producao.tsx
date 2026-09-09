import { useMemo, useState } from 'react'
import { Wand2 } from 'lucide-react'
import SeletorMes from '@/components/dashboard/seletor-mes'
import type { MesSelecionado } from '@/components/dashboard/seletor-mes'
import EsteiraEdicao from '@/components/producao/esteira-edicao'
import FaixaIndicadores from '@/components/producao/faixa-indicadores'
import type { Indicador } from '@/components/producao/faixa-indicadores'
import ModalPautaDia from '@/components/producao/modal-pauta-dia'
import PainelAlertas from '@/components/producao/painel-alertas'
import SemanaCronograma from '@/components/producao/semana-cronograma'
import BarraProgresso from '@/components/ui/barra-progresso'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCriativosDoMes } from '@/hooks/use-criativos-do-mes'
import {
  useAplicarSugestaoPresencial,
  useDefinirTipoDia,
  useDiasProducao,
} from '@/hooks/use-dias-producao'
import { useFrentes } from '@/hooks/use-frentes'
import { useMetas } from '@/hooks/use-metas'
import { usePautaDoMes } from '@/hooks/use-pauta'
import { contarDiasUteisRestantes, montarSemanasDoMes } from '@/lib/cronograma-utils'
import { contarPorFormato, filtrarPorMes } from '@/lib/dashboard-utils'
import { hojeISO } from '@/lib/date-utils'
import { calcularFarol, calcularRitmoEsperado } from '@/lib/metas-utils'
import {
  contarCaptados,
  formatarRitmo,
  montarAlertas,
  montarResumoDoMes,
  sugerirDiasPresenciais,
} from '@/lib/producao-utils'
import type { Criativo, TipoDia } from '@/types/database'

// Datas-sentinela para o filtro "de hoje em diante": num mês futuro tudo vale,
// num mês encerrado nada vale.
const TUDO_VALE = '0000-00-00'
const NADA_VALE = '9999-12-31'

function mesAtual(): MesSelecionado {
  const hoje = new Date()
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }
}

function Producao() {
  const [mesSelecionado, setMesSelecionado] = useState<MesSelecionado>(mesAtual)
  const [dataDaPautaAberta, setDataDaPautaAberta] = useState<string | null>(null)
  const [presenciaisPorSemana, setPresenciaisPorSemana] = useState('2')

  const hoje = new Date()
  const hojeTexto = hojeISO()
  const ehMesAtual =
    mesSelecionado.ano === hoje.getFullYear() && mesSelecionado.mes === hoje.getMonth() + 1
  const ehMesEncerrado =
    mesSelecionado.ano < hoje.getFullYear() ||
    (mesSelecionado.ano === hoje.getFullYear() && mesSelecionado.mes < hoje.getMonth() + 1)

  // Corte de "daqui para frente": hoje no mês corrente, tudo num mês futuro,
  // nada num mês que já fechou.
  const corteDeHoje = ehMesEncerrado ? NADA_VALE : ehMesAtual ? hojeTexto : TUDO_VALE

  const { data: frentes } = useFrentes({ apenasAtivas: true })
  const { data: metas } = useMetas()
  const { data: dias } = useDiasProducao(mesSelecionado)
  const { data: pauta, isLoading: carregandoPauta } = usePautaDoMes(mesSelecionado)
  const { data: criativosDoIntervalo } = useCriativosDoMes(mesSelecionado)

  const definirTipoDia = useDefinirTipoDia()
  const aplicarSugestao = useAplicarSugestaoPresencial()

  const idsFrentesAtivas = useMemo(
    () => new Set(frentes?.map((frente) => frente.id) ?? []),
    [frentes],
  )

  // Mesma regra do dashboard: frente desativada sai das contas, mas os criativos
  // históricos continuam existindo.
  const metaMensal = useMemo(() => {
    if (!metas) return { video: 0, estatico: 0 }
    const somar = (formato: 'video' | 'estatico') =>
      metas
        .filter((meta) => meta.formato === formato && idsFrentesAtivas.has(meta.frente_id))
        .reduce((soma, meta) => soma + meta.meta_mensal, 0)
    return { video: somar('video'), estatico: somar('estatico') }
  }, [idsFrentesAtivas, metas])

  const pautaDoMes = useMemo(
    () => (pauta ?? []).filter((criativo) => idsFrentesAtivas.has(criativo.frente_id)),
    [idsFrentesAtivas, pauta],
  )

  const semanas = useMemo(
    () => montarSemanasDoMes(mesSelecionado.ano, mesSelecionado.mes),
    [mesSelecionado],
  )

  const resumos = useMemo(() => {
    const tipoPorData: Record<string, TipoDia> = {}
    for (const dia of dias ?? []) {
      tipoPorData[dia.data] = dia.tipo
    }

    const pautaPorData: Record<string, Criativo[]> = {}
    for (const criativo of pautaDoMes) {
      if (!criativo.data_captacao) continue
      pautaPorData[criativo.data_captacao] = pautaPorData[criativo.data_captacao] ?? []
      pautaPorData[criativo.data_captacao].push(criativo)
    }

    return montarResumoDoMes({
      semanas,
      metaVideoMensal: metaMensal.video,
      metaEstaticoMensal: metaMensal.estatico,
      tipoPorData,
      pautaPorData,
    })
  }, [dias, metaMensal, pautaDoMes, semanas])

  const totalCaptados = contarCaptados(pautaDoMes)
  const totalNaPauta = pautaDoMes.length
  const aindaNaoCaptados = totalNaPauta - totalCaptados
  const faltamCaptar = Math.max(0, metaMensal.video - totalCaptados)

  const diasPresenciais = useMemo(
    () => resumos.flatMap((resumo) => resumo.diasPresenciais),
    [resumos],
  )
  const diasPresenciaisRestantes = diasPresenciais.filter((data) => data >= corteDeHoje).length
  const diasUteisRestantes = contarDiasUteisRestantes(semanas, corteDeHoje)

  const estaticosEntregues = useMemo(() => {
    const doMes = filtrarPorMes(
      criativosDoIntervalo ?? [],
      mesSelecionado.ano,
      mesSelecionado.mes,
    ).filter((criativo) => idsFrentesAtivas.has(criativo.frente_id))
    return contarPorFormato(doMes).estatico
  }, [criativosDoIntervalo, idsFrentesAtivas, mesSelecionado])

  const alertas = useMemo(
    () =>
      montarAlertas({
        resumos,
        metaVideoMensal: metaMensal.video,
        totalNaPauta,
        totalCaptados,
        diasPresenciaisRestantes,
        ehMesEncerrado,
      }),
    [
      diasPresenciaisRestantes,
      ehMesEncerrado,
      metaMensal.video,
      resumos,
      totalCaptados,
      totalNaPauta,
    ],
  )

  // Sem useMemo de propósito: percorrer as semanas é barato e a memoização manual
  // aqui fazia o React Compiler desistir de otimizar a página inteira.
  const sugestao = sugerirDiasPresenciais({
    resumos,
    porSemana: Number(presenciaisPorSemana),
    hoje: corteDeHoje,
  })

  const ritmoPorDiaPresencial =
    diasPresenciaisRestantes > 0 ? faltamCaptar / diasPresenciaisRestantes : 0

  const indicadores: Indicador[] = [
    { rotulo: 'Meta de vídeos', valor: String(metaMensal.video), tom: 'video' },
    {
      rotulo: 'Captados',
      valor: String(totalCaptados),
      detalhe: `${aindaNaoCaptados} na pauta, ainda não gravados`,
      tom: 'video',
    },
    { rotulo: 'Faltam captar', valor: String(faltamCaptar), tom: 'video' },
    {
      rotulo: 'Estáticos entregues',
      valor: `${estaticosEntregues} / ${metaMensal.estatico}`,
      tom: 'estatico',
    },
    {
      rotulo: 'Dias presenciais',
      valor: String(diasPresenciais.length),
      detalhe: ehMesEncerrado
        ? 'mês encerrado'
        : `${diasPresenciaisRestantes} por vir · ${diasUteisRestantes} dias úteis restantes`,
    },
    {
      rotulo: 'Ritmo necessário',
      valor: diasPresenciaisRestantes > 0 ? formatarRitmo(ritmoPorDiaPresencial) : '—',
      detalhe:
        diasPresenciaisRestantes > 0 ? 'vídeos por dia presencial' : 'nenhum dia presencial à frente',
    },
  ]

  const percentualVideo = metaMensal.video > 0 ? (totalCaptados / metaMensal.video) * 100 : 0
  const percentualEstatico =
    metaMensal.estatico > 0 ? (estaticosEntregues / metaMensal.estatico) * 100 : 0

  const resumoDaPautaAberta =
    dataDaPautaAberta === null
      ? null
      : (resumos
          .flatMap((resumo) => resumo.dias)
          .find((dia) => dia.dia.dataISO === dataDaPautaAberta) ?? null)

  const carregando = !frentes || !metas || carregandoPauta
  const salvandoDia = definirTipoDia.isPending || aplicarSugestao.isPending

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0d559f]">Meio do processo</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">Produção</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Planeje os dias presenciais de captação e acompanhe a edição até a entrega.
          </p>
        </div>
        <SeletorMes mesSelecionado={mesSelecionado} onMudarMes={setMesSelecionado} />
      </div>

      {carregando || !frentes ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <FaixaIndicadores indicadores={indicadores} />

          <section className="space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-[#0d559f]">Vídeos captados</span>
                <span className="text-muted-foreground tabular-nums">
                  {totalCaptados} / {metaMensal.video}
                </span>
              </div>
              <BarraProgresso
                percentual={percentualVideo}
                farol={calcularFarol({
                  entregue: totalCaptados,
                  metaMensal: metaMensal.video,
                  ritmoEsperado: calcularRitmoEsperado(metaMensal.video, hoje),
                  ehMesAtual,
                })}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-amber-700">Estáticos entregues</span>
                <span className="text-muted-foreground tabular-nums">
                  {estaticosEntregues} / {metaMensal.estatico}
                </span>
              </div>
              <BarraProgresso
                percentual={percentualEstatico}
                farol={calcularFarol({
                  entregue: estaticosEntregues,
                  metaMensal: metaMensal.estatico,
                  ritmoEsperado: calcularRitmoEsperado(metaMensal.estatico, hoje),
                  ehMesAtual,
                })}
              />
            </div>

            <p className="border-t border-border pt-3 text-xs text-muted-foreground">
              Vídeo conta como captado quando é marcado na pauta do dia. Estático conta pela data
              de entrega, igual ao dashboard — o cronograma não muda as regras de meta.
            </p>
          </section>

          <PainelAlertas alertas={alertas} />

          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Cronograma de captação</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sugerir</span>
                <Select value={presenciaisPorSemana} onValueChange={setPresenciaisPorSemana}>
                  <SelectTrigger size="sm" className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['1', '2', '3', '4'].map((quantidade) => (
                      <SelectItem key={quantidade} value={quantidade}>
                        {quantidade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">presenciais por semana</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sugestao.length === 0 || salvandoDia}
                  title={
                    sugestao.length === 0
                      ? 'Todas as semanas já têm dia presencial marcado'
                      : `Marca ${sugestao.length} dias`
                  }
                  onClick={() => aplicarSugestao.mutateAsync(sugestao)}
                >
                  <Wand2 />
                  Aplicar
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              A meta de vídeos de cada semana se divide sozinha entre os dias marcados como
              presenciais. Estático não depende do local — é distribuído por dia útil.
            </p>

            {resumos.map((resumo) => (
              <SemanaCronograma
                key={resumo.semana.indice}
                resumo={resumo}
                desabilitado={salvandoDia}
                onAlternarTipo={(data, tipo) => definirTipoDia.mutateAsync({ data, tipo })}
                onAbrirPauta={setDataDaPautaAberta}
              />
            ))}
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Esteira de edição</h2>
              <p className="text-sm text-muted-foreground">
                Vídeos já gravados no mês, a caminho da entrega.
              </p>
            </div>
            <EsteiraEdicao pauta={pautaDoMes} frentes={frentes} />
          </section>

          <ModalPautaDia
            resumo={resumoDaPautaAberta}
            frentes={frentes}
            onOpenChange={(aberto) => {
              if (!aberto) setDataDaPautaAberta(null)
            }}
          />
        </>
      )}
    </div>
  )
}

export default Producao
