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
  // Versão stories (9:16) do estático, quando houver
  arquivo_stories_path: string | null
  arquivo_stories_nome: string | null
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

// ---------------------------------------------------------------------------
// Fábrica de criativos
// ---------------------------------------------------------------------------

export type ConscienciaConceito = 'problema' | 'solucao' | 'produto'
export type TipoArgumento = 'gancho' | 'argumento' | 'prova'
export type UsoArgumento = 'seguro' | 'validar'
export type ProporcaoArte = '1:1' | '4:5' | '9:16'
export type TipoDiretriz = 'usar' | 'evitar' | 'proibido'

// Na tela, um FabricaConceito se chama "Ângulo" (e a Frente se chama "Conceito")
export interface FabricaConceito {
  id: string
  nome: string
  mensagem: string
  personas: string | null
  consciencia: ConscienciaConceito
  objecao: string | null
  roteiro_referencia: string | null
  cuidados: string | null
  // Conceitos (frentes) e narrativas em que o ângulo pode ser usado; vazio = todos
  frente_ids: string[]
  narrativa_ids: string[]
  ativo: boolean
  ordem: number
  created_at: string
}

export interface FabricaArgumento {
  id: string
  conceito_id: string
  tipo: TipoArgumento
  texto: string
  origem: string | null
  uso: UsoArgumento
  ativo: boolean
  created_at: string
}

export interface FabricaNarrativa {
  id: string
  nome: string
  estrutura: string
  descricao: string | null
  // Conceitos (frentes) em que a narrativa pode ser usada; vazio = todos
  frente_ids: string[]
  ativo: boolean
  ordem: number
  created_at: string
}

export interface FabricaFormato {
  id: string
  nome: string
  tipo: Formato
  proporcao: ProporcaoArte
  descricao: string | null
  ativo: boolean
  ordem: number
  created_at: string
}

export interface FabricaLayout {
  id: string
  chave: string
  nome: string
  descricao: string | null
  ativo: boolean
  ordem: number
  created_at: string
}

export interface FabricaPaleta {
  id: string
  nome: string
  cor_fundo: string
  cor_texto: string
  cor_destaque: string
  cor_apoio: string
  ativo: boolean
  ordem: number
  created_at: string
}

export interface FabricaDiretriz {
  id: string
  tipo: TipoDiretriz
  texto: string
  ativo: boolean
  created_at: string
}

export interface FabricaBaseConhecimento {
  id: string
  conteudo: string
  updated_at: string
}

// Textos que vão dentro da arte
export interface TextoArte {
  gancho: string
  apoio: string
  destaque: string
  cta: string
  // 3 passos curtos (layout de etapas)
  itens: string[]
  // Comparativo: a situação de hoje e a situação com a Fácil consulta
  antes: string
  depois: string
}

export interface FabricaGeracao {
  id: string
  lote_id: string
  frente_id: string | null
  conceito_id: string | null
  narrativa_id: string | null
  formato_id: string | null
  layout_id: string | null
  paleta_id: string | null
  persona: string | null
  argumento_central: string | null
  texto_arte: TextoArte
  texto_principal: string | null
  titulo_anuncio: string | null
  descricao_anuncio: string | null
  chamada_acao: string | null
  roteiro: string | null
  alertas: string[]
  criativo_id: string | null
  criado_por: string | null
  created_at: string
}

export type TipoPontoConceito = 'dor' | 'desejo' | 'beneficio' | 'prova'

// Pontos de um conceito (frente) definidos pelo marketing
export interface FabricaPontoConceito {
  id: string
  frente_id: string
  tipo: TipoPontoConceito
  texto: string
  uso: UsoArgumento
  ativo: boolean
  ordem: number
  created_at: string
}

// Uma rodada de geração: modelo de IA, tokens e custo estimado
export interface FabricaLote {
  id: string
  modelo: string
  quantidade: number
  tokens_entrada: number
  tokens_cache_escrita: number
  tokens_cache_leitura: number
  tokens_saida: number
  custo_usd: number
  cotacao_dolar: number
  custo_brl: number
  criado_por: string | null
  created_at: string
}
