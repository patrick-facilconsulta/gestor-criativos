export type Formato = 'video' | 'estatico'

export type StatusCriativo =
  | 'backlog'
  | 'producao'
  | 'revisao'
  | 'aprovado'
  | 'publicado'
  | 'reprovado'

export interface Frente {
  id: string
  nome: string
  ordem: number
  ativa: boolean
}

export interface Meta {
  id: string
  frente_id: string
  formato: Formato
  meta_semanal: number
  meta_mensal: number
}

export interface Criativo {
  id: string
  titulo: string
  frente_id: string
  formato: Formato
  status: StatusCriativo
  responsavel: string | null
  link_arquivo: string | null
  arquivo_path: string | null
  arquivo_nome: string | null
  arquivo_tipo: string | null
  arquivo_tamanho: number | null
  link_briefing: string | null
  data_prevista: string | null
  data_entrega: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
}
