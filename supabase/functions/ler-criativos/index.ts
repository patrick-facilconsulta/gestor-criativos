import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  chaveCriativo,
  completarCarrossel,
  ESQUEMA_LEITURA,
  ESQUEMA_LEITURA_CARROSSEL,
  INSTRUCOES_LEITURA,
  INSTRUCOES_LEITURA_CARROSSEL,
  MODELO_LEITURA,
  quantidadeTexto,
  VERSAO_QUESTIONARIO,
} from '../_shared/leitura-visual.ts'

// Leitura visual dos criativos ESTÁTICOS do Meta: o Claude responde um
// questionário fechado sobre a imagem (texto na arte, tipo de peça, pessoas...).
// Regras em _shared/leitura-visual.ts. Não fala com o Meta: a imagem já está em
// meta_anuncios.imagem_url.
//
// TRAVA: só lê anúncio com tipo_midia = 'imagem' ou 'carrossel' (só de imagens;
// vem do Meta na sincronização). Vídeo é recusado sempre: a capa não representa
// o vídeo. Carrossel: todos os cards vão juntos, na ordem.
//
// Ações:
// - pendentes: estáticos de campanhas de cadastro com volume suficiente (gasto
//   >= 2x o custo por cadastro da conta, 60 dias), um por criativo, ainda sem
//   leitura na versão atual do questionário
// - ler (padrão): lê um anúncio. A tela chama um por vez (cabe no tempo da função)

const COTACAO_PADRAO = Number(Deno.env.get('COTACAO_DOLAR_PADRAO') ?? '5.0')
const DIAS = 60
// Custo médio de uma leitura (R$), para a estimativa na tela
const CUSTO_MEDIO_BRL = 0.13
const CUSTO_MEDIO_CARROSSEL_BRL = 0.3
const MAX_CARDS = 10
const LEGIVEIS = new Set(['imagem', 'carrossel'])

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

async function cotacaoDolar(): Promise<number> {
  try {
    const resposta = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', { signal: AbortSignal.timeout(3000) })
    const valor = Number((await resposta.json())?.USDBRL?.bid)
    return valor > 0 ? valor : COTACAO_PADRAO
  } catch {
    return COTACAO_PADRAO
  }
}

class ErroLeitura extends Error {
  status: number

  constructor(mensagem: string, status = 502) {
    super(mensagem)
    this.status = status
  }
}

async function imagemEmBase64(url: string): Promise<{ data: string; tipo: string }> {
  const resposta = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(20_000) })
  if (!resposta.ok) throw new ErroLeitura('Não foi possível baixar a imagem do anúncio. Clique em "Atualizar agora" em Desempenho e tente de novo.', 502)
  const tipo = (resposta.headers.get('content-type') ?? 'image/jpeg').split(';')[0]
  const bytes = new Uint8Array(await resposta.arrayBuffer())
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return { data: btoa(binario), tipo: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(tipo) ? tipo : 'image/jpeg' }
}

