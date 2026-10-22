import { Logo } from './elementos'
import { Circulado, MenuSelecao, TextoSelecionado, TexturaPapel } from './elementos-territorio'
import { FONTE_TITULO, comAlfa, margens, tamanhoFonte, type PropsLayout, separarDestaque } from './estilo'

// Território "tipografia editorial" com toque de interface: o trecho principal
// aparece selecionado como no celular (menu Copiar/Compartilhar e as alças),
// e a última palavra do apoio ganha um círculo feito à mão.
function LayoutTextoSelecionado({ texto, cores, proporcao }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const { antes, marcado, depois } = separarDestaque(texto.gancho, texto.destaque)
  const tamanho = tamanhoFonte(texto.gancho, alto ? 116 : 96, 60, alto ? 42 : 38)
  const corSelecao = cores.fundoEscuro ? '#7DB4F0' : cores.destaque

  // Círculo na última palavra do apoio (sem a pontuação)
  const apoio = texto.apoio.trim()
  const partesApoio = apoio.match(/^([\s\S]*?)(\S+?)([.!?…]*)$/)

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
        <Logo cores={cores} altura={alto ? 60 : 48} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: alto ? 64 : 44 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: alto ? 36 : 26 }}>
            <div>
              <MenuSelecao tamanho={alto ? 30 : 24} />
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: FONTE_TITULO,
                fontWeight: 700,
                fontSize: tamanho,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                color: cores.texto,
              }}
            >
              {antes}
              <TextoSelecionado cor={corSelecao}>{marcado}</TextoSelecionado>
              {depois}
            </h2>
          </div>

          {apoio && (
            <p
              style={{
                margin: 0,
                maxWidth: '88%',
                fontFamily: FONTE_TITULO,
                fontWeight: 300,
                fontSize: alto ? 46 : 36,
                lineHeight: 1.35,
                color: comAlfa(cores.texto, 0.88),
              }}
            >
              {partesApoio ? (
                <>
                  {partesApoio[1]}
                  <Circulado cor={cores.destaque} espessura={alto ? 6 : 5}>
                    <span style={{ fontWeight: 600 }}>{partesApoio[2]}</span>
                  </Circulado>
                  {partesApoio[3]}
                </>
              ) : (
                apoio
              )}
            </p>
          )}
        </div>
      </div>
    </>
  )
}

export default LayoutTextoSelecionado
