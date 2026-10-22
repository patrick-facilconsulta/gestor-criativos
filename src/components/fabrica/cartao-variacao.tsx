import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Copy, Download, ImageIcon, Maximize2, Pencil, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRegistrarEntrega } from '@/hooks/use-criativos'
import {
  useAtualizarGeracao,
  useCriarCriativoDaFabrica,
  useFotoGeracao,
  useGerarFoto,
  type BaseFabrica,
} from '@/hooks/use-fabrica'
import { conferirCompliance } from '@/lib/compliance'
import { copiarTexto } from '@/lib/copiar-texto'
import { formatarDataBR, hojeISO } from '@/lib/date-utils'
import { baixarArquivo, gerarPng, nomeArquivo } from '@/lib/exportar-png'
import { DIMENSOES_ARTE, ROTULO_PROPORCAO, formatarReais, proporcoesDoFormato } from '@/lib/fabrica'
import { ehEspecificacaoHtml, especificacaoUsaFoto } from '@/lib/layout-referencia'
import { DESTAQUE_NO_GANCHO, excessosDeTexto, limitesDoLayout, type CampoArte } from '@/lib/limites-texto'
import type { FabricaGeracao, FabricaLote, FabricaModeloIA, ProporcaoArte, TextoArte } from '@/types/database'
import ArteCriativo from './arte/arte-criativo'
import PreviaEscalada from './arte/previa-escalada'

// Layouts que mostram a foto quando ela existe
const LAYOUTS_COM_FOTO = ['foto-fundo', 'manchete', 'pergunta', 'etiquetas-foto', 'post-its-foto', 'objeto-foto']
// Layouts que PRECISAM de foto: a foto é gerada sozinha quando a variação nasce
// neles (decisão de 22/10/2026: cerca de R$ 0,30 por foto). Valor = enquadramento
const LAYOUTS_PRECISAM_FOTO: Record<string, string> = {
  'foto-fundo': 'padrao',
  'etiquetas-foto': 'pessoa',
  'post-its-foto': 'pessoa',
  'objeto-foto': 'objeto',
}
// Fotos automáticas já pedidas nesta sessão (evita pedir duas vezes)
const fotosAutomaticasPedidas = new Set<string>()

const ROTULO_CAMPO: Record<CampoArte, string> = {
  gancho: 'Gancho',
  apoio: 'Texto de apoio',
  destaque: 'Selo/destaque',
  cta: 'Botão',
  itens: 'Um dos itens',
  antes: 'Hoje',
  depois: 'Com a Fácil',
}

// Quantos caracteres o campo tem e quantos o layout comporta
function ContadorTexto({ tamanho, limite }: { tamanho: number; limite: number | undefined }) {
  if (limite === undefined) return <span className="text-[11px] text-muted-foreground">não aparece neste layout</span>
  return (
    <span className={`text-[11px] ${tamanho > limite ? 'font-semibold text-destructive' : 'text-muted-foreground'}`}>
      {tamanho}/{limite}
    </span>
  )
}

interface CartaoVariacaoProps {
  geracao: FabricaGeracao
  base: BaseFabrica
  numero: number
  // Modelos de imagem ativos (OpenAI)
  modelosImagem: FabricaModeloIA[]
  // Custos das fotos já geradas para esta variação
  custosFoto: FabricaLote[]
  // Abre o anúncio de resultado em que a variação se inspirou
  onAbrirAnuncio?: (adId: string) => void
}

function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    if (await copiarTexto(texto)) {
      setCopiado(true)
      toast.success('Texto copiado.')
      setTimeout(() => setCopiado(false), 2000)
    } else {
      toast.error('Não foi possível copiar o texto.')
    }
  }

  return (
    <Button variant="ghost" size="icon-sm" title={`Copiar ${rotulo.toLowerCase()}`} onClick={copiar}>
      {copiado ? <Check className="text-[#187a3b]" /> : <Copy />}
    </Button>
  )
}

