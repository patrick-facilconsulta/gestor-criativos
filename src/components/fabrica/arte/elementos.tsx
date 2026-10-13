import type { CSSProperties, ReactNode } from 'react'
import logoBranco from '../../../../docs/primário branco.svg'
import logoPrimario from '../../../../docs/Logotipo primário.svg'
import type { ProporcaoArte } from '@/types/database'
import { FONTE_TEXTO, FONTE_TITULO, margens, type CoresArte } from './estilo'

export function Logo({ cores, altura = 64 }: { cores: CoresArte; altura?: number }) {
  return (
    <img
      src={cores.fundoEscuro ? logoBranco : logoPrimario}
      alt="Fácil consulta"
      style={{ height: altura, width: 'auto', display: 'block', alignSelf: 'flex-start' }}
    />
  )
}

export function Selo({ cores, children, estilo }: { cores: CoresArte; children: ReactNode; estilo?: CSSProperties }) {
  return (
    <span
      style={{
        display: 'inline-block',
        alignSelf: 'flex-start',
        padding: '14px 30px',
        borderRadius: 999,
        background: cores.destaque,
        color: cores.sobreDestaque,
        fontFamily: FONTE_TITULO,
        fontWeight: 600,
        fontSize: 32,
        lineHeight: 1.1,
        ...estilo,
      }}
    >
      {children}
    </span>
  )
}

// `largo`: ocupa toda a largura disponível (layouts por referência)
export function BotaoCta({
  cores,
  children,
  largo = false,
  tamanho = 40,
}: {
  cores: CoresArte
  children: ReactNode
  largo?: boolean
  tamanho?: number
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        width: largo ? '100%' : undefined,
        justifyContent: 'center',
        alignItems: 'center',
        gap: tamanho * 0.45,
        padding: `${tamanho * 0.75}px ${tamanho * 1.3}px`,
        borderRadius: 24,
        background: cores.destaque,
        color: cores.sobreDestaque,
        fontFamily: FONTE_TITULO,
        fontWeight: 700,
        fontSize: tamanho,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}
    >
      {children}
      <span style={{ fontSize: tamanho * 1.1 }}>→</span>
    </span>
  )
}

export function Titulo({ cores, tamanho, children, estilo }: { cores: CoresArte; tamanho: number; children: ReactNode; estilo?: CSSProperties }) {
  return (
    <h2
      style={{
        margin: 0,
        color: cores.texto,
        fontFamily: FONTE_TITULO,
        fontWeight: 700,
        fontSize: tamanho,
        lineHeight: 1.08,
        letterSpacing: '-0.01em',
        ...estilo,
      }}
    >
      {children}
    </h2>
  )
}

// `apoio`: texto de apoio de campanha em Poppins Light, como pede o manual da
// marca; sem ele, texto corrido em Inter
export function Paragrafo({
  cor,
  tamanho = 38,
  children,
  estilo,
  apoio = false,
}: {
  cor: string
  tamanho?: number
  children: ReactNode
  estilo?: CSSProperties
  apoio?: boolean
}) {
  return (
    <p
      style={{
        margin: 0,
        color: cor,
        fontFamily: apoio ? FONTE_TITULO : FONTE_TEXTO,
        fontWeight: apoio ? 300 : 400,
        fontSize: tamanho,
        lineHeight: 1.35,
        ...estilo,
      }}
    >
      {children}
    </p>
  )
}

// Círculos decorativos de fundo, nas cores da paleta
export function Decoracao({ cores, largura, altura }: { cores: CoresArte; largura: number; altura: number }) {
  return (
    <svg
      width={largura}
      height={altura}
      viewBox={`0 0 ${largura} ${altura}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      aria-hidden
    >
      <circle cx={largura - 40} cy={120} r={260} fill={cores.apoio} opacity={0.55} />
      <circle cx={largura + 60} cy={altura - 200} r={200} fill={cores.apoio} opacity={0.4} />
      <circle cx={-80} cy={altura * 0.62} r={180} fill={cores.apoio} opacity={0.35} />
    </svg>
  )
}

// Foto em destaque redonda, com borda na cor de destaque
export function FotoDetalhe({ url, cores, tamanho }: { url: string; cores: CoresArte; tamanho: number }) {
  return (
    <img
      src={url}
      alt=""
      style={{
        width: tamanho,
        height: tamanho,
        flexShrink: 0,
        objectFit: 'cover',
        objectPosition: 'center 30%',
        borderRadius: '50%',
        border: `${Math.round(tamanho * 0.035)}px solid ${cores.destaque}`,
        boxShadow: '0 18px 40px rgba(6, 28, 54, 0.3)',
        display: 'block',
      }}
    />
  )
}

// Área útil da arte, já com as margens da proporção
export function Moldura({ proporcao, children, estilo }: { proporcao: ProporcaoArte; children: ReactNode; estilo?: CSSProperties }) {
  const { topo, base, lados } = margens(proporcao)

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: `${topo}px ${lados}px ${base}px`,
        display: 'flex',
        flexDirection: 'column',
        ...estilo,
      }}
    >
      {children}
    </div>
  )
}
