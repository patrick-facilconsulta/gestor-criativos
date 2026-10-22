import Anthropic from 'npm:@anthropic-ai/sdk'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { montarAprendizado } from './aprendizado.ts'
import { type CampoArte, DESTAQUE_NO_GANCHO, excessosDeTexto, limitesDoLayout, type TextoArte } from './limites.ts'

// Gera variações de criativo com IA a partir da base da Fábrica (/fabrica).
// O modelo vem do catálogo fabrica_modelos_ia e pode ser da Anthropic (Claude)
// ou da OpenAI (GPT). As chaves ficam só aqui, como segredos da função
// (ANTHROPIC_API_KEY e OPENAI_API_KEY), e nunca chegam ao navegador.

const MODELO_PADRAO = 'claude-opus-5-5'
// Usada só se a cotação do dia não puder ser consultada
const COTACAO_PADRAO = Number(Deno.env.get('COTACAO_DOLAR_PADRAO') ?? '5.0')
const MAX_VARIACOES = 6
const GANCHOS_ANTERIORES = 30
// Territórios criativos (diversificação pedida pelo Meta). Cada rodada espalha
// as variações por territórios diferentes, e cada território tem uma orientação
// própria de texto (o layout já é escolhido ANTES da IA escrever). O tamanho
// dos textos vem dos limites de cada layout (limites.ts), não daqui.
// Layouts com foto entram no sorteio: a foto é gerada automaticamente na tela.
const ORIENTACAO_TERRITORIO: Record<string, string> = {
  classico: 'Arte clássica da marca: gancho forte, apoio claro, selo curto em "destaque".',
  interface:
    'Interface do dia a dia (tela do celular do médico). Gancho curto e direto. Em "destaque", copie EXATAMENTE um trecho de 2 a 3 palavras do gancho (ele será grifado). Em "itens", 3 tarefas curtas do consultório, a primeira já resolvida.',
  editorial:
    'Tipografia editorial: uma frase-tese, sem cara de anúncio. Em "destaque", copie EXATAMENTE o trecho de 1 a 3 palavras do gancho que deve ser grifado. O apoio termina com a palavra mais importante (ela ganha um círculo à mão). CTA curto.',
  pessoa:
    'Pessoa em cena real (foto do médico com elementos colados). Se o layout for de etiquetas, "itens" são 3 recursos da plataforma; se for de post-its, o gancho é uma pergunta curta e "itens" são 3 dores. Em "foto_prompt": médico ou médica brasileiro(a) em cena real de consultório, enquadrado da cintura para cima, CENTRALIZADO, olhando para a câmera, rosto no terço de cima da imagem e espaço livre dos dois lados na altura do peito.',
  conversa:
    'Conversa de mensagens (paciente pedindo horário tarde da noite; o layout já mostra a conversa). O gancho conecta o horário em que o paciente procura com a agenda aberta do médico. O apoio fala da agenda online.',
  enquete:
    'Enquete de stories: o gancho é uma PERGUNTA de sim ou não, que o médico responde mentalmente. O apoio fala com quem respondeu "ainda não". CTA curto.',
  relogio:
    'Relógio marcando tarde da noite: o gancho fala da agenda funcionando fora do horário de atendimento (enquanto o médico dorme ou atende). O apoio cita o agendamento online 24h.',
  recortes:
    'Recortes de papel (cada palavra num recorte): poucas palavras, com contraste ou virada. Em "destaque", copie EXATAMENTE o trecho de 1 a 2 palavras do gancho que vai em papel colorido.',
  objeto:
    'Objeto-metáfora (foto de um objeto, sem pessoa, com frase curta): gancho curtíssimo e metafórico. Em "foto_prompt": UM objeto que represente a ideia (ex.: ampulheta, agenda de papel em branco, chave, relógio de mesa), sem nenhuma pessoa, sobre fundo escuro e liso, iluminação de estúdio, objeto à DIREITA do quadro, com espaço livre à esquerda e no alto.',
  produto:
    'Tela do produto (celular com o perfil e a agenda, já desenhado): gancho sobre o perfil/agenda aberta para agendamento. "itens" são 3 recursos da plataforma.',
  referencia: 'Layout criado a partir de referência: siga a estrutura padrão (gancho, apoio, selo, CTA).',
}

// Escolhe o layout de cada variação, alternando territórios (sem repetir
// território enquanto houver outro disponível)
function distribuirLayouts<T extends { territorio: string | null }>(layouts: T[], quantidade: number): T[] {
  const porTerritorio = new Map<string, T[]>()
  for (const layout of layouts) {
    const chave = layout.territorio ?? 'classico'
    porTerritorio.set(chave, [...(porTerritorio.get(chave) ?? []), layout])
  }
  const territorios = [...porTerritorio.keys()].sort(() => Math.random() - 0.5)
  for (const lista of porTerritorio.values()) lista.sort(() => Math.random() - 0.5)
  const escolhidos: T[] = []
  for (let i = 0; i < quantidade; i++) {
    const lista = porTerritorio.get(territorios[i % territorios.length])!
    escolhidos.push(lista[Math.floor(i / territorios.length) % lista.length])
  }
  return escolhidos
}

