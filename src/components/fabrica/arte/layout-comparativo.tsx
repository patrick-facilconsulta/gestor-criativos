import { BotaoCta, Logo, Moldura, Paragrafo, Titulo } from './elementos'
import { FONTE_TITULO, comAlfa, tamanhoFonte, type CoresArte, type PropsLayout } from './estilo'

function Coluna({
  rotulo,
  texto,
  simbolo,
  fundo,
  cor,
  corSimbolo,
  tamanho,
}: {
  rotulo: string
  texto: string
  simbolo: string
  fundo: string
  cor: string
  corSimbolo: string
  tamanho: number
}) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: tamanho * 0.6,
        background: fundo,
        borderRadius: 36,
        padding: tamanho * 1.2,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: tamanho * 0.45 }}>
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: tamanho * 1.6,
            height: tamanho * 1.6,
            borderRadius: 999,
            background: corSimbolo,
            color: '#FFFFFF',
            fontFamily: FONTE_TITULO,
            fontWeight: 700,
            fontSize: tamanho,
          }}
        >
          {simbolo}
        </span>
        <span style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: tamanho * 0.9, color: cor }}>{rotulo}</span>
      </span>
      <Paragrafo cor={cor} tamanho={tamanho * 1.05} estilo={{ fontWeight: 500, lineHeight: 1.25 }}>
        {texto}
      </Paragrafo>
    </div>
  )
}

function colunasDoComparativo(cores: CoresArte, texto: PropsLayout['texto'], tamanho: number) {
  return (
    <>
      <Coluna
        rotulo="Hoje"
        texto={texto.antes}
        simbolo="✕"
        fundo={comAlfa(cores.texto, cores.fundoEscuro ? 0.1 : 0.06)}
        cor={comAlfa(cores.texto, 0.8)}
        corSimbolo="#DC3545"
        tamanho={tamanho}
      />
      <Coluna
        rotulo="Com a Fácil consulta"
        texto={texto.depois}
        simbolo="✓"
        fundo={cores.apoio}
        cor={cores.sobreApoio}
        corSimbolo="#28A745"
        tamanho={tamanho}
      />
    </>
  )
}

// Duas colunas: a situação de hoje × a mesma situação com a Fácil consulta
function LayoutComparativo({ texto, cores, proporcao }: PropsLayout) {
  const alto = proporcao === '9:16'
  const quadrado = proporcao === '1:1'
  const tamanhoTitulo = tamanhoFonte(texto.gancho, alto ? 100 : quadrado ? 76 : 86, 54, alto ? 46 : 40)
  const tamanhoColuna = alto ? 44 : quadrado ? 32 : 36

  return (
    <Moldura proporcao={proporcao} estilo={{ gap: alto ? 56 : 40 }}>
      <Logo cores={cores} altura={alto ? 72 : quadrado ? 52 : 60} />
      <Titulo cores={cores} tamanho={tamanhoTitulo}>{texto.gancho}</Titulo>
      <div
        style={{
          flex: 1,
          display: 'flex',
          // Em pé (9:16) as colunas viram linhas
          flexDirection: alto ? 'column' : 'row',
          gap: 28,
          alignItems: 'stretch',
        }}
      >
        {colunasDoComparativo(cores, texto, tamanhoColuna)}
      </div>
      {texto.cta && (
        <div>
          <BotaoCta cores={cores}>{texto.cta}</BotaoCta>
        </div>
      )}
    </Moldura>
  )
}

export default LayoutComparativo
