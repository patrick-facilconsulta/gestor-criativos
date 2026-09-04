import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Criativo, StatusCriativo } from '@/types/database'

// Único ponto do app autorizado a mudar o status de um criativo. A data de entrega
// é registrada somente na central de entregas, no momento do envio do material.
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
      const { error } = await supabase
        .from('criativos')
        .update({ status: novoStatus })
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
