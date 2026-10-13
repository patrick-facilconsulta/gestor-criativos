import { useState, type FormEvent } from 'react'
import { Factory } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { BaseFabrica, PedidoGeracao } from '@/hooks/use-fabrica'
import {
  MAX_VARIACOES,
  MODELO_IA_PADRAO,
  ROTULO_PROVEDOR,
  PERSONAS,
  ROTULO_TIPO_PONTO,
  angulosDisponiveis,
  narrativasDoConceito,
  servePara,
} from '@/lib/fabrica'
import type { FabricaModeloIA, FabricaPontoConceito, Frente } from '@/types/database'

// Valor especial dos selects: a função sorteia entre os que combinam
const SURPRESA = '__surpresa__'
const QUALQUER = '__qualquer__'
// Lembra o último modelo de IA escolhido neste navegador (só conveniência)
const CHAVE_MODELO = 'fabrica-modelo-ia'

function modeloSalvo() {
  try {
    return localStorage.getItem(CHAVE_MODELO)
  } catch {
    return null
  }
}

interface FormularioGeracaoProps {
  base: BaseFabrica
  // Na tela, "frentes" se chamam "Conceitos"
  frentes: Frente[]
  pontos: FabricaPontoConceito[]
  // Modelos de texto ativos (Claude e GPT)
  modelos: FabricaModeloIA[]
  gerando: boolean
  onGerar: (pedido: PedidoGeracao) => void
}

