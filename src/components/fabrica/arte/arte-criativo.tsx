import type { ComponentType, Ref } from 'react'
import { DIMENSOES_ARTE } from '@/lib/fabrica'
import type { FabricaPaleta, ProporcaoArte, TextoArte } from '@/types/database'
import { FONTE_TEXTO, coresDaPaleta, type PropsLayout } from './estilo'
import LayoutBuscaGoogle from './layout-busca-google'
import LayoutComparativo from './layout-comparativo'
import LayoutEtapas from './layout-etapas'
import LayoutManchete from './layout-manchete'
import LayoutNotificacao from './layout-notificacao'
import LayoutPergunta from './layout-pergunta'

// A `chave` de cada layout cadastrado em fabrica_layouts aponta para um destes
// modelos. Layout novo = novo modelo aqui + nova linha na tabela.
const MODELOS: Record<string, ComponentType<PropsLayout>> = {
  manchete: LayoutManchete,
  pergunta: LayoutPergunta,
  notificacao: LayoutNotificacao,
  comparativo: LayoutComparativo,
  etapas: LayoutEtapas,
  'busca-google': LayoutBuscaGoogle,
}

interface ArteCriativoProps {
  chaveLayout: string
  paleta: FabricaPaleta
  proporcao: ProporcaoArte
  texto: TextoArte
  ref?: Ref<HTMLDivElement>
}

// Desenha a arte no tamanho real (1080 px de largura). Para mostrar na tela,
// use dentro de PreviaEscalada.
function ArteCriativo({ chaveLayout, paleta, proporcao, texto, ref }: ArteCriativoProps) {
  const { largura, altura } = DIMENSOES_ARTE[proporcao]
  const cores = coresDaPaleta(paleta)
  const Modelo = MODELOS[chaveLayout] ?? LayoutManchete

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: largura,
        height: altura,
        background: cores.fundoEscuro
          ? `linear-gradient(160deg, ${cores.fundo} 0%, ${cores.apoio} 100%)`
          : cores.fundo,
        color: cores.texto,
        fontFamily: FONTE_TEXTO,
      }}
    >
      <Modelo texto={texto} cores={cores} proporcao={proporcao} largura={largura} altura={altura} />
    </div>
  )
}

export default ArteCriativo
