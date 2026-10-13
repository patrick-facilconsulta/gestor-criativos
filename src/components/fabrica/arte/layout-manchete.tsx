import { BotaoCta, Decoracao, FotoDetalhe, Logo, Moldura, Paragrafo, Selo, Titulo } from './elementos'
import { comAlfa, tamanhoFonte, type PropsLayout } from './estilo'

// Título grande, texto de apoio e botão de CTA
function LayoutManchete({ texto, cores, proporcao, largura, altura, fotoUrl }: PropsLayout) {
  const alto = proporcao === '9:16'
  // No quadrado com foto sobra menos altura: o título fica um pouco menor
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 112 : fotoUrl ? 80 : 96, 56, alto ? 48 : 42)

  return (
    <>
      <Decoracao cores={cores} largura={largura} altura={altura} />
      <Moldura proporcao={proporcao}>
        {/* Com foto: logo e foto redonda dividem o topo, sem invadir o texto */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
          <Logo cores={cores} altura={alto ? 76 : 64} />
          {fotoUrl && <FotoDetalhe url={fotoUrl} cores={cores} tamanho={alto ? 340 : 220} />}
        </div>
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
