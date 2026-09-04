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
  linkArquivo: string
  linkBriefing: string
  dataPrevista: string
  dataEntrega: string
  observacoes: string
}

function estadoInicial(criativo?: Criativo): EstadoFormulario {
  if (!criativo) {
    return {
      titulo: '',
      frenteId: '',
      formato: '',
      responsavel: '',
      linkArquivo: '',
      linkBriefing: '',
      dataPrevista: '',
      dataEntrega: '',
      observacoes: '',
    }
  }

  return {
    titulo: criativo.titulo,
    frenteId: criativo.frente_id,
    formato: criativo.formato,
    responsavel: criativo.responsavel ?? '',
    linkArquivo: criativo.link_arquivo ?? '',
    linkBriefing: criativo.link_briefing ?? '',
    dataPrevista: criativo.data_prevista ?? '',
    dataEntrega: criativo.data_entrega ?? '',
    observacoes: criativo.observacoes ?? '',
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
      link_arquivo: formulario.linkArquivo.trim() || null,
      link_briefing: formulario.linkBriefing.trim() || null,
      data_prevista: formulario.dataPrevista || null,
      observacoes: formulario.observacoes.trim() || null,
    }

    if (modoEdicao && criativo) {
      await editarCriativo.mutateAsync({
        id: criativo.id,
        ...dadosComuns,
        data_entrega: formulario.dataEntrega || null,
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
      <DialogContent className="sm:max-w-md">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="link-arquivo">Link do arquivo</Label>
              <Input
                id="link-arquivo"
                type="url"
                value={formulario.linkArquivo}
                onChange={(event) => setFormulario((f) => ({ ...f, linkArquivo: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="link-briefing">Link do briefing</Label>
              <Input
                id="link-briefing"
                type="url"
                value={formulario.linkBriefing}
                onChange={(event) => setFormulario((f) => ({ ...f, linkBriefing: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

            {modoEdicao && (
              <div className="space-y-1">
                <Label htmlFor="data-entrega">Data de entrega</Label>
                <Input
                  id="data-entrega"
                  type="date"
                  value={formulario.dataEntrega}
                  onChange={(event) =>
                    setFormulario((f) => ({ ...f, dataEntrega: event.target.value }))
                  }
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formulario.observacoes}
              onChange={(event) => setFormulario((f) => ({ ...f, observacoes: event.target.value }))}
            />
          </div>

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
