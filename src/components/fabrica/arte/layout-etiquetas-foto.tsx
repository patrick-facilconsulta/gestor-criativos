import { fotoProvisoria } from '@/lib/layout-referencia'
import { enquadrarRosto, seSobrepoem, useRosto, type Retangulo } from '@/lib/rosto'
import { Logo } from './elementos'
import { FONTE_TEXTO, FONTE_TITULO, TEXTO_ESCURO, comAlfa, margens, tamanhoFonte, type PropsLayout } from './estilo'

// Território "pessoa em cena real": foto do médico no dia a dia, com etiquetas
// flutuando em volta (o que a plataforma faz por ele) e o título embaixo.
// REGRA: etiqueta nunca em cima do rosto. O rosto é detectado na foto
// (src/lib/rosto.ts): a foto é enquadrada com o rosto no alto e cada etiqueta
// só ocupa uma posição livre (fora do rosto, do título e da logo), dentro da
// margem padrão. Sem rosto detectado, usa posições padrão.

function Cursor({ tamanho }: { tamanho: number }) {
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden style={{ position: 'absolute', right: tamanho * 0.4, bottom: -tamanho * 0.75, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }}>
      <path d="M4 2 L4 19 L8.5 14.8 L11.6 21.5 L14.4 20.2 L11.3 13.6 L17.5 13.6 Z" fill="#FFFFFF" stroke="#0A1628" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

const GIROS = [-3, 2.5, -1.5]

function LayoutEtiquetasFoto({ texto, cores, proporcao, largura, altura, fotoUrl }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 98 : 74, 52, alto ? 42 : 40)
  const tamanhoEtiqueta = alto ? 34 : 25
  const itens = (texto.itens ?? []).filter(Boolean).slice(0, 3)
  const foto = fotoUrl || fotoProvisoria()
  const rosto = useRosto(fotoUrl)

  // Enquadramento: rosto no centro, no terço de cima
  const enquadramento = rosto ? enquadrarRosto(rosto, { largura, altura }, { x: 0.5, y: alto ? 0.3 : 0.27 }) : null

  // Tamanho aproximado de cada etiqueta (ícone + texto + respiro)
  const tamanhoDe = (item: string) => ({
    largura: tamanhoEtiqueta * (1.2 + 0.45 + 1.3) + item.length * tamanhoEtiqueta * 0.56,
    altura: tamanhoEtiqueta * 2.1,
  })
  // Áreas proibidas: rosto (com folga), logo no alto e título embaixo
  const inicioTitulo = altura * (alto ? 0.64 : 0.62)
  // Áreas de texto (logo e título): folga pequena. Rosto: folga maior
  const areasTexto: Retangulo[] = [
    { x: 0, y: 0, largura, altura: m.topo + 90 },
    { x: 0, y: inicioTitulo, largura, altura: altura - inicioTitulo },
  ]
  const rostoNaArte = enquadramento?.rostoNaCaixa
  // Linhas candidatas: acima do rosto (se couber) e na faixa entre o rosto e o título
  const linhas = alto ? [0.17, 0.24, 0.44, 0.485, 0.53, 0.575] : [0.2, 0.44, 0.5, 0.56]
  // Preferência: alterna os lados, de cima para baixo
  const candidatos = linhas.flatMap((y, i) => (i % 2 === 0 ? [['esquerda', y], ['direita', y]] : [['direita', y], ['esquerda', y]]) as [string, number][])

  const posicoes: (Retangulo | null)[] = []
  for (const item of itens) {
    const { largura: w, altura: h } = tamanhoDe(item)
    const livre = candidatos
      .map(([lado, y]) => ({ x: lado === 'esquerda' ? m.lados : largura - m.lados - w, y: altura * y, largura: w, altura: h }))
      .find(
        (r) =>
          r.x >= m.lados - 1 &&
          !areasTexto.some((a) => seSobrepoem(r, a, 8)) &&
          !(rostoNaArte && seSobrepoem(r, rostoNaArte, 24)) &&
          !posicoes.some((p) => p && seSobrepoem(r, p, 8)),
      )
    posicoes.push(livre ?? null)
  }

  return (
    <>
      <img
        src={foto}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: enquadramento?.objectPosition ?? 'center 30%' }}
      />
      {/* Escurece a base, onde fica o título */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, ${comAlfa('#061C36', 0.35)} 0%, ${comAlfa('#061C36', 0)} 22%, ${comAlfa('#061C36', 0)} 48%, ${comAlfa('#061C36', 0.92)} 82%)`,
        }}
      />

      {itens.map((item, indice) => {
        const posicao = posicoes[indice]
        // Sem lugar livre (rosto muito grande), a etiqueta não aparece: melhor que cobrir o rosto
        if (!posicao) return null
        return (
          <span
            key={item}
            style={{
              position: 'absolute',
              left: posicao.x,
              top: posicao.y,
              display: 'inline-flex',
              alignItems: 'center',
              gap: tamanhoEtiqueta * 0.45,
              padding: `${tamanhoEtiqueta * 0.45}px ${tamanhoEtiqueta * 0.8}px ${tamanhoEtiqueta * 0.45}px ${tamanhoEtiqueta * 0.5}px`,
              borderRadius: 999,
              background: '#FFFFFF',
              boxShadow: '0 12px 28px rgba(6, 28, 54, 0.28)',
              fontFamily: FONTE_TEXTO,
              fontWeight: 600,
              fontSize: tamanhoEtiqueta,
              color: TEXTO_ESCURO,
              transform: `rotate(${GIROS[indice]}deg)`,
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: tamanhoEtiqueta * 1.2,
                height: tamanhoEtiqueta * 1.2,
                borderRadius: '50%',
                background: indice === 1 ? '#28A745' : '#2985F0',
                color: '#FFFFFF',
                fontSize: tamanhoEtiqueta * 0.7,
              }}
            >
              ✓
            </span>
            {item}
            {/* Cursor na última etiqueta (abaixo dela não há outra) */}
            {indice === itens.length - 1 && <Cursor tamanho={tamanhoEtiqueta * 1.5} />}
          </span>
        )
      })}

      <div style={{ position: 'absolute', left: m.lados, right: m.lados, top: m.topo }}>
        <Logo cores={{ ...cores, fundoEscuro: true }} altura={alto ? 60 : 46} />
      </div>

      <div style={{ position: 'absolute', left: m.lados, right: m.lados, bottom: m.base, display: 'flex', flexDirection: 'column', gap: alto ? 26 : 16 }}>
        <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanhoTitulo, lineHeight: 1.08, letterSpacing: '-0.02em', color: '#FFFFFF' }}>
          {texto.gancho}
        </h2>
        {texto.apoio && (
          <p style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 300, fontSize: alto ? 42 : 32, lineHeight: 1.3, color: 'rgba(255,255,255,0.88)' }}>{texto.apoio}</p>
        )}
      </div>
    </>
  )
}

export default LayoutEtiquetasFoto
