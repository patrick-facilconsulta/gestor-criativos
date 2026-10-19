// Única porta do sistema para o Meta (Graph API / Marketing API).
//
// REGRA DE OURO: o sistema nunca edita, pausa, despublica nem exclui nada que
// já existe no Meta. Ele só LÊ e CRIA, e o que cria nasce PAUSADO, dentro da
// campanha própria da Fábrica. As travas abaixo garantem isso no servidor:
//
// 1. Leitura (GET) é livre.
// 2. Escrita (POST) só nos caminhos exatos de criação da conta configurada:
//    act_<conta>/campaigns, /adsets, /adimages, /adcreatives e /ads.
//    No Meta, editar ou pausar é um POST no id do próprio objeto — esse caminho
//    é recusado, assim como qualquer DELETE (não há função para isso aqui).
// 3. Campanha, conjunto e anúncio nascem com status PAUSED, seja qual for o pedido.
// 4. Conjunto novo só entra em campanha criada pelo sistema; anúncio novo só
//    entra em conjunto criado pelo sistema (lista vinda de meta_objetos, que só
//    o servidor grava). Anúncio novo em conjunto existente faria o conjunto
//    voltar ao aprendizado.
// 5. Orçamento: só no conjunto (campanha sem orçamento próprio), com teto fixo.
//
// Nenhuma outra função deve chamar graph.facebook.com diretamente.

export const META_VERSAO = 'v26.0'
export const META_BASE = `https://graph.facebook.com/${META_VERSAO}`

// Teto fixo de orçamento diário por conjunto, em reais (vale mesmo se a
// configuração da tela for maior)
export const TETO_FIXO_ORCAMENTO_DIARIO = 300
// Teto fixo do limite de gasto total da campanha da Fábrica, em reais
export const TETO_FIXO_CAMPANHA = 20000

// Caminho de criação → tipo do objeto registrado em meta_objetos
export const CRIACOES = {
  campaigns: 'campaign',
  adsets: 'adset',
  adimages: 'adimage',
  adcreatives: 'adcreative',
  ads: 'ad',
} as const

export type CaminhoCriacao = keyof typeof CRIACOES

const COM_STATUS: CaminhoCriacao[] = ['campaigns', 'adsets', 'ads']

export class ErroMeta extends Error {
  status: number
  detalhe?: unknown

  constructor(message: string, status = 502, detalhe?: unknown) {
    super(message)
    this.status = status
    this.detalhe = detalhe
  }
}

// Conta configurada, no formato act_<números>
export function contaConfigurada(): string {
  const bruto = (Deno.env.get('META_AD_ACCOUNT_ID') ?? '').trim().replace(/^act_/, '')
  if (!/^\d+$/.test(bruto)) {
    throw new ErroMeta('Falta configurar a conta do Meta (segredo META_AD_ACCOUNT_ID).', 500)
  }
  return `act_${bruto}`
}

function token(): string {
  const valor = Deno.env.get('META_ACCESS_TOKEN')?.trim()
  if (!valor) {
    throw new ErroMeta('Falta o token do Meta (segredo META_ACCESS_TOKEN).', 500)
  }
  return valor
}

