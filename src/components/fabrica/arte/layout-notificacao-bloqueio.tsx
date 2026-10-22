import simbolo from '../../../../docs/símbolo.svg'
import { Logo } from './elementos'
import { FONTE_TEXTO, FONTE_TITULO, TEXTO_ESCURO, comAlfa, margens, tamanhoFonte, type PropsLayout } from './estilo'

// Território "interface do dia a dia": a tela bloqueada do celular do médico
// com avisos da Fácil consulta chegando. Os avisos mostram o mecanismo do
// produto (agendamento, confirmação, lembrete), sem nome de paciente nem valor.
const AVISOS = [
  { titulo: 'Nova consulta agendada', texto: 'Paciente particular · sexta, 14h', quando: 'agora' },
  { titulo: 'Consulta confirmada', texto: 'O paciente confirmou o horário de amanhã', quando: '12 min' },
  { titulo: 'Lembrete enviado', texto: 'Seu paciente recebeu o lembrete automático', quando: '1 h' },
]

function Aviso({ titulo, texto, quando, tamanho }: { titulo: string; texto: string; quando: string; tamanho: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: tamanho * 0.75,
        alignItems: 'flex-start',
        padding: `${tamanho * 0.85}px ${tamanho * 0.95}px`,
        borderRadius: tamanho * 1.2,
        background: 'rgba(255, 255, 255, 0.86)',
        boxShadow: '0 10px 26px rgba(0, 0, 0, 0.18)',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          width: tamanho * 2.3,
          height: tamanho * 2.3,
          borderRadius: tamanho * 0.6,
          background: '#FFFFFF',
          boxShadow: '0 0 0 1px rgba(10,22,40,0.08)',
        }}
      >
        <img src={simbolo} alt="" style={{ width: '68%', height: 'auto' }} />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: tamanho * 0.18 }}>
        <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontFamily: FONTE_TEXTO, fontSize: tamanho * 0.78, color: '#5B6576' }}>
          <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>FÁCIL CONSULTA</span>
          <span>{quando}</span>
        </span>
        <span style={{ fontFamily: FONTE_TEXTO, fontWeight: 700, fontSize: tamanho, color: TEXTO_ESCURO, lineHeight: 1.2 }}>{titulo}</span>
        <span style={{ fontFamily: FONTE_TEXTO, fontSize: tamanho * 0.92, color: '#2A3446', lineHeight: 1.3 }}>{texto}</span>
      </span>
    </div>
  )
}

function LayoutNotificacaoBloqueio({ texto, cores, proporcao, largura, altura }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 104 : 80, 56, alto ? 44 : 40)
  const larguraCelular = alto ? 820 : 660
  const tamanhoAviso = alto ? 34 : 27
  const avisos = alto ? AVISOS : AVISOS.slice(0, 2)

  return (
    <>
      {/* Brilho suave atrás do celular, na cor de apoio */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: largura / 2 - larguraCelular,
          top: altura * 0.35,
          width: larguraCelular * 2,
          height: larguraCelular * 2,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${comAlfa(cores.destaque, cores.fundoEscuro ? 0.35 : 0.18)} 0%, ${comAlfa(cores.destaque, 0)} 60%)`,
        }}
      />

      <div style={{ position: 'absolute', left: m.lados, right: m.lados, top: m.topo, display: 'flex', flexDirection: 'column', gap: alto ? 32 : 22 }}>
        <Logo cores={cores} altura={alto ? 60 : 46} />
        <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanhoTitulo, lineHeight: 1.08, letterSpacing: '-0.02em', color: cores.texto }}>
          {texto.gancho}
        </h2>
        {alto && texto.apoio && (
          <p style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 300, fontSize: 42, lineHeight: 1.3, color: comAlfa(cores.texto, 0.85) }}>{texto.apoio}</p>
        )}
      </div>

      {/* Celular inclinado, cortado pela borda de baixo */}
      <div
        style={{
          position: 'absolute',
          left: (largura - larguraCelular) / 2 + (alto ? 0 : 40),
          top: alto ? altura * 0.5 : altura * 0.47,
          width: larguraCelular,
          height: larguraCelular * 2.05,
          padding: 18,
          borderRadius: 96,
          background: '#0B0F16',
          boxShadow: '0 40px 80px rgba(0,0,0,0.35)',
          transform: 'rotate(-4deg)',
          transformOrigin: 'top center',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 80,
            overflow: 'hidden',
            background: 'linear-gradient(165deg, #2B5F9E 0%, #0A2C53 55%, #061C36 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: `${alto ? 70 : 56}px ${alto ? 36 : 28}px`,
            gap: alto ? 26 : 20,
          }}
        >
          <span style={{ width: 150, height: 40, borderRadius: 999, background: '#000', marginTop: -36 }} />
          <span style={{ fontFamily: FONTE_TEXTO, fontWeight: 500, fontSize: alto ? 34 : 28, color: 'rgba(255,255,255,0.85)' }}>segunda-feira</span>
          <span style={{ fontFamily: FONTE_TEXTO, fontWeight: 600, fontSize: alto ? 170 : 136, lineHeight: 0.9, color: '#FFFFFF', letterSpacing: '-0.03em' }}>9:41</span>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: tamanhoAviso * 0.55, marginTop: alto ? 30 : 18 }}>
            {avisos.map((aviso) => (
              <Aviso key={aviso.titulo} {...aviso} tamanho={tamanhoAviso} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default LayoutNotificacaoBloqueio
