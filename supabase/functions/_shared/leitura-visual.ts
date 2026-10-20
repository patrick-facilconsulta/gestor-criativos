// Regras da leitura visual dos criativos, usadas por `ler-criativos` (que lê)
// e por `gerar-criativos/aprendizado.ts` (que usa a leitura no prompt).
//
// Piloto de 20/10/2026: Claude Opus 5.5 acertou 96% e GPT-6 Astra 94% nos
// estáticos. Ajustes que vieram dele (versão 2 do questionário):
// - quantidade de texto não é mais pergunta para a IA: o sistema conta as
//   palavras da transcrição, que os dois acertaram;
// - logo é só a marca completa; ícone de app numa tela conta como produto;
// - "mostra a plataforma" inclui qualquer tela de sistema, teleconsulta ou
//   notificação de app.
// TRAVA: vídeo nunca é lido (a capa não representa o vídeo).

export const MODELO_LEITURA = 'claude-opus-5-5'
export const VERSAO_QUESTIONARIO = 2

// "002 _ Estático novo — Cópia — Cópia" → "002 _ ESTÁTICO NOVO": o mesmo criativo
// rodando em vários conjuntos conta (e é lido) uma vez só
export function chaveCriativo(nome: string) {
  return nome.replace(/(\s*[—-]\s*c[óo]pia)+\s*$/i, '').trim().toUpperCase()
}

export const ESQUEMA_LEITURA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'texto_na_arte',
    'titulo_principal',
    'formato_titulo',
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

export const INSTRUCOES_LEITURA = `Você analisa criativos ESTÁTICOS (imagens) de anúncios do Meta (Facebook/Instagram) da Fácil consulta, plataforma que leva pacientes particulares até a agenda de MÉDICOS. O público dos anúncios são médicos.
Responda o questionário sobre a imagem com objetividade. Descreva só o que está visível; não deduza nem invente. Na dúvida, escolha a opção mais neutra ("outro", "pessoa_sem_papel_claro", false).

- texto_na_arte: transcreva TODO texto escrito na imagem, exatamente como está (mesma grafia, sem corrigir), na ordem de leitura, separando blocos com " | ". Ignore emojis e textos minúsculos de interface ilegíveis. Vazio se não houver texto.
- titulo_principal: o texto de maior destaque visual, exatamente como escrito. Vazio se não houver.
- formato_titulo: forma do título principal. "convite_ou_ordem" = chamada como "Cadastre-se", "Descubra...". "sem_titulo" se não houver.
- tipo_peca: "foto" = fotografia quase sem texto; "foto_com_texto" = fotografia com textos por cima; "arte_grafica" = peça desenhada (formas, cores chapadas, ícones), sem foto como base; "tela_de_celular_ou_sistema" = o destaque é uma tela de celular, app, agenda ou sistema; "busca_do_google" = imita resultado de busca do Google; "pessoa_falando_para_camera" = pessoa falando para a câmera.
- pessoas: quem aparece. "medico" = jaleco, estetoscópio ou consultório evidente; "paciente" = pessoa sendo atendida ou claramente paciente (inclusive numa tela de teleconsulta).
- mostra_produto: true se aparece QUALQUER tela de sistema ou app: agenda, perfil de médico, site, teleconsulta (videochamada com paciente num monitor ou celular), notificação de app (ex.: "Novo paciente agendou consulta") — mesmo que não dê para ver a marca.
- elemento_principal: o que chama atenção primeiro, em até 10 palavras.
- tem_botao: true se há um botão desenhado na arte (ex.: "Saiba mais"). Não conte botões da interface do Meta.
- tem_logo: true SOMENTE se aparece a logo completa da Fácil consulta (símbolo com o nome "Fácil consulta" escrito). Ícone de app (ex.: um quadrado com "FC" numa notificação) NÃO é logo: ele conta em mostra_produto.
- fundo e cor_predominante: o que ocupa a maior parte da área.
- legibilidade: qualidade da imagem para esta leitura (resolução, corte).
- resumo: 1 ou 2 frases descrevendo a peça.`

