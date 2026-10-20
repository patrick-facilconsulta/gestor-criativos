import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Leitura visual de um criativo do Meta: uma IA com visão responde um
// questionário FECHADO sobre a imagem do anúncio (texto na arte, tipo de peça,
// pessoas, quantidade de texto...). Nada de medidas ou posições: é aí que os
// modelos de visão erram (ver layouts por referência).
// Uma chamada = um anúncio, lido pelos modelos pedidos em paralelo. A tela chama
// anúncio por anúncio (cabe no tempo da função). Grava em meta_leituras_visuais
// e o custo em fabrica_lotes (tipo 'leitura'). Não fala com o Meta: a imagem já
// está em meta_anuncios.imagem_url.

const COTACAO_PADRAO = Number(Deno.env.get('COTACAO_DOLAR_PADRAO') ?? '5.0')
const MAX_MODELOS = 3

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

// Questionário: respostas checáveis, com opções fechadas sempre que possível
const ESQUEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'texto_na_arte',
    'titulo_principal',
    'formato_titulo',
    'quantidade_texto',
    'tipo_peca',
    'pessoas',
    'mostra_produto',
    'elemento_principal',
    'tem_botao',
    'tem_logo',
    'fundo',
    'cor_predominante',
    'legibilidade',
    'resumo',
  ],
  properties: {
    texto_na_arte: { type: 'string' },
    titulo_principal: { type: 'string' },
    formato_titulo: { type: 'string', enum: ['pergunta', 'afirmacao', 'numero_ou_estatistica', 'convite_ou_ordem', 'sem_titulo'] },
    quantidade_texto: { type: 'string', enum: ['pouco', 'medio', 'muito'] },
    tipo_peca: {
      type: 'string',
      enum: ['foto', 'foto_com_texto', 'arte_grafica', 'tela_de_celular_ou_sistema', 'busca_do_google', 'pessoa_falando_para_camera', 'outro'],
    },
    pessoas: { type: 'string', enum: ['nenhuma', 'medico', 'paciente', 'medico_e_paciente', 'pessoa_sem_papel_claro'] },
    mostra_produto: { type: 'boolean' },
    elemento_principal: { type: 'string' },
    tem_botao: { type: 'boolean' },
    tem_logo: { type: 'boolean' },
    fundo: { type: 'string', enum: ['claro', 'escuro', 'colorido', 'foto'] },
    cor_predominante: {
      type: 'string',
      enum: ['azul', 'branco', 'preto_ou_azul_marinho', 'verde', 'amarelo_ou_laranja', 'vermelho_ou_rosa', 'cinza', 'outra'],
    },
    legibilidade: { type: 'string', enum: ['boa', 'parcial', 'ruim'] },
    resumo: { type: 'string' },
  },
}

const INSTRUCOES = `Você analisa criativos de anúncios do Meta (Facebook/Instagram) da Fácil consulta, plataforma que leva pacientes particulares até a agenda de MÉDICOS. O público dos anúncios são médicos.
Responda o questionário sobre a imagem com objetividade. Descreva só o que está visível; não deduza nem invente. Na dúvida, escolha a opção mais neutra ("outro", "pessoa_sem_papel_claro", false).

- texto_na_arte: transcreva TODO texto escrito na imagem, exatamente como está (mesma grafia, sem corrigir), na ordem de leitura, separando blocos com " | ". Ignore emojis e textos minúsculos de interface ilegíveis. Vazio se não houver texto.
- titulo_principal: o texto de maior destaque visual, exatamente como escrito. Vazio se não houver.
- formato_titulo: forma do título principal. "convite_ou_ordem" = chamada como "Cadastre-se", "Descubra...". "sem_titulo" se não houver.
- quantidade_texto: pouco = até 8 palavras na arte; medio = 9 a 25; muito = mais de 25.
- tipo_peca: "foto" = fotografia quase sem texto; "foto_com_texto" = fotografia com textos por cima; "arte_grafica" = peça desenhada (formas, cores chapadas, ícones), sem foto como base; "tela_de_celular_ou_sistema" = mostra tela de celular, app, agenda ou sistema; "busca_do_google" = imita resultado de busca do Google; "pessoa_falando_para_camera" = quadro de vídeo com pessoa falando.
- pessoas: quem aparece. "medico" = jaleco, estetoscópio ou consultório evidente; "paciente" = pessoa sendo atendida ou claramente paciente.
- mostra_produto: true se aparece a plataforma (tela da agenda, perfil, app ou site da Fácil consulta).
- elemento_principal: o que chama atenção primeiro, em até 10 palavras.
- tem_botao: true se há um botão desenhado na arte (ex.: "Saiba mais"). Não conte botões da interface do Meta.
- tem_logo: true se a logo da Fácil consulta aparece.
- fundo e cor_predominante: o que ocupa a maior parte da área.
- legibilidade: qualidade da imagem para esta leitura (resolução, corte).
- resumo: 1 ou 2 frases descrevendo a peça.
Se a imagem for a capa de um vídeo, analise só o quadro mostrado.`

