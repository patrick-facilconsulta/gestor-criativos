import { createClient } from 'npm:@supabase/supabase-js@2'

// Recria o padrão de layout de imagens de referência (anúncios, peças do
// Canva/Figma) como template HTML nos dois tamanhos. Cores vêm sempre da
// paleta da marca, por variáveis. Formato em src/lib/layout-referencia.ts
// (EspecificacaoHtml); o HTML é limpo de novo no navegador antes de desenhar.
// Quadrado e stories são pedidos em paralelo, para caber no tempo da função.
// IA: OpenAI (Responses API com imagens e saída estruturada). O modelo vem do
// catálogo fabrica_modelos_ia (OpenAI, texto, ativo); padrão: o primeiro da lista.

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

// O que a IA devolve em cada chamada. A ordem dos campos é proposital: primeiro
// a IA mede a referência (fundo e elementos com posição em %), depois escreve o
// HTML seguindo essas medidas. Isso deixa a recriação bem mais fiel.
const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['fundo_referencia', 'elementos', 'descricao', 'usa_foto', 'foto_sugerida', 'html'],
  properties: {
    fundo_referencia: {
      type: 'object',
      additionalProperties: false,
      required: ['tipo', 'descricao'],
      properties: {
        tipo: { type: 'string', enum: ['fotografia', 'cor-solida', 'degrade', 'ilustracao'] },
        descricao: { type: 'string' },
      },
    },
    elementos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nome', 'papel', 'x', 'y', 'largura', 'altura', 'rotacao', 'estilo'],
        properties: {
          nome: { type: 'string' },
          papel: {
            type: 'string',
            enum: ['GANCHO', 'APOIO', 'SELO', 'CTA', 'ITENS', 'LOGO', 'OBJETO_COM_TEXTO', 'FORMA_DECORATIVA', 'FOTO'],
          },
          x: { type: 'number' },
          y: { type: 'number' },
          largura: { type: 'number' },
          altura: { type: 'number' },
          rotacao: { type: 'number' },
          estilo: { type: 'string' },
        },
      },
    },
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
    observacao: 'Se a referência for vertical, mantenha os mesmos elementos e a mesma lógica de composição, reorganizando as posições para caber no quadrado (reduza espaços vazios, não remova elementos importantes).',
  },
  stories: {
    nome: 'stories',
    raiz: 'position:relative;width:1080px;height:1920px;overflow:hidden;background:var(--cor-fundo)',
    observacao: 'Se a referência for vertical, siga as medidas dela à risca. Mantenha textos e elementos importantes entre y=220 e y=1620 (a interface do Instagram cobre o topo e a base).',
  },
}

