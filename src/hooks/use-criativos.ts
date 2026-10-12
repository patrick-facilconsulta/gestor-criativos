import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getIntervaloPeriodo } from '@/lib/date-utils'
import type { PeriodoAtalho } from '@/lib/date-utils'
import { hojeISO } from '@/lib/date-utils'
import { normalizarLinkDrive } from '@/lib/drive-url'
import { supabase } from '@/lib/supabase'
import type { Criativo, Formato, StatusCriativo } from '@/types/database'

export const ITENS_POR_PAGINA = 50
export const BUCKET_ENTREGAS = 'entregas'

export interface FiltrosCriativos {
  busca: string
  frenteIds: string[]
  formato: Formato | 'todos'
  statusSelecionados: StatusCriativo[]
  periodo: PeriodoAtalho
}

interface UseCriativosOpcoes {
  pagina?: number
  filtros: FiltrosCriativos
}

interface ResultadoCriativos {
  criativos: Criativo[]
  total: number
}

export function useCriativos({ pagina = 0, filtros }: UseCriativosOpcoes) {
  return useQuery({
    queryKey: ['criativos', { pagina, filtros }],
    queryFn: async (): Promise<ResultadoCriativos> => {
      const inicio = pagina * ITENS_POR_PAGINA
      const fim = inicio + ITENS_POR_PAGINA - 1

      let query = supabase
        .from('criativos')
        .select('*', { count: 'exact' })
        .order('data_prevista', { ascending: true, nullsFirst: false })

      if (filtros.busca.trim() !== '') {
        query = query.ilike('titulo', `%${filtros.busca.trim()}%`)
      }

      if (filtros.frenteIds.length > 0) {
        query = query.in('frente_id', filtros.frenteIds)
      }

      if (filtros.formato !== 'todos') {
        query = query.eq('formato', filtros.formato)
      }

      // Se desmarcar todos os status, nenhuma linha deve aparecer.
      query = query.in('status', filtros.statusSelecionados.length > 0 ? filtros.statusSelecionados : ['__nenhum__'])

      // Regra combinada com o usuário: criativos sem data_entrega aparecem sempre,
      // independente do período — o período só restringe quem já tem data_entrega.
      const intervalo = getIntervaloPeriodo(filtros.periodo)
      if (intervalo) {
        query = query.or(
          `data_entrega.is.null,and(data_entrega.gte.${intervalo.inicio},data_entrega.lte.${intervalo.fim})`,
        )
      }

      const { data, error, count } = await query.range(inicio, fim)

      if (error) {
        throw error
      }

      return { criativos: data as Criativo[], total: count ?? 0 }
    },
  })
}

export function useCriativosParaEntrega() {
  return useQuery({
    queryKey: ['criativos', 'entregas'],
    queryFn: async (): Promise<Criativo[]> => {
      const { data, error } = await supabase
        .from('criativos')
        .select('*')
        .in('status', ['backlog', 'producao', 'reprovado', 'revisao', 'aprovado'])
        .order('data_prevista', { ascending: true, nullsFirst: false })

      if (error) {
        throw error
      }

      return data as Criativo[]
    },
  })
}

export interface NovoCriativo {
  titulo: string
  frente_id: string
  formato: Formato
  responsavel: string | null
  link_inspiracao: string | null
  data_prevista: string | null
  briefing: string | null
  texto_principal?: string | null
  titulo_anuncio?: string | null
  descricao_anuncio?: string | null
  chamada_acao?: string | null
  url_destino?: string | null
}

export function useCriarCriativo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (novoCriativo: NovoCriativo) => {
      const { error } = await supabase.from('criativos').insert(novoCriativo)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criativos'] })
      toast.success('Criativo criado.')
    },
  })
}

export interface CriativoEditado extends NovoCriativo {
  id: string
}

// Edita os dados do criativo, mas nunca o `status` — a mudança de status tem sua
// própria regra e vive em useAtualizarStatusCriativo.
export function useEditarCriativo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...campos }: CriativoEditado) => {
      const { error } = await supabase.from('criativos').update(campos).eq('id', id)

      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criativos'] })
      toast.success('Criativo salvo.')
    },
  })
}

type DadosEntrega = {
  id: string
  arquivoPathAnterior: string | null
  // Versão stories que estava no criativo (removida ao entregar de novo)
  arquivoStoriesPathAnterior?: string | null
} & (
  // `arquivoStories`: versão stories (9:16) do estático, quando houver
  | { tipo: 'arquivo'; arquivo: File; arquivoStories?: File }
  | { tipo: 'drive'; link: string }
)

