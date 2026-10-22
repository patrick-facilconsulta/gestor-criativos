import simbolo from '../../../../docs/símbolo.svg'
import { Logo } from './elementos'
import { TexturaPapel } from './elementos-territorio'
import { FONTE_TEXTO, FONTE_TITULO, TEXTO_ESCURO, comAlfa, margens, tamanhoFonte, type PropsLayout } from './estilo'

// Território "produto de verdade": um celular com a tela da plataforma (perfil
// do médico com a agenda) e "adesivos" com os benefícios (itens). Em produção a
// tela deve ser um print REAL da plataforma (vem como foto do layout); sem ele,
// mostra uma tela de exemplo com "Dr(a). Seu nome", nunca um médico real.
const ADESIVOS = [
  { fundo: '#2985F0', texto: '#FFFFFF', giro: -6 },
  { fundo: '#FFD666', texto: TEXTO_ESCURO, giro: 5 },
  { fundo: '#FFFFFF', texto: TEXTO_ESCURO, giro: -3 },
]

function TelaExemplo({ escala }: { escala: number }) {
  const t = (n: number) => n * escala
  const dias = [
    { dia: 'Seg', num: '21', horas: ['09:00', '10:30', '14:00'] },
    { dia: 'Ter', num: '22', horas: ['08:30', '11:00', '16:30'] },
    { dia: 'Qua', num: '23', horas: ['09:30', '13:00', '18:00'] },
  ]
  return (
    <div style={{ width: '100%', height: '100%', background: '#F5F8FC', display: 'flex', flexDirection: 'column', fontFamily: FONTE_TEXTO, color: TEXTO_ESCURO }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: t(10), padding: `${t(44)}px ${t(22)}px ${t(14)}px`, background: '#FFFFFF' }}>
        <img src={simbolo} alt="" style={{ height: t(26) }} />
        <span style={{ fontWeight: 600, fontSize: t(17), color: '#004CA8' }}>Fácil consulta</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: t(14), padding: `${t(18)}px ${t(22)}px`, background: '#FFFFFF', borderBottom: '1px solid #E4EAF2' }}>
        <span style={{ display: 'grid', placeItems: 'center', width: t(64), height: t(64), borderRadius: '50%', background: '#E1EFFF', color: '#004CA8', fontWeight: 700, fontSize: t(24) }}>Dr</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: t(3) }}>
          <span style={{ fontWeight: 700, fontSize: t(20) }}>Dr(a). Seu nome</span>
          <span style={{ fontSize: t(14), color: '#596579' }}>Sua especialidade · Consulta particular</span>
          <span style={{ fontSize: t(13), color: '#28A745', fontWeight: 600 }}>● Agenda aberta</span>
        </span>
      </div>
      <div style={{ padding: `${t(18)}px ${t(18)}px`, display: 'flex', flexDirection: 'column', gap: t(12) }}>
        <span style={{ fontWeight: 700, fontSize: t(16) }}>Escolha um horário</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: t(10) }}>
          {dias.map((d) => (
            <div key={d.dia} style={{ display: 'flex', flexDirection: 'column', gap: t(7), alignItems: 'stretch' }}>
              <span style={{ textAlign: 'center', fontSize: t(13), color: '#596579' }}>{d.dia} <b style={{ color: TEXTO_ESCURO }}>{d.num}</b></span>
              {d.horas.map((h, i) => (
                <span
                  key={h}
                  style={{
                    textAlign: 'center',
                    padding: `${t(8)}px 0`,
                    borderRadius: t(8),
                    fontSize: t(14),
                    fontWeight: 600,
                    background: d.dia === 'Ter' && i === 1 ? '#2985F0' : '#FFFFFF',
                    color: d.dia === 'Ter' && i === 1 ? '#FFFFFF' : '#004CA8',
                    border: '1px solid #CFE0F5',
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
          ))}
        </div>
        <span style={{ marginTop: t(6), textAlign: 'center', padding: `${t(13)}px 0`, borderRadius: t(12), background: '#2985F0', color: '#FFFFFF', fontWeight: 700, fontSize: t(16) }}>
          Agendar consulta
        </span>
      </div>
    </div>
  )
}

function LayoutProdutoReal({ texto, cores, proporcao, largura, altura, fotoUrl }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 90 : 66, 48, alto ? 46 : 46)
  const larguraCelular = alto ? 600 : 420
  const alturaCelular = larguraCelular * 2
  const itens = (texto.itens ?? []).filter(Boolean).slice(0, 3)
  const tamanhoAdesivo = alto ? 36 : 28
  // Posição do celular: à direita no quadrado (cortado embaixo); centralizado no stories
  const celular = alto
    ? { left: largura - larguraCelular - 40, top: altura * 0.43 }
    : { left: largura - larguraCelular - 70, top: altura * 0.3 }
  const posAdesivos = alto
    ? [
        { left: m.lados - 30, top: altura * 0.52 },
        { left: m.lados + 10, top: altura * 0.61 },
        { left: m.lados - 20, top: altura * 0.7 },
      ]
    : [
        { left: m.lados, top: altura * 0.56 },
        { left: m.lados + 40, top: altura * 0.7 },
        { left: m.lados - 10, top: altura * 0.84 },
      ]

  return (
    <>
      {!cores.fundoEscuro && <TexturaPapel />}
      <div style={{ position: 'absolute', left: m.lados, right: alto ? m.lados : largura * 0.44, top: m.topo, display: 'flex', flexDirection: 'column', gap: alto ? 28 : 18 }}>
        <Logo cores={cores} altura={alto ? 60 : 46} />
        <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanhoTitulo, lineHeight: 1.08, letterSpacing: '-0.02em', color: cores.texto }}>
          {texto.gancho}
        </h2>
        {texto.apoio && (
          <p style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 300, fontSize: alto ? 40 : 28, lineHeight: 1.3, color: comAlfa(cores.texto, 0.85) }}>{texto.apoio}</p>
        )}
      </div>

      {/* Celular com a tela da plataforma */}
      <div
        style={{
          position: 'absolute',
          ...celular,
          width: larguraCelular,
          height: alturaCelular,
          padding: 14,
          borderRadius: 74,
          background: '#0B0F16',
          boxShadow: '0 40px 80px rgba(6, 28, 54, 0.3)',
          transform: 'rotate(3deg)',
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 62, overflow: 'hidden' }}>
          {fotoUrl ? (
            <img src={fotoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          ) : (
            <TelaExemplo escala={larguraCelular / 380} />
          )}
          <span style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: larguraCelular * 0.28, height: 34, borderRadius: 999, background: '#000' }} />
        </div>
      </div>

      {itens.map((item, indice) => (
        <span
          key={item}
          style={{
            position: 'absolute',
            ...posAdesivos[indice],
            padding: `${tamanhoAdesivo * 0.55}px ${tamanhoAdesivo * 0.9}px`,
            borderRadius: 999,
            background: ADESIVOS[indice].fundo,
            color: ADESIVOS[indice].texto,
            border: '3px solid #0A1628',
            boxShadow: '0 10px 0 rgba(10, 22, 40, 0.9)',
            fontFamily: FONTE_TITULO,
            fontWeight: 600,
            fontSize: tamanhoAdesivo,
            transform: `rotate(${ADESIVOS[indice].giro}deg)`,
            whiteSpace: 'nowrap',
          }}
        >
          {item}
        </span>
      ))}
    </>
  )
}

export default LayoutProdutoReal
