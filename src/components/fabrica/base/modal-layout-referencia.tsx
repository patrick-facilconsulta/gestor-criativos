import { useRef, useState } from 'react'
import { ImagePlus, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import ArteCriativo from '@/components/fabrica/arte/arte-criativo'
import PreviaEscalada from '@/components/fabrica/arte/previa-escalada'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAnalisarReferencia, useSalvarLayoutReferencia, type AnaliseReferencia } from '@/hooks/use-fabrica'
import { DIMENSOES_ARTE, formatarReais } from '@/lib/fabrica'
import { prepararImagemReferencia } from '@/lib/layout-referencia'
import type { FabricaPaleta, TextoArte } from '@/types/database'

const MAX_IMAGENS = 3

// Texto de exemplo só para a prévia do layout
const TEXTO_EXEMPLO: TextoArte = {
  gancho: 'Médico, a consulta chega paga e confirmada.',
  apoio: 'O paciente agenda pelo Google e você recebe o aviso no WhatsApp.',
  destaque: 'Paciente já pago',
  cta: 'Veja se tem demanda',
  itens: ['Paciente te acha no Google', 'Agenda e paga online', 'Você recebe o aviso'],
  antes: 'Cobrar e negociar horário',
  depois: 'Paciente chega pago',
}

interface ImagemPreparada {
  previa: string
  media_type: string
  data: string
}

interface ModalLayoutReferenciaProps {
  aberto: boolean
  paletas: FabricaPaleta[]
  proximaOrdemLayout: number
  proximaOrdemPaleta: number
  onFechar: () => void
}