interface ModeloIA {
  provedor: 'anthropic' | 'openai'
  modelo: string
  preco_entrada: number
  preco_cache_leitura: number
  preco_saida: number
}

interface Leitura {
  leitura: Record<string, unknown>
  entrada: number
  saida: number
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

async function lerComAnthropic(modelo: ModeloIA, imagem: { data: string; tipo: string }, pedido: string): Promise<Leitura> {
  const chave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!chave) throw new ErroLeitura('Falta a chave da Anthropic (segredo ANTHROPIC_API_KEY).', 500)
  const anthropic = new Anthropic({ apiKey: chave })
  const resposta = await anthropic.beta.messages.create({
    model: modelo.modelo,
    max_tokens: 4000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: ESQUEMA } },
    system: INSTRUCOES,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: imagem.tipo, data: imagem.data } },
          { type: 'text', text: pedido },
        ],
      },
    ],
  } as Anthropic.Beta.MessageCreateParamsNonStreaming)
  if (resposta.stop_reason === 'refusal') throw new ErroLeitura('A IA recusou analisar esta imagem.', 422)
  const texto = resposta.content.find((bloco) => bloco.type === 'text')
  if (!texto || texto.type !== 'text') throw new ErroLeitura('A IA não devolveu a leitura.', 502)
  return {
    leitura: JSON.parse(texto.text),
    entrada: (resposta.usage.input_tokens ?? 0) + (resposta.usage.cache_read_input_tokens ?? 0),
    saida: resposta.usage.output_tokens ?? 0,
  }
}