// Liga cada variação ao layout que a IA disse ter seguido (campo "layout"): a
// IA às vezes devolve fora da ordem pedida. O que não casar fica com os layouts
// que sobraram, na ordem.
function casarLayouts<L extends { chave: string }>(variacoes: { layout?: string }[], planejados: L[]): L[] {
  const livres = [...planejados]
  const casados = variacoes.map((v) => {
    const i = livres.findIndex((l) => l.chave === v.layout?.trim())
    return i >= 0 ? livres.splice(i, 1)[0] : undefined
  })
  return casados.map((l) => l ?? livres.shift() ?? planejados[0])
}

const NOME_CAMPO: Record<CampoArte, string> = {
  gancho: 'gancho',
  apoio: 'apoio',
  destaque: 'destaque',
  cta: 'cta',
  itens: 'cada item',
  antes: 'antes',
  depois: 'depois',
}

// Limites do layout escritos para a IA (em caracteres, com uma ideia em palavras)
function limitesParaIA(chave: string) {
  return Object.entries(limitesDoLayout(chave))
    .map(([campo, limite]) => `${NOME_CAMPO[campo as CampoArte]} até ${limite} caracteres (~${Math.max(2, Math.round(limite / 6.5))} palavras)`)
    .join('; ')
}

// O que não cabe no layout da variação (vazio = tudo cabe)
function problemasDeTamanho(texto: TextoArte, chave: string): string[] {
  const problemas = excessosDeTexto(texto, chave).map((e) => `${NOME_CAMPO[e.campo]} com ${e.tamanho} caracteres; o máximo é ${e.limite}`)
  const destaque = texto.destaque.trim().toLowerCase()
  if (DESTAQUE_NO_GANCHO.includes(chave) && destaque && !texto.gancho.toLowerCase().includes(destaque)) {
    problemas.push('o destaque precisa ser um trecho copiado exatamente do gancho')
  }
  return problemas
}

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

// Erro com mensagem pronta para mostrar na tela
class ErroGeracao extends Error {
  constructor(mensagem: string, public status: number) {
    super(mensagem)
  }
}

function sortear<T>(itens: T[]): T {
  return itens[Math.floor(Math.random() * itens.length)]
}

// Lista vazia de vínculo = serve para todos (mesma regra de src/lib/fabrica.ts)
function servePara(ids: string[] | null | undefined, id: string | null) {
  return !id || !ids || ids.length === 0 || ids.includes(id)
}

// Cotação do dólar do dia (AwesomeAPI, pública e sem chave). Se falhar, usa a padrão.
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
          'layout',
          'persona',
          'ponto_conceito',
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
          'foto_prompt',
          'alertas',
          'inspiracao',
        ],
        properties: {
          layout: { type: 'string' },
          persona: { type: 'string' },
          ponto_conceito: { type: 'string' },
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
          foto_prompt: { type: 'string' },
          alertas: { type: 'array', items: { type: 'string' } },
          inspiracao: {
            type: 'object',
            additionalProperties: false,
            required: ['tipo', 'anuncio', 'padrao'],
            properties: {
              tipo: { type: 'string', enum: ['referencia', 'exploracao', 'sem_dados'] },
              anuncio: { type: 'string' },
              padrao: { type: 'string' },
            },
          },
        },
      },
    },
  },
}

interface Variacao {
  layout?: string
  persona: string
  ponto_conceito: string
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
  foto_prompt: string
  alertas: string[]
  inspiracao?: { tipo: 'referencia' | 'exploracao' | 'sem_dados'; anuncio: string; padrao: string }
}

