import simbolo from '../../../../docs/símbolo.svg'
import { Logo } from './elementos'
import { FONTE_TEXTO, FONTE_TITULO, TEXTO_ESCURO, comAlfa, margens, tamanhoFonte, type PropsLayout } from './estilo'

// Território "relógio / hora do dia": um relógio gigante marcando tarde da noite
// e um aviso de consulta agendada chegando. Mostra o agendamento 24h sem
// prometer resultado. Fica melhor nas paletas escuras ("noite").
function LayoutRelogio({ texto, cores, proporcao }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 96 : 70, 50, alto ? 44 : 44)
  const tamanhoHora = alto ? 330 : 250
  const tamanhoAviso = alto ? 32 : 26

  return (
    <>
      {/* Lua minguante no canto, na cor de destaque */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          right: m.lados,
          top: m.topo - 10,
          width: alto ? 120 : 92,
          height: alto ? 120 : 92,
          borderRadius: '50%',
          boxShadow: `${alto ? -26 : -20}px ${alto ? 14 : 10}px 0 0 ${cores.destaque}`,
          transform: 'rotate(-20deg)',
          opacity: 0.9,
        }}
      />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: `${m.topo}px ${m.lados}px ${m.base}px` }}>
        <Logo cores={cores} altura={alto ? 60 : 46} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: alto ? 22 : 12 }}>
          <span style={{ fontFamily: FONTE_TEXTO, fontWeight: 500, fontSize: alto ? 40 : 30, color: comAlfa(cores.texto, 0.75) }}>terça-feira</span>
          <span
            style={{
              fontFamily: FONTE_TEXTO,
              fontWeight: 600,
              fontSize: tamanhoHora,
              lineHeight: 0.9,
              letterSpacing: '-0.05em',
              fontVariantNumeric: 'tabular-nums',
              color: cores.texto,
            }}
          >
            23:47
          </span>

          {/* Aviso chegando */}
          <div
            style={{
              alignSelf: 'flex-start',
              display: 'flex',
              alignItems: 'center',
              gap: tamanhoAviso * 0.6,
              marginTop: alto ? 30 : 18,
              padding: `${tamanhoAviso * 0.6}px ${tamanhoAviso * 0.9}px ${tamanhoAviso * 0.6}px ${tamanhoAviso * 0.6}px`,
              borderRadius: tamanhoAviso,
              background: 'rgba(255,255,255,0.92)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
              fontFamily: FONTE_TEXTO,
            }}
          >
            <span style={{ display: 'grid', placeItems: 'center', width: tamanhoAviso * 1.9, height: tamanhoAviso * 1.9, borderRadius: tamanhoAviso * 0.5, background: '#FFFFFF', boxShadow: '0 0 0 1px rgba(10,22,40,0.08)' }}>
              <img src={simbolo} alt="" style={{ width: '68%' }} />
            </span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700, fontSize: tamanhoAviso, color: TEXTO_ESCURO }}>Nova consulta agendada</span>
              <span style={{ fontSize: tamanhoAviso * 0.85, color: '#475467' }}>Paciente particular · agora</span>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: alto ? 22 : 12 }}>
          <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanhoTitulo, lineHeight: 1.08, letterSpacing: '-0.02em', color: cores.texto }}>
            {texto.gancho}
          </h2>
          {texto.apoio && (
            <p style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 300, fontSize: alto ? 40 : 30, lineHeight: 1.3, color: comAlfa(cores.texto, 0.85) }}>{texto.apoio}</p>
          )}
        </div>
      </div>
    </>
  )
}

export default LayoutRelogio
