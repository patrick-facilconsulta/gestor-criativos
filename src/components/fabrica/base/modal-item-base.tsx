import { useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export type ValorCampo = string | number | boolean | string[] | null

export interface CampoBase {
  chave: string
  rotulo: string
  // 'multipla': lista de caixas de seleção; nenhuma marcada = vale para todos
  tipo: 'texto' | 'textarea' | 'select' | 'multipla' | 'cor' | 'numero' | 'booleano'
  obrigatorio?: boolean
  opcoes?: { valor: string; rotulo: string }[]
  // Select que aceita ficar vazio (grava null)
  permiteVazio?: boolean
  ajuda?: string
  linhas?: number
}

// Valor do select que representa "nenhum" (o Radix não aceita value vazio)
const NENHUM = '__nenhum__'

interface ModalItemBaseProps {
  aberto: boolean
  titulo: string
  descricao?: string
  campos: CampoBase[]
  valoresIniciais: Record<string, ValorCampo>
  salvando: boolean
  onFechar: () => void
  onSalvar: (valores: Record<string, ValorCampo>) => void
  // Prévia opcional que acompanha o formulário (ex.: paleta aplicada na arte)
  previa?: (valores: Record<string, ValorCampo>) => ReactNode
}

function ModalItemBase({ aberto, titulo, descricao, campos, valoresIniciais, salvando, onFechar, onSalvar, previa }: ModalItemBaseProps) {
  const [valores, setValores] = useState(valoresIniciais)

  const valido = campos.every((campo) => {
    if (!campo.obrigatorio) return true
    const valor = valores[campo.chave]
    if (Array.isArray(valor)) return valor.length > 0
    return valor !== null && valor !== undefined && String(valor).trim() !== ''
  }) && campos
    .filter((campo) => campo.tipo === 'cor')
    .every((campo) => /^#[0-9a-fA-F]{6}$/.test(String(valores[campo.chave] ?? '')))

  function alterar(chave: string, valor: ValorCampo) {
    setValores((atuais) => ({ ...atuais, [chave]: valor }))
  }

  function enviar(event: FormEvent) {
    event.preventDefault()
    // Texto vazio vira null; número vira inteiro
    const normalizados: Record<string, ValorCampo> = {}
    for (const campo of campos) {
      const valor = valores[campo.chave]
      if (campo.tipo === 'numero') {
        normalizados[campo.chave] = Number.parseInt(String(valor ?? 0), 10) || 0
      } else if (campo.tipo === 'booleano') {
        normalizados[campo.chave] = Boolean(valor)
      } else if (campo.tipo === 'multipla') {
        normalizados[campo.chave] = Array.isArray(valor) ? valor : []
      } else if (typeof valor === 'string') {
        normalizados[campo.chave] = valor.trim() === '' ? null : campo.tipo === 'cor' ? valor.toUpperCase() : valor.trim()
      } else {
        normalizados[campo.chave] = valor ?? null
      }
    }
    onSalvar(normalizados)
  }

  function renderizarCampo(campo: CampoBase) {
    const id = `campo-${campo.chave}`
    const valor = valores[campo.chave]

    if (campo.tipo === 'booleano') {
      return (
        <label key={campo.chave} className="flex items-center gap-2 text-sm font-medium">
          <Checkbox checked={Boolean(valor)} onCheckedChange={(marcado) => alterar(campo.chave, marcado === true)} />
          {campo.rotulo}
        </label>
      )
    }

    if (campo.tipo === 'multipla') {
      const marcados = Array.isArray(valor) ? valor : []
      return (
        <fieldset key={campo.chave} className="space-y-1">
          <legend className="text-sm font-medium">{campo.rotulo}</legend>
          <div className="grid gap-1.5 rounded-md border border-border p-2.5 sm:grid-cols-2">
            {campo.opcoes?.map((opcao) => (
              <label key={opcao.valor} className="flex items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={marcados.includes(opcao.valor)}
                  onCheckedChange={(marcado) =>
                    alterar(
                      campo.chave,
                      marcado === true ? [...marcados, opcao.valor] : marcados.filter((item) => item !== opcao.valor),
                    )
                  }
                />
                {opcao.rotulo}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{campo.ajuda ?? 'Nenhum marcado = vale para todos.'}</p>
        </fieldset>
      )
    }

    return (
      <div key={campo.chave} className="space-y-1">
        <Label htmlFor={id}>
          {campo.rotulo}
          {campo.obrigatorio && <span className="text-destructive"> *</span>}
        </Label>
        {campo.tipo === 'textarea' ? (
          <Textarea id={id} rows={campo.linhas ?? 3} value={String(valor ?? '')} onChange={(e) => alterar(campo.chave, e.target.value)} />
        ) : campo.tipo === 'select' ? (
          <Select
            value={valor === null || valor === undefined || valor === '' ? NENHUM : String(valor)}
            onValueChange={(novo) => alterar(campo.chave, novo === NENHUM ? null : novo)}
          >
            <SelectTrigger id={id} className="w-full">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {campo.permiteVazio && <SelectItem value={NENHUM}>Nenhum</SelectItem>}
              {campo.opcoes?.map((opcao) => (
                <SelectItem key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : campo.tipo === 'cor' ? (
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label={`${campo.rotulo} (seletor)`}
              className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
              value={/^#[0-9a-fA-F]{6}$/.test(String(valor ?? '')) ? String(valor) : '#000000'}
              onChange={(e) => alterar(campo.chave, e.target.value.toUpperCase())}
            />
            <Input id={id} value={String(valor ?? '')} placeholder="#RRGGBB" onChange={(e) => alterar(campo.chave, e.target.value)} />
          </div>
        ) : (
          <Input
            id={id}
            type={campo.tipo === 'numero' ? 'number' : 'text'}
            value={String(valor ?? '')}
            onChange={(e) => alterar(campo.chave, e.target.value)}
          />
        )}
        {campo.ajuda && <p className="text-xs text-muted-foreground">{campo.ajuda}</p>}
      </div>
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => !abrir && onFechar()}>
      <DialogContent className={`max-h-[calc(100vh-2rem)] overflow-y-auto ${previa ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}>
        <form onSubmit={enviar} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{titulo}</DialogTitle>
            {descricao && <DialogDescription>{descricao}</DialogDescription>}
          </DialogHeader>
          <div className={previa ? 'grid gap-6 sm:grid-cols-[minmax(0,1fr)_240px]' : ''}>
            <div className="space-y-4">{campos.map(renderizarCampo)}</div>
            {previa && <div>{previa(valores)}</div>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={!valido || salvando}>{salvando ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ModalItemBase
