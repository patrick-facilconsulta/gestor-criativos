import { toBlob } from 'html-to-image'

// Converte a arte (o elemento em tamanho real) em PNG. O `style` zera a escala
// da prévia, para o arquivo sair com 1080 px de largura.
export async function gerarPng(elemento: HTMLElement, largura: number, altura: number): Promise<Blob> {
  const blob = await toBlob(elemento, {
    width: largura,
    height: altura,
    pixelRatio: 1,
    // Sem cacheBust: ele acrescenta "?t=..." às imagens e quebra endereços
    // blob: (a foto da variação deixava de ser encontrada no envio para revisão)
    cacheBust: false,
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
  // Libera a memória só depois, para não cancelar o download no meio
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
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
