import { useRef, useState } from 'react'
import { ImageIcon, ImagePlus, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import ArteCriativo from '@/components/fabrica/arte/arte-criativo'
import PreviaEscalada from '@/components/fabrica/arte/previa-escalada'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAnalisarReferencia, useGerarFotoLayout, useSalvarLayoutReferencia, type AnaliseReferencia } from '@/hooks/use-fabrica'
import { DIMENSOES_ARTE, formatarReais, nomeDoModelo } from '@/lib/fabrica'
import { prepararImagemReferencia } from '@/lib/layout-referencia'
import type { FabricaModeloIA, FabricaPaleta, TextoArte } from '@/types/database'

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
  // Modelos de texto da OpenAI ativos (a análise usa a OpenAI)
  modelos: FabricaModeloIA[]
  proximaOrdemLayout: number
  onFechar: () => void
}

function ModalLayoutReferencia({ aberto, paletas, modelos, proximaOrdemLayout, onFechar }: ModalLayoutReferenciaProps) {
  const entrada = useRef<HTMLInputElement>(null)
  const analisar = useAnalisarReferencia()
  const salvar = useSalvarLayoutReferencia()
  const gerarFoto = useGerarFotoLayout()
  // Foto de exemplo da cena da referência; vira a foto padrão do layout
  const [fotoExemplo, setFotoExemplo] = useState<{ path: string; url: string } | null>(null)
  const [imagens, setImagens] = useState<ImagemPreparada[]>([])
  const [nome, setNome] = useState('')
  const [observacao, setObservacao] = useState('')
  const [analise, setAnalise] = useState<AnaliseReferencia | null>(null)
  // Paleta da marca usada na prévia
  const [paletaPreviaId, setPaletaPreviaId] = useState<string | null>(null)
  const [modeloEscolhido, setModeloEscolhido] = useState<string | null>(null)
  // Padrão: o modelo mais capaz da OpenAI (lê melhor a imagem), se estiver ativo
  const modelo =
    modelos.find((m) => m.modelo === modeloEscolhido)?.modelo ??
    modelos.find((m) => m.modelo === 'gpt-6-astra')?.modelo ??
    modelos[0]?.modelo ??
    null

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
      { imagens: imagens.map(({ media_type, data }) => ({ media_type, data })), observacao: observacao.trim() || null, modelo },
      {
        onSuccess: (resultado) => {
          setAnalise(resultado)
          setFotoExemplo(null)
          // Layout com foto: já gera a foto de exemplo, para a prévia ficar fiel
          if (resultado.especificacao.usa_foto && resultado.especificacao.foto_sugerida) {
            gerarFotoExemplo(resultado.especificacao.foto_sugerida)
          }
        },
        onError: (erro) => toast.error(erro.message),
      },
    )
  }

  function gerarFotoExemplo(prompt: string) {
    gerarFoto.mutate(
      { prompt },
      {
        onSuccess: (foto) => setFotoExemplo(foto),
        onError: (erro) => toast.error(erro.message),
      },
    )
  }

  function salvarLayout() {
    if (!analise) return
    salvar.mutate(
      {
        nome: nome.trim(),
        especificacao: { ...analise.especificacao, foto_padrao_path: fotoExemplo?.path ?? null },
        imagens: imagens.map(({ media_type, data }) => ({ media_type, data })),
        ordem: proximaOrdemLayout,
        // As cores vêm sempre das paletas da marca
        paleta: null,
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
    setPaletaPreviaId(null)
    setFotoExemplo(null)
    onFechar()
  }

  // Prévia com as paletas da marca (troca pelas bolinhas)
  const paletaPrevia: FabricaPaleta | undefined = paletas.find((p) => p.id === paletaPreviaId) ?? paletas[0]

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && fechar()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Novo layout por referência</DialogTitle>
          <DialogDescription>
            Envie até 3 imagens de anúncios no padrão desejado. A IA recria a composição da referência (posição dos blocos,
            mockups, uso de foto) no quadrado e no stories, sempre com o logo, as fontes e as cores da Fácil consulta.
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

            <div className="space-y-1">
              <Label htmlFor="referencia-modelo">Modelo de IA (OpenAI)</Label>
              {modelos.length > 0 ? (
                <Select value={modelo ?? ''} onValueChange={setModeloEscolhido}>
                  <SelectTrigger id="referencia-modelo" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {modelos.map((opcao) => (
                      <SelectItem key={opcao.modelo} value={opcao.modelo}>
                        {opcao.nome}
                        {opcao.descricao && <span className="text-muted-foreground"> · {opcao.descricao}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-destructive">Nenhum modelo de texto da OpenAI ativo. Ative um em Modelos de IA.</p>
              )}
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={imagens.length === 0 || analisar.isPending || !modelo}
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
                <p className="text-xs text-muted-foreground">
                  Custo da análise: {formatarReais(analise.custo_brl)} · {nomeDoModelo(analise.modelo, modelos)}
                </p>
                <div className="space-y-1">
                  <Label htmlFor="referencia-nome">Nome do layout</Label>
                  <Input id="referencia-nome" placeholder="Ex.: Título gigante com faixa" value={nome} onChange={(event) => setNome(event.target.value)} />
                </div>
                {analise.especificacao.usa_foto && analise.especificacao.foto_sugerida && (
                  <div className="space-y-2 rounded-md bg-[#f7faff] p-2.5">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Foto do layout:</span> {analise.especificacao.foto_sugerida}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={gerarFoto.isPending}
                      onClick={() => gerarFotoExemplo(analise.especificacao.foto_sugerida)}
                    >
                      <ImageIcon />
                      {gerarFoto.isPending ? 'Gerando a foto... (até 1 min)' : fotoExemplo ? 'Gerar outra foto' : 'Gerar foto'}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      Essa foto fica salva como foto padrão do layout. Cada variação pode gerar a sua depois.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Prévia</p>
              {analise && (
                <div className="flex items-center gap-1.5" role="group" aria-label="Paleta da prévia">
                  {paletas.map((opcao) => (
                    <button
                      key={opcao.id}
                      type="button"
                      title={opcao.nome}
                      aria-pressed={opcao.id === paletaPrevia?.id}
                      onClick={() => setPaletaPreviaId(opcao.id)}
                      className={`size-6 rounded-full border-2 ${opcao.id === paletaPrevia?.id ? 'border-[#0e1628]' : 'border-white shadow'}`}
                      style={{ background: `linear-gradient(135deg, ${opcao.cor_fundo} 50%, ${opcao.cor_destaque} 50%)` }}
                    />
                  ))}
                </div>
              )}
            </div>
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
                          fotoUrl={fotoExemplo?.url ?? null}
                        />
                      </PreviaEscalada>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Texto de exemplo, com as paletas da marca. A área cinza marcada "FOTO" mostra onde entra a foto, até ela ser gerada.
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
          <Button type="button" disabled={!analise || !nome.trim() || salvar.isPending || gerarFoto.isPending} onClick={salvarLayout}>
            {salvar.isPending ? 'Salvando...' : 'Salvar layout'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ModalLayoutReferencia
