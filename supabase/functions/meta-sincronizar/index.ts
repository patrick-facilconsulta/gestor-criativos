import { createClient } from 'npm:@supabase/supabase-js@2'
import { contaConfigurada, ErroMeta, metaLer, metaLerTudo } from '../_shared/meta.ts'

// Lê do Meta (SÓ LEITURA) os resultados diários de todos os anúncios da conta e
// os textos de cada anúncio. Grava em meta_resultados_diarios e meta_anuncios,
// usados na página /desempenho e no aprendizado da IA da Fábrica.
// Também marca como publicado o criativo da Fábrica que teve a primeira impressão.
//
// Trabalha em partes: a função tem tempo máximo de execução, e 90 dias da conta
// inteira não cabem numa chamada só. Cada parte é gravada na hora; se o tempo
// acabar, devolve `parcial: true` e a tela chama de novo, continuando de onde parou.

const DIAS_PRIMEIRA_VEZ = 90
// O Meta revisa números dos últimos dias; cada sincronização relê esta janela
const DIAS_RELEITURA = 7
const JANELA_DIAS = 15
// Margem antes do limite de tempo da Edge Function
const TEMPO_MAXIMO_MS = 90_000
// Dados de cada anúncio (textos, status, miniatura) são relidos depois deste prazo
const HORAS_DADOS_ANUNCIO = 20

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function responder(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface Acao {
  action_type: string
  value: string
}

interface LinhaInsight {
  ad_id: string
  ad_name: string
  adset_id: string
  adset_name: string
  campaign_id: string
  campaign_name: string
  objective?: string
  date_start: string
  spend?: string
  impressions?: string
  reach?: string
  actions?: Acao[]
  // Resultado pelo qual a campanha otimiza (ex.: indicator com "cadastro_lp_profissional")
  results?: { indicator?: string; values?: { value?: string }[] }[]
}

interface AnuncioMeta {
  id: string
  name: string
  effective_status?: string
  created_time?: string
  adset?: { id: string; name?: string; destination_type?: string }
  campaign?: { id: string; name?: string; objective?: string }
  creative?: {
    id?: string
    object_type?: string
    video_id?: string
    body?: string
    title?: string
    thumbnail_url?: string
    image_url?: string
    image_hash?: string
    link_url?: string
    object_story_spec?: {
      link_data?: { message?: string; name?: string; description?: string; link?: string; picture?: string; image_hash?: string }
      video_data?: {
        video_id?: string
        message?: string
        title?: string
        link_description?: string
        image_url?: string
        call_to_action?: { value?: { link?: string } }
      }
    }
    asset_feed_spec?: {
      images?: { url?: string; hash?: string; adlabels?: { name?: string }[] }[]
      videos?: { thumbnail_url?: string; video_id?: string }[]
      ad_formats?: string[]
      bodies?: { text?: string }[]
      titles?: { text?: string }[]
      descriptions?: { text?: string }[]
      link_urls?: { website_url?: string }[]
    }
  }
}

function hojeEm(fuso = 'America/Sao_Paulo') {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuso }).format(new Date())
}

