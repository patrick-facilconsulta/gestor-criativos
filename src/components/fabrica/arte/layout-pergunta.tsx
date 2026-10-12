import { BotaoCta, Logo, Moldura, Paragrafo, Titulo } from './elementos'
import { FONTE_TITULO, comAlfa, tamanhoFonte, type PropsLayout } from './estilo'

// Gancho em forma de pergunta gigante, com a resposta num cartão embaixo
function LayoutPergunta({ texto, cores, proporcao, altura }: PropsLayout) {
  const alto = proporcao === '9:16'
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 120 : 104, 64, alto ? 44 : 38)

  return (
    <>
      {/* Interrogação gigante ao fundo */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          right: -40,
          top: altura * 0.08,
          fontFamily: FONTE_TITULO,
          fontWeight: 700,
          fontSize: altura * 0.7,
          lineHeight: 1,
          color: comAlfa(cores.destaque, 0.14),
        }}
      >
        ?
      </span>
      <Moldura proporcao={proporcao}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: alto ? 56 : 40 }}>
          <Titulo cores={cores} tamanho={tamanhoTitulo}>{texto.gancho}</Titulo>
          {texto.apoio && (
            <div
              style={{
                background: cores.apoio,
                borderRadius: 32,
                padding: alto ? '44px 48px' : '36px 40px',
                borderLeft: `14px solid ${cores.destaque}`,
              }}
            >
              <Paragrafo cor={cores.sobreApoio} tamanho={alto ? 44 : 38} estilo={{ fontWeight: 500 }}>
                {texto.apoio}
              </Paragrafo>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          {texto.cta ? <BotaoCta cores={cores}>{texto.cta}</BotaoCta> : <span />}
          <Logo cores={cores} altura={alto ? 64 : 56} />
        </div>
      </Moldura>
    </>
  )
}

export default LayoutPergunta