// Correção de tamanho: a IA devolve só os textos da arte das variações que
// passaram do limite do layout
const ESQUEMA_CORRECAO = {
  type: 'object',
  additionalProperties: false,
  required: ['correcoes'],
  properties: {
    correcoes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['numero', 'gancho', 'apoio', 'destaque', 'cta', 'itens'],
        properties: {
          numero: { type: 'integer' },
          gancho: { type: 'string' },
          apoio: { type: 'string' },
          destaque: { type: 'string' },
          cta: { type: 'string' },
          itens: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
}

interface Correcao {
  numero: number
  gancho: string
  apoio: string
  destaque: string
  cta: string
  itens: string[]
}

interface Entrada {
  frente_id?: string
  conceito_id?: string | null
  narrativa_id?: string | null
  formato_id?: string
  persona?: string | null
  modelo?: string | null
  quantidade?: number
  orientacao?: string | null
}

interface ModeloIA {
  provedor: 'anthropic' | 'openai'
  modelo: string
  preco_entrada: number
  preco_cache_leitura: number
  preco_saida: number
  suporta_fallback: boolean
  padrao: boolean
}

interface Uso {
  entrada: number
  cacheEscrita: number
  cacheLeitura: number
  saida: number
}

interface RespostaIA {
  json: string
  uso: Uso
  modeloUsado: string
}

interface OpcoesChamada {
  esquema?: Record<string, unknown>
  nomeEsquema?: string
  esforco?: 'low' | 'medium'
}

// Parte fixa das instruções. Fica antes de tudo que muda a cada pedido, para o
// cache de prompt reaproveitar (e baratear) as próximas chamadas.
const INSTRUCOES = `Você é redator(a) sênior de anúncios de Meta Ads da Fácil consulta, plataforma que leva pacientes particulares do Google até a agenda de médicos. O público dos anúncios são MÉDICOS (não pacientes).

Sua tarefa: escrever variações de criativo a partir da base de conhecimento de vendas (reuniões reais de vendedores com médicos) e da combinação pedida: Conceito (a linha de produto/campanha) + Narrativa + Ângulo + Formato. Cada variação precisa usar um argumento diferente do ângulo: pode partir dos argumentos cadastrados ou criar novos, desde que coerentes com a base.

Como combinar Conceito, Ângulo e Narrativa (obrigatório):
- O CONCEITO define o ASSUNTO do criativo. Cada variação tem como argumento central UM dos pontos do conceito informados no pedido, e cada variação usa um ponto diferente enquanto houver pontos disponíveis.
- O ÂNGULO define a ABORDAGEM: para quem falar, qual dor ou objeção tocar e o tom. Os argumentos do ângulo são apoio; use-os só quando combinarem com o ponto do conceito escolhido.
- A NARRATIVA define a ESTRUTURA da história.
- Nunca faça de outro conceito o assunto do criativo. Ex.: se o conceito é Plataforma, o assunto é a plataforma (agendamento, pagamento, recuperação de pacientes, gerente de contas etc.), e não o Google; o Google pode aparecer no máximo como detalhe de contexto.

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
- ponto_conceito: o ponto do conceito usado como assunto, copiado exatamente como veio na lista do pedido.
- argumento_central: o argumento usado, em uma frase, desenvolvendo o ponto do conceito.
- layout: a chave do layout da variação, copiada exatamente como veio no pedido (ex.: "objeto-foto").
- gancho: título da arte. Primeiros 3 segundos: dor ou pergunta que o médico reconhece.
- apoio: texto de apoio da arte.
- destaque: selo curto da arte (ex.: "Sem dancinha", "Paciente já pago"); em alguns layouts é um trecho do gancho (o pedido diz quando).
- cta: texto do botão da arte.
- itens: exatamente 3 itens curtos (passos, tarefas, recursos ou dores, conforme o layout).
- antes: a situação de hoje (layout comparativo).
- depois: a mesma situação com a Fácil consulta (layout comparativo).
- texto_principal: legenda do anúncio no Meta. Siga as regras de "Texto principal" abaixo.
- titulo_anuncio: título do anúncio no Meta (aparece embaixo da imagem), até 40 caracteres. O benefício principal em poucas palavras; não repita a primeira linha do texto principal nem o gancho da arte.
- descricao_anuncio: descrição do anúncio no Meta, até 30 caracteres. Complementa o título (reforça o benefício ou tira uma objeção), sem repetir o título.
- chamada_acao: uma das opções permitidas pelo esquema.
- roteiro: só para formato de vídeo. Roteiro de 20 a 30 segundos, com blocos marcados por tempo ([0-3s], [3-12s] etc.), indicando fala e texto na tela, seguindo a narrativa. Para formato estático, devolva string vazia.
- foto_prompt: descrição, em português, de UMA foto realista que combine com a variação, para ser gerada por IA e usada de fundo ou de detalhe na arte. Descreva cena, pessoa (pode ser um médico ou médica brasileira, gerada por IA), ambiente, luz e enquadramento vertical. A foto não pode ter texto, logotipo, marca, tela legível nem jaleco com nome. Até 60 palavras.
- alertas: lista de pontos de atenção de compliance (ou vazia).
- inspiracao: de onde veio a variação, para a equipe conferir.
  - tipo "referencia": a variação segue o padrão de um dos MELHORES anúncios dos aprendizados de desempenho. Em "anuncio", copie o nome exatamente como aparece na lista; em "padrao", diga em até 12 palavras o que foi aproveitado (ex.: "título em pergunta + médico na foto + pouco texto").
  - tipo "exploracao": caminho novo, para continuar aprendendo. "anuncio" vazio; em "padrao", o que está sendo testado (até 12 palavras).
  - tipo "sem_dados": o pedido não trouxe melhores anúncios para seguir. "anuncio" e "padrao" vazios.

Texto principal (legenda do anúncio no Meta). Objetivo: texto curto, persuasivo e fácil de ler no feed, que leve o médico interessado em atrair pacientes particulares a se cadastrar.
- Estrutura obrigatória ABT (And, But, Therefore), em 3 blocos separados por uma linha em branco:
  1. Gancho: abre com uma dor, um desejo ou uma situação que o médico reconhece. A primeira linha precisa gerar identificação sozinha.
  2. Contraste: como o Fácil consulta ajuda a resolver essa situação, destacando UM benefício principal.
  3. Conclusão: liga o benefício à ação, com um CTA claro e alinhado à campanha (cadastro na página; ex.: ver se a sua especialidade tem demanda na sua região), coerente com a chamada_acao.
- Uma única ideia central por anúncio: o ponto do conceito da variação.
- De 30 a 55 palavras, como referência. Frases curtas e linguagem natural.
- Emojis: use 1 ou 2 em todo texto principal (obrigatório; nunca mais de 2), com função de destaque: no início do gancho, marcando o benefício ou ao lado do CTA. Escolha emojis sóbrios e ligados à mensagem (ex.: 📅 🩺 📍 ✅ 👉 💬 🔎); nada de dinheiro, euforia ou exagero (ex.: 💰 🤑 🔥 🚀).
- Evite: introdução institucional ("O Fácil consulta é uma plataforma..."), lista de funcionalidades, repetição e explicação desnecessária.
- Nunca prometa resultado garantido.
- Adapte a estrutura ao conceito, ao ângulo e à narrativa: as variações da rodada não podem ter textos com a mesma cara (mude a abertura, o ritmo e o CTA).
- Critério de aprovação: a primeira linha gera identificação, o benefício aparece rápido e quem só passar o olho entende a mensagem.

Tamanho dos textos da arte (obrigatório): cada layout foi desenhado para um tamanho de texto. O pedido traz, para cada variação, o máximo de caracteres de cada campo que o layout dela mostra, contando espaços e pontuação. É um teto, não uma meta: texto maior quebra a arte. Prefira frases curtas e corte palavras antes de passar do limite. Campos que o layout da variação não mostra: escreva curtos (gancho até 70 caracteres, apoio até 120, destaque até 26, cta até 22, cada item até 38, antes e depois até 55), porque a equipe pode trocar o layout na tela.

Formato estático: a MESMA arte é entregue em duas medidas, quadrada (1080×1080, feed) e stories (1080×1920). Escreva textos curtos que funcionem bem nas duas.

Escreva cada variação com um gancho realmente diferente das outras e dos ganchos já usados que forem informados.`

// --- Anthropic (Claude) --------------------------------------------------------------

async function chamarAnthropic(modelo: ModeloIA, sistema: string, pedido: string, opcoes: OpcoesChamada = {}): Promise<RespostaIA> {
  const chave = Deno.env.get('ANTHROPIC_API_KEY')
  if (!chave) throw new ErroGeracao('Falta a chave da Anthropic (segredo ANTHROPIC_API_KEY).', 500)

  const anthropic = new Anthropic({ apiKey: chave })
  try {
    const resposta = await anthropic.beta.messages.create({
      model: modelo.modelo,
      max_tokens: 16000,
      // Se o filtro de segurança recusar, a Anthropic refaz em outro modelo
      ...(modelo.suporta_fallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' } : {}),
      output_config: {
        effort: opcoes.esforco ?? 'medium',
        format: { type: 'json_schema', schema: opcoes.esquema ?? ESQUEMA_RESPOSTA },
      },
      system: [{ type: 'text', text: sistema, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: pedido }],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming)

    if (resposta.stop_reason === 'refusal') {
      throw new ErroGeracao('A IA recusou este pedido. Ajuste a orientação e tente de novo.', 422)
    }
    if (resposta.stop_reason === 'max_tokens') {
      throw new ErroGeracao('A resposta da IA ficou longa demais. Peça menos variações.', 422)
    }

    const texto = resposta.content.find((bloco) => bloco.type === 'text')
    if (!texto || texto.type !== 'text') throw new ErroGeracao('A IA não devolveu texto.', 502)

    return {
      json: texto.text,
      modeloUsado: resposta.model,
      uso: {
        entrada: resposta.usage.input_tokens ?? 0,
        cacheEscrita: resposta.usage.cache_creation_input_tokens ?? 0,
        cacheLeitura: resposta.usage.cache_read_input_tokens ?? 0,
        saida: resposta.usage.output_tokens ?? 0,
      },
    }
  } catch (erro) {
    if (erro instanceof ErroGeracao) throw erro
    console.error('Erro ao chamar a Anthropic', erro)
    if (erro instanceof Anthropic.AuthenticationError) {
      throw new ErroGeracao('A chave da Anthropic é inválida. Confira o segredo ANTHROPIC_API_KEY.', 500)
    }
    if (erro instanceof Anthropic.RateLimitError) {
      throw new ErroGeracao('Muitos pedidos à IA agora. Espere um minuto e tente de novo.', 429)
    }
    if (erro instanceof Anthropic.NotFoundError || erro instanceof Anthropic.BadRequestError) {
      throw new ErroGeracao(`A Anthropic não aceitou o modelo "${modelo.modelo}". Confira o nome em Editar base › Modelos de IA.`, 400)
    }
    throw new ErroGeracao('Não foi possível gerar os criativos agora. Tente de novo.', 502)
  }
}

// --- OpenAI (GPT), pela Responses API com saída estruturada -------------------------

async function chamarOpenAI(modelo: ModeloIA, sistema: string, pedido: string, opcoes: OpcoesChamada = {}): Promise<RespostaIA> {
  const chave = Deno.env.get('OPENAI_API_KEY')
  if (!chave) throw new ErroGeracao('Falta a chave da OpenAI (segredo OPENAI_API_KEY).', 500)

  let resposta: Response
  try {
    resposta = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelo.modelo,
        max_output_tokens: 16000,
        input: [
          { role: 'system', content: sistema },
          { role: 'user', content: pedido },
        ],
        text: {
          format: { type: 'json_schema', name: opcoes.nomeEsquema ?? 'variacoes_criativo', schema: opcoes.esquema ?? ESQUEMA_RESPOSTA, strict: true },
        },
      }),
    })
  } catch (erro) {
    console.error('Erro de rede com a OpenAI', erro)
    throw new ErroGeracao('Não foi possível falar com a OpenAI agora. Tente de novo.', 502)
  }

  // deno-lint-ignore no-explicit-any
  const corpo: any = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    console.error('Erro da OpenAI', resposta.status, corpo?.error)
    if (resposta.status === 401) throw new ErroGeracao('A chave da OpenAI é inválida. Confira o segredo OPENAI_API_KEY.', 500)
    if (resposta.status === 429) throw new ErroGeracao('Limite ou crédito da OpenAI esgotado. Confira a conta da OpenAI.', 429)
    if (resposta.status === 404 || corpo?.error?.code === 'model_not_found') {
      throw new ErroGeracao(`A OpenAI não aceitou o modelo "${modelo.modelo}". Confira o nome em Editar base › Modelos de IA.`, 400)
    }
    throw new ErroGeracao(`A OpenAI devolveu um erro: ${corpo?.error?.message ?? resposta.status}`, 502)
  }

  // Junta os textos de saída; uma recusa vem como conteúdo do tipo "refusal"
  // deno-lint-ignore no-explicit-any
  const conteudos: any[] = (corpo?.output ?? []).flatMap((item: any) => (item?.type === 'message' ? item.content ?? [] : []))
  if (conteudos.some((c) => c?.type === 'refusal')) {
    throw new ErroGeracao('A IA recusou este pedido. Ajuste a orientação e tente de novo.', 422)
  }
  const json = conteudos.filter((c) => c?.type === 'output_text').map((c) => c.text).join('')
  if (!json) {
    if (corpo?.status === 'incomplete') throw new ErroGeracao('A resposta da IA ficou longa demais. Peça menos variações.', 422)
    throw new ErroGeracao('A IA não devolveu texto.', 502)
  }

  // A OpenAI faz cache sozinha; os tokens em cache vêm dentro dos de entrada
  const emCache = corpo?.usage?.input_tokens_details?.cached_tokens ?? 0
  return {
    json,
    modeloUsado: modelo.modelo,
    uso: {
      entrada: Math.max((corpo?.usage?.input_tokens ?? 0) - emCache, 0),
      cacheEscrita: 0,
      cacheLeitura: emCache,
      saida: corpo?.usage?.output_tokens ?? 0,
    },
  }
}

