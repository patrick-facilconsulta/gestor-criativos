import { useEffect, useRef, useState } from 'react'
import { fotoProvisoria } from '@/lib/layout-referencia'
import { enquadrarRosto, seSobrepoem, useRosto, type Retangulo } from '@/lib/rosto'
import { Logo } from './elementos'
import { TexturaPapel } from './elementos-territorio'
import { FONTE_TITULO, TEXTO_ESCURO, comAlfa, margens, tamanhoFonte, type PropsLayout } from './estilo'

// Território "pessoa em cena real" com colagem: faixa de papel no alto com o
// título (a faixa cresce com o texto) e a foto embaixo, com post-its colados
// (as dores ou os itens), um pouco tortos.
// REGRA: post-it nunca em cima do rosto. O rosto é detectado na foto
// (src/lib/rosto.ts): a foto é enquadrada com o rosto inteiro e centralizado,
// e os post-its só ocupam posições livres, dentro da margem padrão.
// Cores dos post-its: amarelo e azul-claro da marca, e branco.
const POST_ITS = [
  { cor: '#FFD666', giro: -6 },
  { cor: '#E1EFFF', giro: 4 },
  { cor: '#FFFFFF', giro: -2.5 },
]

function LayoutPostItsFoto({ texto, cores, proporcao, fotoUrl }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 112 : 72, 52, alto ? 30 : 28)
  const itens = (texto.itens ?? []).filter(Boolean).slice(0, 3)
  const corTexto = cores.fundoEscuro ? cores.texto : TEXTO_ESCURO
  const foto = fotoUrl || fotoProvisoria()
  const rosto = useRosto(fotoUrl)

  // Tamanho da área da foto (depende da altura da faixa do título)
  const areaFoto = useRef<HTMLDivElement>(null)
  const [caixa, setCaixa] = useState<{ largura: number; altura: number } | null>(null)
  useEffect(() => {
    const elemento = areaFoto.current
    if (!elemento) return
    const observador = new ResizeObserver(() => setCaixa({ largura: elemento.offsetWidth, altura: elemento.offsetHeight }))
    observador.observe(elemento)
    return () => observador.disconnect()
  }, [])

  // Rosto centralizado, um pouco acima do meio da área da foto
  const enquadramento = rosto && caixa ? enquadrarRosto(rosto, caixa, { x: 0.5, y: alto ? 0.42 : 0.46 }) : null

  // Posições dos post-its: colunas da esquerda e da direita (na margem), de cima
  // para baixo, alternando os lados; fora do rosto e sem sair da foto
  const posicoes: Retangulo[] = []
  let lado = alto ? 300 : 200
  if (caixa) {
    const linhas = [0.05, 0.27, 0.49, 0.71]
    for (let tentativa = 0; tentativa < 3 && posicoes.length < itens.length; tentativa++) {
      posicoes.length = 0
      const candidatos = linhas.flatMap((y, i) => {
        const esquerda = { x: m.lados, y: caixa.altura * y, largura: lado, altura: lado * 0.86 }
        const direita = { x: caixa.largura - m.lados - lado, y: caixa.altura * y, largura: lado, altura: lado * 0.86 }
        return i % 2 === 0 ? [esquerda, direita] : [direita, esquerda]
      })
      for (const candidato of candidatos) {
        if (posicoes.length >= itens.length) break
        if (candidato.y + candidato.altura > caixa.altura - 16) continue
        if (enquadramento && seSobrepoem(candidato, enquadramento.rostoNaCaixa, 20)) continue
        if (posicoes.some((p) => seSobrepoem(candidato, p, 12))) continue
        posicoes.push(candidato)
      }
      // Rosto grande demais para caberem todos: diminui os post-its e tenta de novo
      if (posicoes.length < itens.length) lado = Math.round(lado * 0.85)
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Faixa de papel com o título, com a borda de baixo levemente irregular */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flexShrink: 0,
          background: cores.fundoEscuro ? cores.fundo : '#FBFAF7',
          clipPath: 'polygon(0 0, 100% 0, 100% 94%, 82% 99%, 64% 95%, 41% 100%, 20% 96%, 0 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: alto ? 40 : 18,
          padding: `${m.topo}px ${m.lados}px ${alto ? 64 : 40}px`,
          marginBottom: -24,
        }}
      >
        {!cores.fundoEscuro && <TexturaPapel />}
        <div style={{ position: 'relative' }}>
          <Logo cores={cores} altura={alto ? 56 : 42} />
        </div>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: alto ? 22 : 12 }}>
          <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanhoTitulo, lineHeight: 1.02, letterSpacing: '-0.03em', color: corTexto }}>
            {texto.gancho}
          </h2>
          {texto.apoio && (
            <p style={{ margin: 0, maxWidth: '86%', fontFamily: FONTE_TITULO, fontWeight: 300, fontSize: alto ? 40 : 28, lineHeight: 1.25, color: comAlfa(corTexto, 0.85) }}>
              {texto.apoio}
            </p>
          )}
        </div>
      </div>

      {/* Foto com os post-its */}
      <div ref={areaFoto} style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <img
          src={foto}
          alt=""
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: enquadramento?.objectPosition ?? 'center 20%' }}
        />
        {itens.map((item, indice) => {
          const posicao = posicoes[indice]
          // Sem lugar livre, o post-it não aparece: melhor que cobrir o rosto
          if (!posicao) return null
          return (
            <div
              key={item}
              style={{
                position: 'absolute',
                left: posicao.x,
                top: posicao.y,
                width: posicao.largura,
                minHeight: posicao.altura,
                padding: posicao.largura * 0.1,
                display: 'flex',
                alignItems: 'center',
                background: POST_ITS[indice].cor,
                boxShadow: '0 16px 26px rgba(0, 0, 0, 0.28)',
                transform: `rotate(${POST_ITS[indice].giro}deg)`,
                fontFamily: FONTE_TITULO,
                fontWeight: 600,
                fontSize: posicao.largura * 0.15,
                lineHeight: 1.12,
                color: TEXTO_ESCURO,
              }}
            >
              {item}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default LayoutPostItsFoto
