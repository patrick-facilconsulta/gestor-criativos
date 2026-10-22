import { Logo } from './elementos'
import { FONTE_TITULO, TEXTO_ESCURO, comAlfa, margens, type PropsLayout, separarDestaque } from './estilo'

// Território "recortes de papel": cada palavra do título num pedaço de papel
// recortado e colado meio torto (colagem tipográfica). O trecho em destaque vai
// em papel da cor de destaque, e a palavra principal se repete nas bordas.
const PAPEL = '#F6F1E7'
// Giros "aleatórios" fixos, para a peça sair igual toda vez
const GIROS = [-2.5, 1.8, -1.2, 2.6, -2, 1.1, -2.8, 1.6, -0.8, 2.2]

function LayoutRecortes({ texto, cores, proporcao, largura, altura }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const { antes, marcado, depois } = separarDestaque(texto.gancho, texto.destaque)
  const soltas = [
    ...antes.split(/\s+/).filter(Boolean).map((p) => ({ p, destaque: false })),
    ...marcado.split(/\s+/).filter(Boolean).map((p) => ({ p, destaque: true })),
    ...depois.split(/\s+/).filter(Boolean).map((p) => ({ p, destaque: false })),
  ]
  // Pontuação solta (ex.: a vírgula depois do destaque) gruda na palavra anterior
  const palavras: { p: string; destaque: boolean }[] = []
  for (const palavra of soltas) {
    const ultima = palavras[palavras.length - 1]
    if (ultima && /^[.,;:!?…]+$/.test(palavra.p)) ultima.p += palavra.p
    else if (ultima && /^[.,;:!?…]/.test(palavra.p)) {
      const [, pontuacao, resto] = palavra.p.match(/^([.,;:!?…]+)(.*)$/)!
      ultima.p += pontuacao
      if (resto) palavras.push({ ...palavra, p: resto })
    } else palavras.push({ ...palavra })
  }
  const tamanho = Math.round(Math.max(56, Math.min(alto ? 104 : 86, (alto ? 1450 : 1150) / Math.max(texto.gancho.length, 12) * 3.2)))
  const repetida = marcado.split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? ''
  const fundo = cores.fundoEscuro ? cores.fundo : cores.apoio
  // Subtítulo com as últimas palavras em negrito, na mesma cor (separarDestaque sem destaque pega as duas últimas)
  const apoio = separarDestaque(texto.apoio, '')

  return (
    <>
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: fundo }} />
      {/* A palavra principal repetida nas bordas, em papel */}
      {repetida &&
        // Longe da logo (canto de cima à esquerda) e do texto principal
        [
          { right: -60, top: altura * 0.17, giro: 6 },
          { left: -50, bottom: altura * 0.2, giro: 7 },
          { left: largura * 0.56, bottom: altura * 0.05, giro: -5 },
        ].map(({ giro, ...pos }, indice) => (
          <span
            key={indice}
            aria-hidden
            style={{
              position: 'absolute',
              ...pos,
              padding: '6px 22px',
              background: PAPEL,
              color: TEXTO_ESCURO,
              opacity: 0.45,
              fontFamily: FONTE_TITULO,
              fontWeight: 300,
              fontSize: alto ? 46 : 38,
              transform: `rotate(${giro}deg)`,
              boxShadow: '0 6px 14px rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            {repetida.replace(/[.,!?…]+$/, '')}
          </span>
        ))}

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: `${m.topo}px ${m.lados}px ${m.base}px` }}>
        <Logo cores={{ ...cores, fundoEscuro: cores.fundoEscuro }} altura={alto ? 60 : 46} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: alto ? 60 : 36 }}>
          <h2 style={{ margin: 0, display: 'flex', flexWrap: 'wrap', gap: `${tamanho * 0.18}px ${tamanho * 0.14}px`, alignItems: 'center' }}>
            {palavras.map(({ p, destaque }, indice) => (
              <span
                key={indice}
                style={{
                  display: 'inline-block',
                  padding: `${tamanho * 0.06}px ${tamanho * 0.2}px ${tamanho * 0.1}px`,
                  background: destaque ? cores.destaque : PAPEL,
                  color: destaque ? cores.sobreDestaque : TEXTO_ESCURO,
                  // Varia o peso da Poppins (fontes da marca), como letras de recortes diferentes
                  fontFamily: FONTE_TITULO,
                  fontWeight: indice % 3 === 1 ? 300 : 700,
                  fontSize: tamanho,
                  lineHeight: 1.05,
                  letterSpacing: '-0.01em',
                  transform: `rotate(${GIROS[indice % GIROS.length]}deg)`,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.28)',
                }}
              >
                {p}
              </span>
            ))}
          </h2>
          {texto.apoio && (
            <p style={{ margin: 0, maxWidth: '88%', fontFamily: FONTE_TITULO, fontWeight: 300, fontSize: alto ? 44 : 34, lineHeight: 1.3, color: comAlfa(cores.fundoEscuro ? cores.texto : TEXTO_ESCURO, 0.92) }}>
              {apoio.antes}
              <strong style={{ fontWeight: 700 }}>{apoio.marcado}</strong>
              {apoio.depois}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

export default LayoutRecortes
