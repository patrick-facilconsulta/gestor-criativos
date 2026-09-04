import { useQuery } from '@tanstack/react-query'
import { formatarDataISO, getFimSemanaIso, getInicioSemanaIso } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'
import type { Criativo } from '@/types/database'

interface UseCriativosDoMesOpcoes {
  ano: number
  mes: number // 1-12
}

// Uma única consulta (proibido criar views/RPC): busca da segunda-feira da semana ISO
// que contém o dia 1 do mês até o domingo da semana ISO que contém o último dia do
// mês. Isso garante que a semana corrente inteira esteja disponível mesmo quando ela
// cruza a fronteira do mês. Os filtros de mês/semana em si são feitos em memória
// (ver src/lib/dashboard-utils.ts).
export function useCriativosDoMes({ ano, mes }: UseCriativosDoMesOpcoes) {
  return useQuery({
    queryKey: ['criativos-do-mes', { ano, mes }],
    queryFn: async (): Promise<Criativo[]> => {
      const primeiroDiaMes = new Date(ano, mes - 1, 1)
      const ultimoDiaMes = new Date(ano, mes, 0)

      const inicioIntervalo = getInicioSemanaIso(primeiroDiaMes)
      const fimIntervalo = getFimSemanaIso(ultimoDiaMes)

      const { data, error } = await supabase
        .from('criativos')
        .select('*')
        .gte('data_entrega', formatarDataISO(inicioIntervalo))
        .lte('data_entrega', formatarDataISO(fimIntervalo))

      if (error) {
        throw error
      }

      return data as Criativo[]
    },
  })
}
