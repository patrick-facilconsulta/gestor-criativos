import { BotaoCta, Logo, Moldura, Paragrafo, Titulo } from './elementos'
import { FONTE_TEXTO, FONTE_TITULO, TEXTO_ESCURO, comAlfa, tamanhoFonte, type PropsLayout } from './estilo'

// Um aviso de consulta como chega no celular do médico. É o mecanismo do
// produto, não um depoimento: sem nome de paciente, sem valor em reais.
function CartaoAviso({ titulo, detalhe, tamanho, destaque }: { titulo: string; detalhe: string; tamanho: number; destaque: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tamanho * 0.7,
        background: '#FFFFFF',
        borderRadius: tamanho * 0.9,
        padding: `${tamanho * 0.85}px ${tamanho}px`,
        boxShadow: '0 18px 40px rgba(6, 28, 54, 0.25)',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          width: tamanho * 2.6,
          height: tamanho * 2.6,
          borderRadius: tamanho * 0.7,
          background: destaque,
          color: '#FFFFFF',
          fontSize: tamanho * 1.4,
          fontFamily: FONTE_TITULO,
          fontWeight: 700,
        }}
      >
        ✓
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: tamanho * 0.25, minWidth: 0 }}>
        <span style={{ fontFamily: FONTE_TEXTO, fontSize: tamanho * 0.8, color: '#596579' }}>Fácil consulta · agora</span>
        <span style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: tamanho * 1.05, color: TEXTO_ESCURO, lineHeight: 1.2 }}>{titulo}</span>
        <span style={{ fontFamily: FONTE_TEXTO, fontSize: tamanho * 0.85, color: '#1C263C', lineHeight: 1.3 }}>{detalhe}</span>
      </span>
    </div>
  )
}

function LayoutNotificacao({ texto, cores, proporcao }: PropsLayout) {
  const alto = proporcao === '9:16'
  const quadrado = proporcao === '1:1'
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 100 : quadrado ? 76 : 88, 54, alto ? 46 : 40)
  const tamanhoAviso = alto ? 36 : quadrado ? 27 : 31
  // Verde de sucesso do guia da marca: o aviso lê como confirmação
  const corIcone = '#28A745'

  return (
    <Moldura proporcao={proporcao} estilo={{ gap: alto ? 56 : quadrado ? 30 : 40 }}>
      <Logo cores={cores} altura={alto ? 72 : quadrado ? 52 : 60} />
      <Titulo cores={cores} tamanho={tamanhoTitulo}>{texto.gancho}</Titulo>

      {/* Tela do celular com os avisos */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: tamanhoAviso * 0.7,
          borderRadius: 48,
          padding: alto ? 48 : 34,
          background: comAlfa(cores.apoio, cores.fundoEscuro ? 0.9 : 1),
        }}
      >
        <CartaoAviso
          titulo="Nova consulta confirmada"
          detalhe="Teleconsulta paga · hoje às 19h"
          tamanho={tamanhoAviso}
          destaque={corIcone}
        />
        {!quadrado && (
          <CartaoAviso
            titulo="Pagamento aprovado"
            detalhe="Envie o link da consulta no horário"
            tamanho={tamanhoAviso}
            destaque={corIcone}
          />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: quadrado ? 24 : 32 }}>
        {texto.apoio && (
          <Paragrafo cor={comAlfa(cores.texto, 0.85)} tamanho={alto ? 42 : quadrado ? 32 : 36}>
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

export default LayoutNotificacao