const INSTRUCOES = `Você é diretor(a) de arte e desenvolvedor(a) front-end. Recebe imagens de referência de anúncios e precisa RECRIAR FIELMENTE o layout da referência em HTML, para anúncios da marca Fácil consulta. Fidelidade é o critério principal: quem olhar a referência e o resultado lado a lado deve reconhecer a mesma composição (mesmos elementos, nas mesmas posições, tamanhos, inclinações e hierarquia). Só mudam três coisas: os textos (entram por marcadores), as cores (vêm da paleta da marca) e as fontes (as da marca).

TRABALHE EM DUAS ETAPAS, nesta ordem, preenchendo os campos do JSON:

ETAPA 1. Meça a referência.
- fundo_referencia.tipo: "fotografia" se o fundo é uma foto de cena real (pessoas, mãos, objetos, ambientes, céu, mesa); "cor-solida", "degrade" ou "ilustracao" caso contrário. descricao: o que aparece no fundo.
- elementos: liste TODOS os elementos visíveis, do fundo para a frente. Para cada um: nome (ex.: "título amarelo do topo", "post-it amarelo segurado pela mão", "lista dentro do post-it"), papel, posição x e y do canto superior esquerdo e largura e altura, todos em PORCENTAGEM da largura/altura da peça (0 a 100), rotacao em graus (negativo = anti-horário) e estilo (cor, peso e tamanho da fonte em % da altura da peça, alinhamento, caixa alta, sombra, cantos, se parece manuscrito, se é papel, vidro etc.).
- Papéis dos textos: GANCHO = o texto de MAIOR destaque visual (normalmente o título grande); ITENS = lista de tópicos/passos; APOIO = texto secundário; SELO = etiqueta curta; CTA = botão ou chamada para ação. Objeto físico que carrega texto (post-it, papel, celular, cartaz, placa, balão) = OBJETO_COM_TEXTO, e os textos dentro dele recebem seu próprio papel.

ETAPA 2. Escreva o HTML seguindo as medidas da etapa 1.
1. Um único <div> raiz no tamanho pedido. Somente estilos inline (atributo style). Não use <style>, classes, <script>, <iframe>, eventos (onclick etc.), links, url() nem imagens externas.
2. Posicione cada elemento com position:absolute usando as porcentagens medidas (left, top, width, height em %) e a mesma rotação (transform:rotate). Mantenha a ordem de empilhamento (z-index) da referência.
3. Fundo: se fundo_referencia.tipo for "fotografia", o primeiro filho do raiz é <img data-papel="foto" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover"> (sem src) e usa_foto é true. Nunca troque uma referência fotográfica por fundo liso. Para legibilidade, use no máximo um degradê leve (rgba preto ou da cor de fundo) só onde houver texto.
4. Objetos com texto (post-it, papel, celular, cartaz, balão, tela) são DESENHADOS em HTML/CSS por cima da foto, na posição, tamanho, proporção e rotação medidas, com o acabamento do objeto (post-it: quadrado de cor chapada com sombra suave; papel: branco com sombra; celular: moldura escura arredondada com tela). A cor do objeto segue o papel dele na paleta: objeto colorido de destaque (ex.: post-it amarelo) -> var(--cor-destaque) e o texto dentro dele -> var(--cor-sobre-destaque); objeto branco -> #FFFFFF com texto #0A1628.
5. Textos por marcadores: {{GANCHO}} (obrigatório, sempre no elemento de papel GANCHO), {{APOIO}}, {{SELO}}, {{CTA}}, {{ITEM_1}}, {{ITEM_2}}, {{ITEM_3}}. Listas viram 2 ou 3 itens com o mesmo marcador visual da referência (bolinhas, números, traços). Não invente textos fixos: todo texto vem de marcador.
6. Cores: só var(--cor-fundo), var(--cor-texto), var(--cor-destaque), var(--cor-apoio), var(--cor-sobre-destaque), var(--cor-sobre-apoio) e neutros (#FFFFFF, #000000, #0A1628 e rgba de preto ou branco). Título colorido sobre foto (ex.: amarelo) -> var(--cor-destaque); título branco sobre foto -> #FFFFFF; título escuro em fundo claro -> var(--cor-texto). Se o título fica sobre foto, dê text-shadow suave para leitura.
7. Fontes: var(--fonte-titulo) (Poppins) com peso 600 ou 700 em títulos, selos, botões e textos que imitam manuscrito; var(--fonte-texto) (Inter) no texto corrido. Copie da referência: caixa alta ou não, alinhamento, entrelinha e o tamanho relativo de cada texto.
8. Tamanho de cada texto: font-size:calc(<N>px * var(--escala-texto)), com N proporcional ao medido na referência (tamanho em % da altura x altura da peça). Os textos variam: não fixe altura de caixas de texto (deixe crescer) e dê folga.
9. Logo: <img data-papel="logo" data-versao="branca"> sobre áreas escuras ou foto, ou data-versao="colorida" sobre áreas claras, sem src, height entre 40 e 72px, width:auto. Se a referência não tem logo, coloque um discreto num canto que não atrapalhe.
10. foto_sugerida (só se usa foto): descreva em português a foto para ser gerada por IA, reproduzindo a cena da referência e deixando o espaço dos objetos desenhados no mesmo lugar (ex.: "mão segurando um post-it amarelo em branco no centro da imagem, diante de uma mesa de escritório com teclado e monitor desfocados, céu azul ao fundo"). Sem texto na foto.
11. descricao: em português, 1 ou 2 frases sobre o layout recriado.

Se houver mais de uma imagem, recrie o padrão comum entre elas. Capriche no acabamento: é um anúncio profissional.`

