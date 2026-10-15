import { useState } from 'react'
import { Megaphone, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAtualizarStatusCriativo } from '@/hooks/use-atualizar-status-criativo'
import { hojeISO } from '@/lib/date-utils'
import type { Criativo } from '@/types/database'

interface ModalPublicacaoProps {
  criativo: Criativo | null
  onFechar: () => void
}

// Registra que o criativo aprovado foi ao ar no Meta: muda o status para
// 'publicado' e guarda a campanha e o dia. Também permite desfazer.
function ModalPublicacao({ criativo, onFechar }: ModalPublicacaoProps) {
  return (
    <Dialog open={Boolean(criativo)} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-md">
        {/* key: o formulário recomeça com os dados de cada criativo aberto */}
        {criativo && <FormularioPublicacao key={criativo.id} criativo={criativo} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  )
}

function FormularioPublicacao({ criativo, onFechar }: { criativo: Criativo; onFechar: () => void }) {
  const [campanha, setCampanha] = useState(criativo.campanha ?? '')
  const [dataPublicacao, setDataPublicacao] = useState(criativo.data_publicacao ?? hojeISO())
  const atualizarStatus = useAtualizarStatusCriativo()
  const jaPublicado = criativo.status === 'publicado'

  function salvar() {
    atualizarStatus.mutate(
      {
        criativo,
        novoStatus: 'publicado',
        publicacao: { campanha: campanha.trim() || null, data_publicacao: dataPublicacao || null },
      },
      { onSuccess: onFechar },
    )
  }

  function desfazer() {
    atualizarStatus.mutate({ criativo, novoStatus: 'aprovado' }, { onSuccess: onFechar })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{jaPublicado ? 'Publicação' : 'Marcar como publicado'}</DialogTitle>
        <DialogDescription>{criativo.titulo}</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="campanha-publicacao">Campanha</Label>
          <Input
            id="campanha-publicacao"
            placeholder="Ex.: Captação médicos · Teleconsulta"
            value={campanha}
            onChange={(event) => setCampanha(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">Opcional. Nome da campanha no Meta em que o anúncio entrou.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="data-publicacao">Data da publicação</Label>
          <Input
            id="data-publicacao"
            type="date"
            value={dataPublicacao}
            onChange={(event) => setDataPublicacao(event.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        {jaPublicado && (
          <Button variant="outline" className="sm:mr-auto" disabled={atualizarStatus.isPending} onClick={desfazer}>
            <Undo2 />
            Desmarcar publicação
          </Button>
        )}
        <Button disabled={atualizarStatus.isPending} onClick={salvar}>
          <Megaphone />
          {atualizarStatus.isPending ? 'Salvando...' : jaPublicado ? 'Salvar' : 'Marcar como publicado'}
        </Button>
      </DialogFooter>
    </>
  )
}

export default ModalPublicacao
