import type { CSSProperties, ReactNode } from 'react'
import { comAlfa } from './estilo'

// Elementos dos "territórios" criativos (diversificação pedida pelo Meta):
// textura de papel, traços feitos à mão, marca-texto e texto selecionado.
// Tudo desenhado em HTML/SVG, para sair igual em toda variação.

// Ruído leve de papel. Só em fundo claro (em fundo escuro some ou suja).
// Em base64: no texto puro, a exportação do PNG (html-to-image) decodificava o
// "%23" e o filtro se perdia; o retângulo saía preto e cobria o fundo da arte.
const RUIDO = `url("data:image/svg+xml;base64,${btoa(
  "<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0.10 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>",
)}")`

export function TexturaPapel() {
  return <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: RUIDO, pointerEvents: 'none' }} />
}

// Marca-texto: faixa de cor atrás do trecho, um pouco torta, como caneta real
export function MarcaTexto({ cor, opacidade, children, corTexto }: { cor: string; opacidade: number; children: ReactNode; corTexto?: string }) {
  const tinta = comAlfa(cor, opacidade)
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(100deg, ${comAlfa(cor, 0)} 0.6%, ${tinta} 2.4%, ${tinta} 97%, ${comAlfa(cor, 0)} 99.4%)`,
        backgroundSize: '100% 72%',
        backgroundPosition: '0 70%',
        backgroundRepeat: 'no-repeat',
        boxDecorationBreak: 'clone',
        WebkitBoxDecorationBreak: 'clone',
        padding: '0 0.12em',
        margin: '0 -0.06em',
        color: corTexto,
      }}
    >
      {children}
    </span>
  )
}

// Texto selecionado como no celular: fundo azul claro e as duas "alças"
export function TextoSelecionado({ cor, children }: { cor: string; children: ReactNode }) {
  const alca = (posicao: 'inicio' | 'fim'): CSSProperties => ({
    position: 'relative',
    display: 'inline-block',
    width: 0,
    height: '1em',
    verticalAlign: '-0.12em',
    borderLeft: `0.045em solid ${cor}`,
    marginLeft: posicao === 'inicio' ? '-0.02em' : 0,
  })
  const bolinha = (posicao: 'inicio' | 'fim'): CSSProperties => ({
    position: 'absolute',
    left: '-0.09em',
    [posicao === 'inicio' ? 'top' : 'bottom']: '-0.14em',
    width: '0.14em',
    height: '0.14em',
    borderRadius: '50%',
    background: cor,
  })
  // Separa a primeira e a última palavra para as alças ficarem grudadas nelas
  const textoSelecao = String(children)
  const primeiroEspaco = textoSelecao.indexOf(' ')
  const ultimoEspaco = textoSelecao.lastIndexOf(' ')
  const [inicio, meio, fim] = primeiroEspaco < 0
    ? [textoSelecao, '', '']
    : [textoSelecao.slice(0, primeiroEspaco), textoSelecao.slice(primeiroEspaco, ultimoEspaco + 1), textoSelecao.slice(ultimoEspaco + 1)]
  return (
    <span style={{ background: comAlfa(cor, 0.26), boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>
      <span style={{ whiteSpace: 'nowrap' }}>
        <span style={alca('inicio')}><span style={bolinha('inicio')} /></span>
        {inicio}
      </span>
      {meio}
      {fim && (
        <span style={{ whiteSpace: 'nowrap' }}>
          {fim}
          <span style={alca('fim')}><span style={bolinha('fim')} /></span>
        </span>
      )}
      {!fim && <span style={alca('fim')}><span style={bolinha('fim')} /></span>}
    </span>
  )
}

// Menu de texto selecionado (Copiar | Selecionar tudo | Compartilhar)
export function MenuSelecao({ tamanho }: { tamanho: number }) {
  const itens = ['Copiar', 'Selecionar tudo', 'Compartilhar']
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'stretch',
        background: '#FFFFFF',
        borderRadius: tamanho * 0.55,
        boxShadow: '0 10px 30px rgba(10, 22, 40, 0.18), 0 0 0 1px rgba(10, 22, 40, 0.06)',
        fontFamily: "'Inter Variable', 'Inter', sans-serif",
        fontSize: tamanho,
        color: '#0A1628',
        overflow: 'hidden',
      }}
    >
      {itens.map((item, indice) => (
        <span key={item} style={{ padding: `${tamanho * 0.5}px ${tamanho * 0.8}px`, borderLeft: indice ? '1px solid rgba(10,22,40,0.12)' : undefined }}>
          {item}
        </span>
      ))}
      <span style={{ padding: `${tamanho * 0.5}px ${tamanho * 0.6}px`, borderLeft: '1px solid rgba(10,22,40,0.12)' }}>›</span>
    </div>
  )
}

// Círculo feito à mão em volta de um trecho
export function Circulado({ cor, children, espessura = 6 }: { cor: string; children: ReactNode; espessura?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <svg
        viewBox="0 0 200 100"
        preserveAspectRatio="none"
        aria-hidden
        style={{ position: 'absolute', left: '-12%', top: '-18%', width: '124%', height: '136%', overflow: 'visible', pointerEvents: 'none' }}
      >
        <path
          d="M 34 16 C 86 0, 172 6, 194 42 C 212 76, 150 99, 92 97 C 32 95, 2 72, 9 45 C 15 24, 52 9, 116 7"
          fill="none"
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  )
}

// Sublinhado ondulado feito à mão
export function Sublinhado({ cor, children, espessura = 6 }: { cor: string; children: ReactNode; espessura?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <svg
        viewBox="0 0 200 20"
        preserveAspectRatio="none"
        aria-hidden
        style={{ position: 'absolute', left: '-2%', bottom: '-0.16em', width: '104%', height: '0.28em', overflow: 'visible' }}
      >
        <path d="M 2 13 C 40 4, 78 17, 118 9 S 186 5, 198 11" fill="none" stroke={cor} strokeWidth={espessura} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </span>
  )
}

// Seta curva feita à mão (aponta para baixo e para a direita)
export function SetaMao({ cor, largura, estilo }: { cor: string; largura: number; estilo?: CSSProperties }) {
  return (
    <svg viewBox="0 0 120 90" width={largura} height={largura * 0.75} aria-hidden style={{ overflow: 'visible', ...estilo }}>
      <path d="M 8 10 C 20 58, 58 80, 104 70" fill="none" stroke={cor} strokeWidth={5} strokeLinecap="round" />
      <path d="M 86 54 L 106 70 L 84 84" fill="none" stroke={cor} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Rótulo pequeno de "edição" no topo (ex.: FÁCIL CONSULTA ——— PARA MÉDICOS)
export function RotuloEdicao({ cor, tamanho, esquerda, direita }: { cor: string; tamanho: number; esquerda: string; direita?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: tamanho, color: cor, fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: tamanho, letterSpacing: '0.12em' }}>
      <span>{esquerda}</span>
      <span style={{ flex: 1, height: 2, background: cor, opacity: 0.8 }} />
      {direita && <span>{direita}</span>}
    </div>
  )
}
