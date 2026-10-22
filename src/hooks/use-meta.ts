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

// Páginas de destino mais usadas nos anúncios ativos da conta (sugestão ao
// lançar). Página usada por um anúncio só fica de fora: pode ser erro de digitação.
export function usePaginasDestino() {
  return useQuery({
    queryKey: ['meta', 'paginas-destino'],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('meta_anuncios')
        .select('url')
        .eq('status_efetivo', 'ACTIVE')
        .not('url', 'is', null)
      if (error) throw error
      const contagem = new Map<string, number>()
      for (const { url } of data ?? []) {
        const pagina = String(url).split('?')[0]
        contagem.set(pagina, (contagem.get(pagina) ?? 0) + 1)
      }
      return [...contagem.entries()]
        .filter(([, total]) => total >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([pagina]) => pagina)
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
  // Criativos sem URL de destino recebem esta antes de lançar (fica salva neles)
  url_destino_faltante?: { ids: string[]; url: string }
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
    mutationFn: async ({ url_destino_faltante, ...pedido }: PedidoLancamento): Promise<ResultadoLancamento> => {
      if (url_destino_faltante?.ids.length) {
        const { error: erroUrl } = await supabase
          .from('criativos')
          .update({ url_destino: url_destino_faltante.url })
          .in('id', url_destino_faltante.ids)
        if (erroUrl) throw new Error('Não foi possível salvar a URL de destino nos criativos.')
      }
      const { data, error } = await supabase.functions.invoke('lancar-no-meta', { body: { acao: 'lancar', ...pedido } })
      if (error) throw new Error(await mensagemDeErro(error, 'Não foi possível lançar no Meta agora. Nada foi ativado.'))
      return data as ResultadoLancamento
    },
    onSuccess: (resultado, pedido) => {
      if (!resultado.simulacao || pedido.url_destino_faltante?.ids.length) {
        queryClient.invalidateQueries({ queryKey: ['criativos'] })
      }
      if (!resultado.simulacao) queryClient.invalidateQueries({ queryKey: ['meta'] })
    },
  })
}

export function useSincronizarMeta() {
  const queryClient = useQueryClient()

  return useMutation({
    // A função trabalha em partes (limite de tempo do servidor): chama de novo
    // enquanto ela avisar que ficou parcial
    mutationFn: async (dias?: number) => {
      const total = { linhas: 0, anuncios: 0, publicados: 0 }
      for (let parte = 0; parte < 10; parte++) {
        const { data, error } = await supabase.functions.invoke('meta-sincronizar', { body: dias && parte === 0 ? { dias } : {} })
        if (error) throw new Error(await mensagemDeErro(error, 'Não foi possível atualizar os resultados do Meta agora.'))
        const resposta = data as { parcial: boolean; linhas: number; anuncios: number; publicados: number }
        total.linhas += resposta.linhas
        total.anuncios += resposta.anuncios
        total.publicados += resposta.publicados
        if (!resposta.parcial) break
      }
      return total
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta'] })
      queryClient.invalidateQueries({ queryKey: ['criativos'] })
    },
  })
}

export interface DesempenhoAnuncio extends MetaAnuncio {
  // Conceito escolhido à mão (só quando não veio do nome)
  frente_manual: string | null
  // Conceito que vale: o do nome ou, na falta dele, o manual
  conceito_id: string | null
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

      const soma = new Map<string, Omit<DesempenhoAnuncio, keyof MetaAnuncio | 'frente_manual' | 'conceito_id'>>()
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

      const { data: manuais, error: erroManuais } = await supabase.from('meta_conceito_manual').select('ad_id, frente_id')
      if (erroManuais) throw erroManuais
      const manual = new Map((manuais ?? []).map((m) => [m.ad_id as string, m.frente_id as string]))

      return anuncios.map((anuncio) => ({
        ...anuncio,
        ...soma.get(anuncio.ad_id)!,
        frente_manual: manual.get(anuncio.ad_id) ?? null,
        conceito_id: anuncio.frente_id ?? manual.get(anuncio.ad_id) ?? null,
      }))
    },
  })
}

// Conceito escolhido à mão para anúncio sem conceito no nome (frenteId null = limpar)
export function useDefinirConceitoManual() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ adId, frenteId }: { adId: string; frenteId: string | null }) => {
      if (!frenteId) {
        const { error } = await supabase.from('meta_conceito_manual').delete().eq('ad_id', adId)
        if (error) throw error
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('meta_conceito_manual')
        .upsert({ ad_id: adId, frente_id: frenteId, definido_por: user?.email ?? null, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meta', 'desempenho'] })
      toast.success('Conceito salvo.')
    },
    onError: () => toast.error('Não foi possível salvar o conceito.'),
  })
}