// Quantidade de texto pelas palavras da transcrição (no piloto, a IA errava
// mais nesta pergunta do que na transcrição)
export function quantidadeTexto(textoNaArte: string): { palavras: number; quantidade: 'pouco' | 'medio' | 'muito' } {
  const palavras = textoNaArte.replace(/\|/g, ' ').split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length
  return { palavras, quantidade: palavras <= 8 ? 'pouco' : palavras <= 25 ? 'medio' : 'muito' }
}

export type LeituraVisual = Record<string, unknown>

// Correção da equipe vale por cima da leitura, campo a campo
export function leituraFinal(leitura: LeituraVisual | null | undefined, correcao: LeituraVisual | null | undefined): LeituraVisual | null {
  if (!leitura) return null
  const final = { ...leitura, ...(correcao ?? {}) }
  if (correcao && typeof correcao.texto_na_arte === 'string') Object.assign(final, quantidadeTexto(correcao.texto_na_arte))
  return final
}

const ROTULOS: Record<string, string> = {
  pergunta: 'pergunta', afirmacao: 'afirmação', numero_ou_estatistica: 'número ou estatística', convite_ou_ordem: 'convite ou chamada', sem_titulo: 'sem título',
  pouco: 'pouco texto', medio: 'texto médio', muito: 'muito texto',
  foto: 'foto', foto_com_texto: 'foto com texto', arte_grafica: 'arte gráfica', tela_de_celular_ou_sistema: 'tela de celular ou sistema',
  busca_do_google: 'imita busca do Google', pessoa_falando_para_camera: 'pessoa falando para a câmera', outro: 'outro',
  nenhuma: 'sem pessoas', medico: 'médico', paciente: 'paciente', medico_e_paciente: 'médico e paciente', pessoa_sem_papel_claro: 'pessoa sem papel claro',
  claro: 'fundo claro', escuro: 'fundo escuro', colorido: 'fundo colorido',
  azul: 'azul', branco: 'branco', preto_ou_azul_marinho: 'preto ou azul-marinho', verde: 'verde', amarelo_ou_laranja: 'amarelo ou laranja',
  vermelho_ou_rosa: 'vermelho ou rosa', cinza: 'cinza', outra: 'outra cor',
}
const rotulo = (valor: unknown) => ROTULOS[String(valor)] ?? String(valor ?? '—')

// Uma linha para o prompt da Fábrica descrevendo a arte
export function descreverArte(l: LeituraVisual): string {
  if (l.formato === 'carrossel') return descreverCarrossel(l)
  const partes = [
    rotulo(l.tipo_peca),
    rotulo(l.pessoas),
    `título da arte "${String(l.titulo_principal ?? '').trim() || '—'}" (${rotulo(l.formato_titulo)})`,
    `${rotulo(l.quantidade)}${l.palavras ? ` (${l.palavras} palavras)` : ''}`,
    l.mostra_produto ? 'mostra a plataforma' : 'não mostra a plataforma',
    l.tem_botao ? 'com botão' : 'sem botão',
    `${rotulo(l.fundo)}, cor predominante ${rotulo(l.cor_predominante)}`,
    `destaque: ${String(l.elemento_principal ?? '—')}`,
  ]
  return partes.join('; ')
}

// ---------------------------------------------------------------------------
// Carrossel: cada card é uma imagem estática; os cards são lidos todos juntos,
// na ordem. (Carrossel com card em vídeo é tratado como vídeo: não é lido.)
// ---------------------------------------------------------------------------

const PROPRIEDADES_CARD = {
  texto_na_arte: ESQUEMA_LEITURA.properties.texto_na_arte,
  titulo_principal: ESQUEMA_LEITURA.properties.titulo_principal,
  tipo_peca: ESQUEMA_LEITURA.properties.tipo_peca,
  pessoas: ESQUEMA_LEITURA.properties.pessoas,
  mostra_produto: ESQUEMA_LEITURA.properties.mostra_produto,
  elemento_principal: ESQUEMA_LEITURA.properties.elemento_principal,
}