// Estáticos elegíveis, um por criativo (o anúncio que mais gastou), sem leitura atual
async function pendentes(supabase: SupabaseClient): Promise<{ ad_id: string; nome: string; carrossel: boolean }[]> {
  const desde = new Date(Date.now() - DIAS * 86_400_000).toISOString().slice(0, 10)
  const { data: anuncios } = await supabase
    .from('meta_anuncios')
    .select('ad_id, nome, tipo_midia')
    .eq('objetivo', 'OUTCOME_LEADS')
    .eq('formulario_instantaneo', false)
  const porId = new Map((anuncios ?? []).map((a) => [a.ad_id as string, a]))

  const soma = new Map<string, { gasto: number; resultados: number }>()
  for (let pagina = 0; pagina < 100; pagina++) {
    const { data } = await supabase
      .from('meta_resultados_diarios')
      .select('ad_id, gasto, resultados')
      .gte('data', desde)
      .range(pagina * 1000, pagina * 1000 + 999)
    for (const l of data ?? []) {
      if (!porId.has(l.ad_id as string)) continue
      const atual = soma.get(l.ad_id as string) ?? { gasto: 0, resultados: 0 }
      atual.gasto += Number(l.gasto)
      atual.resultados += Number(l.resultados)
      soma.set(l.ad_id as string, atual)
    }
    if (!data || data.length < 1000) break
  }
  const total = [...soma.values()].reduce((s, x) => ({ gasto: s.gasto + x.gasto, resultados: s.resultados + x.resultados }), { gasto: 0, resultados: 0 })
  if (!total.resultados) return []
  const gastoMinimo = (2 * total.gasto) / total.resultados

  // Soma por criativo e escolhe o anúncio que mais gastou
  const criativos = new Map<string, { gasto: number; ad_id: string; nome: string; maior: number; legivel: boolean; carrossel: boolean }>()
  for (const [adId, n] of soma) {
    const a = porId.get(adId)!
    const chave = chaveCriativo(a.nome as string)
    const atual = criativos.get(chave) ?? { gasto: 0, ad_id: adId, nome: a.nome as string, maior: -1, legivel: false, carrossel: false }
    atual.gasto += n.gasto
    if (n.gasto > atual.maior) {
      Object.assign(atual, { ad_id: adId, nome: a.nome, maior: n.gasto, legivel: LEGIVEIS.has(a.tipo_midia as string), carrossel: a.tipo_midia === 'carrossel' })
    }
    criativos.set(chave, atual)
  }
  const elegiveis = [...criativos.values()].filter((c) => c.legivel && c.gasto >= gastoMinimo)

  const { data: lidas } = await supabase
    .from('meta_leituras_visuais')
    .select('ad_id, leitura')
    .eq('modelo', MODELO_LEITURA)
    .in('ad_id', elegiveis.map((c) => c.ad_id))
  const atuais = new Set(
    (lidas ?? []).filter((l) => (l.leitura as { versao?: number } | null)?.versao === VERSAO_QUESTIONARIO).map((l) => l.ad_id as string),
  )
  return elegiveis
    .filter((c) => !atuais.has(c.ad_id))
    .sort((a, b) => b.gasto - a.gasto)
    .map((c) => ({ ad_id: c.ad_id, nome: c.nome, carrossel: c.carrossel }))
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
  if (!authorization) return responder({ erro: 'Usuário não autenticado.' }, 401)
  if (!supabaseUrl || !anonKey || !serviceKey) return responder({ erro: 'Função não configurada. Falta a configuração do Supabase.' }, 500)

  const supabaseUsuario = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: { user } } = await supabaseUsuario.auth.getUser()
  if (!user) return responder({ erro: 'Usuário não autenticado.' }, 401)
  const supabase = createClient(supabaseUrl, serviceKey)

  let entrada: { acao?: 'pendentes' | 'ler'; ad_id?: string }
  try {
    entrada = await request.json()
  } catch {
    return responder({ erro: 'Dados inválidos.' }, 400)
  }

  try {
    if (entrada.acao === 'pendentes') {
      const lista = await pendentes(supabase)
      const custo = lista.reduce((total, p) => total + (p.carrossel ? CUSTO_MEDIO_CARROSSEL_BRL : CUSTO_MEDIO_BRL), 0)
      return responder({ pendentes: lista, custo_estimado_brl: Number(custo.toFixed(2)) }, 200)
    }

    if (!entrada.ad_id) return responder({ erro: 'Informe o anúncio.' }, 400)

    const [{ data: anuncio }, { data: modelo }] = await Promise.all([
      supabase.from('meta_anuncios').select('ad_id, nome, imagem_url, tipo_midia, cartoes').eq('ad_id', entrada.ad_id).maybeSingle(),
      supabase.from('fabrica_modelos_ia').select('modelo, preco_entrada, preco_saida').eq('modelo', MODELO_LEITURA).maybeSingle(),
    ])
    if (!anuncio) return responder({ erro: 'Anúncio não encontrado. Atualize os resultados em Desempenho.' }, 404)

    // TRAVA: só imagem ou carrossel de imagens. Vídeo (ou tipo desconhecido) nunca é lido
    if (!LEGIVEIS.has(anuncio.tipo_midia as string)) {
      return responder({
        erro: anuncio.tipo_midia === 'video'
          ? 'Vídeo não recebe leitura visual: a capa não representa o vídeo.'
          : 'O tipo deste anúncio ainda não é conhecido. Clique em "Atualizar agora" em Desempenho.',
      }, 422)
    }
    const carrossel = anuncio.tipo_midia === 'carrossel'
    const urls = carrossel
      ? ((anuncio.cartoes ?? []) as { imagem_url?: string | null }[]).map((c) => c.imagem_url).filter(Boolean).slice(0, MAX_CARDS) as string[]
      : [anuncio.imagem_url].filter(Boolean) as string[]
    if (urls.length === 0) return responder({ erro: 'Este anúncio não tem imagem.' }, 400)

    const chave = Deno.env.get('ANTHROPIC_API_KEY')
    if (!chave) throw new ErroLeitura('Falta a chave da Anthropic (segredo ANTHROPIC_API_KEY).', 500)

    const imagens = await Promise.all(urls.map(imagemEmBase64))
    // Carrossel: cada card rotulado, na ordem
    const conteudo = imagens.flatMap((imagem, indice) => [
      ...(carrossel ? [{ type: 'text', text: `Card ${indice + 1}` }] : []),
      { type: 'image', source: { type: 'base64', media_type: imagem.tipo, data: imagem.data } },
    ])
    const anthropic = new Anthropic({ apiKey: chave })
    const resposta = await anthropic.beta.messages.create({
      model: MODELO_LEITURA,
      max_tokens: carrossel ? 8000 : 4000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: carrossel ? ESQUEMA_LEITURA_CARROSSEL : ESQUEMA_LEITURA } },
      system: carrossel ? INSTRUCOES_LEITURA_CARROSSEL : INSTRUCOES_LEITURA,
      messages: [
        {
          role: 'user',
          content: [
            ...conteudo,
            {
              type: 'text',
              text: carrossel
                ? `Anúncio "${anuncio.nome}", carrossel de ${imagens.length} cards. Responda o questionário sobre o carrossel.`
                : `Anúncio "${anuncio.nome}". Responda o questionário sobre esta imagem.`,
            },
          ],
        },
      ],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming)
    if (resposta.stop_reason === 'refusal') throw new ErroLeitura('A IA recusou analisar esta imagem.', 422)
    const texto = resposta.content.find((bloco) => bloco.type === 'text')
    if (!texto || texto.type !== 'text') throw new ErroLeitura('A IA não devolveu a leitura.', 502)

    const lida = JSON.parse(texto.text) as Record<string, unknown>
    const leitura = carrossel
      ? { ...completarCarrossel(lida), versao: VERSAO_QUESTIONARIO }
      : { ...lida, ...quantidadeTexto(String(lida.texto_na_arte ?? '')), versao: VERSAO_QUESTIONARIO }

    const entradaTokens = (resposta.usage.input_tokens ?? 0) + (resposta.usage.cache_read_input_tokens ?? 0)
    const saidaTokens = resposta.usage.output_tokens ?? 0
    const custoUsd = (entradaTokens * Number(modelo?.preco_entrada ?? 4) + saidaTokens * Number(modelo?.preco_saida ?? 20)) / 1_000_000
    const cotacao = await cotacaoDolar()

    await supabase.from('meta_leituras_visuais').upsert(
      {
        ad_id: anuncio.ad_id,
        modelo: MODELO_LEITURA,
        leitura,
        erro: null,
        tokens_entrada: entradaTokens,
        tokens_saida: saidaTokens,
        custo_brl: Number((custoUsd * cotacao).toFixed(4)),
        criado_por: user.email ?? null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'ad_id,modelo' },
    )
    await supabase.from('fabrica_lotes').insert({
      id: crypto.randomUUID(),
      tipo: 'leitura',
      modelo: MODELO_LEITURA,
      quantidade: 1,
      tokens_entrada: entradaTokens,
      tokens_saida: saidaTokens,
      custo_usd: Number(custoUsd.toFixed(4)),
      cotacao_dolar: Number(cotacao.toFixed(4)),
      custo_brl: Number((custoUsd * cotacao).toFixed(4)),
      criado_por: user.email ?? null,
    })

    return responder({ leitura }, 200)
  } catch (erro) {
    if (erro instanceof ErroLeitura) return responder({ erro: erro.message }, erro.status)
    console.error('Erro na leitura visual', erro)
    if (erro instanceof Anthropic.RateLimitError) return responder({ erro: 'Muitos pedidos à IA agora. Espere um minuto e tente de novo.' }, 429)
    return responder({ erro: 'Não foi possível ler este criativo agora. Tente de novo.' }, 500)
  }
})
