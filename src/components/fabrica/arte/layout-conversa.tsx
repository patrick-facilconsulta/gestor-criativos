import type { ReactNode } from 'react'
import { Logo } from './elementos'
import { FONTE_TEXTO, FONTE_TITULO, TEXTO_ESCURO, comAlfa, margens, tamanhoFonte, type PropsLayout } from './estilo'

// Território "conversa": uma conversa de mensagens no celular. O paciente pede
// um horário tarde da noite e o médico responde com o link de agendamento da
// Fácil consulta (o paciente escolhe o horário sozinho). É uma situação comum,
// não um depoimento: sem nome de paciente, sem elogio, sem resultado.
const FUNDO_CONVERSA = '#EFE9E1'

function Balao({ lado, children, hora, tamanho, cor }: { lado: 'paciente' | 'medico'; children: ReactNode; hora: string; tamanho: number; cor: string }) {
  const doMedico = lado === 'medico'
  return (
    <div style={{ display: 'flex', justifyContent: doMedico ? 'flex-end' : 'flex-start' }}>
      <div
        style={{
          maxWidth: '82%',
          padding: `${tamanho * 0.55}px ${tamanho * 0.75}px ${tamanho * 0.4}px`,
          borderRadius: tamanho * 0.7,
          borderTopLeftRadius: doMedico ? tamanho * 0.7 : 6,
          borderTopRightRadius: doMedico ? 6 : tamanho * 0.7,
          background: doMedico ? cor : '#FFFFFF',
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
          fontFamily: FONTE_TEXTO,
          fontSize: tamanho,
          lineHeight: 1.35,
          color: TEXTO_ESCURO,
        }}
      >
        {children}
        <span style={{ display: 'block', textAlign: 'right', marginTop: 4, fontSize: tamanho * 0.62, color: '#667085' }}>
          {hora} {doMedico && <span style={{ color: '#2985F0' }}>✓✓</span>}
        </span>
      </div>
    </div>
  )
}

function LayoutConversa({ texto, cores, proporcao }: PropsLayout) {
  const alto = proporcao === '9:16'
  const m = margens(proporcao)
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 96 : 72, 52, alto ? 44 : 44)
  const tamanhoMsg = alto ? 36 : 28
  const corMedico = cores.fundoEscuro ? '#DCEBFF' : cores.apoio

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: `${m.topo}px ${m.lados}px 0` }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: alto ? 28 : 18, paddingBottom: alto ? 56 : 36 }}>
        <Logo cores={cores} altura={alto ? 60 : 46} />
        <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 700, fontSize: tamanhoTitulo, lineHeight: 1.08, letterSpacing: '-0.02em', color: cores.texto }}>
          {texto.gancho}
        </h2>
        {texto.apoio && alto && (
          <p style={{ margin: 0, fontFamily: FONTE_TITULO, fontWeight: 300, fontSize: 40, lineHeight: 1.3, color: comAlfa(cores.texto, 0.85) }}>{texto.apoio}</p>
        )}
      </div>

      {/* Tela da conversa, cortada pela borda de baixo */}
      <div
        style={{
          flex: 1,
          margin: `0 ${alto ? 0 : 20}px`,
          borderRadius: '48px 48px 0 0',
          background: FUNDO_CONVERSA,
          boxShadow: '0 -10px 40px rgba(6, 28, 54, 0.18)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Barra do contato */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: alto ? '26px 30px' : '18px 24px', background: '#F7F5F2', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <span style={{ fontSize: alto ? 44 : 34, color: '#2985F0', lineHeight: 1 }}>‹</span>
          <span style={{ display: 'grid', placeItems: 'center', width: alto ? 64 : 50, height: alto ? 64 : 50, borderRadius: '50%', background: '#C9D3E0', color: '#FFFFFF', fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: alto ? 30 : 24 }}>P</span>
          <span style={{ display: 'flex', flexDirection: 'column', fontFamily: FONTE_TEXTO }}>
            <span style={{ fontWeight: 600, fontSize: alto ? 32 : 25, color: TEXTO_ESCURO }}>Paciente novo</span>
            <span style={{ fontSize: alto ? 24 : 19, color: '#667085' }}>online</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: tamanhoMsg * 0.55, padding: alto ? '30px 30px' : '20px 24px' }}>
          <span style={{ alignSelf: 'center', padding: '4px 16px', borderRadius: 999, background: 'rgba(255,255,255,0.8)', fontFamily: FONTE_TEXTO, fontSize: tamanhoMsg * 0.62, color: '#667085' }}>Hoje</span>
          <Balao lado="paciente" hora="23:12" tamanho={tamanhoMsg} cor={corMedico}>
            Oi, doutor! Consigo marcar uma consulta particular pra sábado?
          </Balao>
          <Balao lado="medico" hora="23:14" tamanho={tamanhoMsg} cor={corMedico}>
            Consegue sim! Os horários livres aparecem aqui, é só escolher:
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                marginTop: tamanhoMsg * 0.4,
                padding: `${tamanhoMsg * 0.4}px ${tamanhoMsg * 0.5}px`,
                borderRadius: tamanhoMsg * 0.35,
                background: 'rgba(255,255,255,0.75)',
                borderLeft: `5px solid #2985F0`,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: tamanhoMsg * 0.85 }}>Agende sua consulta</span>
              <span style={{ fontSize: tamanhoMsg * 0.7, color: '#475467' }}>facilconsulta.com.br</span>
            </span>
          </Balao>
        </div>
      </div>
    </div>
  )
}

export default LayoutConversa