export const ESQUEMA_LEITURA_CARROSSEL = {
  type: 'object',
  additionalProperties: false,
  required: ['cartoes', 'formato_titulo', 'sequencia', 'tem_botao', 'tem_logo', 'fundo', 'cor_predominante', 'legibilidade', 'resumo'],
  properties: {
    cartoes: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: Object.keys(PROPRIEDADES_CARD), properties: PROPRIEDADES_CARD },
    },
    formato_titulo: ESQUEMA_LEITURA.properties.formato_titulo,
    sequencia: { type: 'string' },
    tem_botao: ESQUEMA_LEITURA.properties.tem_botao,
    tem_logo: ESQUEMA_LEITURA.properties.tem_logo,
    fundo: ESQUEMA_LEITURA.properties.fundo,
    cor_predominante: ESQUEMA_LEITURA.properties.cor_predominante,
    legibilidade: ESQUEMA_LEITURA.properties.legibilidade,
    resumo: ESQUEMA_LEITURA.properties.resumo,
  },
}

export const INSTRUCOES_LEITURA_CARROSSEL = `${INSTRUCOES_LEITURA}

ESTE ANÚNCIO É UM CARROSSEL: as imagens vêm na ordem dos cards ("Card 1", "Card 2"...). O card 1 é o gancho (o que aparece primeiro no feed).
- cartoes: um item por card, na mesma ordem, com texto_na_arte, titulo_principal, tipo_peca, pessoas, mostra_produto e elemento_principal daquele card (mesmas regras acima).
- formato_titulo: forma do título do CARD 1.
- sequencia: em 1 ou 2 frases, como a história avança de card em card (ex.: "card 1 faz a pergunta, cards 2 a 4 trazem um motivo cada, último card chama para o cadastro").
- tem_botao, tem_logo, fundo, cor_predominante: considerando o carrossel como um todo (o que predomina).
- resumo: 1 ou 2 frases sobre o carrossel inteiro.`

// Contagem de palavras por card e no total
export function completarCarrossel(lida: Record<string, unknown>): Record<string, unknown> {
  const cartoes: Record<string, unknown>[] = ((lida.cartoes ?? []) as Record<string, unknown>[]).map((c) => ({ ...c, ...quantidadeTexto(String(c.texto_na_arte ?? '')) }))
  const palavras = cartoes.reduce((total, c) => total + (c.palavras as number), 0)
  return { ...lida, cartoes, formato: 'carrossel', palavras, titulo_principal: cartoes[0]?.titulo_principal ?? '' }
}

export function descreverCarrossel(l: LeituraVisual): string {
  const cartoes = (l.cartoes ?? []) as LeituraVisual[]
  const primeiro = cartoes[0] ?? {}
  const seguintes = cartoes.slice(1).map((c) => `"${String(c.titulo_principal ?? '').trim() || '—'}"`).join(' | ')
  const comProduto = cartoes.filter((c) => c.mostra_produto).length
  return [
    `carrossel de ${cartoes.length} cards`,
    `card 1 (gancho): ${rotulo(primeiro.tipo_peca)}, ${rotulo(primeiro.pessoas)}, título "${String(primeiro.titulo_principal ?? '').trim() || '—'}" (${rotulo(l.formato_titulo)})`,
    seguintes ? `cards seguintes: ${seguintes}` : '',
    `sequência: ${String(l.sequencia ?? '—')}`,
    comProduto ? `mostra a plataforma em ${comProduto} card(s)` : 'não mostra a plataforma',
    `${rotulo(l.fundo)}, cor predominante ${rotulo(l.cor_predominante)}`,
  ].filter(Boolean).join('; ')
}
