import { useMemo, useState } from 'react'
import BarraEmAndamento from '@/components/dashboard/barra-em-andamento'
import CardFrente from '@/components/dashboard/card-frente'
import CardTotal from '@/components/dashboard/card-total'
import SeletorMes from '@/components/dashboard/seletor-mes'
import type { MesSelecionado } from '@/components/dashboard/seletor-mes'
import TabelaRitmoSemanal from '@/components/dashboard/tabela-ritmo-semanal'
import { Button } from '@/components/ui/button'
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
import { supabase } from '@/lib/supabase'

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

  const criativosDoMes = useMemo(
    () => filtrarPorMes(criativosDoIntervalo ?? [], mesSelecionado.ano, mesSelecionado.mes),
    [criativosDoIntervalo, mesSelecionado],
  )

  const criativosDaSemana = useMemo(() => {
    const inicio = formatarDataISO(getInicioSemanaIso(hoje))
    const fim = formatarDataISO(getFimSemanaIso(hoje))
    return filtrarPorIntervalo(criativosDoIntervalo ?? [], inicio, fim)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criativosDoIntervalo])

  const totalPorFormato = useMemo(() => contarPorFormato(criativosDoMes), [criativosDoMes])

  const metaTotalPorFormato = useMemo(() => {
    if (!metas) return { video: 0, estatico: 0 }
    return {
      video: metas
        .filter((meta) => meta.formato === 'video')
        .reduce((soma, meta) => soma + meta.meta_mensal, 0),
      estatico: metas
        .filter((meta) => meta.formato === 'estatico')
        .reduce((soma, meta) => soma + meta.meta_mensal, 0),
    }
  }, [metas])

  const criativosPorFrente = useMemo(() => agruparPorFrente(criativosDoMes), [criativosDoMes])
  const semanaPorFrente = useMemo(() => agruparPorFrente(criativosDaSemana), [criativosDaSemana])

  const carregando = isLoading || !frentes || !metas

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-4">
          <SeletorMes mesSelecionado={mesSelecionado} onMudarMes={setMesSelecionado} />
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>
            Sair
          </Button>
        </div>
      </div>

      {carregando || !frentes || !metas ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          </div>

          {ehMesAtual && (
            <TabelaRitmoSemanal frentes={frentes} metas={metas} semanaPorFrente={semanaPorFrente} />
          )}

          {contagemEmAndamento && <BarraEmAndamento contagem={contagemEmAndamento} />}
        </>
      )}
    </div>
  )
}

export default Dashboard
