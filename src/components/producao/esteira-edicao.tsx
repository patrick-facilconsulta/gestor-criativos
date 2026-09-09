import { ArrowRight, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAtualizarEtapa, useDefinirEditor } from '@/hooks/use-pauta'
import { formatarDataBR } from '@/lib/date-utils'
import type { Criativo, EtapaProducao, Frente } from '@/types/database'

// As três colunas depois da captação. Sem arrastar e soltar (fora de escopo pelo
// CLAUDE.md): cada card tem um botão que empurra o vídeo para a coluna seguinte.
const COLUNAS: {
  etapa: Extract<EtapaProducao, 'captado' | 'em_edicao' | 'editado'>
  titulo: string
  subtitulo: string
  proxima: EtapaProducao | null
  rotuloBotao: string
}[] = [
  {
    etapa: 'captado',
    titulo: 'Captados',
    subtitulo: 'gravados, aguardando edição',
    proxima: 'em_edicao',
    rotuloBotao: 'Mandar para edição',
  },
  {
    etapa: 'em_edicao',
    titulo: 'Em edição',
    subtitulo: 'na mão do editor',
    proxima: 'editado',
    rotuloBotao: 'Marcar como editado',
  },
  {
    etapa: 'editado',
    titulo: 'Editados',
    subtitulo: 'prontos para entrega',
    proxima: null,
    rotuloBotao: '',
  },
]

interface EsteiraEdicaoProps {
  pauta: Criativo[]
  frentes: Frente[]
}

function EsteiraEdicao({ pauta, frentes }: EsteiraEdicaoProps) {
  const atualizarEtapa = useAtualizarEtapa()
  const definirEditor = useDefinirEditor()

  const nomePorFrente = new Map(frentes.map((frente) => [frente.id, frente.nome]))

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {COLUNAS.map((coluna) => {
        const itens = pauta.filter((criativo) => criativo.etapa === coluna.etapa)

        return (
          <section key={coluna.etapa} className="space-y-2">
            <div className="border-b border-border pb-1.5">
              <h3 className="text-sm font-semibold">
                {coluna.titulo}{' '}
                <span className="font-normal text-muted-foreground tabular-nums">
                  ({itens.length})
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">{coluna.subtitulo}</p>
            </div>

            {itens.length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                Nada aqui.
              </p>
            ) : (
              <ul className="space-y-2">
                {itens.map((criativo) => (
                  <li
                    key={criativo.id}
                    className="space-y-2 rounded-lg border border-border bg-card p-3 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-medium">{criativo.titulo}</p>
                      <p className="text-xs text-muted-foreground">
                        {nomePorFrente.get(criativo.frente_id) ?? '—'} ·{' '}
                        {formatarDataBR(criativo.data_captacao)}
                      </p>
                    </div>

                    {coluna.etapa !== 'captado' && (
                      <Input
                        className="h-7 text-xs"
                        placeholder="Editor"
                        defaultValue={criativo.editor ?? ''}
                        onBlur={(event) => {
                          const novo = event.target.value.trim() || null
                          if (novo !== criativo.editor) {
                            definirEditor.mutateAsync({ id: criativo.id, editor: novo })
                          }
                        }}
                      />
                    )}

                    {coluna.proxima ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={atualizarEtapa.isPending}
                        onClick={() =>
                          atualizarEtapa.mutateAsync({
                            id: criativo.id,
                            etapa: coluna.proxima as EtapaProducao,
                          })
                        }
                      >
                        {coluna.rotuloBotao}
                        <ArrowRight />
                      </Button>
                    ) : (
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link to="/entregas">
                          <Upload />
                          Ir para Entregas
                        </Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

export default EsteiraEdicao
