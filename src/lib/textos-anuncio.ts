import type { Criativo } from '@/types/database'

// Campos de copy na mesma ordem em que aparecem no Gerenciador de Anúncios do Meta.
export const CAMPOS_COPY = [
  { chave: 'texto_principal', rotulo: 'Texto principal' },
  { chave: 'titulo_anuncio', rotulo: 'Título' },
  { chave: 'descricao_anuncio', rotulo: 'Descrição' },
  { chave: 'chamada_acao', rotulo: 'Chamada para ação' },
  { chave: 'url_destino', rotulo: 'URL de destino' },
] as const

export type ChaveCopy = (typeof CAMPOS_COPY)[number]['chave']

export function temTextosAnuncio(criativo: Criativo) {
  return CAMPOS_COPY.some(({ chave }) => Boolean(criativo[chave]?.trim()))
}
