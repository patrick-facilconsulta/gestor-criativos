import { Logo } from './elementos'
import { FONTE_TEXTO, FONTE_TITULO, TEXTO_ESCURO, comAlfa, margens, tamanhoFonte, type PropsLayout } from './estilo'

// Território "enquete de stories": a pergunta vira um adesivo de enquete, como
// nos stories do Instagram, com duas opções ainda sem votos (nada de
// porcentagem inventada). Nasce nativo do 9:16, mas funciona no quadrado.
function Opcao({ rotulo, tamanho }: { rotulo: string; tamanho: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tamanho * 0.6,
        padding: `${tamanho * 0.62}px ${tamanho * 0.8}px`,
        borderRadius: tamanho * 0.7,
        background: '#F1F3F7',
        fontFamily: FONTE_TEXTO,
        fontWeight: 600,
        fontSize: tamanho,
        color: TEXTO_ESCURO,
      }}
    >
      <span style={{ width: tamanho * 0.95, height: tamanho * 0.95, borderRadius: '50%', border: `3px solid ${comAlfa(TEXTO_ESCURO, 0.3)}`, flexShrink: 0 }} />
      {rotulo}
    </div>
  )
}

function LayoutEnquete({ texto, cores, proporcao, largura, altura }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const tamanhoPergunta = tamanhoFonte(texto.gancho, alto ? 74 : 58, 44, alto ? 36 : 36)
  const tamanhoOpcao = alto ? 40 : 32
  const larguraAdesivo = alto ? 860 : 760

  return (
    <>
      {/* Manchas de cor ao fundo, como uma foto desfocada */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: largura * 0.9, height: largura * 0.9, left: -largura * 0.25, top: -altura * 0.08, borderRadius: '50%', background: comAlfa(cores.apoio, 0.9), filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', width: largura * 0.8, height: largura * 0.8, right: -largura * 0.3, bottom: -altura * 0.05, borderRadius: '50%', background: comAlfa('#FFFFFF', cores.fundoEscuro ? 0.18 : 0.6), filter: 'blur(70px)' }} />
      </div>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: `${m.topo}px ${m.lados}px ${m.base}px` }}>
        <div style={{ alignSelf: 'flex-start' }}>
          <Logo cores={cores} altura={alto ? 60 : 46} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: alto ? 56 : 34 }}>
          {/* Adesivo de enquete, levemente girado */}
          <div
            style={{
              width: larguraAdesivo,
              borderRadius: 44,
              background: '#FFFFFF',
              boxShadow: '0 24px 60px rgba(6, 28, 54, 0.28)',
              padding: alto ? '48px 44px 44px' : '34px 34px 34px',
              display: 'flex',
              flexDirection: 'column',
              gap: tamanhoOpcao * 0.55,
              transform: 'rotate(-2deg)',
            }}
          >
            <p style={{ margin: `0 0 ${tamanhoOpcao * 0.35}px`, textAlign: 'center', fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanhoPergunta, lineHeight: 1.12, letterSpacing: '-0.015em', color: TEXTO_ESCURO }}>
              {texto.gancho}
            </p>
            <Opcao rotulo="Sim" tamanho={tamanhoOpcao} />
            <Opcao rotulo="Ainda não" tamanho={tamanhoOpcao} />
          </div>

          {texto.apoio && (
            <p style={{ margin: 0, maxWidth: larguraAdesivo * 0.95, textAlign: 'center', fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: alto ? 54 : 40, lineHeight: 1.22, letterSpacing: '-0.01em', color: cores.texto }}>
              {texto.apoio}
            </p>
          )}
          {texto.cta && (
            <span style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: alto ? 36 : 28, color: cores.texto, letterSpacing: '0.01em' }}>
              {texto.cta} ↗
            </span>
          )}
        </div>
      </div>
    </>
  )
}

export default LayoutEnquete
