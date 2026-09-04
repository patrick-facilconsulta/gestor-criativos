import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Frente } from '@/types/database'

interface UseFrentesOpcoes {
  apenasAtivas?: boolean
}

export function useFrentes({ apenasAtivas = false }: UseFrentesOpcoes = {}) {
  return useQuery({
    queryKey: ['frentes', { apenasAtivas }],
    queryFn: async () => {
      let query = supabase.from('frentes').select('*').order('ordem', { ascending: true })

      if (apenasAtivas) {
        query = query.eq('ativa', true)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      return data as Frente[]
    },
  })
}

export function useRenomearFrente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase.from('frentes').update({ nome }).eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frentes'] })
      toast.success('Frente renomeada.')
    },
  })
}

export function useAlternarFrenteAtiva() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ativa }: { id: string; ativa: boolean }) => {
      const { error } = await supabase.from('frentes').update({ ativa }).eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frentes'] })
      toast.success('Frente atualizada.')
    },
  })
}

// Ao adicionar frente, cria também as 2 linhas de meta zeradas (regra do CLAUDE.md).
// São dois inserts sequenciais (a lib do Supabase não dá transação de verdade aqui);
// com o volume de uso deste app, o risco de falhar entre um e outro é baixo.
export function useAdicionarFrente() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (nome: string) => {
      const { data: ultimaFrente, error: erroBusca } = await supabase
        .from('frentes')
        .select('ordem')
        .order('ordem', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (erroBusca) {
        throw erroBusca
      }

      const proximaOrdem = (ultimaFrente?.ordem ?? 0) + 1

      const { data: novaFrente, error: erroInsercao } = await supabase
        .from('frentes')
        .insert({ nome, ordem: proximaOrdem })
        .select()
        .single()

      if (erroInsercao) {
        throw erroInsercao
      }

      const { error: erroMetas } = await supabase.from('metas').insert([
        { frente_id: novaFrente.id, formato: 'video', meta_semanal: 0, meta_mensal: 0 },
        { frente_id: novaFrente.id, formato: 'estatico', meta_semanal: 0, meta_mensal: 0 },
      ])

      if (erroMetas) {
        await supabase.from('frentes').delete().eq('id', novaFrente.id)
        throw erroMetas
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['frentes'] })
      queryClient.invalidateQueries({ queryKey: ['metas'] })
      toast.success('Frente adicionada.')
    },
  })
}