function somarDias(dataISO: string, dias: number) {
  const data = new Date(`${dataISO}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

function valorAcao(acoes: Acao[] | undefined, tipo: string) {
  return Number(acoes?.find((a) => a.action_type === tipo)?.value ?? 0)
}

// "PARTICULAR_AGENDA_06" → "PARTICULAR AGENDA 06" (sem acento, em caixa alta)
function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

// Imagem original do criativo, quando o Meta informa (anúncio de imagem simples;
// para vídeo, a capa). Criativo com imagem por posicionamento não informa: aí
// vale a miniatura grande (ver TAMANHO_MINIATURA)
function imagemOriginal(criativo: AnuncioMeta['creative']) {
  return (
    criativo?.image_url ||
    criativo?.object_story_spec?.link_data?.picture ||
    criativo?.object_story_spec?.video_data?.image_url ||
    criativo?.asset_feed_spec?.images?.find((i) => i.url)?.url ||
    null
  )
}

// Códigos (hash) das imagens do criativo na biblioteca da conta. Com imagem por
// posicionamento, o quadrado vem antes do stories.
function hashesDoCriativo(criativo: AnuncioMeta['creative']) {
  const hashes = [criativo?.image_hash, criativo?.object_story_spec?.link_data?.image_hash]
  const doFeed = [...(criativo?.asset_feed_spec?.images ?? [])].sort((a, b) => {
    const stories = (i: typeof a) => (i.adlabels ?? []).some((l) => /stor|9x16|9_16|vertical/i.test(l.name ?? '')) ? 1 : 0
    return stories(a) - stories(b)
  })
  hashes.push(...doFeed.map((i) => i.hash))
  return [...new Set(hashes.filter(Boolean) as string[])]
}

// Tipo de mídia pelo que o Meta informa no criativo. Vídeo nunca recebe
// leitura visual (trava em ler-criativos)
function tipoMidia(criativo: AnuncioMeta['creative']): 'imagem' | 'video' | 'outro' {
  if (!criativo) return 'outro'
  const feed = criativo.asset_feed_spec
  if (
    criativo.object_type === 'VIDEO' ||
    criativo.video_id ||
    criativo.object_story_spec?.video_data ||
    (feed?.videos?.length ?? 0) > 0 ||
    (feed?.ad_formats ?? []).some((f) => f.includes('VIDEO'))
  ) {
    return 'video'
  }
  if (hashesDoCriativo(criativo).length > 0 || imagemOriginal(criativo)) return 'imagem'
  return 'outro'
}

// A miniatura padrão do Meta tem 64 px; pedida assim (criativo a criativo) vem maior
const TAMANHO_MINIATURA = 1080

function textosDoCriativo(criativo: AnuncioMeta['creative']) {
  const link = criativo?.object_story_spec?.link_data
  const video = criativo?.object_story_spec?.video_data
  const feed = criativo?.asset_feed_spec
  return {
    texto_principal: criativo?.body || link?.message || video?.message || feed?.bodies?.[0]?.text || null,
    titulo: criativo?.title || link?.name || video?.title || feed?.titles?.[0]?.text || null,
    descricao: link?.description || video?.link_description || feed?.descriptions?.[0]?.text || null,
    url: link?.link || video?.call_to_action?.value?.link || feed?.link_urls?.[0]?.website_url || criativo?.link_url || null,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (request.method !== 'POST') {
    return responder({ erro: 'Método não permitido.' }, 405)
  }

  const authorization = request.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authorization) {
    return responder({ erro: 'Usuário não autenticado.' }, 401)
  }
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return responder({ erro: 'Função não configurada. Falta a configuração do Supabase.' }, 500)
  }

  const supabaseUsuario = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: { user } } = await supabaseUsuario.auth.getUser()
  if (!user) {
    return responder({ erro: 'Usuário não autenticado.' }, 401)
  }

  // As tabelas de leitura do Meta só aceitam escrita do servidor
  const supabase = createClient(supabaseUrl, serviceKey)

  let entrada: { dias?: number } = {}
  try {
    entrada = await request.json()
  } catch {
    // corpo vazio: usa o padrão
  }

  try {
    const conta = contaConfigurada()
    const inicioExecucao = Date.now()
    const tempoAcabando = () => Date.now() - inicioExecucao > TEMPO_MAXIMO_MS
    let parcial = false

    const { data: config } = await supabase.from('meta_configuracao').select('*').eq('id', 1).single()
    const evento: string = config?.evento_resultado ?? 'offsite_conversion.fb_pixel_custom.cadastro_lp_profissional'
    // Evento personalizado do pixel: nas "ações" o Meta soma todos sob este nome geral
    const eventoGeral = evento.startsWith('offsite_conversion.fb_pixel_custom.') ? 'offsite_conversion.fb_pixel_custom' : evento

    // Cadastros da linha: o "resultado" da campanha quando ela otimiza o evento;
    // senão, o total de eventos personalizados do pixel (aproximação)
    const cadastros = (l: LinhaInsight) => {
      const doResultado = l.results?.find((r) => r.indicator?.includes(evento.replace('offsite_conversion.', '')))
      if (doResultado) return Number(doResultado.values?.[0]?.value ?? 0)
      return valorAcao(l.actions, evento) || valorAcao(l.actions, eventoGeral)
    }

    // Período: o pedido da tela; ou, se já há dados, os últimos 7 dias a partir do
    // último dia gravado (assim uma 1ª leitura interrompida continua de onde parou)
    const ate = hojeEm()
    const { data: ultimoDia } = await supabase.from('meta_resultados_diarios').select('data').order('data', { ascending: false }).limit(1).maybeSingle()
    const desde = Number(entrada.dias) > 0
      ? somarDias(ate, -(Math.min(Number(entrada.dias), DIAS_PRIMEIRA_VEZ) - 1))
      : ultimoDia
        ? [somarDias(ultimoDia.data as string, -(DIAS_RELEITURA - 1)), somarDias(ate, -(DIAS_RELEITURA - 1))].sort()[0]
        : somarDias(ate, -(DIAS_PRIMEIRA_VEZ - 1))

    // 1. Resultados diários por anúncio, janela por janela, gravando cada uma
    let campoResultados = true
    const anunciosComGasto = new Set<string>()
    const conjuntosFormulario = new Set<string>()
    let linhasGravadas = 0
    for (let inicio = desde; inicio <= ate; inicio = somarDias(inicio, JANELA_DIAS)) {
      if (tempoAcabando()) {
        parcial = true
        break
      }
      const fim = [somarDias(inicio, JANELA_DIAS - 1), ate].sort()[0]
      const parametros = (comResultados: boolean) => ({
        level: 'ad',
        time_increment: 1,
        time_range: { since: inicio, until: fim },
        fields: `ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,objective,spend,impressions,reach,actions${comResultados ? ',results' : ''}`,
        filtering: [{ field: 'spend', operator: 'GREATER_THAN', value: 0 }],
        limit: 500,
      })
      let linhas: LinhaInsight[]
      try {
        linhas = await metaLerTudo<LinhaInsight>(`${conta}/insights`, parametros(campoResultados))
      } catch (erro) {
        // Versão da API sem o campo "results": segue só com as ações
        if (!campoResultados) throw erro
        campoResultados = false
        linhas = await metaLerTudo<LinhaInsight>(`${conta}/insights`, parametros(false))
      }

      const resultados = linhas.map((l) => {
        anunciosComGasto.add(l.ad_id)
        if ((l.actions ?? []).some((a) => a.action_type.includes('meta_leads') || a.action_type === 'onsite_conversion.lead_grouped')) {
          conjuntosFormulario.add(l.adset_id)
        }
        return {
          ad_id: l.ad_id,
          data: l.date_start,
          gasto: Number(l.spend ?? 0),
          impressoes: Number(l.impressions ?? 0),
          alcance: Number(l.reach ?? 0),
          cliques_link: valorAcao(l.actions, 'link_click'),
          visitas_lp: valorAcao(l.actions, 'landing_page_view'),
          resultados: cadastros(l),
          acoes: l.actions ?? null,
        }
      })
      for (let i = 0; i < resultados.length; i += 500) {
        const { error } = await supabase.from('meta_resultados_diarios').upsert(resultados.slice(i, i + 500))
        if (error) throw new ErroMeta(`Não foi possível gravar os resultados: ${error.message}`, 500)
      }
      linhasGravadas += resultados.length
    }

    // 2. Dados de cada anúncio: os que ainda não temos, os da Fábrica e os com
    //    resultado no período cujos dados passaram do prazo
    const { data: objetosFabrica } = await supabase.from('meta_objetos').select('meta_id, criativo_id').eq('tipo', 'ad')
    const criativoPorAnuncio = new Map((objetosFabrica ?? []).map((o) => [o.meta_id as string, o.criativo_id as string | null]))
    const { data: conhecidos } = await supabase.from('meta_anuncios').select('ad_id, atualizado_em')
    const atualizadoEm = new Map((conhecidos ?? []).map((a) => [a.ad_id as string, new Date(a.atualizado_em as string).getTime()]))
    // Inclui anúncios gravados numa leitura anterior que foi interrompida
    const comResultado = new Set<string>(anunciosComGasto)
    for (let pagina = 0; pagina < 50; pagina++) {
      const { data } = await supabase
        .from('meta_resultados_diarios')
        .select('ad_id')
        .gte('data', somarDias(ate, -(DIAS_PRIMEIRA_VEZ - 1)))
        .range(pagina * 1000, pagina * 1000 + 999)
      for (const l of data ?? []) comResultado.add(l.ad_id as string)
      if (!data || data.length < 1000) break
    }
    const prazo = Date.now() - HORAS_DADOS_ANUNCIO * 3_600_000
    const idsAnuncios = [...new Set([...comResultado, ...criativoPorAnuncio.keys()])]
      .filter((id) => criativoPorAnuncio.has(id) || (atualizadoEm.get(id) ?? 0) < prazo)
      // Os que nunca foram lidos primeiro
      .sort((a, b) => (atualizadoEm.get(a) ?? 0) - (atualizadoEm.get(b) ?? 0))

    const [{ data: prefixos }, { data: criativos }] = await Promise.all([
      supabase.from('meta_prefixos_conceito').select('termo, frente_id'),
      supabase.from('criativos').select('id, frente_id, status').in('id', [...criativoPorAnuncio.values()].filter(Boolean) as string[]),
    ])
    const termos = (prefixos ?? []).map((p) => ({ termo: normalizar(p.termo as string), frente_id: p.frente_id as string }))
    const criativoPorId = new Map((criativos ?? []).map((c) => [c.id as string, c]))

    function conceitoPeloNome(...nomes: (string | undefined)[]) {
      for (const nome of nomes) {
        if (!nome) continue
        const palavras = ` ${normalizar(nome)} `
        const achado = termos.find((t) => palavras.includes(` ${t.termo} `) || palavras.includes(` ${t.termo}`))
        if (achado) return achado.frente_id
      }
      return null
    }

    const camposAnuncio =
      'id,name,effective_status,created_time,adset{id,name,destination_type},campaign{id,name,objective},creative{id,object_type,video_id,body,title,thumbnail_url,image_url,image_hash,link_url,object_story_spec,asset_feed_spec}'

    // Imagens originais pela biblioteca de imagens da conta (só leitura)
    async function imagensPorHash(hashes: string[]): Promise<Map<string, { url: string; largura: number; altura: number }>> {
      const mapa = new Map<string, { url: string; largura: number; altura: number }>()
      for (let i = 0; i < hashes.length; i += 50) {
        try {
          const lidas = await metaLerTudo<{ hash: string; url?: string; permalink_url?: string; width?: number; height?: number }>(
            `${conta}/adimages`,
            { hashes: hashes.slice(i, i + 50), fields: 'hash,url,permalink_url,width,height', limit: 100 },
            3,
          )
          for (const img of lidas) {
            const url = img.url || img.permalink_url
            if (url) mapa.set(img.hash, { url, largura: img.width ?? 0, altura: img.height ?? 0 })
          }
        } catch (erro) {
          console.error('Biblioteca de imagens', erro)
        }
      }
      return mapa
    }

    // Miniatura grande, lida criativo a criativo (o tamanho não vale na leitura em lote)
    async function miniaturaGrande(criativoId: string): Promise<string | null> {
      try {
        const lido = await metaLer<{ thumbnail_url?: string }>(criativoId, {
          fields: 'thumbnail_url',
          thumbnail_width: TAMANHO_MINIATURA,
          thumbnail_height: TAMANHO_MINIATURA,
        })
        return lido.thumbnail_url ?? null
      } catch {
        return null
      }
    }

    // Melhor imagem de cada anúncio: original da biblioteca > original informada
    // no criativo > miniatura grande > miniatura pequena
    // `pequena`: ficou só com a miniatura de 64 px; o anúncio é relido na próxima atualização
    async function imagensDoLote(lote: AnuncioMeta[]): Promise<Map<string, { url: string | null; pequena: boolean }>> {
      const porHash = await imagensPorHash([...new Set(lote.flatMap((a) => hashesDoCriativo(a.creative)))])
      const resultado = new Map<string, { url: string | null; pequena: boolean }>()
      for (const a of lote) {
        const daBiblioteca = hashesDoCriativo(a.creative).map((h) => porHash.get(h)).find(Boolean)
        let url = daBiblioteca?.url || imagemOriginal(a.creative)
        if (!url && a.creative?.id && !tempoAcabando()) url = await miniaturaGrande(a.creative.id)
        resultado.set(a.id, { url: url || a.creative?.thumbnail_url || null, pequena: !url })
      }
      return resultado
    }

    async function lerLote(ids: string[]): Promise<AnuncioMeta[]> {
      try {
        return Object.values(await metaLer<Record<string, AnuncioMeta>>('', { ids: ids.join(','), fields: camposAnuncio }))
      } catch {
        // Um anúncio excluído derruba o lote: lê um a um e pula o que falhar
        const lidos: AnuncioMeta[] = []
        for (const id of ids) {
          try {
            lidos.push(await metaLer<AnuncioMeta>(id, { fields: camposAnuncio }))
          } catch {
            // inacessível: fica só com os números
          }
        }
        return lidos
      }
    }

    const anuncios: AnuncioMeta[] = []
    for (let i = 0; i < idsAnuncios.length; i += 25) {
      if (tempoAcabando()) {
        parcial = true
        break
      }
      const lote = await lerLote(idsAnuncios.slice(i, i + 25))
      const imagens = await imagensDoLote(lote)
      anuncios.push(...lote)
      const registros = lote.map((a) => {
        const criativoId = criativoPorAnuncio.get(a.id) ?? null
        const criativo = criativoId ? criativoPorId.get(criativoId) : undefined
        return {
          ad_id: a.id,
          nome: a.name,
          conjunto_id: a.adset?.id ?? null,
          conjunto_nome: a.adset?.name ?? null,
          campanha_id: a.campaign?.id ?? null,
          campanha_nome: a.campaign?.name ?? null,
          objetivo: a.campaign?.objective ?? null,
          status_efetivo: a.effective_status ?? null,
          criado_em_meta: a.created_time ?? null,
          ...textosDoCriativo(a.creative),
          thumbnail_url: a.creative?.thumbnail_url ?? null,
          imagem_url: imagens.get(a.id)?.url ?? null,
          tipo_midia: tipoMidia(a.creative),
          frente_id: (criativo?.frente_id as string | undefined) ?? conceitoPeloNome(a.name, a.adset?.name),
          criativo_id: criativo ? criativoId : null,
          origem: criativoPorAnuncio.has(a.id) ? 'fabrica' : 'conta',
          formulario_instantaneo: a.adset?.destination_type === 'ON_AD' || conjuntosFormulario.has(a.adset?.id ?? ''),
          // Sem imagem grande: data antiga, para tentar de novo na próxima atualização
          atualizado_em: imagens.get(a.id)?.pequena ? '2000-01-01T00:00:00Z' : new Date().toISOString(),
        }
      })
      if (registros.length) {
        const { error } = await supabase.from('meta_anuncios').upsert(registros)
        if (error) throw new ErroMeta(`Não foi possível gravar os anúncios: ${error.message}`, 500)
      }
    }

    // 3. Criativos da Fábrica: status no Meta e, na primeira impressão, "publicado"
    let publicados = 0
    for (const anuncio of anuncios) {
      const criativoId = criativoPorAnuncio.get(anuncio.id)
      const criativo = criativoId ? criativoPorId.get(criativoId) : undefined
      if (!criativo) continue

      const atualizacao: Record<string, unknown> = { meta_status: anuncio.effective_status ?? null }
      if (criativo.status === 'aprovado') {
        const { data: primeiro } = await supabase
          .from('meta_resultados_diarios')
          .select('data')
          .eq('ad_id', anuncio.id)
          .gt('impressoes', 0)
          .order('data')
          .limit(1)
          .maybeSingle()
        if (primeiro) {
          Object.assign(atualizacao, { status: 'publicado', campanha: anuncio.campaign?.name ?? null, data_publicacao: primeiro.data })
          publicados++
        }
      }
      await supabase.from('criativos').update(atualizacao).eq('id', criativo.id)
    }

    if (!parcial) {
      await supabase.from('meta_configuracao').update({ ultima_sincronizacao: new Date().toISOString() }).eq('id', 1)
    }

    return responder({ parcial, desde, linhas: linhasGravadas, anuncios: anuncios.length, publicados }, 200)
  } catch (erro) {
    if (erro instanceof ErroMeta) {
      console.error('Meta', erro.message, erro.detalhe)
      return responder({ erro: erro.message }, erro.status)
    }
    console.error('Erro na sincronização', erro)
    return responder({ erro: 'Não foi possível atualizar os resultados agora. Tente de novo.' }, 500)
  }
})
