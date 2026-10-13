import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Recria o padrão de layout de imagens de referência (anúncios, peças do
// Canva/Figma) como template HTML nos dois tamanhos. Cores vêm sempre da
// paleta da marca, por variáveis. Formato em src/lib/layout-referencia.ts
// (EspecificacaoHtml); o HTML é limpo de novo no navegador antes de desenhar.
// Quadrado e stories são pedidos em paralelo, para caber no tempo da função.

const MODELO = 'claude-opus-5-5'
const MAX_IMAGENS = 3
const COTACAO_PADRAO = Number(Deno.env.get('COTACAO_DOLAR_PADRAO') ?? '5.0')

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

class ErroAnalise extends Error {
  constructor(mensagem: string, public status: number) {
    super(mensagem)
  }
}

async function cotacaoDolar(): Promise<number> {
  try {
    const resposta = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', {
      signal: AbortSignal.timeout(3000),
    })
    const valor = Number((await resposta.json())?.USDBRL?.bid)
    return valor > 0 ? valor : COTACAO_PADRAO
  } catch {
    return COTACAO_PADRAO
  }
}

// O que a IA devolve em cada chamada: o layout recriado em uma medida
const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['descricao', 'usa_foto', 'foto_sugerida', 'html'],
  properties: {
    descricao: { type: 'string' },
    usa_foto: { type: 'boolean' },
    foto_sugerida: { type: 'string' },
    html: { type: 'string' },
  },
}

const MEDIDAS = {
  quadrado: {
    nome: 'quadrado (feed)',
    raiz: 'position:relative;width:1080px;height:1080px;overflow:hidden;background:var(--cor-fundo)',
    observacao: '',
  },
  stories: {
    nome: 'stories',
    raiz: 'position:relative;width:1080px;height:1920px;overflow:hidden;background:var(--cor-fundo)',
    observacao: 'Mantenha textos e elementos importantes entre y=220 e y=1620 (a interface do Instagram cobre o topo e a base).',
  },
}

const INSTRUCOES = `Você é diretor(a) de arte e desenvolvedor(a) front-end. Recebe imagens de referência de anúncios e recria o MESMO PADRÃO DE LAYOUT da referência (composição, hierarquia, proporções, posição de cada bloco, elementos gráficos, mockups e uso de foto) em HTML, para anúncios da marca Fácil consulta. NÃO copie os textos nem as cores da referência: os textos entram por marcadores e as cores vêm da paleta da marca, por variáveis.

Regras obrigatórias:
1. Um único <div> raiz no tamanho pedido. Somente estilos inline (atributo style). Não use <style>, classes, <script>, <iframe>, eventos (onclick etc.), links, url() nem imagens externas. Seja conciso no HTML.
2. Textos por marcadores (use os que o padrão comportar; {{GANCHO}} é obrigatório): {{GANCHO}} (título principal), {{APOIO}} (texto de apoio), {{SELO}} (etiqueta curta), {{CTA}} (texto do botão/chamada), {{ITEM_1}}, {{ITEM_2}}, {{ITEM_3}} (passos de uma lista).
3. Cores: use somente var(--cor-fundo), var(--cor-texto), var(--cor-destaque), var(--cor-apoio), var(--cor-sobre-destaque) (texto sobre a cor de destaque), var(--cor-sobre-apoio) (texto sobre a cor de apoio) e neutros (#FFFFFF, #000000, #0A1628 e rgba() de branco ou preto para sombras, vidros e transparências). Nunca use outras cores fixas. Mapeie os papéis da referência: cor dominante do fundo -> --cor-fundo; título -> --cor-texto; botões, selos e destaques -> --cor-destaque; cartões e segunda cor -> --cor-apoio.
4. Fontes: font-family:var(--fonte-titulo) com font-weight 600 ou 700 em títulos, selos e botões; font-family:var(--fonte-texto) no texto corrido.
5. Tamanhos de texto: font-size:calc(<N>px * var(--escala-texto)), onde N é o tamanho para um título curto (até 40 caracteres). Os textos variam de tamanho: não fixe altura de caixas de texto e deixe folga.
6. Logo: <img data-papel="logo" data-versao="branca"> sobre fundos escuros ou data-versao="colorida" sobre fundos claros, sem src, com style de height (40 a 80px) e width:auto, na posição da referência (se a referência não tiver logo, coloque um discreto num canto).
7. Foto: se a referência usa fotografia (pessoa, objeto, cena), use <img data-papel="foto"> sem src, com object-fit:cover, no mesmo enquadramento da referência, e descreva em foto_sugerida, em português, a foto ideal para esse layout (cena, pessoa ou objeto, luz, enquadramento, área livre para texto). Se não usar foto, deixe foto_sugerida vazio.
8. Quando a referência mostra um objeto com o texto dentro (ex.: celular com a mensagem na tela, cartaz, papel, post-it, balão de conversa, tela de notificação), DESENHE esse objeto em HTML/CSS (moldura, tela, bordas arredondadas, sombras, leve rotação se houver) e coloque {{GANCHO}} dentro dele, como na referência. Se houver foto de fundo com esse objeto, use a foto (data-papel="foto") de fundo e o objeto desenhado por cima.
9. descricao: em português, 1 ou 2 frases sobre o padrão recriado (ex.: "Foto de fundo com um celular no bolso; o título aparece na tela do celular, em azul-escuro, e o logo fica discreto embaixo.").
10. usa_foto: true somente se o template tem data-papel="foto".

Se houver mais de uma imagem, recrie o padrão comum entre elas. Capriche no acabamento: é um anúncio profissional.`

