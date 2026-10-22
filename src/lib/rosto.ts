import { useEffect, useState } from 'react'

// Detecção de rosto nas fotos das artes (MediaPipe, do Google), feita no próprio
// navegador: a foto não sai do computador e não há custo. Serve para os modelos
// com foto enquadrarem o rosto inteiro e nunca colocarem etiqueta ou post-it
// em cima dele. O modelo fica em public/mediapipe; o motor (wasm) vem da CDN,
// na mesma versão do pacote (package.json fixa a versão exata).

const VERSAO = '0.10.21'
const MOTOR = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSAO}/wasm`
const MODELO = '/mediapipe/blaze_face_short_range.tflite'

export interface Rosto {
  // Caixa do rosto, em fração da imagem (0 a 1)
  x: number
  y: number
  largura: number
  altura: number
  // Tamanho original da imagem, em px
  larguraImagem: number
  alturaImagem: number
}

type Detector = { detect: (imagem: HTMLImageElement) => { detections: { boundingBox?: { originX: number; originY: number; width: number; height: number }; categories?: { score: number }[] }[] } }

let detector: Promise<Detector> | null = null
const cache = new Map<string, Promise<Rosto | null>>()

function carregarDetector(): Promise<Detector> {
  detector ??= (async () => {
    const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision')
    const arquivos = await FilesetResolver.forVisionTasks(MOTOR)
    return (await FaceDetector.createFromOptions(arquivos, {
      baseOptions: { modelAssetPath: MODELO },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.5,
    })) as unknown as Detector
  })()
  return detector
}

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rejeitar) => {
    const imagem = new Image()
    imagem.crossOrigin = 'anonymous'
    imagem.onload = () => resolver(imagem)
    imagem.onerror = () => rejeitar(new Error('imagem'))
    imagem.src = url
  })
}

// Maior rosto da foto (ou null se não achar). Fica guardado por endereço.
export function detectarRosto(url: string): Promise<Rosto | null> {
  let pendente = cache.get(url)
  if (!pendente) {
    pendente = (async () => {
      try {
        const [d, imagem] = await Promise.all([carregarDetector(), carregarImagem(url)])
        const rostos = d.detect(imagem).detections
          .map((r) => r.boundingBox)
          .filter((b): b is NonNullable<typeof b> => Boolean(b))
          .sort((a, b) => b.width * b.height - a.width * a.height)
        const maior = rostos[0]
        if (!maior) return null
        const w = imagem.naturalWidth
        const h = imagem.naturalHeight
        // A caixa do detector pega da testa ao queixo: aumenta para incluir cabelo e pescoço
        const folgaX = maior.width * 0.25
        const folgaTopo = maior.height * 0.45
        const folgaBase = maior.height * 0.2
        const x = Math.max(0, maior.originX - folgaX)
        const y = Math.max(0, maior.originY - folgaTopo)
        return {
          x: x / w,
          y: y / h,
          largura: Math.min(w - x, maior.width + folgaX * 2) / w,
          altura: Math.min(h - y, maior.height + folgaTopo + folgaBase) / h,
          larguraImagem: w,
          alturaImagem: h,
        }
      } catch {
        // Sem detector (sem internet, navegador antigo): o layout usa as posições padrão
        return null
      }
    })()
    cache.set(url, pendente)
  }
  return pendente
}

// Rosto de uma foto para usar no render (null enquanto procura ou se não houver)
export function useRosto(url: string | null | undefined): Rosto | null {
  const [resultado, setResultado] = useState<{ url: string; rosto: Rosto | null } | null>(null)
  useEffect(() => {
    if (!url) return
    let ativo = true
    detectarRosto(url).then((rosto) => ativo && setResultado({ url, rosto }))
    return () => {
      ativo = false
    }
  }, [url])
  return resultado && resultado.url === url ? resultado.rosto : null
}

export interface Retangulo {
  x: number
  y: number
  largura: number
  altura: number
}

// Enquadra a foto (object-fit: cover) numa caixa, levando o centro do rosto
// para o ponto alvo (fração da caixa). Devolve o object-position e onde o rosto
// fica na caixa, em px.
export function enquadrarRosto(
  rosto: Rosto,
  caixa: { largura: number; altura: number },
  alvo: { x: number; y: number },
): { objectPosition: string; rostoNaCaixa: Retangulo } {
  const escala = Math.max(caixa.largura / rosto.larguraImagem, caixa.altura / rosto.alturaImagem)
  const larguraExibida = rosto.larguraImagem * escala
  const alturaExibida = rosto.alturaImagem * escala
  const centroX = (rosto.x + rosto.largura / 2) * larguraExibida
  const centroY = (rosto.y + rosto.altura / 2) * alturaExibida
  // Deslocamento da imagem (negativo = para a esquerda/cima), sem deixar sobrar borda
  const deslocX = Math.min(0, Math.max(caixa.largura - larguraExibida, caixa.largura * alvo.x - centroX))
  const deslocY = Math.min(0, Math.max(caixa.altura - alturaExibida, caixa.altura * alvo.y - centroY))
  const posX = larguraExibida > caixa.largura ? (deslocX / (caixa.largura - larguraExibida)) * 100 : 50
  const posY = alturaExibida > caixa.altura ? (deslocY / (caixa.altura - alturaExibida)) * 100 : 50
  return {
    objectPosition: `${posX.toFixed(2)}% ${posY.toFixed(2)}%`,
    rostoNaCaixa: {
      x: rosto.x * larguraExibida + deslocX,
      y: rosto.y * alturaExibida + deslocY,
      largura: rosto.largura * larguraExibida,
      altura: rosto.altura * alturaExibida,
    },
  }
}

export function seSobrepoem(a: Retangulo, b: Retangulo, folga = 0) {
  return a.x < b.x + b.largura + folga && b.x < a.x + a.largura + folga && a.y < b.y + b.altura + folga && b.y < a.y + a.altura + folga
}

// Escolhe, entre posições candidatas (em ordem de preferência), as que não
// encostam no rosto, em áreas proibidas nem umas nas outras
export function escolherPosicoes(
  candidatos: Retangulo[],
  quantidade: number,
  evitar: Retangulo[],
  folga: number,
): Retangulo[] {
  const escolhidos: Retangulo[] = []
  for (const candidato of candidatos) {
    if (escolhidos.length >= quantidade) break
    if (evitar.some((area) => seSobrepoem(candidato, area, folga))) continue
    if (escolhidos.some((outro) => seSobrepoem(candidato, outro, folga / 2))) continue
    escolhidos.push(candidato)
  }
  return escolhidos
}
