import { ExternalLink, ImageOff } from 'lucide-react'
import SecaoLeitura from '@/components/desempenho/secao-leitura'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDefinirConceitoManual, type DesempenhoAnuncio } from '@/hooks/use-meta'
import type { Frente } from '@/types/database'

const SEM_CONCEITO = 'sem'

const reais = (valor: number) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const porcento = (parte: number, todo: number) =>
  todo > 0 ? `${((parte / todo) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—'

interface ModalAnuncioProps {
  anuncio: DesempenhoAnuncio | null
  frentes: Frente[]
  onFechar: () => void
}

// Imagem do anúncio em tamanho grande, textos e números. Anúncio sem conceito
// no nome ganha o seletor para classificar à mão, olhando a imagem.
function ModalAnuncio({ anuncio, frentes, onFechar }: ModalAnuncioProps) {
  const definirConceito = useDefinirConceitoManual()
  const nomes = new Map(frentes.map((f) => [f.id, f.nome]))
  const imagem = anuncio?.imagem_url || anuncio?.thumbnail_url

  return (
    <Dialog open={Boolean(anuncio)} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-auto sm:max-w-4xl">
        {anuncio && (
          <>
            <DialogHeader>
              <DialogTitle>{anuncio.nome}</DialogTitle>
              <DialogDescription>
                {anuncio.campanha_nome} › {anuncio.conjunto_nome}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_300px]">
              {anuncio.tipo_midia === 'carrossel' && anuncio.cartoes?.length ? (
                // Carrossel: todos os cards, na ordem
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {anuncio.cartoes.map((cartao, indice) => (
                    <figure key={indice} className="space-y-1">
                      {cartao.imagem_url ? (
                        <img src={cartao.imagem_url} alt={`Card ${indice + 1}`} className="w-full rounded-md object-contain" />
                      ) : (
                        <span className="grid aspect-square place-items-center rounded-md bg-muted"><ImageOff className="size-5" /></span>
                      )}
                      <figcaption className="text-xs text-muted-foreground">
                        Card {indice + 1}{cartao.titulo ? ` · ${cartao.titulo}` : ''}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="grid min-h-64 place-items-center rounded-md bg-muted">
                  {imagem ? (
                    <img src={imagem} alt={anuncio.nome} className="max-h-[70vh] w-full rounded-md object-contain" />
                  ) : (
                    <span className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                      <ImageOff className="size-6" />
                      Sem imagem disponível
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-4 text-sm">
                <div className="space-y-1">
                  <Label htmlFor="conceito-anuncio">Conceito</Label>
                  {anuncio.frente_id ? (
                    <p>
                      {nomes.get(anuncio.frente_id) ?? '—'}
                      <span className="ml-1 text-xs text-muted-foreground">(pelo nome do anúncio)</span>
                    </p>
                  ) : (
                    <>
                      <Select
                        value={anuncio.frente_manual ?? SEM_CONCEITO}
                        disabled={definirConceito.isPending}
                        onValueChange={(valor) =>
                          definirConceito.mutate({ adId: anuncio.ad_id, frenteId: valor === SEM_CONCEITO ? null : valor })
                        }
                      >
                        <SelectTrigger id="conceito-anuncio" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SEM_CONCEITO}>Sem conceito</SelectItem>
                          {frentes.map((f) => (
                            <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        O nome deste anúncio não indica o conceito. A escolha vale para esta página e para o aprendizado da IA.
                      </p>
                    </>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-md bg-[#f7faff] p-3">
                  <dt className="text-muted-foreground">Gasto</dt>
                  <dd className="text-right font-medium">{reais(anuncio.gasto)}</dd>
                  <dt className="text-muted-foreground">Cadastros</dt>
                  <dd className="text-right font-medium">{anuncio.resultados.toLocaleString('pt-BR')}</dd>
                  <dt className="text-muted-foreground">Custo/cadastro</dt>
                  <dd className="text-right font-medium">{anuncio.resultados ? reais(anuncio.gasto / anuncio.resultados) : '—'}</dd>
                  <dt className="text-muted-foreground">CTR link</dt>
                  <dd className="text-right">{porcento(anuncio.cliques_link, anuncio.impressoes)}</dd>
                  <dt className="text-muted-foreground">Cad./clique</dt>
                  <dd className="text-right">{porcento(anuncio.resultados, anuncio.cliques_link)}</dd>
                  <dt className="text-muted-foreground">Cad./visita</dt>
                  <dd className="text-right">{porcento(anuncio.resultados, anuncio.visitas_lp)}</dd>
                </dl>

                <SecaoLeitura key={anuncio.ad_id} anuncio={anuncio} />

                {anuncio.texto_principal && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Texto principal</p>
                    <p className="mt-1 whitespace-pre-line">{anuncio.texto_principal}</p>
                  </div>
                )}
                {anuncio.titulo && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Título</p>
                    <p className="mt-1">{anuncio.titulo}</p>
                  </div>
                )}
                {imagem && (
                  <a href={imagem} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-[#0d559f] hover:underline">
                    <ExternalLink className="size-3" />
                    Abrir a imagem em outra aba
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ModalAnuncio
