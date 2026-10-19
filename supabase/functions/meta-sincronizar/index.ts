import { createClient } from 'npm:@supabase/supabase-js@2'
import { contaConfigurada, ErroMeta, metaLer, metaLerTudo } from '../_shared/meta.ts'

// Lê do Meta (SÓ LEITURA) os resultados diários de todos os anúncios da conta e
// os textos de cada anúncio. Grava em meta_resultados_diarios e meta_anuncios,
// usados na página /desempenho e no aprendizado da IA da Fábrica.
// Também marca como publicado o criativo da Fábrica que teve a primeira impressão.

const DIAS_PRIMEIRA_VEZ = 90
// O Meta revisa números dos últimos dias; cada sincronização relê esta janela
const DIAS_RELEITURA = 7
const JANELA_DIAS = 15

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
}

interface AnuncioMeta {
  id: string
  name: string
  effective_status?: string
  created_time?: string
  adset?: { id: string; name?: string; destination_type?: string }
  campaign?: { id: string; name?: string; objective?: string }
  creative?: {
    body?: string
    title?: string
    thumbnail_url?: string
    link_url?: string
    object_story_spec?: {
      link_data?: { message?: string; name?: string; description?: string; link?: string }
      video_data?: { message?: string; title?: string; link_description?: string; call_to_action?: { value?: { link?: string } } }
    }
    asset_feed_spec?: {
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
    const { data: config } = await supabase.from('meta_configuracao').select('*').eq('id', 1).single()
    const evento = config?.evento_resultado ?? 'offsite_conversion.fb_pixel_custom.cadastro_lp_profissional'

    const dias = Math.min(Math.max(Number(entrada.dias) || (config?.ultima_sincronizacao ? DIAS_RELEITURA : DIAS_PRIMEIRA_VEZ), 1), DIAS_PRIMEIRA_VEZ)
    const ate = hojeEm()
    const desde = somarDias(ate, -(dias - 1))

    // 1. Resultados diários por anúncio, em janelas para não estourar o tempo
    const linhas: LinhaInsight[] = []
    for (let inicio = desde; inicio <= ate; inicio = somarDias(inicio, JANELA_DIAS)) {
      const fim = [somarDias(inicio, JANELA_DIAS - 1), ate].sort()[0]
      linhas.push(
        ...(await metaLerTudo<LinhaInsight>(`${conta}/insights`, {
          level: 'ad',
          time_increment: 1,
          time_range: { since: inicio, until: fim },
          fields: 'ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,objective,spend,impressions,reach,actions',
          filtering: [{ field: 'spend', operator: 'GREATER_THAN', value: 0 }],
          limit: 500,
        })),
      )
    }

    const resultados = linhas.map((l) => ({
      ad_id: l.ad_id,
      data: l.date_start,
      gasto: Number(l.spend ?? 0),
      impressoes: Number(l.impressions ?? 0),
      alcance: Number(l.reach ?? 0),
      cliques_link: valorAcao(l.actions, 'link_click'),
      visitas_lp: valorAcao(l.actions, 'landing_page_view'),
      resultados: valorAcao(l.actions, evento),
      acoes: l.actions ?? null,
    }))
    for (let i = 0; i < resultados.length; i += 500) {
      const { error } = await supabase.from('meta_resultados_diarios').upsert(resultados.slice(i, i + 500))
      if (error) throw new ErroMeta(`Não foi possível gravar os resultados: ${error.message}`, 500)
    }

    // 2. Dados de cada anúncio (os que gastaram + os criados pela Fábrica)
    const { data: objetosFabrica } = await supabase.from('meta_objetos').select('meta_id, criativo_id').eq('tipo', 'ad')
    const criativoPorAnuncio = new Map((objetosFabrica ?? []).map((o) => [o.meta_id as string, o.criativo_id as string | null]))
    const idsAnuncios = [...new Set([...linhas.map((l) => l.ad_id), ...criativoPorAnuncio.keys()])]

    const camposAnuncio =
      'id,name,effective_status,created_time,adset{id,name,destination_type},campaign{id,name,objective},creative{body,title,thumbnail_url,link_url,object_story_spec,asset_feed_spec}'
    const anuncios: AnuncioMeta[] = []
    for (let i = 0; i < idsAnuncios.length; i += 50) {
      const ids = idsAnuncios.slice(i, i + 50)
      try {
        const lote = await metaLer<Record<string, AnuncioMeta>>('', { ids: ids.join(','), fields: camposAnuncio })
        anuncios.push(...Object.values(lote))
      } catch {
        // Um anúncio excluído derruba o lote inteiro: lê um a um e pula o que falhar
        for (const id of ids) {
          try {
            anuncios.push(await metaLer<AnuncioMeta>(id, { fields: camposAnuncio }))
          } catch {
            // anúncio inacessível: fica só com os números do insights
          }
        }
      }
    }

    // Conceito: pelo criativo da Fábrica ou pelos termos no nome (meta_prefixos_conceito)
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

    const formularioPorConjunto = new Set(
      linhas.filter((l) => (l.actions ?? []).some((a) => a.action_type.includes('meta_leads'))).map((l) => l.adset_id),
    )

    const registros = anuncios.map((a) => {
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
        frente_id: (criativo?.frente_id as string | undefined) ?? conceitoPeloNome(a.name, a.adset?.name),
        criativo_id: criativo ? criativoId : null,
        origem: criativoPorAnuncio.has(a.id) ? 'fabrica' : 'conta',
        formulario_instantaneo: a.adset?.destination_type === 'ON_AD' || formularioPorConjunto.has(a.adset?.id ?? ''),
        atualizado_em: new Date().toISOString(),
      }
    })
    for (let i = 0; i < registros.length; i += 500) {
      const { error } = await supabase.from('meta_anuncios').upsert(registros.slice(i, i + 500))
      if (error) throw new ErroMeta(`Não foi possível gravar os anúncios: ${error.message}`, 500)
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

    await supabase.from('meta_configuracao').update({ ultima_sincronizacao: new Date().toISOString() }).eq('id', 1)

    return responder({ dias, linhas: resultados.length, anuncios: registros.length, publicados }, 200)
  } catch (erro) {
    if (erro instanceof ErroMeta) {
      console.error('Meta', erro.message, erro.detalhe)
      return responder({ erro: erro.message }, erro.status)
    }
    console.error('Erro na sincronização', erro)
    return responder({ erro: 'Não foi possível atualizar os resultados agora. Tente de novo.' }, 500)
  }
})
