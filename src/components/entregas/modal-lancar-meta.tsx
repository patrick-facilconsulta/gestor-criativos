import { useState } from 'react'
import { ExternalLink, FlaskConical, Rocket, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConjuntosMeta, useLancarNoMeta, useMetaConfiguracao, type ResultadoLancamento } from '@/hooks/use-meta'
import type { Criativo } from '@/types/database'

// Botões do Meta (o texto livre de chamada_acao vira um destes)
const BOTOES = [
  { valor: 'LEARN_MORE', rotulo: 'Saiba mais' },
  { valor: 'SIGN_UP', rotulo: 'Cadastre-se' },
  { valor: 'APPLY_NOW', rotulo: 'Candidate-se' },
  { valor: 'CONTACT_US', rotulo: 'Fale conosco' },
  { valor: 'GET_QUOTE', rotulo: 'Solicitar orçamento' },
  { valor: 'SUBSCRIBE', rotulo: 'Assinar' },
]

function botaoSugerido(criativos: Criativo[]) {
  const texto = (criativos[0]?.chamada_acao ?? '').toLowerCase()
  if (texto.includes('cadastr')) return 'SIGN_UP'
  if (texto.includes('fale') || texto.includes('contato')) return 'CONTACT_US'
  return 'LEARN_MORE'
}

interface ModalLancarMetaProps {
  criativos: Criativo[]
  aberto: boolean
  onFechar: () => void
  onLancado: () => void
}

