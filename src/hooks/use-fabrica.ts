import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type {
  FabricaArgumento,
  FabricaBaseConhecimento,
  FabricaConceito,
  FabricaDiretriz,
  FabricaFormato,
  FabricaGeracao,
  FabricaLayout,
  FabricaLote,
  FabricaNarrativa,
  FabricaPaleta,
  FabricaPontoConceito,
} from '@/types/database'

export interface BaseFabrica {
  conceitos: FabricaConceito[]
  narrativas: FabricaNarrativa[]
  formatos: FabricaFormato[]
  layouts: FabricaLayout[]
  paletas: FabricaPaleta[]
}

// Tabelas da base que têm ordem e podem ser ativadas/desativadas
export type TabelaOrdenada =
  | 'fabrica_conceitos'
  | 'fabrica_narrativas'
  | 'fabrica_formatos'
  | 'fabrica_layouts'
  | 'fabrica_paletas'

export type TabelaBase = TabelaOrdenada | 'fabrica_argumentos' | 'fabrica_diretrizes' | 'fabrica_pontos_conceito'

async function listar<T>(tabela: TabelaOrdenada): Promise<T[]> {
  const { data, error } = await supabase.from(tabela).select('*').order('ordem', { ascending: true })

  if (error) {
    throw error
  }

  return data as T[]
}

// Toda a base (inclusive itens desativados). Quem usa filtra por `ativo`.
export function useBaseFabrica() {
  return useQuery({
    queryKey: ['fabrica', 'base'],
    queryFn: async (): Promise<BaseFabrica> => {
      const [conceitos, narrativas, formatos, layouts, paletas] = await Promise.all([
        listar<FabricaConceito>('fabrica_conceitos'),
        listar<FabricaNarrativa>('fabrica_narrativas'),
        listar<FabricaFormato>('fabrica_formatos'),
        listar<FabricaLayout>('fabrica_layouts'),
        listar<FabricaPaleta>('fabrica_paletas'),
      ])

      return { conceitos, narrativas, formatos, layouts, paletas }
    },
  })
}

export function useArgumentos() {
  return useQuery({
    queryKey: ['fabrica', 'argumentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fabrica_argumentos')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return data as FabricaArgumento[]
    },
  })
}

// Pontos de cada conceito (dores, desejos, benefícios e provas)
export function usePontosConceito() {
  return useQuery({
    queryKey: ['fabrica', 'pontos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fabrica_pontos_conceito')
        .select('*')
        .order('ordem', { ascending: true })

      if (error) {
        throw error
      }

      return data as FabricaPontoConceito[]
    },
  })
}

// Rodadas de geração com modelo, tokens e custo, mais recentes primeiro
export function useLotes(limite = 200) {
  return useQuery({
    queryKey: ['fabrica', 'lotes', limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fabrica_lotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite)

      if (error) {
        throw error
      }

      // O banco devolve `numeric` como texto
      return (data as FabricaLote[]).map((lote) => ({
        ...lote,
        custo_usd: Number(lote.custo_usd),
        cotacao_dolar: Number(lote.cotacao_dolar),
        custo_brl: Number(lote.custo_brl),
      }))
    },
  })
}

export function useDiretrizes() {
  return useQuery({
    queryKey: ['fabrica', 'diretrizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fabrica_diretrizes')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      return data as FabricaDiretriz[]
    },
  })
}

export function useBaseConhecimento() {
  return useQuery({
    queryKey: ['fabrica', 'base-conhecimento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fabrica_base_conhecimento')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (error) {
        throw error
      }

      return data as FabricaBaseConhecimento | null
    },
  })
}

export function useSalvarBaseConhecimento() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, conteudo }: { id: string | null; conteudo: string }) => {
      const campos = { conteudo, updated_at: new Date().toISOString() }
      const { error } = id
        ? await supabase.from('fabrica_base_conhecimento').update(campos).eq('id', id)
        : await supabase.from('fabrica_base_conhecimento').insert(campos)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrica', 'base-conhecimento'] })
      toast.success('Base de conhecimento salva.')
    },
  })
}

// Cria ou edita um item de qualquer tabela da base (com `id` = edição)
export function useSalvarItemBase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tabela,
      id,
      campos,
    }: {
      tabela: TabelaBase
      id?: string
      campos: Record<string, unknown>
    }) => {
      const { error } = id
        ? await supabase.from(tabela).update(campos).eq('id', id)
        : await supabase.from(tabela).insert(campos)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrica'] })
      toast.success('Base atualizada.')
    },
  })
}

// Histórico de gerações, mais recentes primeiro
export function useGeracoes(limite = 60) {
  return useQuery({
    queryKey: ['fabrica', 'geracoes', limite],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fabrica_geracoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limite)

      if (error) {
        throw error
      }

      return data as FabricaGeracao[]
    },
  })
}

export interface PedidoGeracao {
  frente_id: string
  conceito_id: string | null
  narrativa_id: string | null
  formato_id: string
  persona: string | null
  modelo: string
  quantidade: number
  orientacao: string | null
}

// A função devolve `{ erro }` com uma mensagem pronta para mostrar
async function mensagemDeErro(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const corpo = await error.context.json()
      if (typeof corpo?.erro === 'string') return corpo.erro
    } catch {
      // resposta sem JSON: cai na mensagem padrão
    }
  }
  return 'Não foi possível gerar os criativos agora. Tente de novo.'
}

export function useGerarCriativos() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (pedido: PedidoGeracao): Promise<FabricaGeracao[]> => {
      const { data, error } = await supabase.functions.invoke('gerar-criativos', { body: pedido })

      if (error) {
        throw new Error(await mensagemDeErro(error))
      }

      return (data as { geracoes: FabricaGeracao[] }).geracoes
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrica', 'geracoes'] })
      queryClient.invalidateQueries({ queryKey: ['fabrica', 'lotes'] })
    },
  })
}

// Guarda a última escolha de layout, paleta e textos da arte feita na tela
export function useAtualizarGeracao() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...campos }: Partial<FabricaGeracao> & { id: string }) => {
      const { error } = await supabase.from('fabrica_geracoes').update(campos).eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fabrica', 'geracoes'] })
    },
  })
}

export interface NovoCriativoDaFabrica {
  geracaoId: string
  titulo: string
  frente_id: string
  formato: FabricaFormato['tipo']
  briefing: string
  texto_principal: string | null
  titulo_anuncio: string | null
  descricao_anuncio: string | null
  chamada_acao: string | null
}

// Cria o criativo (no backlog) a partir de uma variação e liga os dois.
// Para estático, a tela envia o PNG logo em seguida com useRegistrarEntrega,
// e o criativo vai para revisão pelo fluxo normal de Entregas.
export function useCriarCriativoDaFabrica() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ geracaoId, ...criativo }: NovoCriativoDaFabrica): Promise<string> => {
      const { data, error } = await supabase
        .from('criativos')
        .insert({ ...criativo, responsavel: null, link_inspiracao: null, data_prevista: null })
        .select('id')
        .single()

      if (error) {
        throw error
      }

      const { error: erroVinculo } = await supabase
        .from('fabrica_geracoes')
        .update({ criativo_id: data.id })
        .eq('id', geracaoId)

      if (erroVinculo) {
        throw erroVinculo
      }

      return data.id as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criativos'] })
      queryClient.invalidateQueries({ queryKey: ['fabrica', 'geracoes'] })
    },
  })
}