// appsecret_proof: exigido quando o app do Meta tem "Exigir chave secreta" ligado
async function provaSecreta(): Promise<string | null> {
  const segredo = Deno.env.get('META_APP_SECRET')?.trim()
  if (!segredo) return null
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const assinatura = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(token()))
  return [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// Validação da escrita (função pura: testada fora do Deno)
// ---------------------------------------------------------------------------

export interface PedidoCriacao {
  caminho: string
  campos: Record<string, unknown>
}

// Confere um pedido de criação e devolve os campos que podem ir ao Meta.
// `objetosDaFabrica`: ids de campanhas e conjuntos criados pelo sistema.
export function validarCriacao(
  pedido: PedidoCriacao,
  conta: string,
  objetosDaFabrica: ReadonlySet<string>,
): { tipo: CaminhoCriacao; campos: Record<string, unknown> } {
  const partes = pedido.caminho.split('/')
  const tipo = partes[1] as CaminhoCriacao

  // Só act_<conta>/<criação>, sem nada antes ou depois
  if (partes.length !== 2 || partes[0] !== conta || !(tipo in CRIACOES)) {
    throw new ErroMeta(`Escrita bloqueada pela trava de segurança: o caminho "${pedido.caminho}" não é de criação na conta da Fábrica.`, 400)
  }

  const campos: Record<string, unknown> = { ...pedido.campos }

  // Campos que mudariam a natureza do pedido: id de objeto existente, cópia etc.
  // `method` e `batch` mudariam o tipo da chamada (o Graph API aceita method=delete)
  for (const proibido of ['id', 'ids', 'copy_from', 'source_campaign_id', 'source_adset_id', 'source_ad_id', 'access_token', 'method', 'batch']) {
    if (Object.keys(campos).some((chave) => chave.toLowerCase() === proibido)) {
      throw new ErroMeta(`Escrita bloqueada pela trava de segurança: campo "${proibido}" não é permitido.`, 400)
    }
  }

  if (COM_STATUS.includes(tipo)) {
    campos.status = 'PAUSED'
  }

  if (tipo === 'campaigns') {
    if ('daily_budget' in campos || 'lifetime_budget' in campos) {
      throw new ErroMeta('Escrita bloqueada: a campanha da Fábrica não tem orçamento próprio (o orçamento fica no conjunto).', 400)
    }
    const teto = Number(campos.spend_cap)
    if (!Number.isFinite(teto) || teto <= 0 || teto > TETO_FIXO_CAMPANHA * 100) {
      throw new ErroMeta('Escrita bloqueada: a campanha da Fábrica precisa de limite de gasto dentro do teto.', 400)
    }
  }

  if (tipo === 'adsets') {
    if (!objetosDaFabrica.has(String(campos.campaign_id ?? ''))) {
      throw new ErroMeta('Escrita bloqueada: conjunto novo só pode entrar na campanha da Fábrica.', 400)
    }
    if ('lifetime_budget' in campos) {
      throw new ErroMeta('Escrita bloqueada: use orçamento diário.', 400)
    }
    const diario = Number(campos.daily_budget)
    if (!Number.isFinite(diario) || diario <= 0 || diario > TETO_FIXO_ORCAMENTO_DIARIO * 100) {
      throw new ErroMeta(`Escrita bloqueada: orçamento diário acima do teto de R$ ${TETO_FIXO_ORCAMENTO_DIARIO}.`, 400)
    }
  }

  if (tipo === 'ads' && !objetosDaFabrica.has(String(campos.adset_id ?? ''))) {
    throw new ErroMeta('Escrita bloqueada: anúncio novo só pode entrar em conjunto criado pela Fábrica.', 400)
  }

  return { tipo, campos }
}

// Leitura: só endereços do Graph API (inclusive os links de "próxima página")
// e sem `method`/`batch`, que no Graph API transformam um GET em escrita ou exclusão
export function validarLeitura(url: string): void {
  if (!url.startsWith(`${META_BASE}/`)) {
    throw new ErroMeta('Leitura bloqueada: endereço fora do Graph API.', 400)
  }
  const parametros = [...new URL(url).searchParams.keys()].map((chave) => chave.toLowerCase())
  if (parametros.includes('method') || parametros.includes('batch')) {
    throw new ErroMeta('Leitura bloqueada pela trava de segurança: parâmetro "method"/"batch" não é permitido.', 400)
  }
}

// ---------------------------------------------------------------------------
// Chamadas
// ---------------------------------------------------------------------------

// Códigos de limite de chamadas do Meta: na leitura, espera e tenta de novo
const CODIGOS_LIMITE = new Set([4, 17, 32, 613, 80000, 80003, 80004])

function traduzirErro(corpo: { error?: { message?: string; error_user_title?: string; error_user_msg?: string; code?: number } }, status: number) {
  const erro = corpo?.error
  if (erro?.code === 190) {
    return new ErroMeta('O token do Meta expirou ou foi revogado. Gere um novo e atualize o segredo META_ACCESS_TOKEN.', 502, erro)
  }
  if (erro?.code === 10 || erro?.code === 200) {
    return new ErroMeta('O token do Meta não tem permissão para isso. Confira os acessos do usuário do sistema no Business Manager.', 502, erro)
  }
  const texto = erro?.error_user_msg || erro?.error_user_title || erro?.message || `Erro ${status} no Meta.`
  return new ErroMeta(`Meta: ${texto}`, 502, erro)
}

function montarUrl(caminhoOuUrl: string, parametros: Record<string, unknown> = {}) {
  const url = new URL(caminhoOuUrl.startsWith('http') ? caminhoOuUrl : `${META_BASE}/${caminhoOuUrl}`)
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === null) continue
    url.searchParams.set(chave, typeof valor === 'string' ? valor : JSON.stringify(valor))
  }
  return url.toString()
}

