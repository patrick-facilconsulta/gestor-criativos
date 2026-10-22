// Tamanho máximo dos textos da arte em cada layout, em caracteres (contando
// espaços e pontuação). Cada layout só lista os campos que mostra; "itens" é o
// limite de cada item. Os números saíram dos textos aprovados no piloto dos
// territórios (22/10/2026), com uma pequena folga.
// Cópia de src/lib/limites-texto.ts (a tela usa aquela): mudou num, mude no outro.

export interface TextoArte {
  gancho: string
  apoio: string
  destaque: string
  cta: string
  itens: string[]
  antes: string
  depois: string
}

export type CampoArte = 'gancho' | 'apoio' | 'destaque' | 'cta' | 'itens' | 'antes' | 'depois'
export type LimitesTexto = Partial<Record<CampoArte, number>>

export const LIMITES_LAYOUT: Record<string, LimitesTexto> = {
  // Arte clássica
  manchete: { gancho: 70, apoio: 120, destaque: 26, cta: 22 },
  pergunta: { gancho: 70, apoio: 120, cta: 22 },
  notificacao: { gancho: 70, apoio: 120, cta: 22 },
  comparativo: { gancho: 70, antes: 55, depois: 55, cta: 22 },
  etapas: { gancho: 70, itens: 38, cta: 22 },
  'busca-google': { gancho: 70, apoio: 120, cta: 22 },
  'foto-fundo': { gancho: 70, apoio: 120, destaque: 26, cta: 22 },
  // Territórios
  'notificacao-bloqueio': { gancho: 55, apoio: 65 },
  'nota-celular': { gancho: 42, destaque: 18, apoio: 60, itens: 20 },
  'marca-texto': { gancho: 75, destaque: 24, apoio: 70, cta: 16 },
  'texto-selecionado': { gancho: 50, destaque: 16, apoio: 55 },
  'etiquetas-foto': { gancho: 50, apoio: 60, itens: 22 },
  'post-its-foto': { gancho: 28, apoio: 60, itens: 20 },
  conversa: { gancho: 60, apoio: 55 },
  enquete: { gancho: 38, apoio: 55, cta: 16 },
  relogio: { gancho: 45, apoio: 55 },
  recortes: { gancho: 45, destaque: 18, apoio: 55 },
  'objeto-foto': { gancho: 28, apoio: 70 },
  'produto-real': { gancho: 48, apoio: 75, itens: 22 },
}

// Layout por referência (ou chave desconhecida): as regras gerais de antes
export const LIMITES_PADRAO: LimitesTexto = { gancho: 70, apoio: 120, destaque: 26, cta: 22, itens: 38 }

// Layouts em que o destaque é um trecho do próprio gancho (grifado, selecionado
// ou em papel colorido); fora dele, o layout grifa as últimas palavras
export const DESTAQUE_NO_GANCHO = ['nota-celular', 'marca-texto', 'texto-selecionado', 'recortes']

export function limitesDoLayout(chave: string | null | undefined): LimitesTexto {
  return (chave && LIMITES_LAYOUT[chave]) || LIMITES_PADRAO
}

export interface Excesso {
  campo: CampoArte
  tamanho: number
  limite: number
}

// Campos que passam do limite do layout (itens: o maior deles)
export function excessosDeTexto(texto: TextoArte, chave: string | null | undefined): Excesso[] {
  const limites = limitesDoLayout(chave)
  const excessos: Excesso[] = []
  for (const [campo, limite] of Object.entries(limites) as [CampoArte, number][]) {
    const tamanho = campo === 'itens'
      ? Math.max(0, ...(texto.itens ?? []).map((item) => item.trim().length))
      : (texto[campo] ?? '').trim().length
    if (tamanho > limite) excessos.push({ campo, tamanho, limite })
  }
  return excessos
}