// Um anúncio com os números dos últimos 60 dias (para abrir a referência na Fábrica)
export function useAnuncioDesempenho(adId: string | null) {
  return useQuery({
    queryKey: ['meta', 'anuncio', adId],
    enabled: Boolean(adId),
    queryFn: async (): Promise<DesempenhoAnuncio | null> => {
      const desde = new Date(Date.now() - 59 * 86_400_000).toISOString().slice(0, 10)
      const [anuncio, linhas, manual] = await Promise.all([
        supabase.from('meta_anuncios').select('*').eq('ad_id', adId!).maybeSingle(),
        supabase.from('meta_resultados_diarios').select('gasto, impressoes, cliques_link, visitas_lp, resultados').eq('ad_id', adId!).gte('data', desde),
        supabase.from('meta_conceito_manual').select('frente_id').eq('ad_id', adId!).maybeSingle(),
      ])
      if (anuncio.error) throw anuncio.error
      if (!anuncio.data) return null
      const soma = { gasto: 0, impressoes: 0, cliques_link: 0, visitas_lp: 0, resultados: 0 }
      for (const l of linhas.data ?? []) {
        for (const campo of Object.keys(soma) as (keyof typeof soma)[]) soma[campo] += Number(l[campo])
      }
      const a = anuncio.data as MetaAnuncio
      const frenteManual = (manual.data?.frente_id as string | undefined) ?? null
      return { ...a, ...soma, frente_manual: frenteManual, conceito_id: a.frente_id ?? frenteManual }
    },
  })
}

// Miniaturas e nomes de alguns anúncios (painel de aprendizado da Fábrica)
export function useAnunciosResumo(adIds: string[]) {
  return useQuery({
    queryKey: ['meta', 'anuncios-resumo', adIds],
    enabled: adIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meta_anuncios')
        .select('ad_id, nome, imagem_url, thumbnail_url, tipo_midia')
        .in('ad_id', adIds)
      if (error) throw error
      return new Map((data ?? []).map((a) => [a.ad_id as string, a as Pick<MetaAnuncio, 'ad_id' | 'nome' | 'imagem_url' | 'thumbnail_url' | 'tipo_midia'>]))
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

// ---------------------------------------------------------------------------
// Leitura visual dos criativos estáticos (vídeo nunca é lido: trava no servidor)
// ---------------------------------------------------------------------------

export function usePendentesLeitura() {
  return useQuery({
    queryKey: ['meta', 'leitura', 'pendentes'],
    staleTime: 60_000,
    queryFn: async (): Promise<{ pendentes: { ad_id: string; nome: string }[]; custo_estimado_brl: number }> => {
      const { data, error } = await supabase.functions.invoke('ler-criativos', { body: { acao: 'pendentes' } })
      if (error) throw new Error(await mensagemDeErro(error, 'Não foi possível ver os criativos sem leitura.'))
      return data as { pendentes: { ad_id: string; nome: string }[]; custo_estimado_brl: number }
    },
  })
}

// Lê os criativos um a um (cada chamada cabe no tempo da função)
export function useLerCriativos(onProgresso?: (feitos: number, total: number) => void) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (adIds: string[]) => {
      const erros: string[] = []
      for (const [indice, adId] of adIds.entries()) {
        onProgresso?.(indice, adIds.length)
        const { error } = await supabase.functions.invoke('ler-criativos', { body: { acao: 'ler', ad_id: adId } })
        if (error) erros.push(await mensagemDeErro(error, 'Não foi possível ler um criativo.'))
        queryClient.invalidateQueries({ queryKey: ['meta', 'leitura', adId] })
      }
      onProgresso?.(adIds.length, adIds.length)
      return { lidos: adIds.length - erros.length, erros }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['meta', 'leitura'] }),
  })
}

export interface LeituraDoAnuncio {
  leitura: Record<string, unknown> | null
  correcao: Record<string, unknown> | null
  lida_em: string | null
}

export function useLeituraAnuncio(adId: string | null) {
  return useQuery({
    queryKey: ['meta', 'leitura', adId],
    enabled: Boolean(adId),
    queryFn: async (): Promise<LeituraDoAnuncio> => {
      const [leitura, correcao] = await Promise.all([
        supabase.from('meta_leituras_visuais').select('leitura, created_at').eq('ad_id', adId!).eq('modelo', 'claude-opus-5-5').maybeSingle(),
        supabase.from('meta_leitura_correcoes').select('campos').eq('ad_id', adId!).maybeSingle(),
      ])
      if (leitura.error) throw leitura.error
      if (correcao.error) throw correcao.error
      return {
        leitura: (leitura.data?.leitura as Record<string, unknown> | null) ?? null,
        correcao: (correcao.data?.campos as Record<string, unknown> | null) ?? null,
        lida_em: (leitura.data?.created_at as string | undefined) ?? null,
      }
    },
  })
}

// Guarda só os campos que a equipe mudou em relação à leitura da IA
export function useSalvarCorrecaoLeitura() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ adId, campos }: { adId: string; campos: Record<string, unknown> }) => {
      if (Object.keys(campos).length === 0) {
        const { error } = await supabase.from('meta_leitura_correcoes').delete().eq('ad_id', adId)
        if (error) throw error
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('meta_leitura_correcoes')
        .upsert({ ad_id: adId, campos, corrigido_por: user?.email ?? null, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: (_resultado, { adId }) => {
      queryClient.invalidateQueries({ queryKey: ['meta', 'leitura', adId] })
      toast.success('Leitura corrigida.')
    },
    onError: () => toast.error('Não foi possível salvar a correção.'),
  })
}