// GET em um caminho (ex.: "act_123/insights") ou num link de próxima página
export async function metaLer<T = Record<string, unknown>>(caminhoOuUrl: string, parametros: Record<string, unknown> = {}): Promise<T> {
  const url = montarUrl(caminhoOuUrl, parametros)
  validarLeitura(url)
  const prova = await provaSecreta()
  const urlFinal = prova ? montarUrl(url, { appsecret_proof: prova }) : url

  for (let tentativa = 1; ; tentativa++) {
    const resposta = await fetch(urlFinal, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token()}` },
      signal: AbortSignal.timeout(60_000),
    })
    const corpo = await resposta.json().catch(() => ({}))
    if (resposta.ok) return corpo as T

    if (tentativa < 3 && CODIGOS_LIMITE.has(corpo?.error?.code)) {
      await new Promise((r) => setTimeout(r, 5_000 * tentativa))
      continue
    }
    throw traduzirErro(corpo, resposta.status)
  }
}

// Lê todas as páginas de uma lista (campo data + paging.next)
export async function metaLerTudo<T>(caminho: string, parametros: Record<string, unknown> = {}, limitePaginas = 50): Promise<T[]> {
  const itens: T[] = []
  let proxima: string | null = caminho
  let primeira = true
  for (let pagina = 0; proxima && pagina < limitePaginas; pagina++) {
    const corpo: { data?: T[]; paging?: { next?: string } } = await metaLer(proxima, primeira ? parametros : {})
    primeira = false
    itens.push(...(corpo.data ?? []))
    proxima = corpo.paging?.next ?? null
  }
  return itens
}

// POST de criação, depois de passar pelas travas. Nunca repete sozinho.
export async function metaCriar<T = { id: string }>(
  pedido: PedidoCriacao,
  objetosDaFabrica: ReadonlySet<string>,
): Promise<T> {
  const conta = contaConfigurada()
  const { campos } = validarCriacao(pedido, conta, objetosDaFabrica)

  const corpo = new URLSearchParams()
  for (const [chave, valor] of Object.entries(campos)) {
    if (valor === undefined || valor === null) continue
    corpo.set(chave, typeof valor === 'string' ? valor : JSON.stringify(valor))
  }
  const prova = await provaSecreta()
  if (prova) corpo.set('appsecret_proof', prova)

  const resposta = await fetch(`${META_BASE}/${pedido.caminho}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: corpo,
    signal: AbortSignal.timeout(90_000),
  })
  const json = await resposta.json().catch(() => ({}))
  if (!resposta.ok) {
    throw traduzirErro(json, resposta.status)
  }
  return json as T
}