function LinhaTexto({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor?.trim()) return null

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
        <span className="text-[11px] text-muted-foreground">{valor.trim().length} caracteres</span>
      </div>
      <div className="flex items-start gap-1 rounded-md border border-[#d7e6f7] bg-[#f7faff] py-1.5 pr-1 pl-2.5">
        <p className="min-w-0 flex-1 py-0.5 text-sm break-words whitespace-pre-wrap">{valor.trim()}</p>
        <BotaoCopiar texto={valor.trim()} rotulo={rotulo} />
      </div>
    </div>
  )
}

function CartaoVariacao({ geracao, base, numero, modelosImagem, custosFoto, onAbrirAnuncio }: CartaoVariacaoProps) {
  // Uma arte por medida: estático tem quadrado + stories; vídeo tem só a capa
  const artes = useRef<Partial<Record<ProporcaoArte, HTMLDivElement | null>>>({})
  const atualizarGeracao = useAtualizarGeracao()
  const gerarFoto = useGerarFoto()
  const { data: fotoUrl } = useFotoGeracao(geracao.foto_path)
  const criarCriativo = useCriarCriativoDaFabrica()
  const registrarEntrega = useRegistrarEntrega()

  const layoutsAtivos = base.layouts.filter((layout) => layout.ativo)
  const paletasAtivas = base.paletas.filter((paleta) => paleta.ativo)
  const conceito = base.conceitos.find((c) => c.id === geracao.conceito_id)
  const narrativa = base.narrativas.find((n) => n.id === geracao.narrativa_id)
  const formato = base.formatos.find((f) => f.id === geracao.formato_id)
  const proporcoes: ProporcaoArte[] = formato ? proporcoesDoFormato(formato) : ['1:1']
  const eVideo = formato?.tipo === 'video'

  const [layoutId, setLayoutId] = useState(geracao.layout_id ?? layoutsAtivos[0]?.id)
  const [paletaId, setPaletaId] = useState(geracao.paleta_id ?? paletasAtivas[0]?.id)
  const [texto, setTexto] = useState<TextoArte>(geracao.texto_arte)
  const [editando, setEditando] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [ampliada, setAmpliada] = useState(false)
  const [fotoPrompt, setFotoPrompt] = useState(geracao.foto_prompt ?? '')
  const [modeloImagem, setModeloImagem] = useState(
    () => modelosImagem.find((m) => m.padrao)?.modelo ?? modelosImagem[0]?.modelo ?? '',
  )

  // Layout/paleta podem ter sido desativados depois da geração: ainda aparecem
  const layout = base.layouts.find((l) => l.id === layoutId) ?? layoutsAtivos[0]
  const paleta = base.paletas.find((p) => p.id === paletaId) ?? paletasAtivas[0]
  // Layout por referência com foto padrão: vale enquanto a variação não tem foto própria
  const fotoPadraoPath = layout && ehEspecificacaoHtml(layout.especificacao) ? layout.especificacao.foto_padrao_path : null
  const { data: fotoPadrao } = useFotoGeracao(fotoUrl ? null : fotoPadraoPath)
  const fotoArte = fotoUrl ?? fotoPadrao ?? null
  // Tamanho dos textos no layout escolhido (vale também ao trocar o layout na tela)
  const limites = limitesDoLayout(layout?.chave)
  const avisosTamanho = excessosDeTexto(texto, layout?.chave).map(
    (e) => `${ROTULO_CAMPO[e.campo]} com ${e.tamanho} caracteres: o layout "${layout?.nome}" comporta até ${e.limite}. Encurte em "Editar textos da arte".`,
  )
  const destaque = texto.destaque.trim().toLowerCase()
  if (layout && DESTAQUE_NO_GANCHO.includes(layout.chave) && destaque && !texto.gancho.toLowerCase().includes(destaque)) {
    avisosTamanho.push(`O selo/destaque não é um trecho do gancho: o layout "${layout.nome}" vai grifar as últimas palavras.`)
  }
  const alertas = [...conferirCompliance({ ...geracao, texto_arte: texto }), ...avisosTamanho]
  const enviado = Boolean(geracao.criativo_id)
  const textosAlterados = JSON.stringify(texto) !== JSON.stringify(geracao.texto_arte)

  const enquadramentoFoto = (layout && LAYOUTS_PRECISAM_FOTO[layout.chave]) ?? 'padrao'

  function gerarNovaFoto() {
    gerarFoto.mutate(
      { geracao_id: geracao.id, prompt: fotoPrompt.trim(), modelo: modeloImagem || null, enquadramento: enquadramentoFoto },
      {
        onSuccess: () => {
          toast.success('Foto gerada.')
          // Se o layout atual não mostra foto, passa para o de foto de fundo
          const fotoFundo = layoutsAtivos.find((l) => l.chave === 'foto-fundo')
          const layoutMostraFoto = layout && (LAYOUTS_COM_FOTO.includes(layout.chave) || especificacaoUsaFoto(layout.especificacao))
          if (layout && !layoutMostraFoto && fotoFundo) {
            setLayoutId(fotoFundo.id)
            atualizarGeracao.mutate({ id: geracao.id, layout_id: fotoFundo.id })
          }
        },
        onError: (erro) => toast.error(erro.message),
      },
    )
  }

  // Variação nova num layout que precisa de foto: a foto é gerada sozinha, uma vez
  const precisaFotoAutomatica =
    Boolean(layout && layout.chave in LAYOUTS_PRECISAM_FOTO) && !geracao.foto_path && Boolean(fotoPrompt.trim()) && modelosImagem.length > 0
  useEffect(() => {
    if (!precisaFotoAutomatica || fotosAutomaticasPedidas.has(geracao.id)) return
    // Só variações recém-geradas (não gera foto ao abrir o histórico)
    if (Date.now() - new Date(geracao.created_at).getTime() > 15 * 60_000) return
    fotosAutomaticasPedidas.add(geracao.id)
    gerarNovaFoto()
    // gerarNovaFoto muda a cada render; o disparo depende só destes valores
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precisaFotoAutomatica, geracao.id, geracao.created_at])

  const custoUltimaFoto = custosFoto[0]
  const custoTotalFotos = custosFoto.reduce((total, lote) => total + Number(lote.custo_brl), 0)

  function trocarLayout(direcao: 1 | -1) {
    if (layoutsAtivos.length === 0) return
    const atual = layoutsAtivos.findIndex((l) => l.id === layout?.id)
    const proximo = layoutsAtivos[(atual + direcao + layoutsAtivos.length) % layoutsAtivos.length]
    setLayoutId(proximo.id)
    atualizarGeracao.mutate({ id: geracao.id, layout_id: proximo.id })
  }

  function trocarPaleta(id: string) {
    setPaletaId(id)
    atualizarGeracao.mutate({ id: geracao.id, paleta_id: id })
  }

  function salvarTextos() {
    atualizarGeracao.mutate(
      { id: geracao.id, texto_arte: texto },
      { onSuccess: () => toast.success('Textos da arte salvos.') },
    )
    setEditando(false)
  }

  async function gerarImagem(proporcao: ProporcaoArte) {
    const elemento = artes.current[proporcao]
    if (!elemento) throw new Error('Arte não encontrada.')
    const { largura, altura } = DIMENSOES_ARTE[proporcao]
    return gerarPng(elemento, largura, altura)
  }

  const nomeBase = nomeArquivo(`${conceito?.nome ?? 'criativo'}-${numero}`)

  function nomeDaImagem(proporcao: ProporcaoArte) {
    const sufixo = eVideo ? 'capa' : ROTULO_PROPORCAO[proporcao].toLowerCase()
    return `${nomeBase}-${sufixo}.png`
  }

  async function baixar() {
    setProcessando(true)
    try {
      for (const proporcao of proporcoes) {
        baixarArquivo(await gerarImagem(proporcao), nomeDaImagem(proporcao))
      }
    } catch {
      toast.error('Não foi possível gerar a imagem.')
    } finally {
      setProcessando(false)
    }
  }

  function textoCompleto() {
    return [
      ['Texto principal', geracao.texto_principal],
      ['Título', geracao.titulo_anuncio],
      ['Descrição', geracao.descricao_anuncio],
      ['Chamada para ação', geracao.chamada_acao],
      ['Roteiro', geracao.roteiro],
    ]
      .filter(([, valor]) => valor?.trim())
      .map(([rotulo, valor]) => `${rotulo}:\n${valor!.trim()}`)
      .join('\n\n')
  }

  async function copiarTudo() {
    if (await copiarTexto(textoCompleto())) {
      toast.success('Todos os textos copiados.')
    } else {
      toast.error('Não foi possível copiar o texto.')
    }
  }

  async function enviarParaRevisao() {
    if (!geracao.frente_id || !formato) {
      toast.error('Esta variação não tem conceito ou formato. Gere de novo.')
      return
    }

    setProcessando(true)
    try {
      // Gera os PNGs antes de criar o criativo, para não deixar item sem arquivo
      const quadrado = eVideo ? null : await gerarImagem('1:1')
      const stories = eVideo ? null : await gerarImagem('9:16')
      const briefing = [
        `Gerado pela Fábrica de criativos em ${formatarDataBR(hojeISO())}.`,
        `Ângulo: ${conceito?.nome ?? '—'}`,
        `Narrativa: ${narrativa?.nome ?? '—'}`,
        `Formato: ${formato.nome}`,
        geracao.persona ? `Persona: ${geracao.persona}` : '',
        geracao.argumento_central ? `Argumento central: ${geracao.argumento_central}` : '',
        '',
        'Textos da arte:',
        `Gancho: ${texto.gancho}`,
        `Apoio: ${texto.apoio}`,
        `Destaque: ${texto.destaque}`,
        `CTA: ${texto.cta}`,
        geracao.roteiro ? `\nRoteiro:\n${geracao.roteiro}` : '',
      ]
        .filter((linha, indice, linhas) => linha !== '' || linhas[indice - 1] !== '')
        .join('\n')

      const criativoId = await criarCriativo.mutateAsync({
        geracaoId: geracao.id,
        titulo: `Fábrica · ${conceito?.nome ?? 'Criativo'} · ${formatarDataBR(hojeISO())}`,
        frente_id: geracao.frente_id,
        formato: formato.tipo,
        briefing,
        texto_principal: geracao.texto_principal,
        titulo_anuncio: geracao.titulo_anuncio,
        descricao_anuncio: geracao.descricao_anuncio,
        chamada_acao: geracao.chamada_acao,
      })

      if (quadrado && stories) {
        await registrarEntrega.mutateAsync({
          tipo: 'arquivo',
          id: criativoId,
          arquivo: new File([quadrado], nomeDaImagem('1:1'), { type: 'image/png' }),
          arquivoStories: new File([stories], nomeDaImagem('9:16'), { type: 'image/png' }),
          arquivoPathAnterior: null,
        })
      } else {
        toast.success('Roteiro enviado para o backlog de Criativos.')
      }
    } catch {
      toast.error('Não foi possível enviar para revisão. Tente de novo.')
    } finally {
      setProcessando(false)
    }
  }

  // Layout e cores: trocam na hora, sem gastar IA (usado no cartão e no modal)
  const controlesArte = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" title="Layout anterior" onClick={() => trocarLayout(-1)}>
          <ChevronLeft />
        </Button>
        <span className="min-w-28 text-center text-xs font-medium">{layout?.nome ?? 'Sem layout'}</span>
        <Button variant="outline" size="icon-sm" title="Próximo layout" onClick={() => trocarLayout(1)}>
          <ChevronRight />
        </Button>
      </div>
      {!ampliada && (
        <Button variant="ghost" size="sm" onClick={() => setAmpliada(true)}>
          <Maximize2 /> Ampliar
        </Button>
      )}
      <div className="flex items-center gap-1.5" role="group" aria-label="Cores">
        {paletasAtivas.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            title={opcao.nome}
            aria-pressed={opcao.id === paleta?.id}
            onClick={() => trocarPaleta(opcao.id)}
            className={`size-6 rounded-full border-2 transition-transform ${opcao.id === paleta?.id ? 'scale-110 border-[#0e1628]' : 'border-white shadow'}`}
            style={{ background: `linear-gradient(135deg, ${opcao.cor_fundo} 50%, ${opcao.cor_destaque} 50%)` }}
          />
        ))}
      </div>
    </div>
  )

  function campoTexto(chave: 'gancho' | 'apoio' | 'destaque' | 'cta' | 'antes' | 'depois', rotulo: string, linhas = 1) {
    const id = `${geracao.id}-${chave}`
    const limite = limites[chave]
    const passou = limite !== undefined && texto[chave].trim().length > limite
    return (
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={id} className="text-xs">{rotulo}</Label>
          <ContadorTexto tamanho={texto[chave].trim().length} limite={limite} />
        </div>
        {linhas > 1 ? (
          <Textarea id={id} rows={linhas} aria-invalid={passou} value={texto[chave]} onChange={(e) => setTexto((t) => ({ ...t, [chave]: e.target.value }))} />
        ) : (
          <Input id={id} aria-invalid={passou} value={texto[chave]} onChange={(e) => setTexto((t) => ({ ...t, [chave]: e.target.value }))} />
        )}
      </div>
    )
  }

  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-heading text-sm font-semibold">Variação {numero}</h3>
          {enviado && (
            <Link to="/entregas" className="rounded-full bg-[#e9f6ee] px-2.5 py-1 text-xs font-medium text-[#187a3b]">
              Enviado {eVideo ? 'ao backlog' : 'para revisão'}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {conceito && <span className="rounded-full bg-[#e1efff] px-2 py-0.5 text-[#0d559f]">{conceito.nome}</span>}
          {narrativa && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{narrativa.nome}</span>}
          {formato && <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{formato.nome}</span>}
        </div>
        {geracao.inspiracao?.tipo === 'referencia' && (
          <button
            type="button"
            disabled={!geracao.inspiracao.ad_id || !onAbrirAnuncio}
            title="Ver o anúncio de referência, com imagem e números"
            onClick={() => geracao.inspiracao?.ad_id && onAbrirAnuncio?.(geracao.inspiracao.ad_id)}
            className="block w-full rounded-md bg-[#e9f6ee] px-2.5 py-1.5 text-left text-sm text-[#187a3b] transition-colors hover:bg-[#d8efe0] disabled:cursor-default"
          >
            <span className="font-medium">Inspirado em {geracao.inspiracao.nome}:</span> {geracao.inspiracao.padrao}
          </button>
        )}
        {geracao.inspiracao?.tipo === 'exploracao' && (
          <p className="rounded-md bg-[#fdf1dc] px-2.5 py-1.5 text-sm text-[#9a5b00]">
            <span className="font-medium">Caminho novo (exploração):</span> {geracao.inspiracao.padrao || 'testa algo diferente dos anúncios atuais'}
          </p>
        )}
        {geracao.ponto_conceito && (
          <p className="rounded-md bg-[#e1efff] px-2.5 py-1.5 text-sm text-[#0d559f]">
            <span className="font-medium">Ponto do conceito:</span> {geracao.ponto_conceito}
          </p>
        )}
        {geracao.argumento_central && (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Argumento:</span> {geracao.argumento_central}
            {geracao.persona && <> · <span className="font-medium text-foreground">Persona:</span> {geracao.persona}</>}
          </p>
        )}
      </header>

      {alertas.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="flex items-center gap-1.5 font-medium"><AlertTriangle className="size-4" /> Confira antes de publicar</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {alertas.map((alerta) => <li key={alerta}>{alerta}</li>)}
          </ul>
        </div>
      )}

      {layout && paleta && (
        // Quadrado e stories lado a lado, com a mesma altura (colunas 16:9).
        // Clicar na prévia abre a arte grande para avaliar.
        <div
          role="button"
          tabIndex={0}
          title="Clique para ampliar"
          onClick={() => setAmpliada(true)}
          onKeyDown={(event) => event.key === 'Enter' && setAmpliada(true)}
          className={`cursor-zoom-in ${eVideo ? 'mx-auto w-full max-w-[260px]' : 'grid items-end gap-3'}`}
          style={eVideo ? undefined : { gridTemplateColumns: '16fr 9fr' }}
        >
          {proporcoes.map((proporcao) => (
            <div key={proporcao} className="min-w-0">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {eVideo ? 'Capa do Reels' : ROTULO_PROPORCAO[proporcao]}
              </p>
              <PreviaEscalada largura={DIMENSOES_ARTE[proporcao].largura} altura={DIMENSOES_ARTE[proporcao].altura}>
                <ArteCriativo
                  ref={(elemento) => {
                    artes.current[proporcao] = elemento
                  }}
                  chaveLayout={layout.chave}
                  especificacao={layout.especificacao}
                  paleta={paleta}
                  proporcao={proporcao}
                  texto={texto}
                  fotoUrl={fotoArte}
                />
              </PreviaEscalada>
            </div>
          ))}
        </div>
      )}

      {controlesArte}

      <Dialog open={ampliada} onOpenChange={setAmpliada}>
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-[min(1200px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>Variação {numero}{conceito ? ` · ${conceito.nome}` : ''}</DialogTitle>
            <DialogDescription>Avalie a arte em tamanho grande. Layout e cores trocam aqui também.</DialogDescription>
          </DialogHeader>
          {layout && paleta && (
            <div
              className={eVideo ? 'mx-auto w-full' : 'mx-auto grid w-full items-end gap-4'}
              // Limita pela altura da tela: a arte inteira cabe sem rolar
              style={
                eVideo
                  ? { maxWidth: 'calc(72vh * 9 / 16)' }
                  : { gridTemplateColumns: '16fr 9fr', maxWidth: 'calc(72vh * 25 / 16)' }
              }
            >
              {proporcoes.map((proporcao) => (
                <div key={proporcao} className="min-w-0">
                  <p className="mb-1 text-sm font-medium text-muted-foreground">
                    {eVideo
                      ? 'Capa do Reels'
                      : `${ROTULO_PROPORCAO[proporcao]} · ${DIMENSOES_ARTE[proporcao].largura}×${DIMENSOES_ARTE[proporcao].altura}`}
                  </p>
                  <PreviaEscalada largura={DIMENSOES_ARTE[proporcao].largura} altura={DIMENSOES_ARTE[proporcao].altura}>
                    <ArteCriativo chaveLayout={layout.chave}
                  especificacao={layout.especificacao} paleta={paleta} proporcao={proporcao} texto={texto} fotoUrl={fotoArte} />
                  </PreviaEscalada>
                </div>
              ))}
            </div>
          )}
          {controlesArte}
        </DialogContent>
      </Dialog>

      <section className="space-y-2 rounded-md border border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold"><ImageIcon className="size-4" /> Foto com IA (OpenAI)</h4>
          {custoUltimaFoto && (
            <span className="text-xs text-muted-foreground">
              Última: {formatarReais(Number(custoUltimaFoto.custo_brl))}
              {custosFoto.length > 1 && ` · ${custosFoto.length} fotos: ${formatarReais(custoTotalFotos)}`}
            </span>
          )}
        </div>
        <Textarea
          rows={3}
          aria-label="Descrição da foto"
          placeholder="Descreva a cena da foto (ex.: médica atendendo por teleconsulta em casa, à noite, luz quente)."
          value={fotoPrompt}
          onChange={(event) => setFotoPrompt(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          {modelosImagem.length > 1 && (
            <Select value={modeloImagem} onValueChange={setModeloImagem}>
              <SelectTrigger size="sm" className="w-48" aria-label="Modelo de imagem">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {modelosImagem.map((opcao) => (
                  <SelectItem key={opcao.modelo} value={opcao.modelo}>{opcao.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            variant={fotoUrl ? 'outline' : 'default'}
            disabled={gerarFoto.isPending || !fotoPrompt.trim() || modelosImagem.length === 0}
            onClick={gerarNovaFoto}
          >
            <ImageIcon />
            {gerarFoto.isPending ? 'Gerando foto... (até 1 min)' : fotoUrl ? 'Gerar outra foto' : 'Gerar foto'}
          </Button>
        </div>
        {fotoUrl && (
          <p className="text-xs text-muted-foreground">A foto aparece nos layouts Foto de fundo, Manchete, Pergunta, Etiquetas, Post-its e Objeto.</p>
        )}
      </section>

      {editando ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          {campoTexto('gancho', 'Gancho (título da arte)', 2)}
          {campoTexto('apoio', 'Texto de apoio', 2)}
          <div className="grid grid-cols-2 gap-3">
            {campoTexto('destaque', 'Selo')}
            {campoTexto('cta', 'Botão')}
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <Label className="text-xs">Itens (passos, tarefas, etiquetas ou post-its)</Label>
              {limites.itens === undefined ? (
                <ContadorTexto tamanho={0} limite={undefined} />
              ) : (
                <span className="text-[11px] text-muted-foreground">até {limites.itens} cada</span>
              )}
            </div>
            {[0, 1, 2].map((indice) => (
              <Input
                key={indice}
                aria-label={`Item ${indice + 1}`}
                aria-invalid={limites.itens !== undefined && (texto.itens[indice] ?? '').trim().length > limites.itens}
                value={texto.itens[indice] ?? ''}
                onChange={(e) =>
                  setTexto((t) => {
                    const itens = [...t.itens]
                    itens[indice] = e.target.value
                    return { ...t, itens }
                  })
                }
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {campoTexto('antes', 'Hoje (comparativo)')}
            {campoTexto('depois', 'Com a Fácil (comparativo)')}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setTexto(geracao.texto_arte); setEditando(false) }}>
              Cancelar
            </Button>
            <Button size="sm" disabled={!textosAlterados} onClick={salvarTextos}>Salvar textos</Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" size="sm" className="w-fit" onClick={() => setEditando(true)}>
          <Pencil /> Editar textos da arte
        </Button>
      )}

      <section className="space-y-2 border-t border-border pt-3">
        <h4 className="text-sm font-semibold">Textos do anúncio</h4>
        <LinhaTexto rotulo="Texto principal" valor={geracao.texto_principal} />
        <LinhaTexto rotulo="Título" valor={geracao.titulo_anuncio} />
        <LinhaTexto rotulo="Descrição" valor={geracao.descricao_anuncio} />
        <LinhaTexto rotulo="Chamada para ação" valor={geracao.chamada_acao} />
        {eVideo && <LinhaTexto rotulo="Roteiro" valor={geracao.roteiro} />}
      </section>

      <footer className="mt-auto flex flex-wrap gap-2 border-t border-border pt-3">
        <Button variant="outline" size="sm" disabled={processando} onClick={baixar}>
          <Download /> {eVideo ? 'Baixar capa' : 'Baixar as 2 imagens'}
        </Button>
        <Button variant="outline" size="sm" onClick={copiarTudo}>
          <Copy /> Copiar textos
        </Button>
        <Button size="sm" disabled={processando || enviado} onClick={enviarParaRevisao} className="ml-auto">
          <Send /> {processando ? 'Processando...' : eVideo ? 'Enviar ao backlog' : 'Enviar para revisão'}
        </Button>
      </footer>
    </article>
  )
}

export default CartaoVariacao
