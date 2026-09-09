import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatarDataISO, getFimSemanaIso, getInicioSemanaIso } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'
import type { DiaProducao, TipoDia } from '@/types/database'

interface UseDiasProducaoOpcoes {
  ano: number
  mes: number // 1-12
}

// Mesma técnica de use-criativos-do-mes: busca a semana ISO inteira das duas
// pontas, porque o cronograma mostra semanas que cruzam a virada do mês.
export function useDiasProducao({ ano, mes }: UseDiasProducaoOpcoes) {
  return useQuery({
    queryKey: ['dias-producao', { ano, mes }],
    queryFn: async (): Promise<DiaProducao[]> => {
      const primeiroDiaMes = new Date(ano, mes - 1, 1)
      const ultimoDiaMes = new Date(ano, mes, 0)

      const { data, error } = await supabase
        .from('dias_producao')
        .select('*')
        .gte('data', formatarDataISO(getInicioSemanaIso(primeiroDiaMes)))
        .lte('data', formatarDataISO(getFimSemanaIso(ultimoDiaMes)))

      if (error) {
        throw error
      }

      return data as DiaProducao[]
    },
  })
}

// Dia que não está na tabela é home office. Só grava linha quando alguém escolhe.
export function useDefinirTipoDia() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ data, tipo }: { data: string; tipo: TipoDia }) => {
      const { error } = await supabase
        .from('dias_producao')
        .upsert({ data, tipo }, { onConflict: 'data' })

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dias-producao'] })
    },
  })
}

// Marca vários dias como presencial de uma vez (botão de sugestão do cronograma).
export function useAplicarSugestaoPresencial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (datas: string[]) => {
      if (datas.length === 0) {
        return 0
      }

      const { error } = await supabase
        .from('dias_producao')
        .upsert(
          datas.map((data) => ({ data, tipo: 'presencial' as TipoDia })),
          { onConflict: 'data' },
        )

      if (error) {
        throw error
      }

      return datas.length
    },
    onSuccess: (quantidade) => {
      queryClient.invalidateQueries({ queryKey: ['dias-producao'] })
      if (quantidade > 0) {
        toast.success(
          quantidade === 1
            ? '1 dia marcado como presencial.'
            : `${quantidade} dias marcados como presenciais.`,
        )
      }
    },
  })
}
