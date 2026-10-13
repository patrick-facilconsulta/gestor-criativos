import { Search } from 'lucide-react'
import { BotaoCta, Logo, Moldura, Paragrafo, Titulo } from './elementos'
import { FONTE_TEXTO, FONTE_TITULO, TEXTO_ESCURO, comAlfa, tamanhoFonte, type PropsLayout } from './estilo'

// Resultado de busca com botão de agendar. Usa nome fictício genérico.
// Começa desativado na base: só ativar depois de validar o termo do Google.
function LayoutBuscaGoogle({ texto, cores, proporcao }: PropsLayout) {
  const alto = proporcao === '9:16'
  const quadrado = proporcao === '1:1'
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 100 : quadrado ? 76 : 86, 54, alto ? 46 : 40)
  const base = alto ? 36 : quadrado ? 27 : 31

  return (
    <Moldura proporcao={proporcao} estilo={{ gap: alto ? 56 : 36 }}>
      <Logo cores={cores} altura={alto ? 72 : quadrado ? 52 : 60} />
      <Titulo cores={cores} tamanho={tamanhoTitulo}>{texto.gancho}</Titulo>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: base * 0.8 }}>
        {/* Barra de busca */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: base * 0.6,
            background: '#FFFFFF',
            borderRadius: 999,
            padding: `${base * 0.7}px ${base}px`,
            boxShadow: '0 10px 30px rgba(6, 28, 54, 0.18)',
            fontFamily: FONTE_TEXTO,
            fontSize: base,
            color: TEXTO_ESCURO,
          }}
        >
          <Search size={base * 1.1} color="#596579" strokeWidth={2.5} />
          Dra. Seu Nome
        </div>

        {/* Cartão do resultado */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: base * 0.45,
            background: '#FFFFFF',
            borderRadius: 32,
            padding: base * 1.1,
            boxShadow: '0 18px 40px rgba(6, 28, 54, 0.22)',
          }}
        >
          <span style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: base * 1.2, color: TEXTO_ESCURO }}>
            Dra. Seu Nome
          </span>
          <span style={{ fontFamily: FONTE_TEXTO, fontSize: base * 0.85, color: '#596579' }}>
            Sua especialidade · Teleconsulta
          </span>
          <span style={{ fontFamily: FONTE_TEXTO, fontSize: base * 0.9, color: '#F5A623', letterSpacing: 4 }}>★★★★★</span>
          <span
            style={{
              alignSelf: 'flex-start',
              marginTop: base * 0.3,
              padding: `${base * 0.5}px ${base * 0.9}px`,
              borderRadius: 999,
              background: '#2985F0',
              color: '#FFFFFF',
              fontFamily: FONTE_TITULO,
              fontWeight: 600,
              fontSize: base * 0.9,
            }}
          >
            Agendar online
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* No quadrado não sobra altura para o apoio sem espremer o botão */}
        {texto.apoio && !quadrado && (
          <Paragrafo apoio cor={comAlfa(cores.texto, 0.85)} tamanho={alto ? 42 : quadrado ? 32 : 36}>
            {texto.apoio}
          </Paragrafo>
        )}
        {texto.cta && (
          <div>
            <BotaoCta cores={cores}>{texto.cta}</BotaoCta>
          </div>
        )}
      </div>
    </Moldura>
  )
}

export default LayoutBuscaGoogle
