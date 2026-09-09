import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatarDataISO } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'
import type { Criativo, EtapaProducao } from '@/types/database'

interface UsePautaDoMesOpcoes {
  ano: number
  mes: number // 1-12
}

// Invalida tudo que depende do criativo: a pauta em si, as listas de /criativos,
// o dashboard do mês e a barra "Em andamento".
function invalidarTudo(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['pauta'] })
  queryClient.invalidateQueries({ queryKey: ['criativos'] })
  queryClient.invalidateQueries({ queryKey: ['criativos-do-mes'] })
  queryClient.invalidateQueries({ queryKey: ['contagem-em-andamento'] })
}

// Vídeos com dia de captação marcado dentro do mês selecionado. É a partir daqui
// que a tela sabe o que tem na pauta de cada dia e o que está na esteira de edição.
export function usePautaDoMes({ ano, mes }: UsePautaDoMesOpcoes) {
  return useQuery({
    queryKey: ['pauta', { ano, mes }],
    queryFn: async (): Promise<Criativo[]> => {
      const primeiroDiaMes = new Date(ano, mes - 1, 1)
      const ultimoDiaMes = new Date(ano, mes, 0)

      const { data, error } = await supabase
        .from('criativos')
        .select('*')
        .eq('formato', 'video')
        .gte('data_captacao', formatarDataISO(primeiroDiaMes))
        .lte('data_captacao', formatarDataISO(ultimoDiaMes))
        .order('titulo')

      if (error) {
        throw error
      }

      return data as Criativo[]
    },
  })
}

// Candidatos para entrar numa pauta: vídeo do briefing que ainda não tem dia.
// Só antes da revisão — depois disso o material já foi entregue.
export function useVideosSemPauta() {
  return useQuery({
    queryKey: ['pauta', 'sem-dia'],
    queryFn: async (): Promise<Criativo[]> => {
      const { data, error } = await supabase
        .from('criativos')
        .select('*')
        .eq('formato', 'video')
        .is('data_captacao', null)
        .in('status', ['backlog', 'producao'])
        .order('data_prevista', { nullsFirst: false })
        .order('titulo')

      if (error) {
        throw error
      }

      return data as Criativo[]
    },
  })
}

// Pendura o vídeo no dia. Um criativo que ainda estava em backlog sai do backlog:
// ter dia de captação marcado já é estar em produção.
export function useDefinirPauta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ criativo, data }: { criativo: Criativo; data: string }) => {
      const alteracoes: Partial<Criativo> = {
        data_captacao: data,
        etapa: criativo.etapa ?? 'a_captar',
      }

      if (criativo.status === 'backlog') {
        alteracoes.status = 'producao'
      }

      const { error } = await supabase.from('criativos').update(alteracoes).eq('id', criativo.id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      invalidarTudo(queryClient)
      toast.success('Vídeo adicionado à pauta.')
    },
  })
}

// Tira o vídeo do dia e zera a etapa. O status fica como está — o vídeo continua
// em produção, só perdeu a data.
export function useRemoverDaPauta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase
        .from('criativos')
        .update({ data_captacao: null, etapa: null })
        .eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      invalidarTudo(queryClient)
      toast.success('Vídeo removido da pauta.')
    },
  })
}

// Avança (ou volta) o vídeo na esteira: a captar → captado → em edição → editado.
// Não encosta em status nem em data_entrega.
export function useAtualizarEtapa() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, etapa }: { id: string; etapa: EtapaProducao }) => {
      const { error } = await supabase.from('criativos').update({ etapa }).eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      invalidarTudo(queryClient)
    },
  })
}

// Quem está editando. Texto livre, igual ao campo de responsável.
export function useDefinirEditor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, editor }: { id: string; editor: string | null }) => {
      const { error } = await supabase.from('criativos').update({ editor }).eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      invalidarTudo(queryClient)
    },
  })
}
