import { fotoProvisoria } from '@/lib/layout-referencia'
import { Logo } from './elementos'
import { FONTE_TITULO, comAlfa, margens, tamanhoFonte, type PropsLayout } from './estilo'

// Território "objeto-metáfora": foto de um objeto (sem pessoa), como ampulheta,
// agenda em branco ou chave, com uma frase grande no espaço livre. A foto
// gerada pede o objeto à direita e espaço livre à esquerda (quadrado) ou no
// alto (stories).
function LayoutObjetoFoto({ texto, cores, proporcao, fotoUrl }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 128 : 104, 60, alto ? 26 : 24)
  const escuro = '#061C36'

  return (
    <>
      <img
        src={fotoUrl || fotoProvisoria()}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: alto ? '60% 70%' : '75% 50%' }}
      />
      {/* Escurece o lado do texto */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: alto
            ? `linear-gradient(180deg, ${comAlfa(escuro, 0.9)} 0%, ${comAlfa(escuro, 0.6)} 38%, ${comAlfa(escuro, 0)} 62%, ${comAlfa(escuro, 0.5)} 100%)`
            : `linear-gradient(90deg, ${comAlfa(escuro, 0.92)} 0%, ${comAlfa(escuro, 0.7)} 40%, ${comAlfa(escuro, 0)} 72%)`,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: m.topo,
          bottom: m.base,
          left: m.lados,
          width: alto ? `calc(100% - ${m.lados * 2}px)` : '56%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: alto ? 'flex-start' : 'space-between',
          gap: alto ? 48 : 0,
        }}
      >
        <Logo cores={{ ...cores, fundoEscuro: true }} altura={alto ? 60 : 46} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: alto ? 30 : 22 }}>
          <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanhoTitulo, lineHeight: 1.02, letterSpacing: '-0.03em', color: '#FFFFFF' }}>
            {texto.gancho}
          </h2>
          {texto.apoio && (
            <p style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 300, fontSize: alto ? 42 : 32, lineHeight: 1.3, color: 'rgba(255,255,255,0.88)' }}>{texto.apoio}</p>
          )}
          <span style={{ width: alto ? 120 : 96, height: 8, borderRadius: 99, background: cores.destaque.toUpperCase() === '#FFFFFF' ? '#2985F0' : cores.destaque }} />
        </div>
      </div>
    </>
  )
}

export default LayoutObjetoFoto
