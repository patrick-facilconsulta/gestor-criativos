import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type StatusEmAndamento = 'backlog' | 'producao' | 'revisao'

const STATUS_EM_ANDAMENTO: StatusEmAndamento[] = ['backlog', 'producao', 'revisao']

// Consulta separada e leve, de propósito: "Em andamento" não tem filtro de mês (é o
// estado atual geral), então por definição não pode vir da consulta única do mês.
export function useContagemEmAndamento() {
  return useQuery({
    queryKey: ['contagem-em-andamento'],
    queryFn: async (): Promise<Record<StatusEmAndamento, number>> => {
      const { data, error } = await supabase.from('criativos').select('status').in('status', STATUS_EM_ANDAMENTO)

      if (error) {
        throw error
      }

      const contagem: Record<StatusEmAndamento, number> = { backlog: 0, producao: 0, revisao: 0 }

      for (const linha of data) {
        const status = linha.status as StatusEmAndamento
        contagem[status] += 1
      }

      return contagem
    },
  })
}
