import { useState } from 'react'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAtualizarStatusCriativo } from '@/hooks/use-atualizar-status-criativo'
import type { Criativo } from '@/types/database'

interface ModalReprovacaoProps {
  criativo: Criativo | null
  onFechar: () => void
}

// Reprova uma entrega em revisão: o status vai para 'reprovado', o criativo
// volta para os pendentes como "Ajustar" e o motivo fica para quem vai ajustar.
function ModalReprovacao({ criativo, onFechar }: ModalReprovacaoProps) {
  return (
    <Dialog open={Boolean(criativo)} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        {/* key: o formulário recomeça a cada criativo aberto */}
        {criativo && <FormularioReprovacao key={criativo.id} criativo={criativo} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  )
}

function FormularioReprovacao({ criativo, onFechar }: { criativo: Criativo; onFechar: () => void }) {
  const [motivo, setMotivo] = useState('')
  const atualizarStatus = useAtualizarStatusCriativo()

  function reprovar() {
    atualizarStatus.mutate({ criativo, novoStatus: 'reprovado', motivo }, { onSuccess: onFechar })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Reprovar entrega</DialogTitle>
        <DialogDescription>{criativo.titulo}</DialogDescription>
      </DialogHeader>

      <div className="space-y-1">
        <Label htmlFor="motivo-reprovacao">O que precisa ajustar?</Label>
        <Textarea
          id="motivo-reprovacao"
          rows={4}
          placeholder="Ex.: título longo demais no stories; trocar a foto por uma com o rosto livre."
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          A entrega volta para a lista de pendentes como "Ajustar", com este pedido. Reprovado não conta para a meta.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onFechar}>
          Cancelar
        </Button>
        <Button variant="destructive" disabled={atualizarStatus.isPending || !motivo.trim()} onClick={reprovar}>
          <XCircle />
          {atualizarStatus.isPending ? 'Reprovando...' : 'Reprovar'}
        </Button>
      </DialogFooter>
    </>
  )
}

export default ModalReprovacao