interface ImagemEntrada {
  media_type?: string
  data?: string
}

interface ModeloOpenAI {
  modelo: string
  preco_entrada: number
  preco_cache_leitura: number
  preco_saida: number
}

interface Recriacao {
  descricao: string
  usa_foto: boolean
  foto_sugerida: string
  html: string
  entrada: number
  cache: number
  saida: number
}

async function recriar(
  chave: string,
  modelo: string,
  imagens: ImagemEntrada[],
  medida: keyof typeof MEDIDAS,
  observacao: string | null,
): Promise<Recriacao> {
  const { nome, raiz, observacao: extra } = MEDIDAS[medida]
  const pedido =
    `Recrie o padrão de layout destas ${imagens.length} referência(s) na medida ${nome}. ` +
    `O <div> raiz deve ter style="${raiz}". ${extra}` +
    (observacao ? `\nObservação de quem enviou: ${observacao}` : '')

  let resposta: Response
  try {
    resposta = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelo,
        max_output_tokens: 16000,
        input: [
          { role: 'system', content: INSTRUCOES },
          {
            role: 'user',
            content: [
              ...imagens.map((imagem) => ({
                type: 'input_image',
                image_url: `data:${imagem.media_type};base64,${imagem.data}`,
                detail: 'high',
              })),
              { type: 'input_text', text: pedido },
            ],
          },
        ],
        text: { format: { type: 'json_schema', name: 'layout_referencia', schema: ESQUEMA, strict: true } },
      }),
    })
  } catch (erro) {
    console.error('Erro de rede com a OpenAI', erro)
    throw new ErroAnalise('Não foi possível falar com a OpenAI agora. Tente de novo.', 502)
  }

  // deno-lint-ignore no-explicit-any
  const corpo: any = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    console.error('Erro da OpenAI', medida, resposta.status, corpo?.error)
    if (resposta.status === 401) throw new ErroAnalise('A chave da OpenAI é inválida. Confira o segredo OPENAI_API_KEY.', 500)
    if (resposta.status === 429) throw new ErroAnalise('Limite ou crédito da OpenAI esgotado. Confira a conta da OpenAI.', 429)
    if (resposta.status === 404 || corpo?.error?.code === 'model_not_found') {
      throw new ErroAnalise(`A OpenAI não aceitou o modelo "${modelo}". Confira em Editar base › Modelos de IA.`, 400)
    }
    throw new ErroAnalise(`A OpenAI devolveu um erro: ${corpo?.error?.message ?? resposta.status}`, 502)
  }

  // Junta os textos de saída; uma recusa vem como conteúdo do tipo "refusal"
  // deno-lint-ignore no-explicit-any
  const conteudos: any[] = (corpo?.output ?? []).flatMap((item: any) => (item?.type === 'message' ? item.content ?? [] : []))
  if (conteudos.some((c) => c?.type === 'refusal')) {
    throw new ErroAnalise('A IA recusou analisar estas imagens. Tente outra referência.', 422)
  }
  const json = conteudos.filter((c) => c?.type === 'output_text').map((c) => c.text).join('')
  if (!json) {
    if (corpo?.status === 'incomplete') throw new ErroAnalise('A recriação do layout ficou longa demais. Tente com menos imagens.', 422)
    throw new ErroAnalise('A IA não devolveu o layout.', 502)
  }

  let resultado: { descricao: string; usa_foto: boolean; foto_sugerida: string; html: string; fundo_referencia?: { tipo?: string } }
  try {
    resultado = JSON.parse(json)
  } catch {
    throw new ErroAnalise('A IA devolveu o layout fora do formato. Tente de novo.', 502)
  }
  if (!String(resultado.html ?? '').includes('{{GANCHO}}')) {
    throw new ErroAnalise('A IA não conseguiu recriar o layout desta vez. Tente de novo.', 502)
  }

  // A OpenAI faz cache sozinha; os tokens em cache vêm dentro dos de entrada
  // Fundo fotográfico na referência exige foto no layout
  const html = String(resultado.html)
  const usaFoto = html.includes('data-papel="foto"') || html.includes("data-papel='foto'")

  const emCache = corpo?.usage?.input_tokens_details?.cached_tokens ?? 0
  return {
    descricao: resultado.descricao,
    usa_foto: usaFoto,
    foto_sugerida: usaFoto ? resultado.foto_sugerida : '',
    html,
    entrada: Math.max((corpo?.usage?.input_tokens ?? 0) - emCache, 0),
    cache: emCache,
    saida: corpo?.usage?.output_tokens ?? 0,
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
  const chave = Deno.env.get('OPENAI_API_KEY')
  if (!supabaseUrl || !anonKey) {
    return responder({ erro: 'Função não configurada. Falta a configuração do Supabase.' }, 500)
  }
  if (!chave) {
    return responder({ erro: 'Falta a chave da OpenAI (segredo OPENAI_API_KEY).' }, 500)
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: erroUsuario } = await supabase.auth.getUser()
  if (erroUsuario || !user) {
    return responder({ erro: 'Usuário não autenticado.' }, 401)
  }

  let entrada: { imagens?: ImagemEntrada[]; observacao?: string | null; modelo?: string | null }
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

  // Modelo da OpenAI: o pedido, senão o primeiro modelo de texto ativo do catálogo
  const { data: catalogo } = await supabase
    .from('fabrica_modelos_ia')
    .select('modelo, preco_entrada, preco_cache_leitura, preco_saida')
    .eq('provedor', 'openai')
    .eq('tipo', 'texto')
    .eq('ativo', true)
    .order('ordem')
  const modelos = (catalogo ?? []) as ModeloOpenAI[]
  const modelo = modelos.find((m) => m.modelo === entrada.modelo) ?? modelos[0]
  if (!modelo) {
    return responder({ erro: 'Nenhum modelo de texto da OpenAI ativo. Ative um em Editar base › Modelos de IA.' }, 400)
  }

  const observacao = entrada.observacao?.trim() || null
  let quadrado: Recriacao
  let stories: Recriacao
  try {
    ;[quadrado, stories] = await Promise.all([
      recriar(chave, modelo.modelo, imagens, 'quadrado', observacao),
      recriar(chave, modelo.modelo, imagens, 'stories', observacao),
    ])
  } catch (erro) {
    if (erro instanceof ErroAnalise) return responder({ erro: erro.message }, erro.status)
    return responder({ erro: 'Não foi possível analisar a referência agora. Tente de novo.' }, 502)
  }

  // Custo das duas chamadas, pelo preço do catálogo
  const usoEntrada = quadrado.entrada + stories.entrada
  const usoCache = quadrado.cache + stories.cache
  const usoSaida = quadrado.saida + stories.saida
  const custoUsd =
    (usoEntrada * Number(modelo.preco_entrada) +
      usoCache * Number(modelo.preco_cache_leitura) +
      usoSaida * Number(modelo.preco_saida)) /
    1_000_000
  const cotacao = await cotacaoDolar()
  const { error: erroLote } = await supabase.from('fabrica_lotes').insert({
    id: crypto.randomUUID(),
    tipo: 'layout',
    modelo: modelo.modelo,
    quantidade: 1,
    tokens_entrada: usoEntrada,
    tokens_cache_leitura: usoCache,
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
      modelo: modelo.modelo,
    },
    200,
  )
})