async function enviarParaBucket(id: string, arquivo: File) {
  const nomeSeguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '-')
  const caminho = `${id}/${crypto.randomUUID()}-${nomeSeguro}`
  const { error } = await supabase.storage
    .from(BUCKET_ENTREGAS)
    .upload(caminho, arquivo, { contentType: arquivo.type || undefined })

  if (error) {
    throw error
  }

  return caminho
}

export function useRegistrarEntrega() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (entrega: DadosEntrega) => {
      const { id, arquivoPathAnterior, arquivoStoriesPathAnterior } = entrega
      const linkArquivo = entrega.tipo === 'drive' ? normalizarLinkDrive(entrega.link) : null

      if (entrega.tipo === 'drive' && !linkArquivo) {
        throw new Error('Link do Google Drive inválido.')
      }

      let arquivoPath: string | null = null
      let storiesPath: string | null = null
      if (entrega.tipo === 'arquivo') {
        arquivoPath = await enviarParaBucket(id, entrega.arquivo)
        if (entrega.arquivoStories) {
          try {
            storiesPath = await enviarParaBucket(id, entrega.arquivoStories)
          } catch (erro) {
            await supabase.storage.from(BUCKET_ENTREGAS).remove([arquivoPath])
            throw erro
          }
        }
      }

      const { error } = await supabase
        .from('criativos')
        .update({
          arquivo_path: arquivoPath,
          arquivo_nome: entrega.tipo === 'arquivo' ? entrega.arquivo.name : null,
          arquivo_tipo: entrega.tipo === 'arquivo' ? entrega.arquivo.type || null : null,
          arquivo_tamanho: entrega.tipo === 'arquivo' ? entrega.arquivo.size : null,
          // Toda entrega nova substitui também a versão stories
          arquivo_stories_path: storiesPath,
          arquivo_stories_nome: entrega.tipo === 'arquivo' ? entrega.arquivoStories?.name ?? null : null,
          link_arquivo: linkArquivo,
          data_entrega: hojeISO(),
          status: 'revisao',
        })
        .eq('id', id)

      if (error) {
        const enviados = [arquivoPath, storiesPath].filter((caminho): caminho is string => Boolean(caminho))
        if (enviados.length > 0) {
          await supabase.storage.from(BUCKET_ENTREGAS).remove(enviados)
        }
        throw error
      }

      const anteriores = [arquivoPathAnterior, arquivoStoriesPathAnterior].filter(
        (caminho): caminho is string => Boolean(caminho) && caminho !== arquivoPath && caminho !== storiesPath,
      )
      if (anteriores.length > 0) {
        await supabase.storage.from(BUCKET_ENTREGAS).remove(anteriores)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criativos'] })
      toast.success('Entrega enviada para revisão.')
    },
  })
}

export async function obterUrlArquivoEntrega(arquivoPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_ENTREGAS)
    .createSignedUrl(arquivoPath, 60 * 10)

  if (error) {
    throw error
  }

  return data.signedUrl
}

export async function abrirArquivoEntrega(arquivoPath: string): Promise<void> {
  const url = await obterUrlArquivoEntrega(arquivoPath)
  window.open(url, '_blank', 'noopener,noreferrer')
}

export interface NovoLoteCriativos {
  frente_id: string
  formato: Formato
  responsavel: string | null
  quantidade: number
  prefixo: string
}

export function useCriarCriativosEmLote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ frente_id, formato, responsavel, quantidade, prefixo }: NovoLoteCriativos) => {
      const linhas = Array.from({ length: quantidade }, (_, indice) => ({
        titulo: `${prefixo} ${indice + 1}`,
        frente_id,
        formato,
        responsavel,
      }))

      const { error } = await supabase.from('criativos').insert(linhas)

      if (error) {
        throw error
      }
    },
    onSuccess: (_dados, variaveis) => {
      queryClient.invalidateQueries({ queryKey: ['criativos'] })
      toast.success(`${variaveis.quantidade} criativos criados.`)
    },
  })
}

export function useExcluirCriativo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (criativo: Pick<Criativo, 'id' | 'arquivo_path' | 'arquivo_stories_path'>) => {
      const { error } = await supabase.from('criativos').delete().eq('id', criativo.id)

      if (error) {
        throw error
      }

      const arquivos = [criativo.arquivo_path, criativo.arquivo_stories_path].filter(
        (caminho): caminho is string => Boolean(caminho),
      )
      if (arquivos.length > 0) {
        await supabase.storage.from(BUCKET_ENTREGAS).remove(arquivos)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['criativos'] })
      toast.success('Criativo excluído.')
    },
  })
}
