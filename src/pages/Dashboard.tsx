import { useMemo, useState } from 'react'
import BarraEmAndamento from '@/components/dashboard/barra-em-andamento'
import CardFrente from '@/components/dashboard/card-frente'
import CardTotal from '@/components/dashboard/card-total'
import SeletorMes from '@/components/dashboard/seletor-mes'
import type { MesSelecionado } from '@/components/dashboard/seletor-mes'
import TabelaRitmoSemanal from '@/components/dashboard/tabela-ritmo-semanal'
import { useContagemEmAndamento } from '@/hooks/use-contagem-em-andamento'
import { useCriativosDoMes } from '@/hooks/use-criativos-do-mes'
import { useFrentes } from '@/hooks/use-frentes'
import { useMetas } from '@/hooks/use-metas'
import {
  agruparPorFrente,
  contarPorFormato,
  filtrarPorIntervalo,
  filtrarPorMes,
} from '@/lib/dashboard-utils'
import { formatarDataISO, getFimSemanaIso, getInicioSemanaIso } from '@/lib/date-utils'

function mesAtual(): MesSelecionado {
  const hoje = new Date()
  return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }
}

function Dashboard() {
  const [mesSelecionado, setMesSelecionado] = useState<MesSelecionado>(mesAtual)
  const hoje = new Date()
  const ehMesAtual =
    mesSelecionado.ano === hoje.getFullYear() && mesSelecionado.mes === hoje.getMonth() + 1

  const { data: frentes } = useFrentes({ apenasAtivas: true })
  const { data: metas } = useMetas()
  const { data: criativosDoIntervalo, isLoading } = useCriativosDoMes(mesSelecionado)
  const { data: contagemEmAndamento } = useContagemEmAndamento()
  const idsFrentesAtivas = useMemo(
    () => new Set(frentes?.map((frente) => frente.id) ?? []),
    [frentes],
  )

  const criativosDoMes = useMemo(
    () =>
      filtrarPorMes(criativosDoIntervalo ?? [], mesSelecionado.ano, mesSelecionado.mes).filter(
        (criativo) => idsFrentesAtivas.has(criativo.frente_id),
      ),
    [criativosDoIntervalo, idsFrentesAtivas, mesSelecionado],
  )

  const criativosDaSemana = useMemo(() => {
    const inicio = formatarDataISO(getInicioSemanaIso(hoje))
    const fim = formatarDataISO(getFimSemanaIso(hoje))
    return filtrarPorIntervalo(criativosDoIntervalo ?? [], inicio, fim).filter((criativo) =>
      idsFrentesAtivas.has(criativo.frente_id),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criativosDoIntervalo, idsFrentesAtivas])

  const totalPorFormato = useMemo(() => contarPorFormato(criativosDoMes), [criativosDoMes])

  const metaTotalPorFormato = useMemo(() => {
    if (!metas) return { video: 0, estatico: 0 }
    return {
      video: metas
        .filter((meta) => meta.formato === 'video' && idsFrentesAtivas.has(meta.frente_id))
        .reduce((soma, meta) => soma + meta.meta_mensal, 0),
      estatico: metas
        .filter((meta) => meta.formato === 'estatico' && idsFrentesAtivas.has(meta.frente_id))
        .reduce((soma, meta) => soma + meta.meta_mensal, 0),
    }
  }, [idsFrentesAtivas, metas])

  const criativosPorFrente = useMemo(() => agruparPorFrente(criativosDoMes), [criativosDoMes])
  const semanaPorFrente = useMemo(() => agruparPorFrente(criativosDaSemana), [criativosDaSemana])

  const carregando = isLoading || !frentes || !metas

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0d559f]">Visão geral</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">Acompanhe entregas, metas e ritmo de produção.</p>
        </div>
        <div className="flex items-center gap-3">
          <SeletorMes mesSelecionado={mesSelecionado} onMudarMes={setMesSelecionado} />
        </div>
      </div>

      {carregando || !frentes || !metas ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CardTotal
              titulo="Vídeos"
              entregue={totalPorFormato.video}
              metaMensal={metaTotalPorFormato.video}
              ehMesAtual={ehMesAtual}
              hoje={hoje}
            />
            <CardTotal
              titulo="Estáticos"
              entregue={totalPorFormato.estatico}
              metaMensal={metaTotalPorFormato.estatico}
              ehMesAtual={ehMesAtual}
              hoje={hoje}
            />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {frentes.map((frente) => {
              const criativosDaFrente = criativosPorFrente.get(frente.id) ?? []
              const metasDaFrente = metas.filter((meta) => meta.frente_id === frente.id)
              const metaVideo = metasDaFrente.find((meta) => meta.formato === 'video')?.meta_mensal ?? 0
              const metaEstatico =
                metasDaFrente.find((meta) => meta.formato === 'estatico')?.meta_mensal ?? 0

              return (
                <CardFrente
                  key={frente.id}
                  nomeFrente={frente.nome}
                  ehMesAtual={ehMesAtual}
                  hoje={hoje}
                  linhas={[
                    {
                      rotulo: 'Vídeo',
                      entregue: criativosDaFrente.filter((c) => c.formato === 'video').length,
                      metaMensal: metaVideo,
                    },
                    {
                      rotulo: 'Estático',
                      entregue: criativosDaFrente.filter((c) => c.formato === 'estatico').length,
                      metaMensal: metaEstatico,
                    },
                  ]}
                />
              )
            })}
          </section>

          {ehMesAtual && (
            <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-lg font-semibold">Ritmo semanal</h2>
              </div>
              <TabelaRitmoSemanal frentes={frentes} metas={metas} semanaPorFrente={semanaPorFrente} />
            </section>
          )}

          {contagemEmAndamento && <BarraEmAndamento contagem={contagemEmAndamento} />}
        </>
      )}
    </div>
  )
}

export default Dashboard
