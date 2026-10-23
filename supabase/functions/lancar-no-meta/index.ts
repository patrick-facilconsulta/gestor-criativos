import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  contaConfigurada,
  CRIACOES,
  ErroMeta,
  metaCriar,
  metaLer,
  metaLerTudo,
  TETO_FIXO_CAMPANHA,
  TETO_FIXO_ORCAMENTO_DIARIO,
  type CaminhoCriacao,
} from '../_shared/meta.ts'

// Lança criativos aprovados no Meta, SEMPRE PAUSADOS, dentro da campanha
// própria da Fábrica ("[FÁBRICA] Testes"). Cada lançamento é um conjunto NOVO,
// com público, evento e otimização copiados (só leitura) de um conjunto escolhido.
// Nada que já existe no Meta é alterado: ver as travas em _shared/meta.ts.
// A equipe revisa e ativa no Gerenciador de Anúncios.
//
// Ações:
// - listar_conjuntos: conjuntos ativos de campanhas de cadastro (só leitura)
// - lancar: cria tudo; com simular=true só devolve o que seria enviado
//
// O Meta leva de 5 a 45 s por criativo, e a função tem 150 s de limite. Por
// isso o lançamento anda em partes: cada chamada faz o que couber no tempo e
// devolve { pendente: true, lancamento_id }; a tela chama de novo com o
// lancamento_id até terminar. O que já foi criado (meta_objetos) não é refeito.

const NOME_CAMPANHA = '[FÁBRICA] Testes'
const ORCAMENTO_MINIMO = 6
const MAX_CRIATIVOS = 6
const BUCKET_ENTREGAS = 'entregas'
// Só começa um passo novo até aqui; o resto fica para a próxima chamada
const TEMPO_POR_CHAMADA_MS = 60_000

// Botões do Meta oferecidos na tela
const BOTOES_META = ['LEARN_MORE', 'SIGN_UP', 'APPLY_NOW', 'CONTACT_US', 'GET_QUOTE', 'SUBSCRIBE']

// Melhorias automáticas do Advantage+ que alteram texto ou imagem: desligadas,
// porque o anúncio de saúde precisa sair exatamente como foi aprovado
const MELHORIAS_DESLIGADAS = [
  'adapt_to_placement',
  'add_text_overlay',
  'creative_stickers',
  'description_automation',
  'enhance_cta',
  'image_animation',
  'image_background_gen',
  'image_brightness_and_contrast',
  'image_templates',
  'image_text_translation',
  'image_touchups',
  'image_uncrop',
  'inline_comment',
  'media_type_automation',
  'reveal_details_over_time',
  'text_optimizations',
  'text_translation',
]

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

interface Entrada {
  acao?: 'listar_conjuntos' | 'lancar'
  criativo_ids?: string[]
  conjunto_publico_id?: string
  orcamento_diario?: number
  nome_teste?: string
  botao?: string
  simular?: boolean
  // Continuação de um lançamento em partes
  lancamento_id?: string
}

interface ObjetoFeito {
  meta_id: string
  tipo: string
  nome: string | null
  pai_meta_id: string | null
  criativo_id: string | null
}

interface ConjuntoOrigem {
  id: string
  name: string
  account_id?: string
  optimization_goal?: string
  billing_event?: string
  promoted_object?: Record<string, unknown>
  targeting?: Record<string, unknown>
  attribution_spec?: unknown[]
  destination_type?: string
  campaign?: { id: string; name?: string; objective?: string }
}

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

function dataCurta() {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(new Date())
}

async function arquivoEmBase64(supabase: SupabaseClient, caminho: string) {
  const { data, error } = await supabase.storage.from(BUCKET_ENTREGAS).download(caminho)
  if (error || !data) throw new ErroMeta('Não foi possível ler a imagem do criativo no armazenamento.', 500)
  const bytes = new Uint8Array(await data.arrayBuffer())
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binario)
}

