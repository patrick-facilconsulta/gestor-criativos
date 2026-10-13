import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Analisa imagens de referência (anúncios, peças do Canva/Figma) e devolve a
// especificação de um layout da Fábrica no mesmo padrão, mais as cores. O
// esquema é o mesmo de src/lib/layout-referencia.ts.

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

// Cor em #RRGGBB (validada depois da resposta)
const HEX = { type: 'string' }

// Cores da marca usadas quando a IA devolve uma cor inválida
const CORES_PADRAO: Record<string, string> = { fundo: '#0A2C53', texto: '#FFFFFF', destaque: '#2985F0', apoio: '#061C36' }

const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['especificacao', 'cores'],
  properties: {
    especificacao: {
      type: 'object',
      additionalProperties: false,
      required: [
        'descricao', 'fundo', 'lado_foto', 'alinhamento', 'posicao_texto', 'posicao_logo', 'escala_titulo',
        'caixa_alta', 'destacar_palavra', 'apoio', 'selo', 'cta', 'elemento', 'decoracao',
      ],
      properties: {
        descricao: { type: 'string' },
        fundo: { type: 'string', enum: ['solido', 'gradiente', 'foto-inteira', 'foto-metade'] },
        lado_foto: { type: 'string', enum: ['topo', 'base', 'esquerda', 'direita'] },
        alinhamento: { type: 'string', enum: ['esquerda', 'centro'] },
        posicao_texto: { type: 'string', enum: ['topo', 'centro', 'base'] },
        posicao_logo: { type: 'string', enum: ['topo', 'base'] },
        escala_titulo: { type: 'string', enum: ['media', 'grande', 'gigante'] },
        caixa_alta: { type: 'boolean' },
        destacar_palavra: { type: 'boolean' },
        apoio: { type: 'string', enum: ['nenhum', 'texto', 'cartao'] },
        selo: { type: 'string', enum: ['nenhum', 'pilula', 'faixa'] },
        cta: { type: 'string', enum: ['nenhum', 'botao', 'botao-largo', 'texto'] },
        elemento: { type: 'string', enum: ['nenhum', 'notificacao', 'etapas', 'foto-circulo', 'foto-cartao'] },
        decoracao: { type: 'string', enum: ['nenhuma', 'circulos', 'linhas', 'pontos', 'moldura'] },
      },
    },
    cores: {
      type: 'object',
      additionalProperties: false,
      required: ['fundo', 'texto', 'destaque', 'apoio'],
      properties: { fundo: HEX, texto: HEX, destaque: HEX, apoio: HEX },
    },
  },
}

const INSTRUCOES = `Você é diretor(a) de arte. Recebe imagens de referência de anúncios (feed ou stories) e descreve o PADRÃO visual delas com as opções de um gerador de layouts. O gerador sempre usa o logo e as fontes da marca Fácil consulta; você descreve estrutura, hierarquia e estilo, não o conteúdo.

Escolha, para cada campo, a opção mais próxima da referência:
- descricao: em português, 1 ou 2 frases sobre o padrão que você identificou (ex.: "Foto ocupando a metade de cima, título grande em caixa alta alinhado à esquerda e botão largo no rodapé").
- fundo: "solido" (uma cor só), "gradiente" (degradê), "foto-inteira" (foto ocupa tudo com texto por cima), "foto-metade" (foto em uma parte, texto em outra área de cor).
- lado_foto: só importa em "foto-metade"; se não houver foto, use "topo".
- alinhamento: alinhamento predominante do texto.
- posicao_texto: onde o bloco principal de texto fica na altura da peça.
- posicao_logo: logo no topo ou na base (se não houver logo, use "topo").
- escala_titulo: "media", "grande" ou "gigante" (título ocupando boa parte da peça).
- caixa_alta: título todo em maiúsculas?
- destacar_palavra: alguma palavra do título aparece em outra cor?
- apoio: texto de apoio simples, dentro de um cartão/caixa, ou nenhum.
- selo: etiqueta curta acima do título em formato de pílula, em faixa reta, ou nenhum.
- cta: botão normal, botão largo (ocupando a largura), só texto/link, ou nenhum.
- elemento: elemento visual além do texto: "notificacao" (mockup de celular/notificação/tela), "etapas" (lista numerada/passos), "foto-circulo" (foto recortada em círculo), "foto-cartao" (foto em caixa arredondada), ou "nenhum". Se a foto for o fundo, use "nenhum" aqui.
- decoracao: formas de fundo: "circulos", "linhas" (listras/diagonais), "pontos" (malha de pontos), "moldura" (borda interna) ou "nenhuma".
- cores: 4 cores em hexadecimal tiradas da referência: fundo (cor dominante do fundo), texto (cor do título), destaque (botões, selos, palavra destacada) e apoio (cartões, segunda cor). Garanta contraste legível entre texto e fundo.

Se houver mais de uma imagem, descreva o padrão comum entre elas.`

interface ImagemEntrada {
  media_type?: string
  data?: string
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
  let resultado: { especificacao: Record<string, unknown>; cores: Record<string, string> }
  let usoEntrada = 0
  let usoSaida = 0
  try {
    const resposta = await anthropic.beta.messages.create({
      model: MODELO,
      max_tokens: 4000,
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
              text: `Descreva o padrão visual destas ${imagens.length} referência(s).${entrada.observacao?.trim() ? `\nObservação de quem enviou: ${entrada.observacao.trim()}` : ''}`,
            },
          ],
        },
      ],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming)

    usoEntrada = resposta.usage.input_tokens ?? 0
    usoSaida = resposta.usage.output_tokens ?? 0

    if (resposta.stop_reason === 'refusal') {
      return responder({ erro: 'A IA recusou analisar estas imagens. Tente outra referência.' }, 422)
    }
    const texto = resposta.content.find((bloco) => bloco.type === 'text')
    if (!texto || texto.type !== 'text') {
      return responder({ erro: 'A IA não devolveu a análise.' }, 502)
    }
    resultado = JSON.parse(texto.text)
  } catch (erro) {
    console.error('Erro ao analisar referência', erro)
    if (erro instanceof Anthropic.AuthenticationError) {
      return responder({ erro: 'A chave da Anthropic é inválida. Confira o segredo ANTHROPIC_API_KEY.' }, 500)
    }
    if (erro instanceof Anthropic.RateLimitError) {
      return responder({ erro: 'Muitos pedidos à IA agora. Espere um minuto e tente de novo.' }, 429)
    }
    return responder({ erro: 'Não foi possível analisar a referência agora. Tente de novo.' }, 502)
  }

  // Custo da análise (preço do catálogo, se houver)
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

  const cores = Object.fromEntries(
    Object.entries(CORES_PADRAO).map(([nome, padrao]) => {
      const cor = String(resultado.cores?.[nome] ?? '').trim().toUpperCase()
      return [nome, /^#[0-9A-F]{6}$/.test(cor) ? cor : padrao]
    }),
  )

  return responder({ especificacao: resultado.especificacao, cores, custo_brl: Number((custoUsd * cotacao).toFixed(4)) }, 200)
})
