import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import FiltrosCriativos from '@/components/criativos/filtros-criativos'
import ModalCriativo from '@/components/criativos/modal-criativo'
import ModalLote from '@/components/criativos/modal-lote'
import TabelaCriativos from '@/components/criativos/tabela-criativos'
import { Button } from '@/components/ui/button'
import type { FiltrosCriativos as EstadoFiltros } from '@/hooks/use-criativos'
import { useCriativos, ITENS_POR_PAGINA } from '@/hooks/use-criativos'
import { useFrentes } from '@/hooks/use-frentes'
import { ORDEM_STATUS } from '@/lib/constantes'
import type { Criativo, StatusCriativo } from '@/types/database'

const FILTROS_PADRAO: EstadoFiltros = {
  busca: '',
  frenteIds: [],
  formato: 'todos',
  statusSelecionados: ORDEM_STATUS.filter((status) => status !== 'reprovado'),
  periodo: 'mes_atual',
}

function filtrosIniciais(statusDaUrl: string | null): EstadoFiltros {
  if (statusDaUrl && (ORDEM_STATUS as string[]).includes(statusDaUrl)) {
    return { ...FILTROS_PADRAO, statusSelecionados: [statusDaUrl as StatusCriativo] }
  }
  return FILTROS_PADRAO
}

function Criativos() {
  const [searchParams] = useSearchParams()
  const [pagina, setPagina] = useState(0)
  const [filtros, setFiltros] = useState<EstadoFiltros>(() =>
    filtrosIniciais(searchParams.get('status')),
  )
  const [modalAberto, setModalAberto] = useState(false)
  const [modalLoteAberto, setModalLoteAberto] = useState(false)
  const [criativoEditando, setCriativoEditando] = useState<Criativo | null>(null)
  const { data: frentes } = useFrentes()
  const { data: frentesAtivas } = useFrentes({ apenasAtivas: true })
  const { data: resultado, isLoading } = useCriativos({ pagina, filtros })

  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / ITENS_POR_PAGINA)) : 1

  function handleFiltrosChange(novosFiltros: EstadoFiltros) {
    setFiltros(novosFiltros)
    setPagina(0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0d559f]">Biblioteca de produção</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">Criativos</h1>
          <p className="mt-2 text-sm text-muted-foreground">Planeje, acompanhe e organize cada entrega do time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setModalLoteAberto(true)}>
            Criar em lote
          </Button>
          <Button onClick={() => setModalAberto(true)}>Novo criativo</Button>
        </div>
      </div>

      {frentes && frentesAtivas && (
        <>
          <ModalCriativo
            key={criativoEditando?.id ?? 'novo'}
            open={modalAberto || criativoEditando !== null}
            onOpenChange={(aberto) => {
              if (!aberto) {
                setModalAberto(false)
                setCriativoEditando(null)
              }
            }}
            frentes={frentes}
            frentesAtivas={frentesAtivas}
            criativo={criativoEditando ?? undefined}
          />
          <ModalLote open={modalLoteAberto} onOpenChange={setModalLoteAberto} frentes={frentesAtivas} />
        </>
      )}

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        {frentes && (
          <FiltrosCriativos frentes={frentes} filtros={filtros} onFiltrosChange={handleFiltrosChange} />
        )}
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {isLoading || !frentes ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <TabelaCriativos
            criativos={resultado?.criativos ?? []}
            frentes={frentes}
            onEditar={setCriativoEditando}
          />
        )}
      </section>

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground">
          Página {pagina + 1} de {totalPaginas} — {resultado?.total ?? 0} criativo(s)
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagina === 0}
            onClick={() => setPagina((p) => p - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagina + 1 >= totalPaginas}
            onClick={() => setPagina((p) => p + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Criativos