// Criativo com imagem por posicionamento: 9:16 em stories/reels, 1:1 no resto
function especificacaoCriativo(
  criativo: Record<string, string | null>,
  imagens: { quadrado: string; stories: string | null },
  botao: string,
  pagina: string,
  instagram: string | null,
) {
  const identidade = { page_id: pagina, ...(instagram ? { instagram_user_id: instagram } : {}) }
  const urlTags = `utm_source=meta&utm_medium=pago&utm_campaign=fabrica&utm_content=${criativo.id}`
  const melhorias = {
    creative_features_spec: Object.fromEntries(MELHORIAS_DESLIGADAS.map((chave) => [chave, { enroll_status: 'OPT_OUT' }])),
  }
  const textos = {
    bodies: [{ text: criativo.texto_principal }],
    titles: criativo.titulo_anuncio ? [{ text: criativo.titulo_anuncio }] : undefined,
    descriptions: criativo.descricao_anuncio ? [{ text: criativo.descricao_anuncio }] : undefined,
    link_urls: [{ website_url: criativo.url_destino }],
    call_to_action_types: [botao],
  }

  if (!imagens.stories) {
    return {
      object_story_spec: {
        ...identidade,
        link_data: {
          image_hash: imagens.quadrado,
          link: criativo.url_destino,
          message: criativo.texto_principal,
          ...(criativo.titulo_anuncio ? { name: criativo.titulo_anuncio } : {}),
          ...(criativo.descricao_anuncio ? { description: criativo.descricao_anuncio } : {}),
          call_to_action: { type: botao, value: { link: criativo.url_destino } },
        },
      },
      url_tags: urlTags,
      degrees_of_freedom_spec: melhorias,
    }
  }

  return {
    object_story_spec: identidade,
    asset_feed_spec: {
      ad_formats: ['SINGLE_IMAGE'],
      optimization_type: 'PLACEMENT',
      images: [
        { hash: imagens.quadrado, adlabels: [{ name: 'quadrado' }] },
        { hash: imagens.stories, adlabels: [{ name: 'stories' }] },
      ],
      ...textos,
      asset_customization_rules: [
        {
          priority: 1,
          image_label: { name: 'stories' },
          customization_spec: {
            publisher_platforms: ['facebook', 'instagram'],
            facebook_positions: ['story', 'facebook_reels'],
            instagram_positions: ['story', 'reels'],
          },
        },
        {
          priority: 2,
          image_label: { name: 'quadrado' },
          customization_spec: {
            publisher_platforms: ['facebook', 'instagram', 'audience_network'],
            facebook_positions: ['feed', 'marketplace', 'video_feeds', 'search', 'right_hand_column'],
            instagram_positions: ['stream', 'explore', 'explore_home', 'profile_feed', 'ig_search'],
            audience_network_positions: ['classic'],
          },
        },
      ],
    },
    url_tags: urlTags,
    degrees_of_freedom_spec: melhorias,
  }
}

