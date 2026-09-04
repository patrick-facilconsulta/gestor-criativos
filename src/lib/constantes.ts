import type { Formato, StatusCriativo } from '@/types/database'

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
