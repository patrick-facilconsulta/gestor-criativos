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
export function especificacaoUsaFoto(especificacao: unknown) {
  if (!especificacao) return false
  if (ehEspecificacaoHtml(especificacao)) return especificacao.usa_foto
  const e = normalizarEspecificacao(especificacao)
  return (
    e.fundo === 'foto-inteira' ||
    e.fundo === 'foto-metade' ||
    e.elemento === 'foto-circulo' ||
    e.elemento === 'foto-cartao'
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

// ---------------------------------------------------------------------------
// Layout recriado em HTML (padrão atual): a IA recria a composição da
// referência como HTML com estilos inline, usando marcadores de texto e as
// variáveis de cor da paleta da marca. Nunca usa as cores da referência.
// ---------------------------------------------------------------------------

export interface EspecificacaoHtml {
  tipo: 'html'
  descricao: string
  usa_foto: boolean
  // Sugestão de foto para gerar na variação, quando o layout usa foto
  foto_sugerida: string
  html_quadrado: string
  html_stories: string
  // Foto de exemplo gerada na criação do layout (bucket `fabrica`). Vale para
  // toda variação que usar o layout, até ela ganhar uma foto própria
  foto_padrao_path?: string | null
}

export function ehEspecificacaoHtml(valor: unknown): valor is EspecificacaoHtml {
  return Boolean(valor) && typeof valor === 'object' && (valor as { tipo?: string }).tipo === 'html'
}

// O título encolhe conforme cresce (1 = título curto)
export function escalaTexto(gancho: string) {
  return gancho.length <= 40 ? 1 : Math.max(0.62, Math.sqrt(40 / gancho.length))
}

function escaparHtml(texto: string) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface DadosTemplate {
  gancho: string
  apoio: string
  selo: string
  cta: string
  itens: string[]
  logoBranco: string
  logoColorido: string
  // Foto da variação ou, sem ela, uma imagem neutra no lugar
  foto: string
}

// Limpa o HTML gerado pela IA (sem scripts, eventos, estilos globais ou
// endereços externos) e preenche marcadores, logo e foto
export function montarHtmlTemplate(template: string, dados: DadosTemplate): string {
  const preenchido = template
    .replace(/\{\{GANCHO\}\}/g, escaparHtml(dados.gancho))
    .replace(/\{\{APOIO\}\}/g, escaparHtml(dados.apoio))
    .replace(/\{\{SELO\}\}/g, escaparHtml(dados.selo))
    .replace(/\{\{CTA\}\}/g, escaparHtml(dados.cta))
    .replace(/\{\{ITEM_([1-3])\}\}/g, (_, n: string) => escaparHtml(dados.itens[Number(n) - 1] ?? ''))

  const documento = new DOMParser().parseFromString(`<div id="raiz">${preenchido}</div>`, 'text/html')
  const raiz = documento.getElementById('raiz')
  if (!raiz) return ''

  raiz
    .querySelectorAll('script, style, iframe, object, embed, link, meta, base, form, input, button, textarea, select, video, audio, svg foreignObject')
    .forEach((elemento) => elemento.remove())

  raiz.querySelectorAll('*').forEach((elemento) => {
    for (const atributo of [...elemento.attributes]) {
      const nome = atributo.name.toLowerCase()
      if (nome.startsWith('on') || nome === 'src' || nome === 'href' || nome === 'xlink:href' || nome === 'srcset') {
        elemento.removeAttribute(atributo.name)
      } else if (nome === 'style' && /url\(|expression\(|@import/i.test(atributo.value)) {
        elemento.setAttribute('style', atributo.value.replace(/url\([^)]*\)|expression\([^)]*\)|@import[^;]*;?/gi, 'none'))
      }
    }
  })

  raiz.querySelectorAll('img').forEach((imagem) => {
    const papel = imagem.getAttribute('data-papel')
    if (papel === 'logo') {
      imagem.setAttribute('src', imagem.getAttribute('data-versao') === 'branca' ? dados.logoBranco : dados.logoColorido)
      imagem.setAttribute('alt', 'Fácil consulta')
    } else if (papel === 'foto') {
      imagem.setAttribute('src', dados.foto)
      imagem.setAttribute('alt', '')
    } else {
      imagem.remove()
    }
  })

  return raiz.innerHTML
}

// Imagem neutra (cinza, com o rótulo "foto") no lugar da foto, até existir uma.
// Cinza de propósito: com as cores da paleta parecia um fundo liso.
export function fotoProvisoria() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B7C1CC"/><stop offset="1" stop-color="#7D8A97"/></linearGradient></defs><rect width="800" height="1200" fill="url(#g)"/><g fill="none" stroke="#FFFFFF" stroke-opacity=".8" stroke-width="10"><rect x="320" y="520" width="160" height="120" rx="18"/><circle cx="400" cy="580" r="34"/></g><text x="400" y="700" text-anchor="middle" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#FFFFFF" fill-opacity=".85" letter-spacing="6">FOTO</text></svg>`
  return 'data:image/svg+xml;base64,' + btoa(svg)
}
