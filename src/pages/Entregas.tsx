import { useRef, useState } from 'react'
import { CheckCircle2, Download, Eye, FileUp, Send, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import SeletorMes, { type MesSelecionado } from '@/components/dashboard/seletor-mes'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAtualizarStatusCriativo } from '@/hooks/use-atualizar-status-criativo'
import { obterUrlArquivoEntrega, useCriativosParaEntrega, useRegistrarEntrega } from '@/hooks/use-criativos'
import { useFrentes } from '@/hooks/use-frentes'
import { ROTULO_FORMATO } from '@/lib/constantes'
import type { Criativo } from '@/types/database'

function Entregas() {
  const [criativoSelecionado, setCriativoSelecionado] = useState<Criativo | null>(null)
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const [arrastandoArquivo, setArrastandoArquivo] = useState(false)
  const [criativoEmVisualizacao, setCriativoEmVisualizacao] = useState<Criativo | null>(null)
  const [urlVisualizacao, setUrlVisualizacao] = useState<string | null>(null)
  const [carregandoVisualizacao, setCarregandoVisualizacao] = useState(false)
  const [mesAprovados, setMesAprovados] = useState<MesSelecionado>(() => {
    const hoje = new Date()
    return { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }
  })
  const inputArquivo = useRef<HTMLInputElement>(null)
  const { data: criativos, isLoading, isError } = useCriativosParaEntrega()
  const { data: frentes } = useFrentes()
  const registrarEntrega = useRegistrarEntrega()
  const atualizarStatus = useAtualizarStatusCriativo()

  const pendentes = criativos?.filter(
    (criativo) =>
      ['backlog', 'producao', 'reprovado'].includes(criativo.status) ||
      (criativo.status === 'revisao' && !criativo.arquivo_path && !criativo.link_arquivo),
  ) ?? []
  const emRevisao = criativos?.filter(
    (criativo) =>
      criativo.status === 'revisao' && Boolean(criativo.arquivo_path || criativo.link_arquivo),
  ) ?? []
  const aprovados = criativos?.filter(
    (criativo) =>
      criativo.status === 'aprovado' &&
      Boolean(criativo.arquivo_path || criativo.link_arquivo) &&
      criativo.data_entrega?.startsWith(`${mesAprovados.ano}-${String(mesAprovados.mes).padStart(2, '0')}`),
  ) ?? []
  const temAprovados = criativos?.some(
    (criativo) =>
      criativo.status === 'aprovado' && Boolean(criativo.arquivo_path || criativo.link_arquivo),
  ) ?? false
  const nomesFrente = new Map(frentes?.map((frente) => [frente.id, frente.nome]))
  const enviando = registrarEntrega.isPending

  function selecionarCriativo(criativo: Criativo) {
    setCriativoSelecionado(criativo)
    setArquivoSelecionado(null)
  }

  function selecionarArquivo(arquivo: File | undefined) {
    if (arquivo) setArquivoSelecionado(arquivo)
  }

  async function enviarEntrega() {
    if (!criativoSelecionado || !arquivoSelecionado) return

    try {
      await registrarEntrega.mutateAsync({
        id: criativoSelecionado.id,
        arquivo: arquivoSelecionado,
        arquivoPathAnterior: criativoSelecionado.arquivo_path,
      })
      setCriativoSelecionado(null)
      setArquivoSelecionado(null)
    } catch {
      toast.error('Não foi possível enviar o arquivo. Verifique o tamanho e tente novamente.')
    }
  }

  async function visualizarEntrega(criativo: Criativo) {
    try {
      if (criativo.arquivo_path) {
        setCarregandoVisualizacao(true)
        setCriativoEmVisualizacao(criativo)
        setUrlVisualizacao(await obterUrlArquivoEntrega(criativo.arquivo_path))
      } else if (criativo.link_arquivo) {
        setCriativoEmVisualizacao(criativo)
        setUrlVisualizacao(criativo.link_arquivo)
      }
    } catch {
      toast.error('Não foi possível abrir este arquivo.')
      setCriativoEmVisualizacao(null)
    } finally {
      setCarregandoVisualizacao(false)
    }
  }

  async function baixarEntrega(criativo: Criativo) {
    try {
      const url = criativo.arquivo_path
        ? await obterUrlArquivoEntrega(criativo.arquivo_path)
        : criativo.link_arquivo

      if (!url) return

      const link = document.createElement('a')
      link.href = url
      link.download = criativo.arquivo_nome ?? criativo.titulo
      document.body.append(link)
      link.click()
      link.remove()
    } catch {
      toast.error('Não foi possível baixar este arquivo.')
    }
  }

  const tipoArquivo = criativoEmVisualizacao?.arquivo_tipo ?? ''
  const eImagem = tipoArquivo.startsWith('image/')
  const eVideo = tipoArquivo.startsWith('video/')
  const ePdf = tipoArquivo === 'application/pdf'

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#0d559f]">Etapa final da produção</p>
          <h1 className="mt-1 text-3xl font-bold tracking-normal">Entregas</h1>
          <p className="mt-2 text-sm text-muted-foreground">Envie conteúdos finalizados para validação e mantenha a equipe alinhada.</p>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-[#e9f6ee] px-3 py-2 text-sm font-medium text-[#187a3b]">
          <CheckCircle2 className="size-4" />
          {emRevisao.length} em revisão
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Prontos para entregar</h2>
              <p className="mt-1 text-sm text-muted-foreground">Selecione um item para enviar o arquivo final.</p>
            </div>
            <span className="text-sm text-muted-foreground">{pendentes.length} itens</span>
          </div>

          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando entregas...</p>
          ) : isError ? (
            <div className="p-6 text-sm text-destructive">Não foi possível carregar a fila de entregas.</div>
          ) : pendentes.length === 0 ? (
            <div className="grid min-h-56 place-items-center p-6 text-center">
              <div>
                <CheckCircle2 className="mx-auto size-8 text-[#21a453]" />
                <p className="mt-3 font-medium">Nenhuma entrega pendente</p>
                <p className="mt-1 text-sm text-muted-foreground">Os próximos conteúdos em produção aparecerão aqui.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendentes.map((criativo) => (
                <button
                  key={criativo.id}
                  type="button"
                  onClick={() => selecionarCriativo(criativo)}
                  className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#f7faff] ${
                    criativoSelecionado?.id === criativo.id ? 'bg-[#eaf3ff]' : ''
                  }`}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-[#e1efff] text-[#0d559f]">
                    <FileUp className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{criativo.titulo}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {nomesFrente.get(criativo.frente_id) ?? 'Sem frente'} · {ROTULO_FORMATO[criativo.formato]}
                    </span>
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${criativo.status === 'reprovado' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                    {criativo.status === 'reprovado'
                      ? 'Ajustar'
                      : criativo.status === 'revisao'
                        ? 'Sem arquivo'
                        : criativo.status === 'backlog'
                          ? 'Planejado'
                          : 'Em produção'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-lg border border-border bg-card p-5 shadow-sm xl:sticky xl:top-8">
          {criativoSelecionado ? (
            <div>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-md bg-[linear-gradient(135deg,#0a2c53,#061c36)] text-white"><UploadCloud className="size-5" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#0d559f]">Registrar entrega</p>
                  <h2 className="truncate font-heading text-base font-semibold">{criativoSelecionado.titulo}</h2>
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <p className="text-sm font-medium">Arquivo final</p>
                <input
                  ref={inputArquivo}
                  type="file"
                  className="sr-only"
                  onChange={(event) => selecionarArquivo(event.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => inputArquivo.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault()
                    setArrastandoArquivo(true)
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setArrastandoArquivo(false)}
                  onDrop={(event) => {
                    event.preventDefault()
                    setArrastandoArquivo(false)
                    selecionarArquivo(event.dataTransfer.files[0])
                  }}
                  className={`grid min-h-32 w-full place-items-center rounded-md border border-dashed p-4 text-center transition-colors ${
                    arrastandoArquivo ? 'border-primary bg-[#eaf3ff]' : 'border-[#b9cee6] bg-[#f7faff] hover:border-primary hover:bg-[#eef6ff]'
                  }`}
                >
                  <span>
                    <UploadCloud className="mx-auto size-6 text-[#0d559f]" />
                    <span className="mt-2 block text-sm font-medium">{arquivoSelecionado ? arquivoSelecionado.name : 'Arraste ou escolha um arquivo'}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{arquivoSelecionado ? `${(arquivoSelecionado.size / 1024 / 1024).toFixed(1)} MB` : 'Qualquer formato de arquivo é aceito.'}</span>
                  </span>
                </button>
              </div>
              <Button className="mt-6 w-full" disabled={!arquivoSelecionado || enviando} onClick={enviarEntrega}>
                <Send />
                {enviando ? 'Enviando...' : 'Enviar para revisão'}
              </Button>
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-md bg-[#e1efff] text-[#0d559f]"><UploadCloud className="size-6" /></span>
                <p className="mt-4 font-medium">Selecione uma entrega</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Escolha um conteúdo pendente para enviar o arquivo final.</p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {emRevisao.length > 0 && (
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Em revisão</h2>
              <p className="mt-1 text-sm text-muted-foreground">Entregas encaminhadas aguardando aprovação.</p>
            </div>
            <span className="rounded-full bg-[#e1efff] px-2.5 py-1 text-xs font-medium text-[#0d559f]">{emRevisao.length}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {emRevisao.map((criativo) => (
              <div key={criativo.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{criativo.titulo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{nomesFrente.get(criativo.frente_id) ?? 'Sem frente'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    disabled={atualizarStatus.isPending}
                    onClick={() => atualizarStatus.mutate({ criativo, novoStatus: 'aprovado' })}
                  >
                    <CheckCircle2 />
                    {atualizarStatus.isPending ? 'Aprovando...' : 'Aprovar'}
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Visualizar conteúdo" onClick={() => visualizarEntrega(criativo)}>
                    <Eye />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Baixar conteúdo" onClick={() => baixarEntrega(criativo)}>
                    <Download />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {temAprovados && (
        <section className="rounded-lg border border-[#bfe3ca] bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Entregas aprovadas</h2>
              <p className="mt-1 text-sm text-muted-foreground">Conteúdos aprovados disponíveis para consulta e download.</p>
            </div>
            <div className="flex items-center gap-3">
              <SeletorMes mesSelecionado={mesAprovados} onMudarMes={setMesAprovados} />
              <span className="rounded-full bg-[#e9f6ee] px-2.5 py-1 text-xs font-medium text-[#187a3b]">{aprovados.length}</span>
            </div>
          </div>
          {aprovados.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">Nenhuma entrega aprovada neste mês.</p>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {aprovados.map((criativo) => (
              <div key={criativo.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{criativo.titulo}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{nomesFrente.get(criativo.frente_id) ?? 'Sem frente'}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="icon-sm" title="Visualizar conteúdo" onClick={() => visualizarEntrega(criativo)}>
                    <Eye />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Baixar conteúdo" onClick={() => baixarEntrega(criativo)}>
                    <Download />
                  </Button>
                </div>
              </div>
              ))}
            </div>
          )}
        </section>
      )}

      <Dialog
        open={Boolean(criativoEmVisualizacao)}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setCriativoEmVisualizacao(null)
            setUrlVisualizacao(null)
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-4xl overflow-auto p-5 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{criativoEmVisualizacao?.arquivo_nome ?? criativoEmVisualizacao?.titulo}</DialogTitle>
            <DialogDescription>Prévia do arquivo entregue.</DialogDescription>
          </DialogHeader>
          {carregandoVisualizacao ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Carregando arquivo...</p>
          ) : urlVisualizacao && eImagem ? (
            <img className="max-h-[65vh] w-full object-contain" src={urlVisualizacao} alt={criativoEmVisualizacao?.titulo} />
          ) : urlVisualizacao && eVideo ? (
            <video className="max-h-[65vh] w-full" controls src={urlVisualizacao}>Seu navegador não suporta a prévia deste vídeo.</video>
          ) : urlVisualizacao && ePdf ? (
            <iframe className="h-[65vh] w-full border" src={urlVisualizacao} title={criativoEmVisualizacao?.titulo} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">Este formato não possui prévia interna. Use o download para abrir o arquivo.</p>
          )}
          {urlVisualizacao && criativoEmVisualizacao && (
            <Button className="w-fit" onClick={() => baixarEntrega(criativoEmVisualizacao)}>
              <Download />
              Baixar arquivo
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Entregas