import { Logo } from './elementos'
import { MarcaTexto, RotuloEdicao, Sublinhado, TexturaPapel } from './elementos-territorio'
import { FONTE_TITULO, comAlfa, margens, tamanhoFonte, type PropsLayout, separarDestaque } from './estilo'

// Território "tipografia editorial": uma frase grande, muito respiro, um trecho
// grifado com marca-texto. Inspirado em posts de conteúdo (não parece anúncio).
function LayoutMarcaTexto({ texto, cores, proporcao }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const { antes, marcado, depois } = separarDestaque(texto.gancho, texto.destaque)
  const tamanho = tamanhoFonte(texto.gancho, alto ? 118 : 98, 60, alto ? 44 : 38)

  return (
    <>
      {!cores.fundoEscuro && <TexturaPapel />}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: `${m.topo}px ${m.lados}px ${m.base}px`,
        }}
      >
        <RotuloEdicao cor={comAlfa(cores.texto, 0.85)} tamanho={alto ? 26 : 22} esquerda="FÁCIL CONSULTA" direita="PARA MÉDICOS" />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: alto ? 56 : 40 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: FONTE_TITULO,
              fontWeight: 700,
              fontSize: tamanho,
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              color: cores.texto,
            }}
          >
            {antes}
            <MarcaTexto cor={cores.destaque} opacidade={cores.fundoEscuro ? 0.9 : 0.3} corTexto={cores.fundoEscuro ? cores.sobreDestaque : undefined}>
              {marcado}
            </MarcaTexto>
            {depois}
          </h2>
          {texto.apoio && (
            <p
              style={{
                margin: 0,
                maxWidth: '86%',
                fontFamily: FONTE_TITULO,
                fontWeight: 300,
                fontSize: alto ? 44 : 34,
                lineHeight: 1.3,
                color: comAlfa(cores.texto, 0.85),
              }}
            >
              {texto.apoio}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
          {texto.cta ? (
            <span style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: alto ? 38 : 30, color: cores.texto }}>
              <Sublinhado cor={cores.destaque} espessura={5}>{texto.cta}</Sublinhado> →
            </span>
          ) : (
            <span />
          )}
          <Logo cores={cores} altura={alto ? 64 : 50} />
        </div>
      </div>
    </>
  )
}

export default LayoutMarcaTexto
