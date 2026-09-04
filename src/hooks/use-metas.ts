import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Meta } from '@/types/database'

export function useMetas() {
  return useQuery({
    queryKey: ['metas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('metas').select('*')

      if (error) {
        throw error
      }

      return data as Meta[]
    },
  })
}

export interface MetaEditavel {
  id: string
  frente_id: string
  formato: Meta['formato']
  meta_semanal: number
  meta_mensal: number
}

// Grava as 8 linhas de uma vez, como pede o CLAUDE.md ("um único botão Salvar").
export function useSalvarMetas() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (metasEditadas: MetaEditavel[]) => {
      const { error } = await supabase.from('metas').upsert(metasEditadas, { onConflict: 'id' })

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metas'] })
      toast.success('Metas salvas.')
    },
  })
}
