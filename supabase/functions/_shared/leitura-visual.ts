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
