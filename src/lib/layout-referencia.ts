// Layouts criados a partir de imagens de referência: a IA descreve a referência
// com estas opções (a função supabase/functions/analisar-referencia tem o mesmo
// esquema) e o modelo src/components/fabrica/arte/layout-referencia.tsx desenha.

export interface EspecificacaoLayout {
  // O que a IA entendeu da referência, em uma ou duas frases
  descricao: string
  // Fundo: cor sólida, degradê, foto ocupando tudo ou foto ocupando metade
  fundo: 'solido' | 'gradiente' | 'foto-inteira' | 'foto-metade'
  // Só em foto-metade: de que lado fica a foto
  lado_foto: 'topo' | 'base' | 'esquerda' | 'direita'
  alinhamento: 'esquerda' | 'centro'
  // Onde o bloco de texto fica na altura da arte
  posicao_texto: 'topo' | 'centro' | 'base'
  posicao_logo: 'topo' | 'base'
  escala_titulo: 'media' | 'grande' | 'gigante'
  caixa_alta: boolean
  // Pinta as últimas palavras do título na cor de destaque
  destacar_palavra: boolean
  apoio: 'nenhum' | 'texto' | 'cartao'
  selo: 'nenhum' | 'pilula' | 'faixa'
  cta: 'nenhum' | 'botao' | 'botao-largo' | 'texto'
  // Elemento visual extra junto do texto
  elemento: 'nenhum' | 'notificacao' | 'etapas' | 'foto-circulo' | 'foto-cartao'
  decoracao: 'nenhuma' | 'circulos' | 'linhas' | 'pontos' | 'moldura'
}

export interface CoresReferencia {
  fundo: string
  texto: string
  destaque: string
  apoio: string
}

// Padrões usados quando a especificação salva estiver incompleta
export const ESPECIFICACAO_PADRAO: EspecificacaoLayout = {
  descricao: '',
  fundo: 'gradiente',
  lado_foto: 'topo',
  alinhamento: 'esquerda',
  posicao_texto: 'centro',
  posicao_logo: 'topo',
  escala_titulo: 'grande',
  caixa_alta: false,
  destacar_palavra: false,
  apoio: 'texto',
  selo: 'pilula',
  cta: 'botao',
  elemento: 'nenhum',
  decoracao: 'nenhuma',
}

export function normalizarEspecificacao(valor: unknown): EspecificacaoLayout {
  return { ...ESPECIFICACAO_PADRAO, ...(valor && typeof valor === 'object' ? valor : {}) } as EspecificacaoLayout
}

// O layout depende de foto para ficar completo?
export function especificacaoUsaFoto(especificacao: EspecificacaoLayout | null | undefined) {
  if (!especificacao) return false
  return (
    especificacao.fundo === 'foto-inteira' ||
    especificacao.fundo === 'foto-metade' ||
    especificacao.elemento === 'foto-circulo' ||
    especificacao.elemento === 'foto-cartao'
  )
}

// Reduz a imagem enviada (lado maior até 1568 px) e devolve JPEG em base64,
// tamanho que a IA aceita bem e barateia a análise
export async function prepararImagemReferencia(arquivo: File): Promise<{ media_type: string; data: string; previa: string }> {
  const url = URL.createObjectURL(arquivo)
  try {
    const imagem = await new Promise<HTMLImageElement>((resolver, rejeitar) => {
      const img = new Image()
      img.onload = () => resolver(img)
      img.onerror = () => rejeitar(new Error('Imagem inválida.'))
      img.src = url
    })
    const escala = Math.min(1, 1568 / Math.max(imagem.naturalWidth, imagem.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(imagem.naturalWidth * escala)
    canvas.height = Math.round(imagem.naturalHeight * escala)
    const contexto = canvas.getContext('2d')
    if (!contexto) throw new Error('Não foi possível ler a imagem.')
    contexto.fillStyle = '#FFFFFF'
    contexto.fillRect(0, 0, canvas.width, canvas.height)
    contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height)
    const previa = canvas.toDataURL('image/jpeg', 0.85)
    return { media_type: 'image/jpeg', data: previa.split(',')[1], previa }
  } finally {
    URL.revokeObjectURL(url)
  }
}
