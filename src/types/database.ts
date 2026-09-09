export type Formato = 'video' | 'estatico'

export type StatusCriativo =
  | 'backlog'
  | 'producao'
  | 'revisao'
  | 'aprovado'
  | 'publicado'
  | 'reprovado'

// Etapa de produção do vídeo. Anda em paralelo ao funil de `status`, sem
// substituí-lo — detalha o que acontece dentro de 'producao'.
export type EtapaProducao = 'a_captar' | 'captado' | 'em_edicao' | 'editado'

export type TipoDia = 'presencial' | 'home'

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
  link_inspiracao: string | null
  data_prevista: string | null
  data_entrega: string | null
  briefing: string | null
  texto_principal: string | null
  titulo_anuncio: string | null
  descricao_anuncio: string | null
  chamada_acao: string | null
  url_destino: string | null
  etapa: EtapaProducao | null
  data_captacao: string | null
  editor: string | null
  created_at: string
  updated_at: string
}

// Um dia do cronograma. Dia sem linha no banco é tratado como 'home'.
export interface DiaProducao {
  id: string
  data: string
  tipo: TipoDia
  observacao: string | null
  created_at: string
}
