import type { EtapaProducao, Formato, StatusCriativo, TipoDia } from '@/types/database'

export const ORDEM_STATUS: StatusCriativo[] = [
  'backlog',
  'producao',
  'revisao',
  'aprovado',
  'publicado',
  'reprovado',
]

export const ROTULO_STATUS: Record<StatusCriativo, string> = {
  backlog: 'Backlog',
  producao: 'Produção',
  revisao: 'Revisão',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
  reprovado: 'Reprovado',
}

export const ROTULO_FORMATO: Record<Formato, string> = {
  video: 'Vídeo',
  estatico: 'Estático',
}

// Regra 2 do CLAUDE.md: só esses status contam para a meta
export const STATUS_CONTA_PARA_META: StatusCriativo[] = ['aprovado', 'publicado']

// Etapas de produção do vídeo, na ordem em que acontecem
export const ORDEM_ETAPA: EtapaProducao[] = ['a_captar', 'captado', 'em_edicao', 'editado']

export const ROTULO_ETAPA: Record<EtapaProducao, string> = {
  a_captar: 'A captar',
  captado: 'Captado',
  em_edicao: 'Em edição',
  editado: 'Editado',
}

// Um vídeo já gravado está em qualquer uma destas etapas
export const ETAPAS_JA_CAPTADAS: EtapaProducao[] = ['captado', 'em_edicao', 'editado']

export const ROTULO_TIPO_DIA: Record<TipoDia, string> = {
  presencial: 'Presencial',
  home: 'Home',
}
