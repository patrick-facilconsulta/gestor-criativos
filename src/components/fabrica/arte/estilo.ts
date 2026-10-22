import type { FabricaPaleta, ProporcaoArte, TextoArte } from '@/types/database'

export const FONTE_TITULO = "'Poppins', sans-serif"
export const FONTE_TEXTO = "'Inter Variable', 'Inter', sans-serif"
export const TEXTO_ESCURO = '#0A1628'

export interface CoresArte {
  fundo: string
  texto: string
  destaque: string
  apoio: string
  // Cor de texto legível sobre o destaque (botões, selos)
  sobreDestaque: string
  // Cor de texto legível sobre o apoio (cartões)
  sobreApoio: string
  // Fundo escuro usa o logo branco
  fundoEscuro: boolean
}

// Luminância relativa (WCAG) de uma cor #RRGGBB
function luminancia(hex: string) {
  const canais = [1, 3, 5].map((inicio) => {
    const valor = parseInt(hex.slice(inicio, inicio + 2), 16) / 255
    return valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2]
}

// Contraste WCAG entre duas cores (1 a 21)
export function contraste(a: string, b: string) {
  const [clara, escura] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (clara + 0.05) / (escura + 0.05)
}

export function ehEscura(hex: string) {
  return luminancia(hex) < 0.4
}

export function coresDaPaleta(paleta: FabricaPaleta): CoresArte {
  return {
    fundo: paleta.cor_fundo,
    texto: paleta.cor_texto,
    destaque: paleta.cor_destaque,
    apoio: paleta.cor_apoio,
    sobreDestaque: ehEscura(paleta.cor_destaque) ? '#FFFFFF' : ehEscura(paleta.cor_fundo) ? paleta.cor_fundo : TEXTO_ESCURO,
    sobreApoio: ehEscura(paleta.cor_apoio) ? '#FFFFFF' : TEXTO_ESCURO,
    fundoEscuro: ehEscura(paleta.cor_fundo),
  }
}

// Cor com transparência, a partir de #RRGGBB
export function comAlfa(hex: string, alfa: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alfa})`
}

// Diminui a fonte conforme o texto cresce, para caber sem cortar
export function tamanhoFonte(texto: string, maximo: number, minimo: number, caracteresReferencia: number) {
  const tamanho = texto.length <= caracteresReferencia
    ? maximo
    : maximo * Math.sqrt(caracteresReferencia / texto.length)
  return Math.round(Math.max(minimo, tamanho))
}

// Margens internas. No 9:16 (Stories) o topo e a base ficam cobertos pela
// interface do Instagram, então a arte reserva mais espaço nessas áreas.
export function margens(proporcao: ProporcaoArte) {
  if (proporcao === '9:16') return { topo: 200, base: 280, lados: 88 }
  if (proporcao === '4:5') return { topo: 96, base: 96, lados: 88 }
  return { topo: 80, base: 80, lados: 80 }
}

// O que todo modelo de layout recebe
export interface PropsLayout {
  texto: TextoArte
  cores: CoresArte
  proporcao: ProporcaoArte
  largura: number
  altura: number
  // Foto gerada para a variação (data: URL), quando houver
  fotoUrl?: string | null
  // Só no layout por referência: a especificação analisada pela IA
  // (EspecificacaoLayout antiga ou EspecificacaoHtml)
  especificacao?: unknown
}

// Separa o trecho a destacar dentro da frase. Sem o destaque na frase,
// destaca as duas últimas palavras (sem a pontuação final)
export function separarDestaque(frase: string, destaque: string) {
  const alvo = destaque.trim()
  if (alvo) {
    const inicio = frase.toLowerCase().indexOf(alvo.toLowerCase())
    if (inicio >= 0) {
      return { antes: frase.slice(0, inicio), marcado: frase.slice(inicio, inicio + alvo.length), depois: frase.slice(inicio + alvo.length) }
    }
  }
  const partes = frase.match(/^([\s\S]*?)(\S+\s+\S+?)([.!?…]*)$/)
  if (partes) return { antes: partes[1], marcado: partes[2], depois: partes[3] }
  return { antes: '', marcado: frase, depois: '' }
}
