import type { ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export interface ItemBase {
  id: string
  ativo: boolean
}

export interface ColunaBase<T> {
  rotulo: string
  render: (item: T) => ReactNode
  className?: string
}

interface TabelaBaseProps<T extends ItemBase> {
  itens: T[]
  colunas: ColunaBase<T>[]
  desabilitado: boolean
  onEditar: (item: T) => void
  onAlternarAtivo: (item: T, ativo: boolean) => void
}

// Lista de itens da base com "ativo" e botão de editar. Nada é excluído:
// desativar tira o item da Fábrica sem quebrar o histórico.
function TabelaBase<T extends ItemBase>({ itens, colunas, desabilitado, onEditar, onAlternarAtivo }: TabelaBaseProps<T>) {
  if (itens.length === 0) {
    return <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Nenhum item cadastrado.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Ativo</TableHead>
            {colunas.map((coluna) => (
              <TableHead key={coluna.rotulo} className={coluna.className}>{coluna.rotulo}</TableHead>
            ))}
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.map((item) => (
            <TableRow key={item.id} className={item.ativo ? '' : 'opacity-50'}>
              <TableCell>
                <Checkbox
                  checked={item.ativo}
                  disabled={desabilitado}
                  aria-label={item.ativo ? 'Desativar' : 'Ativar'}
                  onCheckedChange={(marcado) => onAlternarAtivo(item, marcado === true)}
                />
              </TableCell>
              {colunas.map((coluna) => (
                <TableCell key={coluna.rotulo} className={`whitespace-normal ${coluna.className ?? ''}`}>{coluna.render(item)}</TableCell>
              ))}
              <TableCell>
                <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => onEditar(item)}>
                  <Pencil />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default TabelaBase