// Lança no Meta, SEMPRE PAUSADO, dentro da campanha da Fábrica. A equipe ativa no Gerenciador.
function ModalLancarMeta({ criativos, aberto, onFechar, onLancado }: ModalLancarMetaProps) {
  return (
    <Dialog open={aberto} onOpenChange={(valor) => !valor && onFechar()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-auto sm:max-w-xl">
        {aberto && <FormularioLancamento criativos={criativos} onFechar={onFechar} onLancado={onLancado} />}
      </DialogContent>
    </Dialog>
  )
}

function FormularioLancamento({ criativos: criativosAbertos, onFechar, onLancado }: Omit<ModalLancarMetaProps, 'aberto'>) {
  // Retrato da seleção ao abrir: depois do lançamento a seleção da página é limpa
  const [criativos] = useState(criativosAbertos)
  const { data: config } = useMetaConfiguracao()
  const conjuntos = useConjuntosMeta()
  const lancar = useLancarNoMeta()
  const [conjuntoId, setConjuntoId] = useState<string | null>(null)
  const [orcamento, setOrcamento] = useState<string | null>(null)
  const [nomeTeste, setNomeTeste] = useState('')
  const [botao, setBotao] = useState(() => botaoSugerido(criativos))
  const [simulacao, setSimulacao] = useState<ResultadoLancamento['simulacao'] | null>(null)
  const [lancado, setLancado] = useState<ResultadoLancamento | null>(null)

  const conjuntoEscolhido = conjuntoId ?? config?.conjunto_publico_id ?? ''
  const orcamentoValor = orcamento ?? String(config?.orcamento_diario_padrao ?? 50)
  const maximo = Number(config?.orcamento_diario_maximo ?? 150)
  const pronto = Boolean(conjuntoEscolhido && nomeTeste.trim() && Number(orcamentoValor) >= 6 && Number(orcamentoValor) <= maximo)

  function enviar(simular: boolean) {
    lancar.mutate(
      {
        criativo_ids: criativos.map((c) => c.id),
        conjunto_publico_id: conjuntoEscolhido,
        orcamento_diario: Number(orcamentoValor),
        nome_teste: nomeTeste.trim(),
        botao,
        simular,
      },
      {
        onSuccess: (resultado) => {
          if (simular) {
            setSimulacao(resultado.simulacao ?? null)
          } else {
            setLancado(resultado)
            toast.success('Criado no Meta, pausado. Ative no Gerenciador quando revisar.')
            onLancado()
          }
        },
        onError: (erro) => toast.error(erro.message),
      },
    )
  }

  if (lancado) {
    const link = `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${lancado.conta}&selected_adset_ids=${lancado.conjunto_id}`
    return (
      <>
        <DialogHeader>
          <DialogTitle>Criado no Meta (pausado)</DialogTitle>
          <DialogDescription>Nada foi ativado. Revise no Gerenciador e ative o conjunto e os anúncios quando estiver tudo certo.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 text-sm">
          {lancado.anuncios?.map((anuncio) => (
            <li key={anuncio.ad_id} className="flex justify-between gap-3 rounded-md bg-[#f7faff] px-3 py-2">
              <span className="font-medium">{anuncio.nome}</span>
              <span className="text-muted-foreground">{criativos.find((c) => c.id === anuncio.criativo_id)?.titulo}</span>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Fechar</Button>
          <Button asChild>
            <a href={link} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              Abrir no Gerenciador
            </a>
          </Button>
        </DialogFooter>
      </>
    )
  }

  const conjuntoOrigem = conjuntos.data?.find((c) => c.id === conjuntoEscolhido)

  return (
    <>
      <DialogHeader>
        <DialogTitle>Lançar no Meta</DialogTitle>
        <DialogDescription>
          {criativos.length} criativo(s) num conjunto novo da campanha &quot;[FÁBRICA] Testes&quot;.
        </DialogDescription>
      </DialogHeader>

      <div className="flex gap-2 rounded-md border border-[#bfe3ca] bg-[#f3fbf6] p-3 text-xs leading-5 text-[#1d5e35]">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>
          Tudo é criado <strong>pausado</strong>, numa campanha separada. Nenhuma campanha, conjunto ou anúncio que já roda é alterado.
          O público é copiado (só leitura) do conjunto escolhido; por disputar o mesmo público, comece com orçamento pequeno.
        </p>
      </div>

      <ul className="space-y-1 text-sm">
        {criativos.map((criativo) => (
          <li key={criativo.id} className="truncate rounded-md bg-[#f7faff] px-3 py-1.5">
            {criativo.titulo}
            {!criativo.arquivo_stories_path && <span className="ml-2 text-xs text-amber-700">(sem versão stories: usa o quadrado em tudo)</span>}
          </li>
        ))}
      </ul>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="meta-nome-teste">Nome do teste</Label>
          <Input
            id="meta-nome-teste"
            placeholder="Ex.: Plataforma · ganchos de agenda"
            maxLength={80}
            value={nomeTeste}
            onChange={(event) => setNomeTeste(event.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="meta-conjunto">Copiar público de</Label>
          <Select value={conjuntoEscolhido} onValueChange={setConjuntoId} disabled={conjuntos.isLoading || conjuntos.isError}>
            <SelectTrigger id="meta-conjunto" className="w-full">
              <SelectValue placeholder={conjuntos.isLoading ? 'Lendo os conjuntos do Meta...' : 'Selecione um conjunto ativo'} />
            </SelectTrigger>
            <SelectContent>
              {conjuntos.data?.map((conjunto) => (
                <SelectItem key={conjunto.id} value={conjunto.id}>
                  {conjunto.nome} · {conjunto.campanha}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className={`text-xs ${conjuntos.isError ? 'text-destructive' : 'text-muted-foreground'}`}>
            {conjuntos.isError
              ? conjuntos.error.message
              : 'Público, evento de cadastro e otimização vêm desse conjunto. Ele não é alterado.'}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="meta-orcamento">Orçamento diário (R$)</Label>
            <Input
              id="meta-orcamento"
              type="number"
              min={6}
              max={maximo}
              value={orcamentoValor}
              onChange={(event) => setOrcamento(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">De R$ 6 a R$ {maximo} (limite nas Configurações).</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="meta-botao">Botão do anúncio</Label>
            <Select value={botao} onValueChange={setBotao}>
              <SelectTrigger id="meta-botao" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BOTOES.map((opcao) => (
                  <SelectItem key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {simulacao && (
        <div className="space-y-2 rounded-md border border-border p-3 text-xs">
          <p className="font-medium text-foreground">Simulação: nada foi enviado ao Meta.</p>
          <p className="text-muted-foreground">
            Seria criado um conjunto pausado com orçamento de R$ {orcamentoValor}/dia, público de &quot;{conjuntoOrigem?.nome ?? conjuntoEscolhido}&quot;
            e {criativos.length} anúncio(s) pausado(s).
          </p>
          <details>
            <summary className="cursor-pointer text-[#0d559f]">Ver o que seria enviado</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-[11px] leading-4">{JSON.stringify(simulacao, null, 2)}</pre>
          </details>
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" disabled={!pronto || lancar.isPending} onClick={() => enviar(true)}>
          <FlaskConical />
          Simular
        </Button>
        <Button disabled={!pronto || lancar.isPending} onClick={() => enviar(false)}>
          <Rocket />
          {lancar.isPending ? 'Enviando ao Meta...' : 'Lançar pausado'}
        </Button>
      </DialogFooter>
    </>
  )
}

export default ModalLancarMeta
