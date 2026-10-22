import { useState } from 'react'
import { ExternalLink, ImageOff } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAtualizarReferencia, useFotoGeracao, useReferencias, type ReferenciaPinterest, type StatusReferencia } from '@/hooks/use-fabrica'
import { rotuloTerritorio } from '@/lib/territorios'

// Referências do Pinterest: a pasta "referências de design" é o gerenciador.
// A equipe salva pins lá e pede ao Claude "atualiza as referências"; ele lê os
// pins novos, analisa e registra aqui. São só inspiração interna, nunca entram
// num anúncio.
const PASTA_PINTEREST = 'https://br.pinterest.com/storearm/refer%C3%AAncias-de-design/'

const ROTULO_STATUS: Record<StatusReferencia, string> = {
  nova: 'Nova',
  em_uso: 'Em uso',
  descartada: 'Descartada',
}

function CartaoReferencia({ referencia }: { referencia: ReferenciaPinterest }) {
  const { data: imagem } = useFotoGeracao(referencia.imagem_path)
  const atualizar = useAtualizarReferencia()
  const [observacao, setObservacao] = useState(referencia.observacao ?? '')

  return (
    <article className={`flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm ${referencia.status === 'descartada' ? 'opacity-60' : ''}`}>
      <div className="grid aspect-[4/5] place-items-center bg-muted">
        {imagem ? (
          <img src={imagem} alt={referencia.descricao_pin ?? 'Referência'} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImageOff className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 text-sm">
        {referencia.analise && <p className="text-muted-foreground">{referencia.analise}</p>}
        <div className="mt-auto flex items-center gap-2">
          <Select
            value={referencia.status}
            onValueChange={(status) => atualizar.mutate({ id: referencia.id, status: status as StatusReferencia })}
          >
            <SelectTrigger size="sm" className="w-36" aria-label="Situação da referência">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROTULO_STATUS) as StatusReferencia[]).map((status) => (
                <SelectItem key={status} value={status}>{ROTULO_STATUS[status]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          rows={2}
          placeholder="Observação da equipe (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          onBlur={() => observacao !== (referencia.observacao ?? '') && atualizar.mutate({ id: referencia.id, observacao: observacao.trim() || null })}
        />
      </div>
    </article>
  )
}

function ReferenciasPinterest() {
  const { data: referencias, isLoading } = useReferencias()
  const [filtro, setFiltro] = useState<'todas' | StatusReferencia>('todas')

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando referências...</p>

  const visiveis = (referencias ?? []).filter((r) => filtro === 'todas' || r.status === filtro)
  const grupos = new Map<string, ReferenciaPinterest[]>()
  for (const r of visiveis) {
    const chave = r.territorio ?? ''
    grupos.set(chave, [...(grupos.get(chave) ?? []), r])
  }
  // Sugestões de território novo primeiro, depois por quantidade
  const ordem = [...grupos.entries()].sort(([a, la], [b, lb]) => Number(b.startsWith('novo:')) - Number(a.startsWith('novo:')) || lb.length - la.length)
  const contar = (status: StatusReferencia) => (referencias ?? []).filter((r) => r.status === status).length

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-[#f7faff] p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p>
            As referências vêm da pasta do Pinterest{' '}
            <a href={PASTA_PINTEREST} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-[#0d559f] hover:underline">
              "referências de design" <ExternalLink className="size-3" />
            </a>
            .
          </p>
          <p className="text-muted-foreground">
            Para atualizar: salve os pins novos na pasta e peça ao Claude "atualiza as referências da Fábrica". Ele analisa cada uma e registra aqui, no território certo. São só inspiração: nunca entram num anúncio.
          </p>
        </div>
        <Select value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
          <SelectTrigger size="sm" className="w-48" aria-label="Filtrar referências">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas ({referencias?.length ?? 0})</SelectItem>
            <SelectItem value="nova">Novas ({contar('nova')})</SelectItem>
            <SelectItem value="em_uso">Em uso ({contar('em_uso')})</SelectItem>
            <SelectItem value="descartada">Descartadas ({contar('descartada')})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {ordem.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma referência registrada ainda.</p>
      ) : (
        ordem.map(([territorio, itens]) => (
          <div key={territorio} className="space-y-3">
            <h3 className="font-heading text-base font-semibold">
              {rotuloTerritorio(territorio)} <span className="text-sm font-normal text-muted-foreground">({itens.length})</span>
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {itens.map((r) => (
                <CartaoReferencia key={r.id} referencia={r} />
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  )
}

export default ReferenciasPinterest
