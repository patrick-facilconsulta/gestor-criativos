import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDefinirPauta, useRemoverDaPauta, useAtualizarEtapa, useVideosSemPauta } from '@/hooks/use-pauta'
import { ETAPAS_JA_CAPTADAS, ROTULO_ETAPA, ROTULO_TIPO_DIA } from '@/lib/constantes'
import { formatarDataBR } from '@/lib/date-utils'
import type { ResumoDia } from '@/lib/producao-utils'
import type { Criativo, Frente } from '@/types/database'

interface ModalPautaDiaProps {
  resumo: ResumoDia | null
  frentes: Frente[]
  onOpenChange: (open: boolean) => void
}

function ModalPautaDia({ resumo, frentes, onOpenChange }: ModalPautaDiaProps) {
  const videosSemPauta = useVideosSemPauta()
  const definirPauta = useDefinirPauta()
  const removerDaPauta = useRemoverDaPauta()
  const atualizarEtapa = useAtualizarEtapa()

  const nomePorFrente = new Map(frentes.map((frente) => [frente.id, frente.nome]))
  const ocupado = definirPauta.isPending || removerDaPauta.isPending || atualizarEtapa.isPending

  function nomeDaFrente(criativo: Criativo) {
    return nomePorFrente.get(criativo.frente_id) ?? '—'
  }

  async function alternarCaptado(criativo: Criativo, captado: boolean) {
    await atualizarEtapa.mutateAsync({
      id: criativo.id,
      // Voltar atrás devolve o vídeo para "a captar"; marcar leva para "captado",
      // que é onde a esteira de edição começa.
      etapa: captado ? 'captado' : 'a_captar',
    })
  }

  return (
    <Dialog open={resumo !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        {resumo && (
          <div className="space-y-5">
            <DialogHeader>
              <DialogTitle>Pauta de {formatarDataBR(resumo.dia.dataISO)}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {ROTULO_TIPO_DIA[resumo.tipo]}
                {resumo.tipo === 'presencial' && ` · meta de ${resumo.metaVideo} vídeos`}
                {resumo.tipo === 'home' &&
                  ' · dia sem gravação. Marque como presencial para receber meta de vídeo.'}
              </p>
            </DialogHeader>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold">
                Nesta pauta ({resumo.pauta.length})
              </h4>

              {resumo.pauta.length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                  Nenhum vídeo neste dia ainda.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {resumo.pauta.map((criativo) => {
                    const captado = Boolean(
                      criativo.etapa && ETAPAS_JA_CAPTADAS.includes(criativo.etapa),
                    )

                    return (
                      <li
                        key={criativo.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
                      >
                        <Checkbox
                          checked={captado}
                          disabled={ocupado}
                          onCheckedChange={(marcado) =>
                            alternarCaptado(criativo, marcado === true)
                          }
                          aria-label={`Marcar ${criativo.titulo} como captado`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{criativo.titulo}</p>
                          <p className="text-xs text-muted-foreground">
                            {nomeDaFrente(criativo)}
                            {criativo.etapa && ` · ${ROTULO_ETAPA[criativo.etapa]}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={ocupado}
                          title="Tirar da pauta"
                          onClick={() => removerDaPauta.mutateAsync({ id: criativo.id })}
                        >
                          <X />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h4 className="text-sm font-semibold">Adicionar do briefing</h4>
              <p className="text-xs text-muted-foreground">
                Vídeos já cadastrados em Criativos que ainda não têm dia de captação.
              </p>

              {videosSemPauta.isLoading && (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              )}

              {videosSemPauta.isError && (
                <p className="text-sm text-destructive">Não foi possível carregar os vídeos.</p>
              )}

              {videosSemPauta.data && videosSemPauta.data.length === 0 && (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                  Todos os vídeos do briefing já têm dia. Cadastre novos em Criativos.
                </p>
              )}

              {videosSemPauta.data && videosSemPauta.data.length > 0 && (
                <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                  {videosSemPauta.data.map((criativo) => (
                    <li
                      key={criativo.id}
                      className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{criativo.titulo}</p>
                        <p className="text-xs text-muted-foreground">{nomeDaFrente(criativo)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={ocupado}
                        onClick={() =>
                          definirPauta.mutateAsync({ criativo, data: resumo.dia.dataISO })
                        }
                      >
                        <Plus />
                        Adicionar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ModalPautaDia
