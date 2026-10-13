import { createClient } from 'npm:@supabase/supabase-js@2'

// Gera a foto de uma variação da Fábrica com a OpenAI (Image API), guarda no
// bucket privado `fabrica` e registra o custo em fabrica_lotes (tipo 'foto').
// A chave fica só aqui, como segredo da função (OPENAI_API_KEY).

const BUCKET = 'fabrica'
// Vertical: cobre o stories inteiro e, recortada ao centro, o quadrado
const TAMANHO = '1024x1536'
const QUALIDADE = 'medium'
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

// Mesma consulta da função gerar-criativos
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

// Regras fixas de estilo e de compliance, somadas à cena de cada variação
function montarPrompt(cena: string) {
  return `Fotografia publicitária realista para um anúncio de Instagram voltado a médicos no Brasil.

Cena: ${cena}

Estilo: foto real e autêntica, luz natural suave, cores naturais, leve profundidade de campo; não pode parecer banco de imagens genérico nem ilustração. Pessoas, se houver, são brasileiras, com aparência natural e diversa. Enquadramento vertical, com área mais limpa na parte de baixo, onde o texto do anúncio será colocado depois.

Proibido na imagem: qualquer texto, letra ou número; logotipos e marcas; telas com conteúdo legível; nome bordado em jaleco; marcas d'água; cenas de emergência, sangue ou procedimentos.`
}

interface Entrada {
  geracao_id?: string
  prompt?: string | null
  modelo?: string | null
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

  if (!entrada.geracao_id) {
    return responder({ erro: 'Informe a variação.' }, 400)
  }

  const [geracao, modelos] = await Promise.all([
    supabase.from('fabrica_geracoes').select('id, foto_path, foto_prompt').eq('id', entrada.geracao_id).maybeSingle(),
    supabase.from('fabrica_modelos_ia').select('*').eq('tipo', 'imagem').eq('ativo', true),
  ])

  if (geracao.error || modelos.error) {
    return responder({ erro: 'Não foi possível ler a variação.' }, 500)
  }
  if (!geracao.data) {
    return responder({ erro: 'Variação não encontrada.' }, 404)
  }

  const modelo =
    modelos.data?.find((m) => m.modelo === entrada.modelo) ??
    modelos.data?.find((m) => m.padrao) ??
    modelos.data?.[0]
  if (!modelo) {
    return responder({ erro: 'Nenhum modelo de imagem ativo. Ative um em Editar base › Modelos de IA.' }, 400)
  }

  const cena = (entrada.prompt ?? geracao.data.foto_prompt ?? '').trim()
  if (!cena) {
    return responder({ erro: 'Descreva a foto antes de gerar.' }, 400)
  }

  // 1. Gera a imagem
  let resposta: Response
  try {
    resposta = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelo.modelo,
        prompt: montarPrompt(cena),
        size: TAMANHO,
        quality: QUALIDADE,
        output_format: 'jpeg',
        output_compression: 88,
        n: 1,
      }),
    })
  } catch (erro) {
    console.error('Erro de rede com a OpenAI', erro)
    return responder({ erro: 'Não foi possível falar com a OpenAI agora. Tente de novo.' }, 502)
  }

  // deno-lint-ignore no-explicit-any
  const corpo: any = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    console.error('Erro da OpenAI', resposta.status, corpo?.error)
    if (resposta.status === 401) return responder({ erro: 'A chave da OpenAI é inválida. Confira o segredo OPENAI_API_KEY.' }, 500)
    if (resposta.status === 429) return responder({ erro: 'Limite ou crédito da OpenAI esgotado. Confira a conta da OpenAI.' }, 429)
    if (corpo?.error?.code === 'moderation_blocked' || corpo?.error?.type === 'image_generation_user_error') {
      return responder({ erro: 'A OpenAI recusou esta descrição de foto. Ajuste a descrição e tente de novo.' }, 422)
    }
    if (resposta.status === 404 || corpo?.error?.code === 'model_not_found') {
      return responder({ erro: `A OpenAI não aceitou o modelo "${modelo.modelo}". Confira em Editar base › Modelos de IA.` }, 400)
    }
    return responder({ erro: `A OpenAI devolveu um erro: ${corpo?.error?.message ?? resposta.status}` }, 502)
  }

  const base64: string | undefined = corpo?.data?.[0]?.b64_json
  if (!base64) {
    return responder({ erro: 'A OpenAI não devolveu a imagem.' }, 502)
  }

  // 2. Guarda no bucket e troca a foto da variação
  const bytes = Uint8Array.from(atob(base64), (caractere) => caractere.charCodeAt(0))
  const caminho = `fotos/${geracao.data.id}/${crypto.randomUUID()}.jpg`
  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, bytes, { contentType: 'image/jpeg' })

  if (erroUpload) {
    console.error('Erro ao guardar a foto', erroUpload)
    return responder({ erro: 'A foto foi gerada, mas não deu para guardar. Tente de novo.' }, 500)
  }

  const { error: erroAtualizacao } = await supabase
    .from('fabrica_geracoes')
    .update({ foto_path: caminho, foto_prompt: cena })
    .eq('id', geracao.data.id)

  if (erroAtualizacao) {
    await supabase.storage.from(BUCKET).remove([caminho])
    return responder({ erro: 'A foto foi gerada, mas não deu para salvar. Tente de novo.' }, 500)
  }

  if (geracao.data.foto_path) {
    await supabase.storage.from(BUCKET).remove([geracao.data.foto_path])
  }

  // 3. Custo: pelos tokens informados pela OpenAI; sem eles, pela estimativa por foto
  const tokensEntrada = Number(corpo?.usage?.input_tokens ?? 0)
  const tokensSaida = Number(corpo?.usage?.output_tokens ?? 0)
  const custoUsd = tokensEntrada || tokensSaida
    ? (tokensEntrada * Number(modelo.preco_entrada) + tokensSaida * Number(modelo.preco_saida)) / 1_000_000
    : Number(modelo.preco_por_imagem)
  const cotacao = await cotacaoDolar()

  const { data: lote, error: erroLote } = await supabase
    .from('fabrica_lotes')
    .insert({
      id: crypto.randomUUID(),
      tipo: 'foto',
      geracao_id: geracao.data.id,
      modelo: modelo.modelo,
      quantidade: 1,
      tokens_entrada: tokensEntrada,
      tokens_saida: tokensSaida,
      custo_usd: Number(custoUsd.toFixed(4)),
      cotacao_dolar: Number(cotacao.toFixed(4)),
      custo_brl: Number((custoUsd * cotacao).toFixed(4)),
      criado_por: user.email ?? null,
    })
    .select('*')
    .single()

  if (erroLote) {
    console.error('Erro ao gravar o custo da foto', erroLote)
  }

  return responder({ foto_path: caminho, foto_prompt: cena, lote: lote ?? null }, 200)
})
