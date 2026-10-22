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
      publicacao,
      motivo,
    }: {
      criativo: Criativo
      novoStatus: StatusCriativo
      // Campanha e dia em que foi ao ar; só faz sentido com status 'publicado'
      publicacao?: { campanha: string | null; data_publicacao: string | null }
      // O que precisa ajustar; só faz sentido com status 'reprovado'
      motivo?: string | null
    }) => {
      const { error } = await supabase
        .from('criativos')
        .update({
          status: novoStatus,
          ...(novoStatus === 'publicado' && publicacao ? publicacao : {}),
          ...(novoStatus !== 'publicado' ? { campanha: null, data_publicacao: null } : {}),
          // O motivo fica visível enquanto o criativo é ajustado e revisado de novo
          ...(novoStatus === 'reprovado' ? { motivo_reprovacao: motivo?.trim() || null } : {}),
          ...(novoStatus === 'aprovado' || novoStatus === 'publicado' ? { motivo_reprovacao: null } : {}),
        })
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
