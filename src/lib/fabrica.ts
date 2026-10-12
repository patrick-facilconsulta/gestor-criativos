import type {
  ConscienciaConceito,
  ProporcaoArte,
  TipoArgumento,
  TipoDiretriz,
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
