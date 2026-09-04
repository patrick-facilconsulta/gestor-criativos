import { FileText, Paperclip, Pencil, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAtualizarStatusCriativo } from '@/hooks/use-atualizar-status-criativo'
import { abrirArquivoEntrega, useExcluirCriativo } from '@/hooks/use-criativos'
import { ORDEM_STATUS, ROTULO_FORMATO, ROTULO_STATUS } from '@/lib/constantes'
import { formatarDataBR } from '@/lib/date-utils'
import type { Criativo, Frente, StatusCriativo } from '@/types/database'

interface TabelaCriativosProps {
  criativos: Criativo[]
  frentes: Frente[]
  onEditar: (criativo: Criativo) => void
}

function TabelaCriativos({ criativos, frentes, onEditar }: TabelaCriativosProps) {
  const nomePorFrenteId = new Map(frentes.map((frente) => [frente.id, frente.nome]))
  const atualizarStatus = useAtualizarStatusCriativo()
  const excluirCriativo = useExcluirCriativo()

  async function abrirArquivo(criativo: Criativo) {
    if (criativo.arquivo_path) {
      await abrirArquivoEntrega(criativo.arquivo_path)
      return
    }

    if (criativo.link_arquivo) {
      window.open(criativo.link_arquivo, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead>Frente</TableHead>
          <TableHead>Formato</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Responsável</TableHead>
          <TableHead>Prevista</TableHead>
          <TableHead>Entrega</TableHead>
          <TableHead>Links</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {criativos.length === 0 && (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground">
              Nenhum criativo encontrado.
            </TableCell>
          </TableRow>
        )}

        {criativos.map((criativo) => (
          <TableRow key={criativo.id}>
            <TableCell>{criativo.titulo}</TableCell>
            <TableCell>{nomePorFrenteId.get(criativo.frente_id) ?? '—'}</TableCell>
            <TableCell>{ROTULO_FORMATO[criativo.formato]}</TableCell>
            <TableCell>
              <Select
                value={criativo.status}
                onValueChange={(valor) =>
                  atualizarStatus.mutate({ criativo, novoStatus: valor as StatusCriativo })
                }
              >
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDEM_STATUS.map((status) => (
                    <SelectItem
                      key={status}
                      value={status}
                      disabled={
                        !criativo.arquivo_path &&
                        !criativo.link_arquivo &&
                        ['revisao', 'aprovado', 'publicado'].includes(status)
                      }
                    >
                      {ROTULO_STATUS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>{criativo.responsavel ?? '—'}</TableCell>
            <TableCell>{formatarDataBR(criativo.data_prevista)}</TableCell>
            <TableCell>{formatarDataBR(criativo.data_entrega)}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={!criativo.arquivo_path && !criativo.link_arquivo}
                  title="Arquivo"
                  onClick={() => abrirArquivo(criativo)}
                >
                  <Paperclip />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  asChild={Boolean(criativo.link_inspiracao)}
                  disabled={!criativo.link_inspiracao}
                  title="Inspiração"
                >
                  {criativo.link_inspiracao ? (
                    <a href={criativo.link_inspiracao} target="_blank" rel="noreferrer">
                      <FileText />
                    </a>
                  ) : (
                    <FileText />
                  )}
                </Button>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" title="Editar" onClick={() => onEditar(criativo)}>
                  <Pencil />
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon-sm" title="Excluir">
                      <Trash2 />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir "{criativo.titulo}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Essa ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => excluirCriativo.mutate(criativo)}>
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default TabelaCriativos