// --- Correção de tamanho -------------------------------------------------------------

const INSTRUCOES_CORRECAO = `Você revisa textos de artes de anúncio da Fácil consulta (o público são médicos). Os textos abaixo passaram do tamanho que o layout comporta. Reescreva só o necessário para cada campo caber no limite (caracteres, contando espaços e pontuação), mantendo a ideia, o tom e a estrutura (pergunta continua pergunta).
Regras: escreva "Fácil consulta" com "c" minúsculo; nada de preço, promessa de resultado ou faturamento, número inventado, depoimento, especialidade médica ou concorrente. Quando o destaque precisar ser trecho do gancho, copie-o exatamente do gancho final.
Devolva todos os campos de cada variação (gancho, apoio, destaque, cta e os 3 itens), inclusive os que já cabiam, sem mudar esses.`

async function encurtarTextos(
  modelo: ModeloIA,
  pedidos: { numero: number; layout: string; chave: string; texto: TextoArte; problemas: string[] }[],
): Promise<{ correcoes: Correcao[]; uso: Uso }> {
  const pedido = pedidos
    .map((p) => [
      `Variação ${p.numero}: layout "${p.layout}"`,
      `Limites: ${limitesParaIA(p.chave)}${DESTAQUE_NO_GANCHO.includes(p.chave) ? '; o destaque é um trecho copiado do gancho' : ''}`,
      `O que corrigir: ${p.problemas.join('; ')}`,
      `Textos atuais: ${JSON.stringify({ gancho: p.texto.gancho, apoio: p.texto.apoio, destaque: p.texto.destaque, cta: p.texto.cta, itens: p.texto.itens })}`,
    ].join('\n'))
    .join('\n\n')
  const opcoes: OpcoesChamada = { esquema: ESQUEMA_CORRECAO, nomeEsquema: 'correcao_tamanho', esforco: 'low' }
  const resposta = modelo.provedor === 'openai'
    ? await chamarOpenAI(modelo, INSTRUCOES_CORRECAO, pedido, opcoes)
    : await chamarAnthropic(modelo, INSTRUCOES_CORRECAO, pedido, opcoes)
  const corrigido = JSON.parse(resposta.json, (_chave, valor) => (typeof valor === 'string' ? corrigirMarca(valor) : valor))
  return { correcoes: (corrigido as { correcoes: Correcao[] }).correcoes ?? [], uso: resposta.uso }
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

  if (!supabaseUrl || !anonKey) {
    return responder({ erro: 'Função não configurada. Falta a configuração do Supabase.' }, 500)
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
  const [conceitos, narrativas, formato, layouts, paletas, diretrizes, base, frente, modelos] = await Promise.all([
    supabase.from('fabrica_conceitos').select('*').eq('ativo', true),
    supabase.from('fabrica_narrativas').select('*').eq('ativo', true),
    supabase.from('fabrica_formatos').select('*').eq('id', entrada.formato_id).maybeSingle(),
    supabase.from('fabrica_layouts').select('id, chave, nome, especificacao, territorio').eq('ativo', true),
    supabase.from('fabrica_paletas').select('id').eq('ativo', true),
    supabase.from('fabrica_diretrizes').select('tipo, texto').eq('ativo', true).order('created_at'),
    supabase.from('fabrica_base_conhecimento').select('*').limit(1).maybeSingle(),
    supabase.from('frentes').select('nome').eq('id', entrada.frente_id).maybeSingle(),
    supabase.from('fabrica_modelos_ia').select('*').eq('tipo', 'texto').eq('ativo', true),
  ])

  const erroBase = [conceitos, narrativas, formato, layouts, paletas, diretrizes, base, frente, modelos].find((r) => r.error)
  if (erroBase) {
    return responder({ erro: 'Não foi possível ler a base da fábrica.' }, 500)
  }

  if (!formato.data) {
    return responder({ erro: 'Formato não encontrado.' }, 400)
  }

  // Modelo pedido, senão o padrão do catálogo, senão o padrão fixo
  const catalogo = (modelos.data ?? []).map((m) => ({
    ...m,
    preco_entrada: Number(m.preco_entrada),
    preco_cache_leitura: Number(m.preco_cache_leitura),
    preco_saida: Number(m.preco_saida),
  })) as ModeloIA[]
  const modelo =
    catalogo.find((m) => m.modelo === entrada.modelo) ??
    catalogo.find((m) => m.padrao) ??
    catalogo.find((m) => m.modelo === MODELO_PADRAO)

  if (!modelo) {
    return responder({ erro: 'Nenhum modelo de IA de texto ativo. Ative um em Editar base › Modelos de IA.' }, 400)
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

  // Todos os layouts ativos entram (inclusive os com foto: a foto é gerada na tela)
  const layoutsAtivos = (layouts.data ?? []) as { id: string; chave: string; nome: string; territorio: string | null }[]
  if (!layoutsAtivos.length || !paletas.data?.length) {
    return responder({ erro: 'Ative pelo menos um layout e uma paleta na base da fábrica.' }, 400)
  }
  // Layout de cada variação escolhido antes da IA, espalhando territórios
  const layoutsDaRodada = distribuirLayouts(layoutsAtivos, quantidade)

  const [argumentos, anteriores, pontos, aprendizado] = await Promise.all([
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
    // Pontos do conceito (planejamento do marketing): dores, desejos, benefícios e provas
    supabase
      .from('fabrica_pontos_conceito')
      .select('tipo, texto')
      .eq('frente_id', frenteId)
      .eq('ativo', true)
      .eq('uso', 'seguro')
      .order('ordem'),
    // O que está dando certo (e errado) no Meta neste conceito. Sem dados, segue sem
    montarAprendizado(supabase, frenteId, frente.data?.nome ?? '').catch((erro) => {
      console.error('Erro ao montar o aprendizado de desempenho', erro)
      return { texto: '', resumo: null }
    }),
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
  // Resumo do manual da marca: quem somos, tom de voz e o que oferecemos ao médico
  const manualMarca = (base.data?.manual_marca as string | undefined)?.trim()

  const sistema = [
    INSTRUCOES,
    diretrizesTexto,
    manualMarca ? `<manual_da_marca>\n${manualMarca}\n</manual_da_marca>` : '',
    documentoBase
      ? `<base_de_conhecimento>\n${documentoBase}\n</base_de_conhecimento>`
      : 'A base de conhecimento completa ainda não foi cadastrada; use o conceito, os argumentos e as diretrizes.',
  ]
    .filter(Boolean)
    .join('\n\n')

  const argumentosTexto = (argumentos.data ?? [])
    .map((a) => `- [${a.tipo}] ${a.texto}${a.origem ? ` (origem: ${a.origem})` : ''}`)
    .join('\n')

  const pontosTexto = (pontos.data ?? []).map((p) => `- [${p.tipo}] ${p.texto}`).join('\n')

  // Os outros conceitos ativos: a IA não deve fazer deles o assunto desta rodada
  const { data: frentesAtivas } = await supabase.from('frentes').select('nome').eq('ativa', true)
  const outrosConceitos = (frentesAtivas ?? [])
    .map((f) => f.nome as string)
    .filter((nome) => nome !== frente.data?.nome)

  const pedido = `Gere ${quantidade} variação(ões) de criativo.

CONCEITO (o assunto obrigatório): ${frente.data?.nome ?? 'não informado'}
Pontos deste conceito, definidos pelo marketing. Cada variação deve ter um destes pontos como assunto principal (um ponto diferente por variação):
${pontosTexto || `- (nenhum cadastrado; o assunto é o próprio conceito "${frente.data?.nome ?? ''}")`}
${outrosConceitos.length ? `Outros conceitos, que NÃO são o assunto desta rodada: ${outrosConceitos.join(', ')}.` : ''}

ÂNGULO (a abordagem): ${conceito.nome}
- Mensagem: ${conceito.mensagem}
- Personas: ${conceito.personas ?? 'todas'}
- Nível de consciência: ${conceito.consciencia}
- Objeção que o criativo antecipa: ${conceito.objecao ?? '—'}
- Roteiro de referência: ${conceito.roteiro_referencia ?? '—'}
- Cuidados: ${conceito.cuidados ?? '—'}

Argumentos do ângulo (apoio; use só os que combinarem com o ponto do conceito):
${argumentosTexto || '- (nenhum; crie a partir da base)'}

Formato: ${formato.data.nome} (${formato.data.tipo === 'video' ? `vídeo: preencha o roteiro; capa ${formato.data.proporcao}` : 'estático: a mesma arte sai em quadrado 1:1 e stories 9:16; roteiro vazio'})
${formato.data.descricao ?? ''}

Narrativa: ${narrativa.nome}
Estrutura:
${narrativa.estrutura}
${entrada.persona ? `\nPersona alvo: ${entrada.persona}` : ''}${entrada.orientacao?.trim() ? `\nOrientação extra do gestor de tráfego: ${entrada.orientacao.trim()}` : ''}

Ganchos já usados neste ângulo (não repita nem parafraseie de perto):
${ganchosAnteriores.length ? ganchosAnteriores.map((g) => `- ${g}`).join('\n') : '- (nenhum ainda)'}
${aprendizado.texto ? `\n${aprendizado.texto}\n` : ''}
Layout de cada variação (já escolhido; devolva as variações nesta ordem, copie a chave em "layout" e respeite os limites de tamanho e a orientação de cada uma):
${layoutsDaRodada.map((l, i) => `- Variação ${i + 1}: layout "${l.nome}" (chave: ${l.chave}). Limites: ${limitesParaIA(l.chave)}. ${ORIENTACAO_TERRITORIO[l.territorio ?? 'classico'] ?? ORIENTACAO_TERRITORIO.classico}`).join('\n')}

Lembrete final: o assunto de cada variação é um ponto do conceito "${frente.data?.nome ?? ''}". O ângulo e a narrativa só definem como contar.`

  let resposta: RespostaIA
  let variacoes: Variacao[]
  try {
    resposta = modelo.provedor === 'openai'
      ? await chamarOpenAI(modelo, sistema, pedido)
      : await chamarAnthropic(modelo, sistema, pedido)
    // Corrige a grafia da marca em todos os textos devolvidos
    const corrigido = JSON.parse(resposta.json, (_chave, valor) => (typeof valor === 'string' ? corrigirMarca(valor) : valor))
    variacoes = (corrigido as { variacoes: Variacao[] }).variacoes ?? []
  } catch (erro) {
    if (erro instanceof ErroGeracao) return responder({ erro: erro.message }, erro.status)
    console.error('Resposta da IA fora do formato', erro)
    return responder({ erro: 'A IA devolveu uma resposta fora do formato. Tente de novo.' }, 502)
  }

  if (variacoes.length === 0) {
    return responder({ erro: 'A IA não devolveu nenhuma variação.' }, 502)
  }

  variacoes = variacoes.slice(0, quantidade)
  const layoutsCasados = casarLayouts(variacoes, layoutsDaRodada)
  const textoDaArte = (v: Variacao): TextoArte => ({
    gancho: v.gancho,
    apoio: v.apoio,
    destaque: v.destaque,
    cta: v.cta,
    itens: (v.itens ?? []).slice(0, 3),
    antes: v.antes,
    depois: v.depois,
  })

  // Texto que não cabe no layout volta uma vez para a IA encurtar. Se a
  // correção falhar, segue com o texto original: a tela avisa o que passou.
  const uso: Uso = { ...resposta.uso }
  const paraEncurtar = variacoes
    .map((v, i) => ({ numero: i + 1, layout: layoutsCasados[i].nome, chave: layoutsCasados[i].chave, texto: textoDaArte(v), problemas: problemasDeTamanho(textoDaArte(v), layoutsCasados[i].chave) }))
    .filter((p) => p.problemas.length > 0)
  if (paraEncurtar.length) {
    try {
      const encurtado = await encurtarTextos(modelo, paraEncurtar)
      for (const campo of Object.keys(uso) as (keyof Uso)[]) uso[campo] += encurtado.uso[campo]
      for (const c of encurtado.correcoes) {
        const v = variacoes[c.numero - 1]
        if (!v || !paraEncurtar.some((p) => p.numero === c.numero)) continue
        if (c.gancho.trim()) v.gancho = c.gancho
        if (c.apoio.trim()) v.apoio = c.apoio
        v.destaque = c.destaque
        if (c.cta.trim()) v.cta = c.cta
        if (c.itens.length === 3) v.itens = c.itens
      }
    } catch (erro) {
      console.error('Erro ao encurtar textos que não cabiam no layout', erro)
    }
  }

  // Paleta sorteada entre as ativas, sem repetir enquanto der (o layout veio
  // antes). Na tela dá para trocar os dois sem gastar IA.
  const paletasEmbaralhadas = [...paletas.data].sort(() => Math.random() - 0.5)
  const loteId = crypto.randomUUID()

  // Custo estimado da rodada (o raciocínio interno da IA conta como saída).
  // Se a Anthropic refez em outro modelo (fallback), usa o preço dele.
  const precoUsado = catalogo.find((m) => m.modelo === resposta.modeloUsado) ?? modelo
  const custoUsd =
    (uso.entrada * precoUsado.preco_entrada +
      // Escrita em cache (só Anthropic) custa 1,25× a entrada
      uso.cacheEscrita * precoUsado.preco_entrada * 1.25 +
      uso.cacheLeitura * precoUsado.preco_cache_leitura +
      uso.saida * precoUsado.preco_saida) /
    1_000_000
  const cotacao = await cotacaoDolar()

  const { data: lote, error: erroLote } = await supabase
    .from('fabrica_lotes')
    .insert({
      id: loteId,
      tipo: 'texto',
      modelo: precoUsado.modelo,
      quantidade: Math.min(variacoes.length, quantidade),
      tokens_entrada: uso.entrada,
      tokens_cache_escrita: uso.cacheEscrita,
      tokens_cache_leitura: uso.cacheLeitura,
      tokens_saida: uso.saida,
      custo_usd: Number(custoUsd.toFixed(4)),
      cotacao_dolar: Number(cotacao.toFixed(4)),
      custo_brl: Number((custoUsd * cotacao).toFixed(4)),
      criado_por: user.email ?? null,
      aprendizado: aprendizado.resumo,
    })
    .select('*')
    .single()

  if (erroLote) {
    // Sem o registro de custo a geração continua valendo
    console.error('Erro ao gravar o custo da rodada', erroLote)
  }

  // Liga o nome do anúncio citado pela IA ao id dele (só vale um dos melhores)
  const melhoresDaRodada = ((aprendizado.resumo?.melhores ?? []) as { ad_id: string; nome: string }[])
  const inspiracaoDe = (v: Variacao) => {
    const i = v.inspiracao
    if (!i || !aprendizado.resumo || !melhoresDaRodada.length) return { tipo: 'sem_dados', ad_id: null, nome: '', padrao: '' }
    if (i.tipo !== 'referencia') return { tipo: i.tipo === 'sem_dados' ? 'exploracao' : i.tipo, ad_id: null, nome: '', padrao: i.padrao }
    const normal = (t: string) => t.trim().toUpperCase()
    const achado = melhoresDaRodada.find((m) => normal(m.nome) === normal(i.anuncio))
    return achado
      ? { tipo: 'referencia', ad_id: achado.ad_id, nome: achado.nome, padrao: i.padrao }
      : { tipo: 'exploracao', ad_id: null, nome: '', padrao: i.padrao }
  }

  const linhas = variacoes.map((v, indice) => ({
    lote_id: loteId,
    frente_id: entrada.frente_id,
    conceito_id: conceito.id,
    narrativa_id: narrativa.id,
    formato_id: formato.data.id,
    layout_id: layoutsCasados[indice].id,
    paleta_id: paletasEmbaralhadas[indice % paletasEmbaralhadas.length].id,
    persona: v.persona || entrada.persona || null,
    ponto_conceito: v.ponto_conceito || null,
    argumento_central: v.argumento_central,
    texto_arte: textoDaArte(v),
    texto_principal: v.texto_principal,
    titulo_anuncio: v.titulo_anuncio,
    descricao_anuncio: v.descricao_anuncio,
    chamada_acao: v.chamada_acao,
    roteiro: formato.data.tipo === 'video' ? v.roteiro || null : null,
    foto_prompt: v.foto_prompt || null,
    alertas: v.alertas ?? [],
    inspiracao: inspiracaoDe(v),
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

  return responder({ geracoes, lote: lote ?? null }, 200)
})
