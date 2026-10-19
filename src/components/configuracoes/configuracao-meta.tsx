import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useFrentes } from '@/hooks/use-frentes'
import {
  useAdicionarPrefixo,
  useAtualizarMetaConfiguracao,
  useConjuntosMeta,
  useMetaConfiguracao,
  usePrefixosConceito,
  useRemoverPrefixo,
} from '@/hooks/use-meta'
import type { MetaConfiguracao } from '@/types/database'

// Limites do lançamento no Meta e termos que ligam o nome do anúncio ao conceito
function ConfiguracaoMeta() {
  const { data: config } = useMetaConfiguracao()

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Meta Ads</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Limites do lançamento pela Fábrica. Tudo é criado pausado, numa campanha separada; nada que já roda é alterado.
      </p>
      {config ? <Limites key={config.updated_at} config={config} /> : <p className="mt-5 text-sm text-muted-foreground">Carregando...</p>}
      <Prefixos />
    </section>
  )
}

function Limites({ config }: { config: MetaConfiguracao }) {
  const salvar = useAtualizarMetaConfiguracao()
  const [conjuntoId, setConjuntoId] = useState(config.conjunto_publico_id ?? '')
  const [padrao, setPadrao] = useState(String(config.orcamento_diario_padrao))
  const [maximo, setMaximo] = useState(String(config.orcamento_diario_maximo))
  const [teto, setTeto] = useState(String(config.teto_campanha))
  const [carregarConjuntos, setCarregarConjuntos] = useState(false)
  const conjuntos = useConjuntosMeta(carregarConjuntos)

  const valido = Number(padrao) >= 6 && Number(maximo) >= Number(padrao) && Number(maximo) <= 300 && Number(teto) > 0

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="meta-padrao">Orçamento diário padrão (R$)</Label>
          <Input id="meta-padrao" type="number" min={6} value={padrao} onChange={(e) => setPadrao(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="meta-maximo">Orçamento diário máximo (R$)</Label>
          <Input id="meta-maximo" type="number" min={6} max={300} value={maximo} onChange={(e) => setMaximo(e.target.value)} />
          <p className="text-xs text-muted-foreground">O sistema nunca passa de R$ 300/dia por conjunto.</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="meta-teto">Limite de gasto da campanha (R$)</Label>
          <Input id="meta-teto" type="number" min={1} value={teto} onChange={(e) => setTeto(e.target.value)} />
          <p className="text-xs text-muted-foreground">Vale ao criar a campanha da Fábrica. Depois, ajuste no Gerenciador.</p>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="meta-conjunto-padrao">Conjunto padrão para copiar o público</Label>
        <Select
          value={conjuntoId}
          onValueChange={setConjuntoId}
          onOpenChange={(aberto) => aberto && setCarregarConjuntos(true)}
        >
          <SelectTrigger id="meta-conjunto-padrao" className="w-full sm:max-w-xl">
            <SelectValue placeholder={conjuntoId || 'Selecione (lê os conjuntos ativos do Meta)'} />
          </SelectTrigger>
          <SelectContent>
            {conjuntos.isLoading && <p className="p-2 text-xs text-muted-foreground">Lendo os conjuntos do Meta...</p>}
            {conjuntos.isError && <p className="p-2 text-xs text-destructive">{conjuntos.error.message}</p>}
            {conjuntoId && !conjuntos.data?.some((c) => c.id === conjuntoId) && <SelectItem value={conjuntoId}>{conjuntoId}</SelectItem>}
            {conjuntos.data?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome} · {c.campanha}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        disabled={!valido || salvar.isPending}
        onClick={() =>
          salvar.mutate({
            conjunto_publico_id: conjuntoId || null,
            orcamento_diario_padrao: Number(padrao),
            orcamento_diario_maximo: Number(maximo),
            teto_campanha: Number(teto),
          })
        }
      >
        {salvar.isPending ? 'Salvando...' : 'Salvar limites'}
      </Button>
    </div>
  )
}

function Prefixos() {
  const { data: prefixos } = usePrefixosConceito()
  const { data: frentes } = useFrentes()
  const adicionar = useAdicionarPrefixo()
  const remover = useRemoverPrefixo()
  const [termo, setTermo] = useState('')
  const [frenteId, setFrenteId] = useState('')
  const nomes = new Map(frentes?.map((f) => [f.id, f.nome]))

  return (
    <div className="mt-8 border-t border-border pt-5">
      <h3 className="font-semibold">Conceito pelo nome do anúncio</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Anúncio com o termo no nome (ex.: PLATAFORMA_VÍDEO_11) é contado no conceito. Vale para a página Desempenho e para o aprendizado da IA, a partir da próxima atualização.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {prefixos?.map((p) => (
          <span key={p.id} className="flex items-center gap-1 rounded-full bg-[#f7faff] px-3 py-1 text-xs">
            <strong>{p.termo}</strong> → {nomes.get(p.frente_id) ?? '?'}
            <button type="button" title="Remover" className="ml-1 text-muted-foreground hover:text-destructive" onClick={() => remover.mutate(p.id)}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <form
        className="mt-3 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!termo.trim() || !frenteId) return
          adicionar.mutate({ termo, frente_id: frenteId }, { onSuccess: () => setTermo('') })
        }}
      >
        <Input placeholder="Termo (ex.: AGENDA)" value={termo} onChange={(e) => setTermo(e.target.value)} className="max-w-48" />
        <Select value={frenteId} onValueChange={setFrenteId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Conceito" />
          </SelectTrigger>
          <SelectContent>
            {frentes?.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="outline" disabled={!termo.trim() || !frenteId || adicionar.isPending}>
          <Plus />
          Adicionar
        </Button>
      </form>
    </div>
  )
}

export default ConfiguracaoMeta
