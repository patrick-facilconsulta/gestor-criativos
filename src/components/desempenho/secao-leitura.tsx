import { useState } from 'react'
import { Eye, Loader2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLeituraAnuncio, useLerCriativos, useSalvarCorrecaoLeitura } from '@/hooks/use-meta'
import { CAMPOS_LEITURA, leituraFinal, mostrarValor, ROTULO_QUANTIDADE, type LeituraVisual } from '@/lib/leitura-visual'
import type { MetaAnuncio } from '@/types/database'

// Leitura da arte na janela do anúncio: o que a IA leu, com correção da equipe
// campo a campo. Vídeo nunca tem leitura (trava também no servidor).
function SecaoLeitura({ anuncio }: { anuncio: MetaAnuncio }) {
  const { data, isLoading } = useLeituraAnuncio(anuncio.tipo_midia === 'imagem' ? anuncio.ad_id : null)
  const ler = useLerCriativos()
  const [editando, setEditando] = useState(false)

  if (anuncio.tipo_midia === 'video') {
    return <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Vídeo: sem leitura visual. A capa não representa o vídeo; a IA usa só os textos do anúncio.</p>
  }
  if (anuncio.tipo_midia !== 'imagem') {
    return <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">Leitura visual indisponível para este formato.</p>
  }
  if (isLoading) return <p className="text-xs text-muted-foreground">Carregando a leitura...</p>

  if (!data?.leitura) {
    return (
      <div className="space-y-2 rounded-md border border-dashed border-border p-3">
        <p className="text-xs text-muted-foreground">Este estático ainda não tem leitura da arte.</p>
        <Button
          size="sm"
          variant="outline"
          disabled={ler.isPending}
          onClick={() =>
            ler.mutate([anuncio.ad_id], {
              onSuccess: (r) => (r.erros.length ? toast.error(r.erros[0]) : toast.success('Criativo lido.')),
            })
          }
        >
          {ler.isPending ? <Loader2 className="animate-spin" /> : <Eye />}
          {ler.isPending ? 'Lendo...' : 'Ler este criativo (cerca de R$ 0,13)'}
        </Button>
      </div>
    )
  }

  const final = leituraFinal(data.leitura, data.correcao)!
  if (editando) {
    return <EdicaoLeitura adId={anuncio.ad_id} leitura={data.leitura} final={final} correcao={data.correcao} onFechar={() => setEditando(false)} />
  }

  const corrigidos = new Set(Object.keys(data.correcao ?? {}))
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Leitura da arte</p>
        <Button size="xs" variant="ghost" onClick={() => setEditando(true)}>
          <Pencil />
          Corrigir
        </Button>
      </div>
      <dl className="space-y-1.5 text-xs">
        {CAMPOS_LEITURA.filter((c) => c.id !== 'texto_na_arte' && c.id !== 'resumo').map((campo) => (
          <div key={campo.id} className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
            <dt className="text-muted-foreground">{campo.nome}</dt>
            <dd>
              {mostrarValor(campo, final[campo.id])}
              {corrigidos.has(campo.id) && <span className="ml-1 text-[10px] text-[#187a3b]">(corrigido)</span>}
            </dd>
          </div>
        ))}
        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
          <dt className="text-muted-foreground">Quantidade de texto</dt>
          <dd>
            {ROTULO_QUANTIDADE[String(final.quantidade)] ?? '—'}
            {final.palavras ? ` (${final.palavras} palavras)` : ''}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function EdicaoLeitura({
  adId,
  leitura,
  final,
  correcao,
  onFechar,
}: {
  adId: string
  leitura: LeituraVisual
  final: LeituraVisual
  correcao: LeituraVisual | null
  onFechar: () => void
}) {
  const salvar = useSalvarCorrecaoLeitura()
  const [valores, setValores] = useState<LeituraVisual>(() => ({ ...final }))

  function confirmar() {
    // Guarda só o que ficou diferente da leitura da IA
    const campos: LeituraVisual = {}
    for (const campo of CAMPOS_LEITURA) {
      if (JSON.stringify(valores[campo.id]) !== JSON.stringify(leitura[campo.id])) campos[campo.id] = valores[campo.id]
    }
    salvar.mutate({ adId, campos }, { onSuccess: onFechar })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Corrigir a leitura da arte (olhando a imagem)</p>
      {CAMPOS_LEITURA.map((campo) => {
        const id = `leitura-${campo.id}`
        const valor = valores[campo.id]
        return (
          <div key={campo.id} className="space-y-1">
            <label htmlFor={id} className="text-xs text-muted-foreground">{campo.nome}</label>
            {campo.tipo === 'texto' && (
              <Input id={id} value={String(valor ?? '')} onChange={(e) => setValores((v) => ({ ...v, [campo.id]: e.target.value }))} />
            )}
            {campo.tipo === 'texto_longo' && (
              <Textarea id={id} rows={3} value={String(valor ?? '')} onChange={(e) => setValores((v) => ({ ...v, [campo.id]: e.target.value }))} />
            )}
            {(campo.tipo === 'opcoes' || campo.tipo === 'sim_nao') && (
              <Select
                value={campo.tipo === 'sim_nao' ? (valor ? 'sim' : 'nao') : String(valor ?? '')}
                onValueChange={(novo) => setValores((v) => ({ ...v, [campo.id]: campo.tipo === 'sim_nao' ? novo === 'sim' : novo }))}
              >
                <SelectTrigger id={id} size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(campo.tipo === 'sim_nao' ? [{ valor: 'sim', rotulo: 'Sim' }, { valor: 'nao', rotulo: 'Não' }] : campo.opcoes!).map((o) => (
                    <SelectItem key={o.valor} value={o.valor}>{o.rotulo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={salvar.isPending} onClick={confirmar}>{salvar.isPending ? 'Salvando...' : 'Salvar correção'}</Button>
        <Button size="sm" variant="outline" onClick={onFechar}>Cancelar</Button>
        {correcao && (
          <Button size="sm" variant="ghost" disabled={salvar.isPending} onClick={() => salvar.mutate({ adId, campos: {} }, { onSuccess: onFechar })}>
            Voltar à leitura da IA
          </Button>
        )}
      </div>
    </div>
  )
}

export default SecaoLeitura
