import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { STATUS_CONTA_PARA_META } from '@/lib/constantes'
import { hojeISO } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'
import type { Criativo, StatusCriativo } from '@/types/database'

// Único ponto do app autorizado a mudar o `status` de um criativo. Aplica aqui as
// regras 4 a 7 do CLAUDE.md sobre `data_entrega`: preenche com a data de hoje na
// primeira vez que entra em aprovado/publicado (se estiver vazia), e limpa quando o
// status volta para backlog/produção/revisão/reprovado. Qualquer outro lugar do
// código que precisar mudar status deve chamar este hook — nunca fazer update direto.
export function useAtualizarStatusCriativo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      criativo,
      novoStatus,
    }: {
      criativo: Criativo
      novoStatus: StatusCriativo
    }) => {
      const contaParaMeta = STATUS_CONTA_PARA_META.includes(novoStatus)
      const novaDataEntrega = contaParaMeta ? (criativo.data_entrega ?? hojeISO()) : null

      const { error } = await supabase
        .from('criativos')
        .update({ status: novoStatus, data_entrega: novaDataEntrega })
        .eq('id', criativo.id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criativos'] })
      toast.success('Status atualizado.')
    },
  })
}