function ModalLayoutReferencia({ aberto, paletas, proximaOrdemLayout, proximaOrdemPaleta, onFechar }: ModalLayoutReferenciaProps) {
  const entrada = useRef<HTMLInputElement>(null)
  const analisar = useAnalisarReferencia()
  const salvar = useSalvarLayoutReferencia()
  const [imagens, setImagens] = useState<ImagemPreparada[]>([])
  const [nome, setNome] = useState('')
  const [observacao, setObservacao] = useState('')
  const [analise, setAnalise] = useState<AnaliseReferencia | null>(null)
  const [usarCores, setUsarCores] = useState(true)

  async function adicionarImagens(arquivos: FileList | null) {
    if (!arquivos) return
    const livres = MAX_IMAGENS - imagens.length
    const escolhidos = [...arquivos].filter((arquivo) => arquivo.type.startsWith('image/')).slice(0, livres)
    try {
      const preparadas = await Promise.all(escolhidos.map(prepararImagemReferencia))
      setImagens((atuais) => [...atuais, ...preparadas])
      setAnalise(null)
    } catch {
      toast.error('Não foi possível ler uma das imagens. Use JPG, PNG ou WebP.')
    }
    if (entrada.current) entrada.current.value = ''
  }

  function analisarReferencia() {
    analisar.mutate(
      { imagens: imagens.map(({ media_type, data }) => ({ media_type, data })), observacao: observacao.trim() || null },
      {
        onSuccess: (resultado) => setAnalise(resultado),
        onError: (erro) => toast.error(erro.message),
      },
    )
  }

  function salvarLayout() {
    if (!analise) return
    salvar.mutate(
      {
        nome: nome.trim(),
        especificacao: analise.especificacao,
        imagens: imagens.map(({ media_type, data }) => ({ media_type, data })),
        ordem: proximaOrdemLayout,
        paleta: usarCores ? { ...analise.cores, nome: `Ref. ${nome.trim()}`, ordem: proximaOrdemPaleta } : null,
      },
      {
        onSuccess: fechar,
        onError: () => toast.error('Não foi possível salvar o layout. Tente de novo.'),
      },
    )
  }

  function fechar() {
    setImagens([])
    setNome('')
    setObservacao('')
    setAnalise(null)
    setUsarCores(true)
    onFechar()
  }

  // Paleta da prévia: as cores da referência ou a primeira paleta ativa
  const paletaPrevia: FabricaPaleta | undefined = analise && usarCores
    ? {
        id: 'referencia',
        nome: 'Referência',
        cor_fundo: analise.cores.fundo,
        cor_texto: analise.cores.texto,
        cor_destaque: analise.cores.destaque,
        cor_apoio: analise.cores.apoio,
        ativo: true,
        ordem: 0,
        created_at: '',
      }
    : paletas[0]

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && fechar()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Novo layout por referência</DialogTitle>
          <DialogDescription>
            Envie até 3 imagens de anúncios que seguem o padrão desejado. A IA identifica a estrutura, o estilo e as cores e
            monta um layout que funciona no quadrado e no stories, sempre com o logo e as fontes da marca.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Imagens de referência</Label>
              <div className="grid grid-cols-3 gap-2">
                {imagens.map((imagem, indice) => (
                  <div key={indice} className="relative overflow-hidden rounded-md border border-border">
                    <img src={imagem.previa} alt={`Referência ${indice + 1}`} className="aspect-square w-full object-cover" />
                    <button
                      type="button"
                      title="Remover"
                      onClick={() => {
                        setImagens((atuais) => atuais.filter((_, i) => i !== indice))
                        setAnalise(null)
                      }}
                      className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
                {imagens.length < MAX_IMAGENS && (
                  <button
                    type="button"
                    onClick={() => entrada.current?.click()}
                    className="grid aspect-square place-items-center rounded-md border border-dashed border-[#b9cee6] bg-[#f7faff] text-xs font-medium text-[#0d559f] hover:border-primary"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <ImagePlus className="size-5" />
                      Adicionar
                    </span>
                  </button>
                )}
              </div>
              <input
                ref={entrada}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => adicionarImagens(event.target.files)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="referencia-observacao">O que você quer aproveitar da referência? (opcional)</Label>
              <Textarea
                id="referencia-observacao"
                rows={2}
                placeholder="Ex.: o título gigante em caixa alta e o botão largo no rodapé."
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
              />
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={imagens.length === 0 || analisar.isPending}
              onClick={analisarReferencia}
            >
              <Sparkles />
              {analisar.isPending ? 'Analisando... (até 30 s)' : analise ? 'Analisar de novo' : 'Analisar referência'}
            </Button>

            {analise && (
              <div className="space-y-3 rounded-md border border-border p-3">
                <p className="text-sm">
                  <span className="font-medium">O que a IA entendeu:</span> {analise.especificacao.descricao}
                </p>
                <p className="text-xs text-muted-foreground">Custo da análise: {formatarReais(analise.custo_brl)}</p>
                <div className="space-y-1">
                  <Label htmlFor="referencia-nome">Nome do layout</Label>
                  <Input id="referencia-nome" placeholder="Ex.: Título gigante com faixa" value={nome} onChange={(event) => setNome(event.target.value)} />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox className="mt-0.5" checked={usarCores} onCheckedChange={(marcado) => setUsarCores(marcado === true)} />
                  <span>
                    Criar também uma paleta com as cores da referência
                    <span className="mt-1 flex gap-1">
                      {Object.values(analise.cores).map((cor) => (
                        <span key={cor} title={cor} className="size-5 rounded-full border border-border" style={{ background: cor }} />
                      ))}
                    </span>
                  </span>
                </label>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Prévia</p>
            {analise && paletaPrevia ? (
              <>
                <div className="grid items-end gap-3" style={{ gridTemplateColumns: '16fr 9fr' }}>
                  {(['1:1', '9:16'] as const).map((proporcao) => (
                    <div key={proporcao} className="min-w-0">
                      <p className="mb-1 text-xs text-muted-foreground">{proporcao === '1:1' ? 'Quadrado' : 'Stories'}</p>
                      <PreviaEscalada largura={DIMENSOES_ARTE[proporcao].largura} altura={DIMENSOES_ARTE[proporcao].altura}>
                        <ArteCriativo
                          chaveLayout="referencia"
                          especificacao={analise.especificacao}
                          paleta={paletaPrevia}
                          proporcao={proporcao}
                          texto={TEXTO_EXEMPLO}
                        />
                      </PreviaEscalada>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Texto de exemplo. Se o layout usa foto, ela aparece quando você gerar uma foto na variação.
                </p>
              </>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Envie as imagens e clique em "Analisar referência" para ver como o layout vai ficar.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={fechar}>Cancelar</Button>
          <Button type="button" disabled={!analise || !nome.trim() || salvar.isPending} onClick={salvarLayout}>
            {salvar.isPending ? 'Salvando...' : 'Salvar layout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ModalLayoutReferencia