async function lerComOpenAI(modelo: ModeloIA, imagem: { data: string; tipo: string }, pedido: string): Promise<Leitura> {
  const chave = Deno.env.get('OPENAI_API_KEY')
  if (!chave) throw new ErroLeitura('Falta a chave da OpenAI (segredo OPENAI_API_KEY).', 500)
  const resposta = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelo.modelo,
      max_output_tokens: 4000,
      input: [
        { role: 'system', content: INSTRUCOES },
        {
          role: 'user',
          content: [
            { type: 'input_image', image_url: `data:${imagem.tipo};base64,${imagem.data}`, detail: 'high' },
            { type: 'input_text', text: pedido },
          ],
        },
      ],
      text: { format: { type: 'json_schema', name: 'leitura_criativo', schema: ESQUEMA, strict: true } },
    }),
  })
  // deno-lint-ignore no-explicit-any
  const corpo: any = await resposta.json().catch(() => null)
  if (!resposta.ok) throw new ErroLeitura(`A OpenAI devolveu um erro: ${corpo?.error?.message ?? resposta.status}`, 502)
  // deno-lint-ignore no-explicit-any
  const conteudos: any[] = (corpo?.output ?? []).flatMap((item: any) => (item?.type === 'message' ? item.content ?? [] : []))
  if (conteudos.some((c) => c?.type === 'refusal')) throw new ErroLeitura('A IA recusou analisar esta imagem.', 422)
  const json = conteudos.filter((c) => c?.type === 'output_text').map((c) => c.text).join('')
  if (!json) throw new ErroLeitura('A IA não devolveu a leitura.', 502)
  return { leitura: JSON.parse(json), entrada: corpo?.usage?.input_tokens ?? 0, saida: corpo?.usage?.output_tokens ?? 0 }
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

  let entrada: { ad_id?: string; modelos?: string[]; refazer?: boolean }
  try {
    entrada = await request.json()
  } catch {
    return responder({ erro: 'Dados inválidos.' }, 400)
  }
  const nomesModelos = [...new Set(entrada.modelos ?? [])].slice(0, MAX_MODELOS)
  if (!entrada.ad_id || nomesModelos.length === 0) {
    return responder({ erro: 'Informe o anúncio e os modelos.' }, 400)
  }

  const [{ data: anuncio }, { data: catalogo }, { data: feitas }] = await Promise.all([
    supabase.from('meta_anuncios').select('ad_id, nome, imagem_url, thumbnail_url').eq('ad_id', entrada.ad_id).maybeSingle(),
    supabase.from('fabrica_modelos_ia').select('provedor, modelo, preco_entrada, preco_cache_leitura, preco_saida').eq('tipo', 'texto').eq('ativo', true).in('modelo', nomesModelos),
    supabase.from('meta_leituras_visuais').select('modelo').eq('ad_id', entrada.ad_id).not('leitura', 'is', null),
  ])
  if (!anuncio) return responder({ erro: 'Anúncio não encontrado. Atualize os resultados em Desempenho.' }, 404)
  const url = anuncio.imagem_url || anuncio.thumbnail_url
  if (!url) return responder({ erro: 'Este anúncio não tem imagem.' }, 400)

  const jaFeitos = new Set(entrada.refazer ? [] : (feitas ?? []).map((f) => f.modelo as string))
  const modelos = ((catalogo ?? []) as ModeloIA[]).filter((m) => !jaFeitos.has(m.modelo))
  if (modelos.length === 0) return responder({ leituras: 0 }, 200)

  try {
    const imagem = await imagemEmBase64(url)
    const pedido = `Anúncio "${anuncio.nome}". Responda o questionário sobre esta imagem.`
    const cotacao = await cotacaoDolar()

    const resultados = await Promise.all(
      modelos.map(async (modelo) => {
        try {
          const lida = modelo.provedor === 'openai' ? await lerComOpenAI(modelo, imagem, pedido) : await lerComAnthropic(modelo, imagem, pedido)
          const custoUsd = (lida.entrada * Number(modelo.preco_entrada) + lida.saida * Number(modelo.preco_saida)) / 1_000_000
          return { modelo: modelo.modelo, leitura: lida.leitura, erro: null, entrada: lida.entrada, saida: lida.saida, custoUsd }
        } catch (erro) {
          console.error('Leitura', modelo.modelo, erro)
          return { modelo: modelo.modelo, leitura: null, erro: erro instanceof Error ? erro.message : 'Erro na leitura.', entrada: 0, saida: 0, custoUsd: 0 }
        }
      }),
    )

    await supabase.from('meta_leituras_visuais').upsert(
      resultados.map((r) => ({
        ad_id: anuncio.ad_id,
        modelo: r.modelo,
        leitura: r.leitura,
        erro: r.erro,
        tokens_entrada: r.entrada,
        tokens_saida: r.saida,
        custo_brl: Number((r.custoUsd * cotacao).toFixed(4)),
        criado_por: user.email ?? null,
        created_at: new Date().toISOString(),
      })),
      { onConflict: 'ad_id,modelo' },
    )

    // Custo de cada leitura no mesmo registro de custos da Fábrica
    await supabase.from('fabrica_lotes').insert(
      resultados
        .filter((r) => r.leitura)
        .map((r) => ({
          id: crypto.randomUUID(),
          tipo: 'leitura',
          modelo: r.modelo,
          quantidade: 1,
          tokens_entrada: r.entrada,
          tokens_saida: r.saida,
          custo_usd: Number(r.custoUsd.toFixed(4)),
          cotacao_dolar: Number(cotacao.toFixed(4)),
          custo_brl: Number((r.custoUsd * cotacao).toFixed(4)),
          criado_por: user.email ?? null,
        })),
    )

    const erros = resultados.filter((r) => r.erro)
    return responder({ leituras: resultados.length - erros.length, erros: erros.map((e) => `${e.modelo}: ${e.erro}`) }, 200)
  } catch (erro) {
    if (erro instanceof ErroLeitura) return responder({ erro: erro.message }, erro.status)
    console.error('Erro na leitura visual', erro)
    return responder({ erro: 'Não foi possível ler este criativo agora. Tente de novo.' }, 500)
  }
})
