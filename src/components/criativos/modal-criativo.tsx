import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCriarCriativo, useEditarCriativo } from '@/hooks/use-criativos'
import { ROTULO_FORMATO } from '@/lib/constantes'
import type { Criativo, Formato, Frente } from '@/types/database'

interface ModalCriativoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  frentes: Frente[]
  frentesAtivas: Frente[]
  criativo?: Criativo
}

interface EstadoFormulario {
  titulo: string
  frenteId: string
  formato: Formato | ''
  responsavel: string
  linkInspiracao: string
  dataPrevista: string
  briefing: string
  textoPrincipal: string
  tituloAnuncio: string
  descricaoAnuncio: string
  chamadaAcao: string
  urlDestino: string
}

const OPCOES_CHAMADA_ACAO = [
  'Saiba mais',
  'Agendar agora',
  'Fale conosco',
  'Cadastre-se',
  'Comprar agora',
  'Enviar mensagem',
  'Sem botão',
]

function estadoInicial(criativo?: Criativo): EstadoFormulario {
  if (!criativo) {
    return {
      titulo: '',
      frenteId: '',
      formato: '',
      responsavel: '',
      linkInspiracao: '',
      dataPrevista: '',
      briefing: '',
      textoPrincipal: '',
      tituloAnuncio: '',
      descricaoAnuncio: '',
      chamadaAcao: '',
      urlDestino: '',
    }
  }

  return {
    titulo: criativo.titulo,
    frenteId: criativo.frente_id,
    formato: criativo.formato,
    responsavel: criativo.responsavel ?? '',
    linkInspiracao: criativo.link_inspiracao ?? '',
    dataPrevista: criativo.data_prevista ?? '',
    briefing: criativo.briefing ?? '',
    textoPrincipal: criativo.texto_principal ?? '',
    tituloAnuncio: criativo.titulo_anuncio ?? '',
    descricaoAnuncio: criativo.descricao_anuncio ?? '',
    chamadaAcao: criativo.chamada_acao ?? '',
    urlDestino: criativo.url_destino ?? '',
  }
}

