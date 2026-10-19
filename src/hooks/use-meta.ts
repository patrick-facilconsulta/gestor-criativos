import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mensagemDeErro } from '@/hooks/use-fabrica'
import { supabase } from '@/lib/supabase'
import type { MetaAnuncio, MetaConfiguracao, MetaPrefixoConceito, MetaResultadoDiario } from '@/types/database'

// Integração com o Meta Ads. Toda chamada ao Meta passa pelas Edge Functions
// (lancar-no-meta e meta-sincronizar); o token nunca vem para o navegador.

export function useMetaConfiguracao() {
  return useQuery({
    queryKey: ['meta', 'configuracao'],
    queryFn: async (): Promise<MetaConfiguracao | null> => {
      const { data, error } = await supabase.from('meta_configuracao').select('*').eq('id', 1).maybeSingle()
      if (error) throw error
      return data as MetaConfiguracao | null
    },
  })
}

export function useAtualizarMetaConfiguracao() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      campos: Partial<Pick<MetaConfiguracao, 'conjunto_publico_id' | 'orcamento_diario_padrao' | 'orcamento_diario_maximo' | 'teto_campanha'>>,
    ) => {
      const { error } = await supabase
        .from('meta_configuracao')
        .update({ ...campos, updated_at: new Date().toISOString() })
        .eq('id', 1)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta', 'configuracao'] })
      toast.success('Configuração do Meta salva.')
    },
    onError: () => toast.error('Não foi possível salvar a configuração do Meta.'),
  })
}

export interface ConjuntoMeta {
  id: string
  nome: string
  campanha: string
}

// Conjuntos ativos de campanhas de cadastro (para copiar o público). Só leitura no Meta.
export function useConjuntosMeta(ativo = true) {
  return useQuery({
    queryKey: ['meta', 'conjuntos'],
    enabled: ativo,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<ConjuntoMeta[]> => {
      const { data, error } = await supabase.functions.invoke('lancar-no-meta', { body: { acao: 'listar_conjuntos' } })
      if (error) throw new Error(await mensagemDeErro(error, 'Não foi possível ler os conjuntos do Meta.'))
      return (data as { conjuntos: ConjuntoMeta[] }).conjuntos
    },
  })
}

export interface PedidoLancamento {
  criativo_ids: string[]
  conjunto_publico_id: string
  orcamento_diario: number
  nome_teste: string
  botao: string
  simular: boolean
}

export interface ResultadoLancamento {
  simulacao?: Record<string, unknown>
  conta?: string
  campanha_id?: string
  conjunto_id?: string
  anuncios?: { criativo_id: string; ad_id: string; nome: string }[]
}

export function useLancarNoMeta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pedido: PedidoLancamento): Promise<ResultadoLancamento> => {
      const { data, error } = await supabase.functions.invoke('lancar-no-meta', { body: { acao: 'lancar', ...pedido } })
      if (error) throw new Error(await mensagemDeErro(error, 'Não foi possível lançar no Meta agora. Nada foi ativado.'))
      return data as ResultadoLancamento
    },
    onSuccess: (resultado) => {
      if (!resultado.simulacao) {
        queryClient.invalidateQueries({ queryKey: ['criativos'] })
        queryClient.invalidateQueries({ queryKey: ['meta'] })
      }
    },
  })
}

export function useSincronizarMeta() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dias?: number) => {
      const { data, error } = await supabase.functions.invoke('meta-sincronizar', { body: dias ? { dias } : {} })
      if (error) throw new Error(await mensagemDeErro(error, 'Não foi possível atualizar os resultados do Meta agora.'))
      return data as { dias: number; linhas: number; anuncios: number; publicados: number }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta'] })
      queryClient.invalidateQueries({ queryKey: ['criativos'] })
    },
  })
}

export interface DesempenhoAnuncio extends MetaAnuncio {
  gasto: number
  impressoes: number
  cliques_link: number
  visitas_lp: number
  resultados: number
}

// Anúncios com os números somados no período (desde = data ISO)
export function useDesempenhoMeta(desde: string) {
  return useQuery({
    queryKey: ['meta', 'desempenho', desde],
    queryFn: async (): Promise<DesempenhoAnuncio[]> => {
      const linhas: MetaResultadoDiario[] = []
      // O Supabase devolve no máximo 1000 linhas por vez
      for (let pagina = 0; pagina < 200; pagina++) {
        const { data, error } = await supabase
          .from('meta_resultados_diarios')
          .select('ad_id, data, gasto, impressoes, alcance, cliques_link, visitas_lp, resultados')
          .gte('data', desde)
          .order('ad_id')
          .order('data')
          .range(pagina * 1000, pagina * 1000 + 999)
        if (error) throw error
        linhas.push(...(data as MetaResultadoDiario[]))
        if (!data || data.length < 1000) break
      }

      const soma = new Map<string, Omit<DesempenhoAnuncio, keyof MetaAnuncio>>()
      for (const l of linhas) {
        const atual = soma.get(l.ad_id) ?? { gasto: 0, impressoes: 0, cliques_link: 0, visitas_lp: 0, resultados: 0 }
        atual.gasto += Number(l.gasto)
        atual.impressoes += Number(l.impressoes)
        atual.cliques_link += Number(l.cliques_link)
        atual.visitas_lp += Number(l.visitas_lp)
        atual.resultados += Number(l.resultados)
        soma.set(l.ad_id, atual)
      }

      const ids = [...soma.keys()]
      const anuncios: MetaAnuncio[] = []
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase.from('meta_anuncios').select('*').in('ad_id', ids.slice(i, i + 200))
        if (error) throw error
        anuncios.push(...(data as MetaAnuncio[]))
      }

      return anuncios.map((anuncio) => ({ ...anuncio, ...soma.get(anuncio.ad_id)! }))
    },
  })
}

export function usePrefixosConceito() {
  return useQuery({
    queryKey: ['meta', 'prefixos'],
    queryFn: async (): Promise<MetaPrefixoConceito[]> => {
      const { data, error } = await supabase.from('meta_prefixos_conceito').select('*').order('termo')
      if (error) throw error
      return data as MetaPrefixoConceito[]
    },
  })
}

export function useAdicionarPrefixo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (novo: { termo: string; frente_id: string }) => {
      const { error } = await supabase.from('meta_prefixos_conceito').insert({ termo: novo.termo.trim().toUpperCase(), frente_id: novo.frente_id })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meta', 'prefixos'] }),
    onError: () => toast.error('Não foi possível adicionar o termo (ele já existe?).'),
  })
}

export function useRemoverPrefixo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meta_prefixos_conceito').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['meta', 'prefixos'] }),
  })
}
