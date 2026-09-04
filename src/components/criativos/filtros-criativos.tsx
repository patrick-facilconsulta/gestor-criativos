import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { FiltrosCriativos as EstadoFiltros } from '@/hooks/use-criativos'
import { ORDEM_STATUS, ROTULO_FORMATO, ROTULO_STATUS } from '@/lib/constantes'
import type { Formato, Frente, StatusCriativo } from '@/types/database'

interface FiltrosCriativosProps {
  frentes: Frente[]
  filtros: EstadoFiltros
  onFiltrosChange: (filtros: EstadoFiltros) => void
}

function FiltrosCriativos({ frentes, filtros, onFiltrosChange }: FiltrosCriativosProps) {
  function alternarFrente(id: string) {
    const jaSelecionada = filtros.frenteIds.includes(id)
    onFiltrosChange({
      ...filtros,
      frenteIds: jaSelecionada
        ? filtros.frenteIds.filter((frenteId) => frenteId !== id)
        : [...filtros.frenteIds, id],
    })
  }

  function alternarStatus(status: StatusCriativo) {
    const jaSelecionado = filtros.statusSelecionados.includes(status)
    onFiltrosChange({
      ...filtros,
      statusSelecionados: jaSelecionado
        ? filtros.statusSelecionados.filter((s) => s !== status)
        : [...filtros.statusSelecionados, status],
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Buscar por título..."
        value={filtros.busca}
        onChange={(event) => onFiltrosChange({ ...filtros, busca: event.target.value })}
        className="w-56"
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            Frente{filtros.frenteIds.length > 0 ? ` (${filtros.frenteIds.length})` : ''}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <div className="flex flex-col gap-2">
            {frentes.map((frente) => (
              <label key={frente.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={filtros.frenteIds.includes(frente.id)}
                  onCheckedChange={() => alternarFrente(frente.id)}
                />
                {frente.nome}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Select
        value={filtros.formato}
        onValueChange={(valor) => onFiltrosChange({ ...filtros, formato: valor as Formato | 'todos' })}
      >
        <SelectTrigger size="sm" className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os formatos</SelectItem>
          {(Object.keys(ROTULO_FORMATO) as Formato[]).map((formato) => (
            <SelectItem key={formato} value={formato}>
              {ROTULO_FORMATO[formato]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            Status ({filtros.statusSelecionados.length})
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <div className="flex flex-col gap-2">
            {ORDEM_STATUS.map((status) => (
              <label key={status} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={filtros.statusSelecionados.includes(status)}
                  onCheckedChange={() => alternarStatus(status)}
                />
                {ROTULO_STATUS[status]}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Select
        value={filtros.periodo}
        onValueChange={(valor) =>
          onFiltrosChange({ ...filtros, periodo: valor as EstadoFiltros['periodo'] })
        }
      >
        <SelectTrigger size="sm" className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="semana_atual">Semana atual</SelectItem>
          <SelectItem value="mes_atual">Mês atual</SelectItem>
          <SelectItem value="mes_anterior">Mês anterior</SelectItem>
          <SelectItem value="tudo">Tudo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

export default FiltrosCriativos
