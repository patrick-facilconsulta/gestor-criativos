import { useState } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { MODELOS_PILOTO_VISUAL, usePilotoVisual, useRodarPilotoVisual } from '@/hooks/use-meta'

// Piloto da leitura visual: 10 criativos lidos por dois modelos de IA, para a
// equipe avaliar qual modelo e quais perguntas acertam (antes de usar na Fábrica)
function PilotoVisual() {
  const { data: situacao } = usePilotoVisual()
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null)
  const rodar = useRodarPilotoVisual((feitos, total) => setProgresso({ feitos, total }))

  if (!situacao || situacao.ad_ids.length === 0) return null

  const total = situacao.ad_ids.length
  const completos = situacao.ad_ids.filter((id) => MODELOS_PILOTO_VISUAL.every((m) => situacao.lidos[id]?.includes(m))).length
  const pronto = completos === total

  return (
    <section className="rounded-lg border border-[#b9cee6] bg-[#f7faff] p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Eye className="size-5 text-[#0d559f]" />
            Piloto da leitura visual
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} criativos lidos por Claude Opus 5.5 e GPT-6 Astra, com o mesmo questionário. Custo estimado: cerca de R$ 3.
          </p>
          <p className="mt-1 text-sm">
            {rodar.isPending && progresso
              ? `Lendo o criativo ${Math.min(progresso.feitos + 1, progresso.total)} de ${progresso.total}...`
              : pronto
                ? `Leituras prontas (custo: R$ ${situacao.custo_brl.toFixed(2).replace('.', ',')}). Avise no chat para montar a página de avaliação.`
                : `${completos} de ${total} criativos lidos pelos dois modelos.`}
          </p>
          {situacao.erros.length > 0 && !rodar.isPending && (
            <p className="mt-1 text-xs text-destructive">
              {situacao.erros.length} leitura(s) com erro. Clique em continuar para tentar de novo.
            </p>
          )}
        </div>
        {!pronto && (
          <Button
            disabled={rodar.isPending}
            onClick={() =>
              rodar.mutate(situacao, {
                onSuccess: () => toast.success('Piloto concluído.'),
                onError: (erro) => toast.error(erro.message),
              })
            }
          >
            {rodar.isPending ? <Loader2 className="animate-spin" /> : <Eye />}
            {rodar.isPending ? 'Lendo...' : completos > 0 ? 'Continuar o piloto' : 'Rodar o piloto'}
          </Button>
        )}
      </div>
    </section>
  )
}

export default PilotoVisual
