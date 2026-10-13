import type {
  ConscienciaConceito,
  Formato,
  ProporcaoArte,
  TipoArgumento,
  TipoDiretriz,
  TipoPontoConceito,
  UsoArgumento,
} from '@/types/database'

// As 5 personas de médico da base de conhecimento de vendas
export const PERSONAS = [
  'Plantonista querendo sair do plantão',
  'Médica do SUS ou da residência sobrecarregada',
  'Especialista com consultório subutilizado',
  'Especialista preso a convênio e vínculos',
  'Médico experiente avesso a exposição',
]

export const ROTULO_CONSCIENCIA: Record<ConscienciaConceito, string> = {
  problema: 'Problema',
  solucao: 'Solução',
  produto: 'Produto',
}

export const ROTULO_TIPO_ARGUMENTO: Record<TipoArgumento, string> = {
  gancho: 'Gancho',
  argumento: 'Argumento',
  prova: 'Prova',
}

export const ROTULO_USO_ARGUMENTO: Record<UsoArgumento, string> = {
  seguro: 'Seguro',
  validar: 'Validar antes',
}

export const ROTULO_TIPO_DIRETRIZ: Record<TipoDiretriz, string> = {
  usar: 'Usar',
  evitar: 'Evitar',
  proibido: 'Proibido',
}

// Tamanho real (em px) de cada proporção da arte exportada
export const DIMENSOES_ARTE: Record<ProporcaoArte, { largura: number; altura: number }> = {
  '1:1': { largura: 1080, altura: 1080 },
  '4:5': { largura: 1080, altura: 1350 },
  '9:16': { largura: 1080, altura: 1920 },
}

export const MAX_VARIACOES = 6

// Lista vazia de vínculo significa "serve para todos"
export function servePara(ids: string[] | null | undefined, id: string | null) {
  return !id || !ids || ids.length === 0 || ids.includes(id)
}

// Cascata da Fábrica: Conceito (frente) → Narrativa → Ângulo
export function narrativasDoConceito<T extends { frente_ids: string[] }>(narrativas: T[], frenteId: string | null) {
  return narrativas.filter((narrativa) => servePara(narrativa.frente_ids, frenteId))
}

export function angulosDisponiveis<T extends { frente_ids: string[]; narrativa_ids: string[] }>(
  angulos: T[],
  frenteId: string | null,
  narrativaId: string | null,
) {
  return angulos.filter((angulo) => servePara(angulo.frente_ids, frenteId) && servePara(angulo.narrativa_ids, narrativaId))
}

// Estático sai sempre em quadrado + stories (a mesma arte); vídeo tem só a capa
export function proporcoesDoFormato(formato: { tipo: Formato; proporcao: ProporcaoArte }): ProporcaoArte[] {
  return formato.tipo === 'estatico' ? ['1:1', '9:16'] : [formato.proporcao]
}

export const ROTULO_PROPORCAO: Record<ProporcaoArte, string> = {
  '1:1': 'Quadrado',
  '4:5': 'Vertical',
  '9:16': 'Stories',
}

export const ROTULO_TIPO_PONTO: Record<TipoPontoConceito, string> = {
  dor: 'Dor',
  desejo: 'Desejo',
  beneficio: 'Benefício',
  prova: 'Prova',
}

// Modelos de IA que podem gerar os criativos. A função
// supabase/functions/gerar-criativos tem a mesma lista, com os preços.
export const MODELOS_IA = [
  { id: 'claude-opus-5-5', nome: 'Claude Opus 5.5', descricao: 'Padrão: ótima qualidade de texto' },
  { id: 'claude-sonnet-5-5', nome: 'Claude Sonnet 5.5', descricao: 'Metade do preço do Opus' },
  { id: 'claude-haiku-5-5', nome: 'Claude Haiku 5.5', descricao: 'O mais barato e rápido' },
  { id: 'claude-fable-5-1', nome: 'Claude Fable 5.1', descricao: 'O mais capaz; 2,5× o preço do Opus' },
]

export const MODELO_IA_PADRAO = 'claude-opus-5-5'

export function nomeDoModelo(id: string) {
  return MODELOS_IA.find((modelo) => modelo.id === id)?.nome ?? id
}

export function formatarReais(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatarDolares(valor: number) {
  return `US$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
}

export function formatarTokens(valor: number) {
  return valor.toLocaleString('pt-BR')
}