Deno.serve(async (request) => {
  const inicio = Date.now()
  const temTempo = () => Date.now() - inicio < TEMPO_POR_CHAMADA_MS
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
  // Registro do que foi criado (meta_objetos etc.) só o servidor grava
  const supabase = createClient(supabaseUrl, serviceKey)

  let entrada: Entrada
  try {
    entrada = await request.json()
  } catch {
    return responder({ erro: 'Dados inválidos.' }, 400)
  }

  try {
    const conta = contaConfigurada()

    if (entrada.acao === 'listar_conjuntos') {
      const conjuntos = await metaLerTudo<ConjuntoOrigem & { effective_status?: string }>(`${conta}/adsets`, {
        fields: 'id,name,effective_status,optimization_goal,campaign{id,name,objective}',
        filtering: [{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }],
        limit: 200,
      }, 5)
      const { data: daFabrica } = await supabase.from('meta_objetos').select('meta_id').eq('tipo', 'adset')
      const idsFabrica = new Set((daFabrica ?? []).map((o) => o.meta_id))
      return responder({
        conjuntos: conjuntos
          .filter((c) => c.campaign?.objective === 'OUTCOME_LEADS' && !idsFabrica.has(c.id))
          .map((c) => ({ id: c.id, nome: c.name, campanha: c.campaign?.name ?? '' })),
      }, 200)
    }

    // ----- Lançamento -------------------------------------------------------
    const pagina = Deno.env.get('META_PAGE_ID')?.trim()
    const instagram = Deno.env.get('META_INSTAGRAM_ID')?.trim() || null
    if (!pagina) {
      return responder({ erro: 'Falta configurar a Página do Facebook (segredo META_PAGE_ID).' }, 500)
    }

    // Lançamento interrompido que continua: na chamada seguinte (lancamento_id) ou
    // quando a equipe tenta de novo com os mesmos criativos, público, nome e
    // orçamento. Os parâmetros valem os do lançamento gravado.
    const idsPedidos = [...new Set(entrada.criativo_ids ?? [])].sort()
    let continuado: { id: string; criativo_ids: string[]; nome_teste: string; orcamento_diario: number; conjunto_publico_id: string } | null = null
    if (entrada.lancamento_id) {
      const { data } = await supabase
        .from('meta_lancamentos')
        .select('id, status, criativo_ids, nome_teste, orcamento_diario, conjunto_publico_id')
        .eq('id', entrada.lancamento_id)
        .maybeSingle()
      if (!data || data.status === 'concluido') {
        return responder({ erro: 'Este lançamento não existe mais ou já foi concluído.' }, 400)
      }
      continuado = data
    } else if (!entrada.simular && idsPedidos.length) {
      const { data: abertos } = await supabase
        .from('meta_lancamentos')
        .select('id, criativo_ids, nome_teste, orcamento_diario, conjunto_publico_id')
        .in('status', ['em_andamento', 'erro'])
        .gte('created_at', new Date(Date.now() - 24 * 3600_000).toISOString())
        .order('created_at', { ascending: false })
      continuado = (abertos ?? []).find((l) =>
        [...l.criativo_ids].sort().join() === idsPedidos.join() &&
        l.nome_teste === (entrada.nome_teste ?? '').trim().slice(0, 80) &&
        Number(l.orcamento_diario) === Number(entrada.orcamento_diario) &&
        l.conjunto_publico_id === (entrada.conjunto_publico_id ?? '').trim()
      ) ?? null
    }

    const ids = continuado ? continuado.criativo_ids : idsPedidos
    if (ids.length === 0 || ids.length > MAX_CRIATIVOS) {
      return responder({ erro: `Escolha de 1 a ${MAX_CRIATIVOS} criativos.` }, 400)
    }
    const nomeTeste = (continuado?.nome_teste ?? entrada.nome_teste ?? '').trim().slice(0, 80)
    if (!nomeTeste) {
      return responder({ erro: 'Dê um nome ao teste.' }, 400)
    }
    const botao = BOTOES_META.includes(entrada.botao ?? '') ? entrada.botao! : 'LEARN_MORE'

    // O que este lançamento já criou no Meta (numa chamada anterior)
    const { data: feitosAntes } = continuado
      ? await supabase.from('meta_objetos').select('meta_id, tipo, nome, pai_meta_id, criativo_id').eq('lancamento_id', continuado.id)
      : { data: [] as ObjetoFeito[] }
    const feitos = (feitosAntes ?? []) as ObjetoFeito[]
    const criativoNoMeta = new Map(feitos.filter((o) => o.tipo === 'adcreative' && o.criativo_id).map((o) => [o.criativo_id!, o.meta_id]))
    const anuncioNoMeta = new Map(feitos.filter((o) => o.tipo === 'ad' && o.criativo_id).map((o) => [o.criativo_id!, o]))
    const conjuntoFeito = feitos.find((o) => o.tipo === 'adset') ?? null

    const { data: config } = await supabase.from('meta_configuracao').select('*').eq('id', 1).single()
    const maximo = Math.min(Number(config?.orcamento_diario_maximo ?? 150), TETO_FIXO_ORCAMENTO_DIARIO)
    const orcamento = Number(continuado?.orcamento_diario ?? entrada.orcamento_diario)
    if (!Number.isFinite(orcamento) || orcamento < ORCAMENTO_MINIMO || orcamento > maximo) {
      return responder({ erro: `O orçamento diário precisa ficar entre R$ ${ORCAMENTO_MINIMO} e R$ ${maximo}.` }, 400)
    }
    const tetoCampanha = Math.min(Number(config?.teto_campanha ?? 3000), TETO_FIXO_CAMPANHA)

    // Criativos: estáticos aprovados, com arquivo, textos e destino, ainda não lançados
    const { data: criativos, error: erroCriativos } = await supabase
      .from('criativos')
      .select('id, titulo, frente_id, formato, status, arquivo_path, arquivo_stories_path, texto_principal, titulo_anuncio, descricao_anuncio, url_destino, meta_ad_id')
      .in('id', ids)
    if (erroCriativos || !criativos || criativos.length !== ids.length) {
      return responder({ erro: 'Não foi possível ler os criativos escolhidos.' }, 400)
    }
    for (const c of criativos) {
      const problema =
        c.status !== 'aprovado' ? 'não está aprovado (ou já foi publicado)'
        : c.formato !== 'estatico' ? 'não é estático (vídeo ainda não é lançado pelo sistema)'
        : !c.arquivo_path ? 'não tem a imagem enviada em Entregas'
        : c.meta_ad_id && !anuncioNoMeta.has(c.id) ? 'já foi lançado no Meta'
        : !c.texto_principal?.trim() ? 'está sem o texto principal'
        : !/^https:\/\//.test(c.url_destino ?? '') ? 'está sem URL de destino (https)'
        : null
      if (problema) {
        return responder({ erro: `"${c.titulo}" ${problema}.` }, 400)
      }
    }

    // Conjunto de origem: só leitura. Precisa ser da mesma conta e de campanha de cadastro
    const origemId = (continuado?.conjunto_publico_id ?? entrada.conjunto_publico_id ?? config?.conjunto_publico_id ?? '').trim()
    if (!/^\d+$/.test(origemId)) {
      return responder({ erro: 'Escolha o conjunto de onde copiar o público.' }, 400)
    }
    const origem = await metaLer<ConjuntoOrigem>(origemId, {
      fields: 'id,name,account_id,optimization_goal,billing_event,promoted_object,targeting,attribution_spec,destination_type,campaign{id,name,objective}',
    })
    if (`act_${origem.account_id}` !== conta) {
      return responder({ erro: 'O conjunto escolhido não é da conta configurada.' }, 400)
    }
    if (origem.campaign?.objective !== 'OUTCOME_LEADS') {
      return responder({ erro: 'Escolha um conjunto de campanha de cadastros (objetivo Leads).' }, 400)
    }

    // Termos de conceito para o nome do anúncio (padrão da conta: PLATAFORMA_…)
    const [{ data: prefixos }, { count: anunciosAnteriores }, { data: campanhas }] = await Promise.all([
      supabase.from('meta_prefixos_conceito').select('termo, frente_id').order('created_at'),
      supabase.from('meta_objetos').select('id', { count: 'exact', head: true }).eq('tipo', 'ad'),
      supabase.from('meta_objetos').select('meta_id').eq('tipo', 'campaign').order('created_at', { ascending: false }),
    ])
    let numero = (anunciosAnteriores ?? 0)
    const nomeAnuncio = (frenteId: string) => {
      numero++
      const termo = prefixos?.find((p) => p.frente_id === frenteId)?.termo ?? 'GERAL'
      return `FAB_${normalizar(termo)}_${String(numero).padStart(3, '0')}`
    }

    const nomeConjunto = `[FÁBRICA] ${dataCurta()} · ${nomeTeste}`
    const camposConjunto = (campanhaId: string) => ({
      name: nomeConjunto,
      campaign_id: campanhaId,
      daily_budget: Math.round(orcamento * 100),
      billing_event: origem.billing_event ?? 'IMPRESSIONS',
      optimization_goal: origem.optimization_goal,
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      promoted_object: origem.promoted_object,
      targeting: origem.targeting,
      attribution_spec: origem.attribution_spec,
      ...(origem.destination_type ? { destination_type: origem.destination_type } : {}),
    })
    const camposCampanha = {
      name: NOME_CAMPANHA,
      objective: 'OUTCOME_LEADS',
      buying_type: 'AUCTION',
      special_ad_categories: [],
      // Sem orçamento de campanha: cada conjunto tem o seu
      is_adset_budget_sharing_enabled: false,
      spend_cap: Math.round(tetoCampanha * 100),
    }

    // ----- Simulação: devolve o que seria enviado, sem enviar nada -----------
    if (entrada.simular) {
      return responder({
        simulacao: {
          campanha: campanhas?.length ? `usa a campanha da Fábrica já criada (${campanhas[0].meta_id})` : { criar: camposCampanha, status: 'PAUSED' },
          conjunto: { ...camposConjunto(campanhas?.[0]?.meta_id ?? '<campanha da Fábrica>'), status: 'PAUSED', origem: `${origem.name} (${origem.campaign?.name})` },
          anuncios: criativos.map((c) => ({
            nome: nomeAnuncio(c.frente_id),
            criativo: especificacaoCriativo(c, { quadrado: '<imagem quadrada>', stories: c.arquivo_stories_path ? '<imagem stories>' : null }, botao, pagina, instagram),
            status: 'PAUSED',
          })),
        },
      }, 200)
    }

    // ----- Lançamento real ----------------------------------------------------
    let lancamentoId = continuado?.id ?? ''
    if (continuado) {
      await supabase.from('meta_lancamentos').update({ status: 'em_andamento', erro: null }).eq('id', continuado.id)
    } else {
      const { data: novo, error: erroLancamento } = await supabase
        .from('meta_lancamentos')
        .insert({
          nome_teste: nomeTeste,
          conjunto_publico_id: origemId,
          orcamento_diario: orcamento,
          criativo_ids: ids,
          criado_por: user.email ?? null,
        })
        .select('id')
        .single()
      if (erroLancamento || !novo) {
        return responder({ erro: 'Não foi possível registrar o lançamento.' }, 500)
      }
      lancamentoId = novo.id
    }
    const lancamento = { id: lancamentoId }

    const daFabrica = new Set<string>()
    const { data: objetos } = await supabase.from('meta_objetos').select('meta_id').in('tipo', ['campaign', 'adset'])
    for (const o of objetos ?? []) daFabrica.add(o.meta_id)

    // Cria e registra na hora (se der erro depois, o que já foi criado fica pausado e registrado)
    async function criar(caminho: CaminhoCriacao, campos: Record<string, unknown>, extra: { nome?: string; pai?: string; criativo_id?: string } = {}) {
      const resposta = await metaCriar<{ id?: string; images?: Record<string, { hash: string }> }>(
        { caminho: `${conta}/${caminho}`, campos },
        daFabrica,
      )
      const metaId = resposta.id ?? Object.values(resposta.images ?? {})[0]?.hash
      if (!metaId) throw new ErroMeta('O Meta não devolveu o identificador do que foi criado.', 502)
      // A mesma imagem enviada de novo devolve o mesmo hash: não duplica o registro
      const { error: erroRegistro } = await supabase.from('meta_objetos').upsert(
        {
          meta_id: metaId,
          tipo: CRIACOES[caminho],
          pai_meta_id: extra.pai ?? null,
          nome: extra.nome ?? null,
          criativo_id: extra.criativo_id ?? null,
          lancamento_id: lancamento.id,
        },
        { onConflict: 'meta_id', ignoreDuplicates: true },
      )
      if (erroRegistro) console.error('Erro ao registrar objeto criado no Meta', metaId, erroRegistro)
      if (caminho === 'campaigns' || caminho === 'adsets') daFabrica.add(metaId)
      return metaId
    }

    // Acabou o tempo desta chamada: a tela chama de novo com o lancamento_id
    const continuar = (etapa: 'criativos' | 'conjunto' | 'anuncios') =>
      responder({
        pendente: true,
        lancamento_id: lancamento.id,
        etapa,
        criativos_prontos: criativoNoMeta.size,
        anuncios_prontos: anuncioNoMeta.size,
        total: criativos.length,
      }, 200)

    try {
      // 1. Imagens e criativos primeiro: não veiculam nada sozinhos, e é onde
      //    um erro é mais provável. Assim campanha e conjunto só nascem se der certo.
      for (const c of criativos) {
        if (criativoNoMeta.has(c.id)) continue
        if (!temTempo()) return continuar('criativos')
        const [quadrado, stories] = await Promise.all([
          arquivoEmBase64(supabase, c.arquivo_path!).then((bytes) =>
            criar('adimages', { bytes, name: `fab-${c.id}-quadrado.png` }, { criativo_id: c.id })),
          c.arquivo_stories_path
            ? arquivoEmBase64(supabase, c.arquivo_stories_path).then((bytes) =>
              criar('adimages', { bytes, name: `fab-${c.id}-stories.png` }, { criativo_id: c.id }))
            : Promise.resolve(null),
        ])
        const creativeId = await criar(
          'adcreatives',
          { name: `FAB · ${c.titulo}`.slice(0, 100), ...especificacaoCriativo(c, { quadrado, stories }, botao, pagina, instagram) },
          { nome: c.titulo, criativo_id: c.id },
        )
        criativoNoMeta.set(c.id, creativeId)
      }

      // 2. Campanha da Fábrica (só na primeira vez; se foi apagada no Gerenciador, cria outra)
      //    e 3. conjunto novo, com o público copiado (os dois na mesma chamada)
      let campanhaId: string | null = conjuntoFeito?.pai_meta_id ?? null
      if (!conjuntoFeito && !temTempo()) return continuar('conjunto')
      for (const candidata of conjuntoFeito ? [] : campanhas ?? []) {
        try {
          const atual = await metaLer<{ effective_status?: string }>(candidata.meta_id, { fields: 'effective_status' })
          if (!['DELETED', 'ARCHIVED'].includes(atual.effective_status ?? '')) {
            campanhaId = candidata.meta_id
            break
          }
        } catch {
          // campanha inacessível: tenta a próxima
        }
      }
      if (!campanhaId) {
        campanhaId = await criar('campaigns', camposCampanha, { nome: NOME_CAMPANHA })
      }
      const conjuntoId = conjuntoFeito?.meta_id ?? await criar('adsets', camposConjunto(campanhaId), { nome: nomeConjunto, pai: campanhaId })

      // 4. Anúncios
      for (const c of criativos) {
        if (anuncioNoMeta.has(c.id)) continue
        if (!temTempo()) return continuar('anuncios')
        const nome = nomeAnuncio(c.frente_id)
        const adId = await criar('ads', { name: nome, adset_id: conjuntoId, creative: { creative_id: criativoNoMeta.get(c.id) } }, { nome, pai: conjuntoId, criativo_id: c.id })
        await supabase.from('criativos').update({ meta_ad_id: adId, meta_status: 'PAUSED' }).eq('id', c.id)
        anuncioNoMeta.set(c.id, { meta_id: adId, tipo: 'ad', nome, pai_meta_id: conjuntoId, criativo_id: c.id })
      }
      const anuncios = criativos.map((c) => ({ criativo_id: c.id, ad_id: anuncioNoMeta.get(c.id)!.meta_id, nome: anuncioNoMeta.get(c.id)!.nome ?? '' }))

      await supabase
        .from('meta_lancamentos')
        .update({ status: 'concluido', campanha_meta_id: campanhaId, conjunto_meta_id: conjuntoId })
        .eq('id', lancamento.id)

      return responder({ conta: conta.replace('act_', ''), campanha_id: campanhaId, conjunto_id: conjuntoId, anuncios }, 200)
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Erro inesperado.'
      await supabase.from('meta_lancamentos').update({ status: 'erro', erro: mensagem }).eq('id', lancamento.id)
      throw erro
    }
  } catch (erro) {
    if (erro instanceof ErroMeta) {
      console.error('Meta', erro.message, erro.detalhe)
      return responder({ erro: erro.message }, erro.status)
    }
    console.error('Erro no lançamento', erro)
    return responder({ erro: 'Não foi possível lançar agora. Nada foi ativado; tente de novo.' }, 500)
  }
})