interface ImagemEntrada {
  media_type?: string
  data?: string
}

interface Recriacao {
  descricao: string
  usa_foto: boolean
  foto_sugerida: string
  html: string
  entrada: number
  saida: number
}

async function recriar(
  anthropic: Anthropic,
  imagens: ImagemEntrada[],
  medida: keyof typeof MEDIDAS,
  observacao: string | null,
): Promise<Recriacao> {
  const { nome, raiz, observacao: extra } = MEDIDAS[medida]
  try {
    const resposta = await anthropic.beta.messages.create({
      model: MODELO,
      max_tokens: 12000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
      system: INSTRUCOES,
      messages: [
        {
          role: 'user',
          content: [
            ...imagens.map((imagem) => ({
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: imagem.media_type as 'image/jpeg', data: imagem.data! },
            })),
            {
              type: 'text' as const,
              text: `Recrie o padrão de layout destas ${imagens.length} referência(s) na medida ${nome}. O <div> raiz deve ter style="${raiz}". ${extra}${observacao ? `\nObservação de quem enviou: ${observacao}` : ''}`,
            },
          ],
        },
      ],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming)

    if (resposta.stop_reason === 'max_tokens') {
      throw new ErroAnalise('A recriação do layout ficou longa demais. Tente com menos imagens.', 422)
    }
    if (resposta.stop_reason === 'refusal') {
      throw new ErroAnalise('A IA recusou analisar estas imagens. Tente outra referência.', 422)
    }
    const texto = resposta.content.find((bloco) => bloco.type === 'text')
    if (!texto || texto.type !== 'text') {
      throw new ErroAnalise('A IA não devolveu o layout.', 502)
    }
    const resultado = JSON.parse(texto.text)
    if (!String(resultado.html ?? '').includes('{{GANCHO}}')) {
      throw new ErroAnalise('A IA não conseguiu recriar o layout desta vez. Tente de novo.', 502)
    }
    return {
      ...resultado,
      entrada: resposta.usage.input_tokens ?? 0,
      saida: resposta.usage.output_tokens ?? 0,
    }
  } catch (erro) {
    if (erro instanceof ErroAnalise) throw erro
    console.error('Erro ao recriar o layout', medida, erro)
    if (erro instanceof Anthropic.AuthenticationError) {
      throw new ErroAnalise('A chave da Anthropic é inválida. Confira o segredo ANTHROPIC_API_KEY.', 500)
    }
    if (erro instanceof Anthropic.RateLimitError) {
      throw new ErroAnalise('Muitos pedidos à IA agora. Espere um minuto e tente de novo.', 429)
    }
    throw new ErroAnalise('Não foi possível analisar a referência agora. Tente de novo.', 502)
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
  if (!authorization) {
    return responder({ erro: 'Usuário não autenticado.' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const chave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!supabaseUrl || !anonKey || !chave) {
    return responder({ erro: 'Função não configurada. Falta a chave da IA ou do Supabase.' }, 500)
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: erroUsuario } = await supabase.auth.getUser()
  if (erroUsuario || !user) {
    return responder({ erro: 'Usuário não autenticado.' }, 401)
  }

  let entrada: { imagens?: ImagemEntrada[]; observacao?: string | null }
  try {
    entrada = await request.json()
  } catch {
    return responder({ erro: 'Dados inválidos.' }, 400)
  }

  const imagens = (entrada.imagens ?? [])
    .filter((imagem) => imagem.data && ['image/jpeg', 'image/png', 'image/webp'].includes(imagem.media_type ?? ''))
    .slice(0, MAX_IMAGENS)
  if (imagens.length === 0) {
    return responder({ erro: 'Envie pelo menos uma imagem de referência (JPG, PNG ou WebP).' }, 400)
  }

  const anthropic = new Anthropic({ apiKey: chave })
  const observacao = entrada.observacao?.trim() || null
  let quadrado: Recriacao
  let stories: Recriacao
  try {
    ;[quadrado, stories] = await Promise.all([
      recriar(anthropic, imagens, 'quadrado', observacao),
      recriar(anthropic, imagens, 'stories', observacao),
    ])
  } catch (erro) {
    if (erro instanceof ErroAnalise) return responder({ erro: erro.message }, erro.status)
    return responder({ erro: 'Não foi possível analisar a referência agora. Tente de novo.' }, 502)
  }

  // Custo das duas chamadas (preço do catálogo, se houver)
  const usoEntrada = quadrado.entrada + stories.entrada
  const usoSaida = quadrado.saida + stories.saida
  const { data: precoModelo } = await supabase
    .from('fabrica_modelos_ia')
    .select('preco_entrada, preco_saida')
    .eq('modelo', MODELO)
    .maybeSingle()
  const custoUsd =
    (usoEntrada * Number(precoModelo?.preco_entrada ?? 4) + usoSaida * Number(precoModelo?.preco_saida ?? 20)) / 1_000_000
  const cotacao = await cotacaoDolar()
  const { error: erroLote } = await supabase.from('fabrica_lotes').insert({
    id: crypto.randomUUID(),
    tipo: 'layout',
    modelo: MODELO,
    quantidade: 1,
    tokens_entrada: usoEntrada,
    tokens_saida: usoSaida,
    custo_usd: Number(custoUsd.toFixed(4)),
    cotacao_dolar: Number(cotacao.toFixed(4)),
    custo_brl: Number((custoUsd * cotacao).toFixed(4)),
    criado_por: user.email ?? null,
  })
  if (erroLote) {
    console.error('Erro ao gravar o custo da análise', erroLote)
  }

  return responder(
    {
      especificacao: {
        tipo: 'html',
        descricao: quadrado.descricao,
        usa_foto: quadrado.usa_foto || stories.usa_foto,
        foto_sugerida: quadrado.foto_sugerida || stories.foto_sugerida,
        html_quadrado: quadrado.html,
        html_stories: stories.html,
      },
      custo_brl: Number((custoUsd * cotacao).toFixed(4)),
    },
    200,
  )
})
