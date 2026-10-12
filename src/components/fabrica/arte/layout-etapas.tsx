import { BotaoCta, Decoracao, Logo, Moldura, Paragrafo, Titulo } from './elementos'
import { FONTE_TITULO, comAlfa, tamanhoFonte, type PropsLayout } from './estilo'

// O caminho em 3 passos, numerados
function LayoutEtapas({ texto, cores, proporcao, largura, altura }: PropsLayout) {
  const alto = proporcao === '9:16'
  const quadrado = proporcao === '1:1'
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 100 : quadrado ? 78 : 88, 54, alto ? 46 : 40)
  const tamanhoItem = alto ? 46 : quadrado ? 34 : 40
  const itens = texto.itens.filter(Boolean).slice(0, 3)

  return (
    <>
      <Decoracao cores={cores} largura={largura} altura={altura} />
      <Moldura proporcao={proporcao} estilo={{ gap: alto ? 56 : 36 }}>
        <Logo cores={cores} altura={alto ? 72 : quadrado ? 52 : 60} />
        <Titulo cores={cores} tamanho={tamanhoTitulo}>{texto.gancho}</Titulo>
        <ol
          style={{
            flex: 1,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: tamanhoItem * 0.7,
          }}
        >
          {itens.map((item, indice) => (
            <li
              key={indice}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tamanhoItem * 0.6,
                background: comAlfa(cores.apoio, 0.92),
                borderRadius: 28,
                padding: `${tamanhoItem * 0.55}px ${tamanhoItem * 0.7}px`,
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  width: tamanhoItem * 1.7,
                  height: tamanhoItem * 1.7,
                  borderRadius: 999,
                  background: cores.destaque,
                  color: cores.sobreDestaque,
                  fontFamily: FONTE_TITULO,
                  fontWeight: 700,
                  fontSize: tamanhoItem,
                }}
              >
                {indice + 1}
              </span>
              <Paragrafo cor={cores.sobreApoio} tamanho={tamanhoItem} estilo={{ fontWeight: 600, lineHeight: 1.2 }}>
                {item}
              </Paragrafo>
            </li>
          ))}
        </ol>
        {texto.cta && (
          <div>
            <BotaoCta cores={cores}>{texto.cta}</BotaoCta>
          </div>
        )}
      </Moldura>
    </>
  )
}

export default LayoutEtapas