function ModalCriativo({ open, onOpenChange, frentes, frentesAtivas, criativo }: ModalCriativoProps) {
  const modoEdicao = Boolean(criativo)
  // Ao criar, o dropdown só mostra frentes ativas (regra do CLAUDE.md). Ao editar, mostra
  // todas — para não quebrar a exibição de um criativo cuja frente foi desativada depois.
  const opcoesFrente = modoEdicao ? frentes : frentesAtivas
  const [formulario, setFormulario] = useState(() => estadoInicial(criativo))
  const criarCriativo = useCriarCriativo()
  const editarCriativo = useEditarCriativo()

  const salvando = criarCriativo.isPending || editarCriativo.isPending
  const formularioValido =
    formulario.titulo.trim() !== '' && formulario.frenteId !== '' && formulario.formato !== ''

  function fechar() {
    onOpenChange(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!formularioValido || formulario.formato === '') {
      return
    }

    const dadosComuns = {
      titulo: formulario.titulo.trim(),
      frente_id: formulario.frenteId,
      formato: formulario.formato,
      responsavel: formulario.responsavel.trim() || null,
      link_inspiracao: formulario.linkInspiracao.trim() || null,
      data_prevista: formulario.dataPrevista || null,
      briefing: formulario.briefing.trim() || null,
      texto_principal: formulario.textoPrincipal.trim() || null,
      titulo_anuncio: formulario.tituloAnuncio.trim() || null,
      descricao_anuncio: formulario.descricaoAnuncio.trim() || null,
      chamada_acao: formulario.chamadaAcao || null,
      url_destino: formulario.urlDestino.trim() || null,
    }

    if (modoEdicao && criativo) {
      await editarCriativo.mutateAsync({
        id: criativo.id,
        ...dadosComuns,
      })
    } else {
      await criarCriativo.mutateAsync(dadosComuns)
    }

    fechar()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(novoEstado) => (novoEstado ? onOpenChange(true) : fechar())}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{modoEdicao ? 'Editar criativo' : 'Novo criativo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-1">
            <Label htmlFor="titulo">Título</Label>
            <Input
              id="titulo"
              required
              value={formulario.titulo}
              onChange={(event) => setFormulario((f) => ({ ...f, titulo: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="frente">Frente</Label>
              <Select
                value={formulario.frenteId}
                onValueChange={(valor) => setFormulario((f) => ({ ...f, frenteId: valor }))}
              >
                <SelectTrigger id="frente" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {opcoesFrente.map((frente) => (
                    <SelectItem key={frente.id} value={frente.id}>
                      {frente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="formato">Formato</Label>
              <Select
                value={formulario.formato}
                onValueChange={(valor) => setFormulario((f) => ({ ...f, formato: valor as Formato }))}
              >
                <SelectTrigger id="formato" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROTULO_FORMATO) as Formato[]).map((formato) => (
                    <SelectItem key={formato} value={formato}>
                      {ROTULO_FORMATO[formato]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="responsavel">Responsável</Label>
            <Input
              id="responsavel"
              value={formulario.responsavel}
              onChange={(event) => setFormulario((f) => ({ ...f, responsavel: event.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="link-inspiracao">Link de inspiração (opcional)</Label>
            <Input
              id="link-inspiracao"
              type="url"
              value={formulario.linkInspiracao}
              onChange={(event) => setFormulario((f) => ({ ...f, linkInspiracao: event.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="data-prevista">Data prevista</Label>
            <Input
              id="data-prevista"
              type="date"
              value={formulario.dataPrevista}
              onChange={(event) =>
                setFormulario((f) => ({ ...f, dataPrevista: event.target.value }))
              }
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="briefing">Briefing</Label>
            <Textarea
              id="briefing"
              rows={4}
              value={formulario.briefing}
              onChange={(event) => setFormulario((f) => ({ ...f, briefing: event.target.value }))}
            />
          </div>

          <fieldset className="space-y-4 border-t border-border pt-4">
            <legend className="pr-3 font-heading text-base font-semibold">Copy para anúncio</legend>

            <div className="space-y-1">
              <Label htmlFor="texto-principal">Texto principal</Label>
              <Textarea
                id="texto-principal"
                rows={4}
                value={formulario.textoPrincipal}
                onChange={(event) =>
                  setFormulario((f) => ({ ...f, textoPrincipal: event.target.value }))
                }
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="titulo-anuncio">Título do anúncio</Label>
                <Input
                  id="titulo-anuncio"
                  value={formulario.tituloAnuncio}
                  onChange={(event) =>
                    setFormulario((f) => ({ ...f, tituloAnuncio: event.target.value }))
                  }
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="chamada-acao">Chamada para ação</Label>
                <Select
                  value={formulario.chamadaAcao}
                  onValueChange={(valor) =>
                    setFormulario((f) => ({ ...f, chamadaAcao: valor }))
                  }
                >
                  <SelectTrigger id="chamada-acao" className="w-full">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_CHAMADA_ACAO.map((opcao) => (
                      <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="descricao-anuncio">Descrição</Label>
              <Textarea
                id="descricao-anuncio"
                rows={2}
                value={formulario.descricaoAnuncio}
                onChange={(event) =>
                  setFormulario((f) => ({ ...f, descricaoAnuncio: event.target.value }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="url-destino">URL de destino</Label>
              <Input
                id="url-destino"
                type="url"
                value={formulario.urlDestino}
                onChange={(event) =>
                  setFormulario((f) => ({ ...f, urlDestino: event.target.value }))
                }
              />
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="submit" disabled={!formularioValido || salvando}>
              {salvando ? 'Salvando...' : modoEdicao ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ModalCriativo
