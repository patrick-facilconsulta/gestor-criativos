import { useState } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useLerCriativos, usePendentesLeitura } from '@/hooks/use-meta'

// Leitura visual dos estáticos com volume suficiente (o Claude descreve a arte
// para o aprendizado da Fábrica). Vídeo nunca é lido. Só roda com o clique,
// mostrando antes quantos são e quanto custa.
function LeituraVisual() {
  const { data, isLoading, isError } = usePendentesLeitura()
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null)
  const ler = useLerCriativos((feitos, total) => setProgresso({ feitos, total }))

  if (isLoading || isError || !data) return null
  const pendentes = data.pendentes

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Eye className="mt-0.5 size-5 shrink-0 text-[#0d559f]" />
        <div>
          <p className="font-medium">Leitura visual dos estáticos</p>
          <p className="text-sm text-muted-foreground">
            {ler.isPending && progresso
              ? `Lendo o criativo ${Math.min(progresso.feitos + 1, progresso.total)} de ${progresso.total}...`
              : pendentes.length
                ? `${pendentes.length} criativo(s) estático(s) com volume ainda sem leitura. Custo estimado: R$ ${data.custo_estimado_brl.toFixed(2).replace('.', ',')}.`
                : 'Todos os estáticos com volume já têm leitura. Vídeos não recebem leitura visual.'}
          </p>
        </div>
      </div>
      {pendentes.length > 0 && (
        <Button
          disabled={ler.isPending}
          onClick={() =>
            ler.mutate(pendentes.map((p) => p.ad_id), {
              onSuccess: (r) =>
                r.erros.length
                  ? toast.error(`${r.lidos} lido(s). ${r.erros.length} com erro: ${r.erros[0]}`)
                  : toast.success(`${r.lidos} criativo(s) lido(s).`),
              onError: (erro) => toast.error(erro.message),
            })
          }
        >
          {ler.isPending ? <Loader2 className="animate-spin" /> : <Eye />}
          {ler.isPending ? 'Lendo...' : 'Ler agora'}
        </Button>
      )}
    </section>
  )
}

export default LeituraVisual
