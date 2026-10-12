import { useState, type FormEvent } from 'react'
import { Factory } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { BaseFabrica, PedidoGeracao } from '@/hooks/use-fabrica'
import { MAX_VARIACOES, PERSONAS } from '@/lib/fabrica'
import type { Frente } from '@/types/database'

// Valor especial dos selects: a função sorteia entre os ativos
const SURPRESA = '__surpresa__'
const QUALQUER = '__qualquer__'

interface FormularioGeracaoProps {
  base: BaseFabrica
  frentes: Frente[]
  gerando: boolean
  onGerar: (pedido: PedidoGeracao) => void
}

function FormularioGeracao({ base, frentes, gerando, onGerar }: FormularioGeracaoProps) {
  const conceitos = base.conceitos.filter((c) => c.ativo)
  const narrativas = base.narrativas.filter((n) => n.ativo)
  const formatos = base.formatos.filter((f) => f.ativo)

  const [frenteId, setFrenteId] = useState(frentes[0]?.id ?? '')
  const [conceitoId, setConceitoId] = useState(SURPRESA)
  const [formatoId, setFormatoId] = useState(formatos[0]?.id ?? '')
  const [narrativaId, setNarrativaId] = useState(SURPRESA)
  const [persona, setPersona] = useState(QUALQUER)
  const [quantidade, setQuantidade] = useState(3)
  const [orientacao, setOrientacao] = useState('')

  const conceitoEscolhido = conceitos.find((c) => c.id === conceitoId)

  function escolherConceito(id: string) {
    setConceitoId(id)
    // Se o conceito sugere uma frente, já deixa ela selecionada
    const frenteSugerida = conceitos.find((c) => c.id === id)?.frente_id
    if (frenteSugerida && frentes.some((f) => f.id === frenteSugerida)) {
      setFrenteId(frenteSugerida)
    }
  }

  function enviar(event: FormEvent) {
    event.preventDefault()
    onGerar({
      frente_id: frenteId,
      conceito_id: conceitoId === SURPRESA ? null : conceitoId,
      narrativa_id: narrativaId === SURPRESA ? null : narrativaId,
      formato_id: formatoId,
      persona: persona === QUALQUER ? null : persona,
      quantidade,
      orientacao: orientacao.trim() || null,
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="fabrica-conceito">Conceito</Label>
        <Select value={conceitoId} onValueChange={escolherConceito}>
          <SelectTrigger id="fabrica-conceito" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SURPRESA}>Surpreenda-me</SelectItem>
            {conceitos.map((conceito) => (
              <SelectItem key={conceito.id} value={conceito.id}>{conceito.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {conceitoEscolhido && <p className="text-xs leading-5 text-muted-foreground">{conceitoEscolhido.mensagem}</p>}
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
          <Label htmlFor="fabrica-narrativa">Narrativa</Label>
          <Select value={narrativaId} onValueChange={setNarrativaId}>
            <SelectTrigger id="fabrica-narrativa" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SURPRESA}>Surpreenda-me</SelectItem>
              {narrativas.map((narrativa) => (
                <SelectItem key={narrativa.id} value={narrativa.id}>{narrativa.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="fabrica-frente">Frente</Label>
          <Select value={frenteId} onValueChange={setFrenteId}>
            <SelectTrigger id="fabrica-frente" className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {frentes.map((frente) => (
                <SelectItem key={frente.id} value={frente.id}>{frente.nome}</SelectItem>
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
              <SelectItem value={QUALQUER}>A do conceito</SelectItem>
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
        <Label htmlFor="fabrica-orientacao">Orientação extra (opcional)</Label>
        <Textarea
          id="fabrica-orientacao"
          rows={3}
          placeholder="Ex.: foco em quem atende à noite; tom mais leve."
          value={orientacao}
          onChange={(event) => setOrientacao(event.target.value)}
        />
      </div>

      <Button type="submit" className="w-full" disabled={gerando || !frenteId || !formatoId}>
        <Factory />
        {gerando ? 'Gerando... (até 1 minuto)' : 'Gerar criativos'}
      </Button>
    </form>
  )
}

export default FormularioGeracao
