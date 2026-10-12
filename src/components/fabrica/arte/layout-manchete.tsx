import { BotaoCta, Decoracao, Logo, Moldura, Paragrafo, Selo, Titulo } from './elementos'
import { comAlfa, tamanhoFonte, type PropsLayout } from './estilo'

// Título grande, texto de apoio e botão de CTA
function LayoutManchete({ texto, cores, proporcao, largura, altura }: PropsLayout) {
  const alto = proporcao === '9:16'
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 112 : 96, 60, alto ? 48 : 42)

  return (
    <>
      <Decoracao cores={cores} largura={largura} altura={altura} />
      <Moldura proporcao={proporcao}>
        <Logo cores={cores} altura={alto ? 76 : 64} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: alto ? 48 : 36 }}>
          {texto.destaque && <Selo cores={cores}>{texto.destaque}</Selo>}
          <Titulo cores={cores} tamanho={tamanhoTitulo}>{texto.gancho}</Titulo>
          {texto.apoio && (
            <Paragrafo cor={comAlfa(cores.texto, 0.85)} tamanho={alto ? 44 : 38}>
              {texto.apoio}
            </Paragrafo>
          )}
        </div>
        {texto.cta && (
          <div>
            <BotaoCta cores={cores}>{texto.cta}</BotaoCta>
          </div>
        )}
      </Moldura>
    </>
  )
}

export default LayoutManchete
