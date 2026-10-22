import { Logo } from './elementos'
import { MarcaTexto } from './elementos-territorio'
import { FONTE_TEXTO, FONTE_TITULO, TEXTO_ESCURO, comAlfa, margens, tamanhoFonte, type PropsLayout, separarDestaque } from './estilo'

// Território "interface do dia a dia": uma nota do celular (app de Notas) com
// o título grifado, o apoio e uma lista de tarefas (itens). Fundo quadriculado.
const PAPEL_NOTA = '#FFFDF7'

function Caixa({ marcada, cor, tamanho }: { marcada: boolean; cor: string; tamanho: number }) {
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        width: tamanho,
        height: tamanho,
        borderRadius: '50%',
        border: marcada ? 'none' : `3px solid ${comAlfa(TEXTO_ESCURO, 0.35)}`,
        background: marcada ? cor : 'transparent',
        color: '#FFFFFF',
        fontSize: tamanho * 0.62,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {marcada ? '✓' : ''}
    </span>
  )
}

function LayoutNotaCelular({ texto, cores, proporcao }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const { antes, marcado, depois } = separarDestaque(texto.gancho, texto.destaque)
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 92 : 70, 48, alto ? 40 : 36)
  const tamanhoItem = alto ? 40 : 30
  const itens = (texto.itens ?? []).filter(Boolean).slice(0, 3)
  // Cor de destaque legível no papel claro da nota
  const corNota = cores.destaque.toUpperCase() === '#FFFFFF' ? '#2985F0' : cores.destaque
  const grade = comAlfa(cores.fundoEscuro ? '#FFFFFF' : TEXTO_ESCURO, 0.07)

  return (
    <>
      {/* Fundo quadriculado */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${grade} 2px, transparent 2px), linear-gradient(90deg, ${grade} 2px, transparent 2px)`,
          backgroundSize: '54px 54px',
        }}
      />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: `${m.topo}px ${m.lados}px ${m.base}px`, gap: alto ? 40 : 26 }}>
        <Logo cores={cores} altura={alto ? 60 : 46} />

        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          {/* Nota de trás, um pouco girada */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: alto ? '6% 2% 8% 4%' : '4% 1% 4% 3%',
              borderRadius: 44,
              background: comAlfa(cores.fundoEscuro ? '#FFFFFF' : cores.apoio, cores.fundoEscuro ? 0.18 : 1),
              transform: 'rotate(3.5deg)',
            }}
          />
          {/* Nota da frente */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: 44,
              background: PAPEL_NOTA,
              boxShadow: '0 30px 60px rgba(6, 28, 54, 0.22)',
              transform: 'rotate(-1.5deg)',
              padding: alto ? '48px 56px 64px' : '34px 44px 44px',
              display: 'flex',
              flexDirection: 'column',
              gap: alto ? 34 : 22,
            }}
          >
            {/* Barra do app de Notas */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: FONTE_TEXTO, fontSize: alto ? 36 : 28, color: corNota }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
                <span style={{ fontSize: '1.3em', lineHeight: 1 }}>‹</span> Notas
              </span>
              <span style={{ display: 'flex', gap: 26, fontWeight: 700, letterSpacing: '0.1em' }}>
                <span>⇪</span>
                <span>•••</span>
              </span>
            </div>

            <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanhoTitulo, lineHeight: 1.12, letterSpacing: '-0.015em', color: TEXTO_ESCURO }}>
              {antes}
              <MarcaTexto cor="#FFC107" opacidade={0.5}>{marcado}</MarcaTexto>
              {depois}
              {/* Cursor de digitação */}
              <span style={{ display: 'inline-block', width: '0.06em', height: '0.95em', marginLeft: '0.06em', verticalAlign: '-0.1em', background: corNota }} />
            </h2>

            {texto.apoio && (
              <p style={{ margin: 0, fontFamily: FONTE_TEXTO, fontSize: alto ? 40 : 30, lineHeight: 1.35, color: '#3A4558' }}>{texto.apoio}</p>
            )}

            {itens.length > 0 && (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: tamanhoItem * 0.55 }}>
                {itens.map((item, indice) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'center', gap: tamanhoItem * 0.55, fontFamily: FONTE_TEXTO, fontSize: tamanhoItem, color: TEXTO_ESCURO }}>
                    <Caixa marcada={indice === 0} cor={corNota} tamanho={tamanhoItem * 1.1} />
                    <span style={{ textDecoration: indice === 0 ? 'line-through' : 'none', opacity: indice === 0 ? 0.55 : 1 }}>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default LayoutNotaCelular
