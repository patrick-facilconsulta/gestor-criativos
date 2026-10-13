import { BotaoCta, Decoracao, Logo, Moldura, Paragrafo, Selo, Titulo } from './elementos'
import { comAlfa, tamanhoFonte, type PropsLayout } from './estilo'

// Foto ocupando a arte inteira, com uma camada na cor de fundo da paleta para
// o texto ficar legível. Sem foto, mostra só o fundo da paleta.
function LayoutFotoFundo({ texto, cores, proporcao, largura, altura, fotoUrl }: PropsLayout) {
  const alto = proporcao === '9:16'
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 104 : 84, 56, alto ? 48 : 42)

  return (
    <>
      {fotoUrl ? (
        <>
          <img
            src={fotoUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: largura, height: altura, objectFit: 'cover', objectPosition: 'center 30%' }}
          />
          {/* Escurece em cima (logo) e bastante embaixo (texto) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, ${comAlfa(cores.fundo, 0.55)} 0%, ${comAlfa(cores.fundo, 0.05)} 22%, ${comAlfa(cores.fundo, 0.15)} 42%, ${comAlfa(cores.fundo, 0.88)} 66%, ${cores.fundo} 100%)`,
            }}
          />
        </>
      ) : (
        <Decoracao cores={cores} largura={largura} altura={altura} />
      )}
      <Moldura proporcao={proporcao}>
        <Logo cores={cores} altura={alto ? 76 : 60} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: alto ? 40 : 28 }}>
          {texto.destaque && <Selo cores={cores}>{texto.destaque}</Selo>}
          <Titulo cores={cores} tamanho={tamanhoTitulo}>{texto.gancho}</Titulo>
          {texto.apoio && (
            <Paragrafo apoio cor={comAlfa(cores.texto, 0.9)} tamanho={alto ? 42 : 34}>
              {texto.apoio}
            </Paragrafo>
          )}
          {texto.cta && (
            <div style={{ marginTop: alto ? 16 : 8 }}>
              <BotaoCta cores={cores}>{texto.cta}</BotaoCta>
            </div>
          )}
        </div>
      </Moldura>
    </>
  )
}

export default LayoutFotoFundo
