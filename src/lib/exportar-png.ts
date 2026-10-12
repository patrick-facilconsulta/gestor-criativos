import { toBlob } from 'html-to-image'

// Converte a arte (o elemento em tamanho real) em PNG. O `style` zera a escala
// da prévia, para o arquivo sair com 1080 px de largura.
export async function gerarPng(elemento: HTMLElement, largura: number, altura: number): Promise<Blob> {
  const blob = await toBlob(elemento, {
    width: largura,
    height: altura,
    pixelRatio: 1,
    cacheBust: true,
    style: { transform: 'none' },
  })

  if (!blob) {
    throw new Error('Não foi possível gerar a imagem.')
  }

  return blob
}

export function baixarArquivo(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Nome de arquivo sem acentos nem símbolos
export function nomeArquivo(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60) || 'criativo'
}
