import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Gera variações de criativo com IA a partir da base da Fábrica (/fabrica).
// A chave da Anthropic fica só aqui, como segredo da função (ANTHROPIC_API_KEY),
// e nunca chega ao navegador.

const MODELO = 'claude-opus-5-5'
const MAX_VARIACOES = 6
const GANCHOS_ANTERIORES = 30

// Mesma lista de src/lib/constantes.ts (OPCOES_CHAMADA_ACAO). Se mudar lá, mude aqui.
const OPCOES_CHAMADA_ACAO = [
  'Saiba mais',
  'Agendar agora',
  'Fale conosco',
  'Cadastre-se',
  'Comprar agora',
  'Enviar mensagem',
  'Sem botão',
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

function sortear<T>(itens: T[]): T {
  return itens[Math.floor(Math.random() * itens.length)]
}

// Lista vazia de vínculo = serve para todos (mesma regra de src/lib/fabrica.ts)
function servePara(ids: string[] | null | undefined, id: string | null) {
  return !id || !ids || ids.length === 0 || ids.includes(id)
}

// A marca se escreve "Fácil consulta", com "c" minúsculo
function corrigirMarca(texto: string) {
  return texto.replace(/F[áa]cil\s+Consulta/g, 'Fácil consulta')
}

// Formato exato que a IA precisa devolver (saída estruturada)
const ESQUEMA_RESPOSTA = {
  type: 'object',
  additionalProperties: false,
  required: ['variacoes'],
  properties: {
    variacoes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'persona',
          'argumento_central',
          'gancho',
          'apoio',
          'destaque',
          'cta',
          'itens',
          'antes',
          'depois',
          'texto_principal',
          'titulo_anuncio',
          'descricao_anuncio',
          'chamada_acao',
          'roteiro',
          'alertas',
        ],
        properties: {
          persona: { type: 'string' },
          argumento_central: { type: 'string' },
          gancho: { type: 'string' },
          apoio: { type: 'string' },
          destaque: { type: 'string' },
          cta: { type: 'string' },
          itens: { type: 'array', items: { type: 'string' } },
          antes: { type: 'string' },
          depois: { type: 'string' },
          texto_principal: { type: 'string' },
          titulo_anuncio: { type: 'string' },
          descricao_anuncio: { type: 'string' },
          chamada_acao: { type: 'string', enum: OPCOES_CHAMADA_ACAO },
          roteiro: { type: 'string' },
          alertas: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

interface Variacao {
  persona: string
  argumento_central: string
  gancho: string
  apoio: string
  destaque: string
  cta: string
  itens: string[]
  antes: string
  depois: string
  texto_principal: string
  titulo_anuncio: string
  descricao_anuncio: string
  chamada_acao: string
  roteiro: string
  alertas: string[]
}

interface Entrada {
  frente_id?: string
  conceito_id?: string | null
  narrativa_id?: string | null
  formato_id?: string
  persona?: string | null
  quantidade?: number
  orientacao?: string | null
}

// Parte fixa das instruções. Fica antes de tudo que muda a cada pedido, para o
// cache de prompt da Anthropic reaproveitar (e baratear) as próximas chamadas.
const INSTRUCOES = `Você é redator(a) sênior de anúncios de Meta Ads da Fácil consulta, plataforma que leva pacientes particulares do Google até a agenda de médicos. O público dos anúncios são MÉDICOS (não pacientes).

Sua tarefa: escrever variações de criativo a partir da base de conhecimento de vendas (reuniões reais de vendedores com médicos) e da combinação pedida: Conceito (a linha de produto/campanha) + Narrativa + Ângulo + Formato. Cada variação precisa usar um argumento diferente do ângulo: pode partir dos argumentos cadastrados ou criar novos, desde que coerentes com a base.

Regras de linguagem:
- Português do Brasil, falando como o médico fala (veja as diretrizes "usar"). Tom direto, humano, sem exagero.
- O nome da marca se escreve sempre "Fácil consulta", com "c" minúsculo em "consulta".
- Vender segurança e mecanismo (paciente pago e confirmado, agenda no seu horário, sem precisar aparecer), não desconto nem resultado financeiro.

Regras de compliance (inegociáveis):
- Nunca prometer resultado, faturamento, renda ou número de pacientes/consultas.
- Nunca citar preço, parcela, desconto ou garantia.
- Nunca inventar depoimento, citação atribuída a médico, caso de cliente ou número/estatística.
- Nunca usar argumentos marcados como "validar" (eles nem são enviados para você).
- Nunca citar ou segmentar especialidade médica; falar de "sua especialidade" de forma genérica.
- Nunca nomear concorrente nem usar urgência falsa ("só hoje").
- Respeitar todas as diretrizes "proibido" e "evitar" abaixo.
- Se, mesmo assim, alguma frase puder ser sensível (ex.: depende de validação jurídica), registre o motivo em "alertas". Se estiver tudo seguro, devolva "alertas" vazio.

Campos de cada variação:
- persona: para quem ela foi escrita, em poucas palavras.
- argumento_central: o argumento usado, em uma frase.
- gancho: título da arte, até 12 palavras. Primeiros 3 segundos: dor ou pergunta que o médico reconhece.
- apoio: texto de apoio da arte, até 22 palavras.
- destaque: selo curto da arte, até 4 palavras (ex.: "Sem dancinha", "Paciente já pago").
- cta: texto do botão da arte, até 4 palavras.
- itens: exatamente 3 passos curtos (até 6 palavras cada), usados no layout de etapas.
- antes: a situação de hoje, até 10 palavras (layout comparativo).
- depois: a mesma situação com a Fácil consulta, até 10 palavras (layout comparativo).
- texto_principal: legenda do anúncio no Meta, de 2 a 5 frases curtas; pode usar quebras de linha; terminar com convite para ver se a especialidade tem demanda.
- titulo_anuncio: título do anúncio no Meta, até 40 caracteres.
- descricao_anuncio: descrição do anúncio no Meta, até 30 caracteres.
- chamada_acao: uma das opções permitidas pelo esquema.
- roteiro: só para formato de vídeo. Roteiro de 20 a 30 segundos, com blocos marcados por tempo ([0-3s], [3-12s] etc.), indicando fala e texto na tela, seguindo a narrativa. Para formato estático, devolva string vazia.

Formato estático: a MESMA arte é entregue em duas medidas, quadrada (1080×1080, feed) e stories (1080×1920). Escreva textos curtos que funcionem bem nas duas.
- alertas: lista de pontos de atenção de compliance (ou vazia).

Escreva cada variação com um gancho realmente diferente das outras e dos ganchos já usados que forem informados.`

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
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')

  if (!supabaseUrl || !anonKey || !anthropicKey) {
    return responder({ erro: 'Função não configurada. Falta a chave da IA ou do Supabase.' }, 500)
  }

  // Cliente com o token do próprio usuário: as regras de acesso (RLS) valem aqui
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  })
  const { data: { user }, error: erroUsuario } = await supabase.auth.getUser()

  if (erroUsuario || !user) {
    return responder({ erro: 'Usuário não autenticado.' }, 401)
  }

  let entrada: Entrada
  try {
    entrada = await request.json()
  } catch {
    return responder({ erro: 'Dados inválidos.' }, 400)
  }

  const quantidade = Math.min(Math.max(Math.round(entrada.quantidade ?? 3), 1), MAX_VARIACOES)

  if (!entrada.frente_id || !entrada.formato_id) {
    return responder({ erro: 'Escolha o conceito e o formato.' }, 400)
  }

  // Base da fábrica (só itens ativos)
  const [conceitos, narrativas, formato, layouts, paletas, diretrizes, base, frente] = await Promise.all([
    supabase.from('fabrica_conceitos').select('*').eq('ativo', true),
    supabase.from('fabrica_narrativas').select('*').eq('ativo', true),
    supabase.from('fabrica_formatos').select('*').eq('id', entrada.formato_id).maybeSingle(),
    supabase.from('fabrica_layouts').select('id').eq('ativo', true),
    supabase.from('fabrica_paletas').select('id').eq('ativo', true),
    supabase.from('fabrica_diretrizes').select('tipo, texto').eq('ativo', true).order('created_at'),
    supabase.from('fabrica_base_conhecimento').select('conteudo').limit(1).maybeSingle(),
    supabase.from('frentes').select('nome').eq('id', entrada.frente_id).maybeSingle(),
  ])

  const erroBase = [conceitos, narrativas, formato, layouts, paletas, diretrizes, base, frente].find((r) => r.error)
  if (erroBase) {
    return responder({ erro: 'Não foi possível ler a base da fábrica.' }, 500)
  }

  if (!formato.data) {
    return responder({ erro: 'Formato não encontrado.' }, 400)
  }

  // Cascata: Conceito (frente) → Narrativa → Ângulo. "Surpreenda-me" sorteia
  // só entre os que combinam com as escolhas anteriores.
  const frenteId = entrada.frente_id
  const narrativasDoConceito = (narrativas.data ?? []).filter((n) => servePara(n.frente_ids, frenteId))
  const conceitoEscolhido = entrada.conceito_id
    ? conceitos.data?.find((c) => c.id === entrada.conceito_id)
    : undefined
  const narrativa = entrada.narrativa_id
    ? narrativasDoConceito.find((n) => n.id === entrada.narrativa_id)
    : sortear(
        // Se o ângulo já foi escolhido, sorteia uma narrativa que combine com ele
        narrativasDoConceito.filter((n) => servePara(conceitoEscolhido?.narrativa_ids, n.id)).length
          ? narrativasDoConceito.filter((n) => servePara(conceitoEscolhido?.narrativa_ids, n.id))
          : narrativasDoConceito,
      )

  if (!narrativa) {
    return responder({ erro: 'Nenhuma narrativa ativa combina com este conceito.' }, 400)
  }

  const angulosPossiveis = (conceitos.data ?? []).filter(
    (c) => servePara(c.frente_ids, frenteId) && servePara(c.narrativa_ids, narrativa.id),
  )
  const conceito = conceitoEscolhido ?? (angulosPossiveis.length ? sortear(angulosPossiveis) : undefined)

  if (!conceito) {
    return responder({ erro: 'Nenhum ângulo ativo combina com este conceito e narrativa.' }, 400)
  }

  if (!layouts.data?.length || !paletas.data?.length) {
    return responder({ erro: 'Ative pelo menos um layout e uma paleta na base da fábrica.' }, 400)
  }

  const [argumentos, anteriores] = await Promise.all([
    supabase
      .from('fabrica_argumentos')
      .select('tipo, texto, origem')
      .eq('conceito_id', conceito.id)
      .eq('ativo', true)
      .eq('uso', 'seguro'),
    supabase
      .from('fabrica_geracoes')
      .select('texto_arte')
      .eq('conceito_id', conceito.id)
      .order('created_at', { ascending: false })
      .limit(GANCHOS_ANTERIORES),
  ])

  const ganchosAnteriores = (anteriores.data ?? [])
    .map((linha) => (linha.texto_arte as { gancho?: string })?.gancho)
    .filter(Boolean)

  const diretrizesTexto = ['usar', 'evitar', 'proibido']
    .map((tipo) => {
      const linhas = (diretrizes.data ?? []).filter((d) => d.tipo === tipo).map((d) => `- ${d.texto}`)
      return linhas.length ? `Diretrizes "${tipo}":\n${linhas.join('\n')}` : ''
    })
    .filter(Boolean)
    .join('\n\n')

  const documentoBase = base.data?.conteudo?.trim()

  const sistema = [
    INSTRUCOES,
    diretrizesTexto,
    documentoBase
      ? `<base_de_conhecimento>\n${documentoBase}\n</base_de_conhecimento>`
      : 'A base de conhecimento completa ainda não foi cadastrada; use o conceito, os argumentos e as diretrizes.',
  ].join('\n\n')

  const argumentosTexto = (argumentos.data ?? [])
    .map((a) => `- [${a.tipo}] ${a.texto}${a.origem ? ` (origem: ${a.origem})` : ''}`)
    .join('\n')

  const pedido = `Gere ${quantidade} variação(ões) de criativo.

Conceito (linha de produto/campanha): ${frente.data?.nome ?? 'não informado'}

Ângulo: ${conceito.nome}
- Mensagem: ${conceito.mensagem}
- Personas: ${conceito.personas ?? 'todas'}
- Nível de consciência: ${conceito.consciencia}
- Objeção que o criativo antecipa: ${conceito.objecao ?? '—'}
- Roteiro de referência: ${conceito.roteiro_referencia ?? '—'}
- Cuidados: ${conceito.cuidados ?? '—'}

Argumentos cadastrados para este ângulo:
${argumentosTexto || '- (nenhum; crie a partir da base)'}

Formato: ${formato.data.nome} (${formato.data.tipo === 'video' ? `vídeo: preencha o roteiro; capa ${formato.data.proporcao}` : 'estático: a mesma arte sai em quadrado 1:1 e stories 9:16; roteiro vazio'})
${formato.data.descricao ?? ''}

Narrativa: ${narrativa.nome}
Estrutura:
${narrativa.estrutura}
${entrada.persona ? `\nPersona alvo: ${entrada.persona}` : ''}${entrada.orientacao?.trim() ? `\nOrientação extra do gestor de tráfego: ${entrada.orientacao.trim()}` : ''}

Ganchos já usados neste ângulo (não repita nem parafraseie de perto):
${ganchosAnteriores.length ? ganchosAnteriores.map((g) => `- ${g}`).join('\n') : '- (nenhum ainda)'}`

  const anthropic = new Anthropic({ apiKey: anthropicKey })

  let variacoes: Variacao[]
  try {
    const resposta = await anthropic.beta.messages.create({
      model: MODELO,
      max_tokens: 16000,
      // Se o filtro de segurança recusar, a Anthropic refaz em outro modelo
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: ESQUEMA_RESPOSTA },
      },
      system: [{ type: 'text', text: sistema, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: pedido }],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming)

    if (resposta.stop_reason === 'refusal') {
      return responder({ erro: 'A IA recusou este pedido. Ajuste a orientação e tente de novo.' }, 422)
    }

    if (resposta.stop_reason === 'max_tokens') {
      return responder({ erro: 'A resposta da IA ficou longa demais. Peça menos variações.' }, 422)
    }

    const texto = resposta.content.find((bloco) => bloco.type === 'text')
    if (!texto || texto.type !== 'text') {
      return responder({ erro: 'A IA não devolveu texto.' }, 502)
    }

    // Corrige a grafia da marca em todos os textos devolvidos
    const corrigido = JSON.parse(texto.text, (_chave, valor) => (typeof valor === 'string' ? corrigirMarca(valor) : valor))
    variacoes = (corrigido as { variacoes: Variacao[] }).variacoes ?? []
  } catch (erro) {
    console.error('Erro ao chamar a IA', erro)
    if (erro instanceof Anthropic.AuthenticationError) {
      return responder({ erro: 'A chave da IA é inválida. Confira o segredo ANTHROPIC_API_KEY.' }, 500)
    }
    if (erro instanceof Anthropic.RateLimitError) {
      return responder({ erro: 'Muitos pedidos à IA agora. Espere um minuto e tente de novo.' }, 429)
    }
    return responder({ erro: 'Não foi possível gerar os criativos agora. Tente de novo.' }, 502)
  }

  if (variacoes.length === 0) {
    return responder({ erro: 'A IA não devolveu nenhuma variação.' }, 502)
  }

  // Layout e paleta são sorteados entre os ativos, sem repetir enquanto der.
  // Na tela dá para trocar os dois sem gastar IA.
  const layoutsEmbaralhados = [...layouts.data].sort(() => Math.random() - 0.5)
  const paletasEmbaralhadas = [...paletas.data].sort(() => Math.random() - 0.5)
  const loteId = crypto.randomUUID()

  const linhas = variacoes.slice(0, quantidade).map((v, indice) => ({
    lote_id: loteId,
    frente_id: entrada.frente_id,
    conceito_id: conceito.id,
    narrativa_id: narrativa.id,
    formato_id: formato.data.id,
    layout_id: layoutsEmbaralhados[indice % layoutsEmbaralhados.length].id,
    paleta_id: paletasEmbaralhadas[indice % paletasEmbaralhadas.length].id,
    persona: v.persona || entrada.persona || null,
    argumento_central: v.argumento_central,
    texto_arte: {
      gancho: v.gancho,
      apoio: v.apoio,
      destaque: v.destaque,
      cta: v.cta,
      itens: (v.itens ?? []).slice(0, 3),
      antes: v.antes,
      depois: v.depois,
    },
    texto_principal: v.texto_principal,
    titulo_anuncio: v.titulo_anuncio,
    descricao_anuncio: v.descricao_anuncio,
    chamada_acao: v.chamada_acao,
    roteiro: formato.data.tipo === 'video' ? v.roteiro || null : null,
    alertas: v.alertas ?? [],
    criado_por: user.email ?? null,
  }))

  const { data: geracoes, error: erroGravacao } = await supabase
    .from('fabrica_geracoes')
    .insert(linhas)
    .select('*')

  if (erroGravacao) {
    console.error('Erro ao gravar gerações', erroGravacao)
    return responder({ erro: 'Os criativos foram gerados, mas não deu para salvar. Tente de novo.' }, 500)
  }

  return responder({ geracoes }, 200)
})