// Ordem das escolhas: Conceito → Narrativa → Ângulo. Cada escolha filtra a próxima.
function FormularioGeracao({ base, frentes, pontos, modelos, gerando, onGerar }: FormularioGeracaoProps) {
  const angulosAtivos = base.conceitos.filter((c) => c.ativo)
  const narrativasAtivas = base.narrativas.filter((n) => n.ativo)
  const formatos = base.formatos.filter((f) => f.ativo)

  const [frenteId, setFrenteId] = useState(frentes[0]?.id ?? '')
  const [narrativaId, setNarrativaId] = useState(SURPRESA)
  const [anguloId, setAnguloId] = useState(SURPRESA)
  const [formatoId, setFormatoId] = useState(formatos[0]?.id ?? '')
  const [persona, setPersona] = useState(QUALQUER)
  const [quantidade, setQuantidade] = useState(3)
  const [orientacao, setOrientacao] = useState('')
  const [modeloEscolhido, setModelo] = useState(modeloSalvo)
  // O salvo só vale se ainda estiver ativo no catálogo; senão, o padrão
  const modelo =
    modelos.find((m) => m.modelo === modeloEscolhido)?.modelo ??
    modelos.find((m) => m.padrao)?.modelo ??
    modelos[0]?.modelo ??
    MODELO_IA_PADRAO

  function escolherModelo(id: string) {
    setModelo(id)
    try {
      localStorage.setItem(CHAVE_MODELO, id)
    } catch {
      // sem armazenamento local: só não lembra a escolha
    }
  }

  const narrativaEscolhida = narrativaId === SURPRESA ? null : narrativaId
  const narrativas = narrativasDoConceito(narrativasAtivas, frenteId)
  const angulos = angulosDisponiveis(angulosAtivos, frenteId, narrativaEscolhida)
  const anguloEscolhido = angulos.find((a) => a.id === anguloId)
  const pontosDoConceito = pontos.filter((p) => p.frente_id === frenteId && p.ativo && p.uso === 'seguro')

  function escolherConceito(id: string) {
    setFrenteId(id)
    // Limpa as escolhas seguintes que não combinam mais com o novo conceito
    const narrativa = narrativasAtivas.find((n) => n.id === narrativaId)
    const narrativaContinua = narrativa && servePara(narrativa.frente_ids, id)
    if (!narrativaContinua) setNarrativaId(SURPRESA)
    const angulo = angulosAtivos.find((a) => a.id === anguloId)
    if (!angulo || !servePara(angulo.frente_ids, id) || (narrativaContinua && !servePara(angulo.narrativa_ids, narrativaId))) {
      setAnguloId(SURPRESA)
    }
  }

  function escolherNarrativa(id: string) {
    setNarrativaId(id)
    const angulo = angulosAtivos.find((a) => a.id === anguloId)
    if (angulo && id !== SURPRESA && !servePara(angulo.narrativa_ids, id)) {
      setAnguloId(SURPRESA)
    }
  }

  function enviar(event: FormEvent) {
    event.preventDefault()
    onGerar({
      frente_id: frenteId,
      conceito_id: anguloId === SURPRESA ? null : anguloId,
      narrativa_id: narrativaEscolhida,
      formato_id: formatoId,
      persona: persona === QUALQUER ? null : persona,
      modelo,
      quantidade,
      orientacao: orientacao.trim() || null,
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="fabrica-conceito">1. Conceito</Label>
        <Select value={frenteId} onValueChange={escolherConceito}>
          <SelectTrigger id="fabrica-conceito" className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {frentes.map((frente) => (
              <SelectItem key={frente.id} value={frente.id}>{frente.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {pontosDoConceito.length > 0 && (
          <details className="rounded-md bg-[#f7faff] px-2.5 py-1.5 text-xs">
            <summary className="cursor-pointer font-medium text-[#0d559f]">
              {pontosDoConceito.length} {pontosDoConceito.length === 1 ? 'ponto' : 'pontos'} deste conceito {pontosDoConceito.length === 1 ? 'entra' : 'entram'} no pedido
            </summary>
            <ul className="mt-1.5 space-y-1 text-muted-foreground">
              {pontosDoConceito.map((ponto) => (
                <li key={ponto.id}>
                  <span className="font-medium text-foreground">{ROTULO_TIPO_PONTO[ponto.tipo]}:</span> {ponto.texto}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="fabrica-narrativa">2. Narrativa</Label>
        <Select value={narrativaId} onValueChange={escolherNarrativa}>
          <SelectTrigger id="fabrica-narrativa" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SURPRESA}>Surpreenda-me ({narrativas.length})</SelectItem>
            {narrativas.map((narrativa) => (
              <SelectItem key={narrativa.id} value={narrativa.id}>{narrativa.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="fabrica-angulo">3. Ângulo</Label>
        <Select value={anguloId} onValueChange={setAnguloId} disabled={angulos.length === 0}>
          <SelectTrigger id="fabrica-angulo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SURPRESA}>Surpreenda-me ({angulos.length})</SelectItem>
            {angulos.map((angulo) => (
              <SelectItem key={angulo.id} value={angulo.id}>{angulo.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {angulos.length === 0 ? (
          <p className="text-xs text-destructive">Nenhum ângulo ativo combina com este conceito e narrativa. Ajuste em "Editar base".</p>
        ) : (
          anguloEscolhido && <p className="text-xs leading-5 text-muted-foreground">{anguloEscolhido.mensagem}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="fabrica-formato">Formato</Label>
          <Select value={formatoId} onValueChange={setFormatoId}>
            <SelectTrigger id="fabrica-formato" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {formatos.map((formato) => (
                <SelectItem key={formato.id} value={formato.id}>{formato.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="fabrica-persona">Persona</Label>
          <Select value={persona} onValueChange={setPersona}>
            <SelectTrigger id="fabrica-persona" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={QUALQUER}>A do ângulo</SelectItem>
              {PERSONAS.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>{opcao}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Quantas variações</p>
        <div className="grid grid-cols-6 gap-1" role="group" aria-label="Quantidade de variações">
          {Array.from({ length: MAX_VARIACOES }, (_, indice) => indice + 1).map((numero) => (
            <Button
              key={numero}
              type="button"
              size="sm"
              variant={quantidade === numero ? 'default' : 'outline'}
              aria-pressed={quantidade === numero}
              onClick={() => setQuantidade(numero)}
            >
              {numero}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="fabrica-modelo">Modelo de IA</Label>
        <Select value={modelo} onValueChange={escolherModelo}>
          <SelectTrigger id="fabrica-modelo" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['anthropic', 'openai'] as const).map((provedor) => {
              const doProvedor = modelos.filter((m) => m.provedor === provedor)
              if (doProvedor.length === 0) return null
              return (
                <SelectGroup key={provedor}>
                  <SelectLabel>{ROTULO_PROVEDOR[provedor]}</SelectLabel>
                  {doProvedor.map((opcao) => (
                    <SelectItem key={opcao.modelo} value={opcao.modelo}>
                      {opcao.nome}
                      {opcao.descricao && <span className="text-muted-foreground"> · {opcao.descricao}</span>}
                    </SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="fabrica-orientacao">Orientação extra (opcional)</Label>
        <Textarea
          id="fabrica-orientacao"
          rows={3}
          placeholder="Ex.: foco em quem atende à noite; tom mais leve."
          value={orientacao}
          onChange={(event) => setOrientacao(event.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={gerando || !frenteId || !formatoId || angulos.length === 0}>
        <Factory />
        {gerando ? 'Gerando... (até 1 minuto)' : 'Gerar criativos'}
      </Button>
    </form>
  )
}

export default FormularioGeracao
