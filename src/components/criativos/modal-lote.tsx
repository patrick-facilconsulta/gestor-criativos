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
import { useCriarCriativosEmLote } from '@/hooks/use-criativos'
import { ROTULO_FORMATO } from '@/lib/constantes'
import type { Formato, Frente } from '@/types/database'

interface ModalLoteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  frentes: Frente[]
}

const FORMULARIO_VAZIO = {
  frenteId: '',
  formato: '' as Formato | '',
  responsavel: '',
  quantidade: '1',
  prefixo: '',
}

function ModalLote({ open, onOpenChange, frentes }: ModalLoteProps) {
  const [formulario, setFormulario] = useState(FORMULARIO_VAZIO)
  const criarEmLote = useCriarCriativosEmLote()

  const quantidadeNumero = Number(formulario.quantidade)
  const quantidadeValida = Number.isInteger(quantidadeNumero) && quantidadeNumero >= 1 && quantidadeNumero <= 20

  const formularioValido =
    formulario.frenteId !== '' &&
    formulario.formato !== '' &&
    formulario.prefixo.trim() !== '' &&
    quantidadeValida

  function fecharEResetar() {
    setFormulario(FORMULARIO_VAZIO)
    onOpenChange(false)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (!formularioValido || formulario.formato === '') {
      return
    }

    await criarEmLote.mutateAsync({
      frente_id: formulario.frenteId,
      formato: formulario.formato,
      responsavel: formulario.responsavel.trim() || null,
      quantidade: quantidadeNumero,
      prefixo: formulario.prefixo.trim(),
    })

    fecharEResetar()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(novoEstado) => (novoEstado ? onOpenChange(true) : fecharEResetar())}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Criar em lote</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lote-frente">Frente</Label>
              <Select
                value={formulario.frenteId}
                onValueChange={(valor) => setFormulario((f) => ({ ...f, frenteId: valor }))}
              >
                <SelectTrigger id="lote-frente" className="w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {frentes.map((frente) => (
                    <SelectItem key={frente.id} value={frente.id}>
                      {frente.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="lote-formato">Formato</Label>
              <Select
                value={formulario.formato}
                onValueChange={(valor) => setFormulario((f) => ({ ...f, formato: valor as Formato }))}
              >
                <SelectTrigger id="lote-formato" className="w-full">
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
            <Label htmlFor="lote-responsavel">Responsável</Label>
            <Input
              id="lote-responsavel"
              value={formulario.responsavel}
              onChange={(event) => setFormulario((f) => ({ ...f, responsavel: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lote-prefixo">Prefixo do título</Label>
              <Input
                id="lote-prefixo"
                required
                value={formulario.prefixo}
                onChange={(event) => setFormulario((f) => ({ ...f, prefixo: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lote-quantidade">Quantidade (1 a 20)</Label>
              <Input
                id="lote-quantidade"
                type="number"
                min={1}
                max={20}
                required
                value={formulario.quantidade}
                onChange={(event) => setFormulario((f) => ({ ...f, quantidade: event.target.value }))}
              />
            </div>
          </div>

          {formulario.prefixo && quantidadeValida && (
            <p className="text-sm text-muted-foreground">
              Serão criados: "{formulario.prefixo} 1"
              {quantidadeNumero > 1 ? ` até "${formulario.prefixo} ${quantidadeNumero}"` : ''}, todos em
              Backlog.
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={!formularioValido || criarEmLote.isPending}>
              {criarEmLote.isPending ? 'Criando...' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ModalLote
