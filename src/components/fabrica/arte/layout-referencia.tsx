import type { CSSProperties } from 'react'
import { normalizarEspecificacao } from '@/lib/layout-referencia'
import { BotaoCta, Decoracao, FotoDetalhe, Logo, Paragrafo, Selo, Titulo } from './elementos'
import { FONTE_TITULO, comAlfa, contraste, margens, tamanhoFonte, type PropsLayout } from './estilo'
import { CartaoAviso } from './layout-notificacao'

// Desenha um layout criado a partir de uma imagem de referência, seguindo a
// especificação que a IA montou (src/lib/layout-referencia.ts). Funciona no
// quadrado e no stories. Sem foto, as partes de foto viram a cor de apoio.

const TAMANHOS_TITULO = {
  media: { quadrado: 70, stories: 88 },
  grande: { quadrado: 88, stories: 108 },
  gigante: { quadrado: 112, stories: 132 },
}

function LayoutReferencia({ texto, cores, proporcao, largura, altura, fotoUrl, especificacao }: PropsLayout) {
  const e = normalizarEspecificacao(especificacao)
  const alto = proporcao === '9:16'
  const centro = e.alinhamento === 'centro'
  const { topo, base, lados } = margens(proporcao)

  // No stories, foto à esquerda/direita vira em cima/embaixo (meia largura fica estreita demais)
  const lado = alto && (e.lado_foto === 'esquerda' || e.lado_foto === 'direita')
    ? (e.lado_foto === 'esquerda' ? 'topo' : 'base')
    : e.lado_foto
  const metade = e.fundo === 'foto-metade'
  const metadeLateral = metade && (lado === 'esquerda' || lado === 'direita')
  // No quadrado com foto em cima/embaixo sobra pouca altura: foto menor
  const fracaoFoto = metade && !metadeLateral ? (alto ? '40%' : '36%') : '46%'
  const apertado = metade && !alto

  // Área da foto em "foto-metade"
  const areaFoto: CSSProperties = metade
    ? lado === 'topo' ? { top: 0, left: 0, right: 0, height: fracaoFoto }
      : lado === 'base' ? { bottom: 0, left: 0, right: 0, height: fracaoFoto }
        : lado === 'esquerda' ? { top: 0, bottom: 0, left: 0, width: '44%' }
          : { top: 0, bottom: 0, right: 0, width: '44%' }
    : {}

  // Área do texto: a arte toda ou a parte sem foto
  const regiao: CSSProperties = !metade
    ? { inset: 0, padding: `${topo}px ${lados}px ${base}px` }
    : lado === 'topo' ? { left: 0, right: 0, bottom: 0, top: fracaoFoto, padding: `${apertado ? 40 : 56}px ${lados}px ${base}px` }
      : lado === 'base' ? { left: 0, right: 0, top: 0, bottom: fracaoFoto, padding: `${topo}px ${lados}px ${apertado ? 40 : 56}px` }
        : lado === 'esquerda' ? { top: 0, bottom: 0, right: 0, left: '44%', padding: `${topo}px ${lados}px ${base}px 56px` }
          : { top: 0, bottom: 0, left: 0, right: '44%', padding: `${topo}px 56px ${base}px ${lados}px` }

  const fatorRegiao = metadeLateral ? 0.72 : apertado ? 0.7 : metade ? 0.9 : 1
  const tamanhoBase = TAMANHOS_TITULO[e.escala_titulo][alto ? 'stories' : 'quadrado']
  const tamanhoTitulo = tamanhoFonte(texto.gancho, tamanhoBase * fatorRegiao, 48, alto ? 46 : 40)
  const tamanhoApoio = Math.round((alto ? 42 : 34) * (apertado ? 0.85 : 1))
  const tamanhoCta = apertado ? 30 : 40
  const corDestaqueTexto = contraste(cores.destaque, cores.fundo) >= 2.5 ? cores.destaque : cores.texto

  // Título com as últimas palavras na cor de destaque, se a referência pedir
  const palavras = texto.gancho.split(' ')
  const quantasDestacar = e.destacar_palavra ? Math.max(1, Math.round(palavras.length * 0.35)) : 0
  const tituloNormal = palavras.slice(0, palavras.length - quantasDestacar).join(' ')
  const tituloDestaque = palavras.slice(palavras.length - quantasDestacar).join(' ')

  const justificar = { topo: 'flex-start', centro: 'center', base: 'flex-end' }[e.posicao_texto]
  const alinhar = centro ? 'center' : 'flex-start'
  const temFoto = Boolean(fotoUrl)

  return (
    <>
      {/* Fundo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: e.fundo === 'solido' || metade ? cores.fundo : `linear-gradient(160deg, ${cores.fundo} 0%, ${cores.apoio} 100%)`,
        }}
      />
      {e.fundo === 'foto-inteira' && temFoto && (
        <>
          <img src={fotoUrl!} alt="" style={{ position: 'absolute', inset: 0, width: largura, height: altura, objectFit: 'cover', objectPosition: 'center 30%' }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                e.posicao_texto === 'topo'
                  ? `linear-gradient(0deg, ${comAlfa(cores.fundo, 0.1)} 30%, ${comAlfa(cores.fundo, 0.9)} 70%)`
                  : e.posicao_texto === 'centro'
                    ? comAlfa(cores.fundo, 0.62)
                    : `linear-gradient(180deg, ${comAlfa(cores.fundo, 0.45)} 0%, ${comAlfa(cores.fundo, 0.1)} 30%, ${comAlfa(cores.fundo, 0.92)} 68%)`,
            }}
          />
        </>
      )}
      {metade && (
        <div style={{ position: 'absolute', overflow: 'hidden', background: cores.apoio, ...areaFoto }}>
          {temFoto && <img src={fotoUrl!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }} />}
        </div>
      )}

      {/* Decoração */}
      {e.decoracao === 'circulos' && <Decoracao cores={cores} largura={largura} altura={altura} />}
      {e.decoracao === 'linhas' && (
        <svg width={largura} height={altura} style={{ position: 'absolute', inset: 0, opacity: 0.18 }} aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <line key={i} x1={largura - 420 + i * 40} y1={0} x2={largura + i * 40} y2={420} stroke={cores.destaque} strokeWidth={6} />
          ))}
        </svg>
      )}
      {e.decoracao === 'pontos' && (
        <svg width={largura} height={altura} style={{ position: 'absolute', inset: 0, opacity: 0.25 }} aria-hidden>
          {Array.from({ length: 8 }, (_, linha) =>
            Array.from({ length: 8 }, (_, coluna) => (
              <circle key={`${linha}-${coluna}`} cx={largura - 340 + coluna * 40} cy={70 + linha * 40} r={5} fill={cores.destaque} />
            )),
          )}
        </svg>
      )}
      {e.decoracao === 'moldura' && (
        <div style={{ position: 'absolute', inset: 28, border: `5px solid ${cores.destaque}`, borderRadius: 40, pointerEvents: 'none' }} />
      )}

      {/* Conteúdo */}
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: alinhar, textAlign: centro ? 'center' : 'left', ...regiao }}>
        {e.posicao_logo === 'topo' && (
          <div style={{ alignSelf: alinhar }}>
            <Logo cores={cores} altura={alto ? 72 : apertado ? 46 : 58} />
          </div>
        )}

        <div
          style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: justificar,
            alignItems: alinhar,
            gap: alto ? (metade ? 30 : 40) : apertado ? 18 : 28,
            paddingBlock: apertado ? 12 : 24,
          }}
        >
          {e.elemento === 'foto-circulo' && temFoto && <FotoDetalhe url={fotoUrl!} cores={cores} tamanho={alto ? 320 : 200} />}

          {texto.destaque && e.selo === 'pilula' && <Selo cores={cores} estilo={{ alignSelf: alinhar }}>{texto.destaque}</Selo>}
          {texto.destaque && e.selo === 'faixa' && (
            <span
              style={{
                alignSelf: alinhar,
                background: cores.destaque,
                color: cores.sobreDestaque,
                fontFamily: FONTE_TITULO,
                fontWeight: 600,
                fontSize: 28,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '10px 22px',
              }}
            >
              {texto.destaque}
            </span>
          )}

          <Titulo cores={cores} tamanho={tamanhoTitulo} estilo={{ textTransform: e.caixa_alta ? 'uppercase' : 'none', width: '100%' }}>
            {tituloNormal}
            {quantasDestacar > 0 && (
              <>
                {tituloNormal ? ' ' : ''}
                <span style={{ color: corDestaqueTexto }}>{tituloDestaque}</span>
              </>
            )}
          </Titulo>

          {e.elemento === 'notificacao' && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18, textAlign: 'left' }}>
              <CartaoAviso titulo="Nova consulta confirmada" detalhe="Teleconsulta paga · hoje às 19h" tamanho={alto ? 34 : 26} destaque="#28A745" />
              {alto && <CartaoAviso titulo="Pagamento aprovado" detalhe="Envie o link da consulta no horário" tamanho={34} destaque="#28A745" />}
            </div>
          )}

          {e.elemento === 'etapas' && texto.itens.filter(Boolean).length > 0 && (
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', width: '100%', display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
              {texto.itens.filter(Boolean).slice(0, 3).map((item, indice) => (
                <li key={indice} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <span
                    style={{
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      width: alto ? 64 : 52,
                      height: alto ? 64 : 52,
                      borderRadius: 999,
                      background: cores.destaque,
                      color: cores.sobreDestaque,
                      fontFamily: FONTE_TITULO,
                      fontWeight: 700,
                      fontSize: alto ? 32 : 26,
                    }}
                  >
                    {indice + 1}
                  </span>
                  <Paragrafo cor={cores.texto} tamanho={alto ? 40 : 32} estilo={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {item}
                  </Paragrafo>
                </li>
              ))}
            </ol>
          )}

          {e.elemento === 'foto-cartao' && temFoto && (
            <img
              src={fotoUrl!}
              alt=""
              style={{ width: '100%', height: alto ? 560 : 300, objectFit: 'cover', objectPosition: 'center 30%', borderRadius: 32, display: 'block' }}
            />
          )}

          {texto.apoio && e.apoio === 'texto' && (
            <Paragrafo apoio cor={comAlfa(cores.texto, 0.88)} tamanho={tamanhoApoio}>
              {texto.apoio}
            </Paragrafo>
          )}
          {texto.apoio && e.apoio === 'cartao' && (
            <div style={{ background: cores.apoio, borderRadius: 28, padding: alto ? '36px 40px' : apertado ? '18px 24px' : '28px 32px', width: '100%' }}>
              <Paragrafo cor={cores.sobreApoio} tamanho={tamanhoApoio} estilo={{ fontWeight: 500 }}>
                {texto.apoio}
              </Paragrafo>
            </div>
          )}

          {texto.cta && e.cta === 'botao' && <BotaoCta cores={cores} tamanho={tamanhoCta}>{texto.cta}</BotaoCta>}
          {texto.cta && e.cta === 'botao-largo' && <BotaoCta cores={cores} largo tamanho={tamanhoCta}>{texto.cta}</BotaoCta>}
          {texto.cta && e.cta === 'texto' && (
            <span
              style={{
                fontFamily: FONTE_TITULO,
                fontWeight: 700,
                fontSize: alto ? 40 : 34,
                color: corDestaqueTexto,
                textDecoration: 'underline',
                textUnderlineOffset: 10,
                textDecorationThickness: 4,
              }}
            >
              {texto.cta} →
            </span>
          )}
        </div>

        {e.posicao_logo === 'base' && (
          <div style={{ alignSelf: alinhar }}>
            <Logo cores={cores} altura={alto ? 64 : 52} />
          </div>
        )}
      </div>
    </>
  )
}

export default LayoutReferencia
