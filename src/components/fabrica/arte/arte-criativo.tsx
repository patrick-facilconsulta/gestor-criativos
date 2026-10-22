import type { ComponentType, Ref } from 'react'
import { DIMENSOES_ARTE } from '@/lib/fabrica'
import type { FabricaPaleta, ProporcaoArte, TextoArte } from '@/types/database'
import { FONTE_TEXTO, coresDaPaleta, type PropsLayout } from './estilo'
import LayoutBuscaGoogle from './layout-busca-google'
import LayoutComparativo from './layout-comparativo'
import LayoutConversa from './layout-conversa'
import LayoutEnquete from './layout-enquete'
import LayoutEtapas from './layout-etapas'
import LayoutEtiquetasFoto from './layout-etiquetas-foto'
import LayoutFotoFundo from './layout-foto-fundo'
import LayoutManchete from './layout-manchete'
import LayoutMarcaTexto from './layout-marca-texto'
import LayoutNotaCelular from './layout-nota-celular'
import LayoutNotificacao from './layout-notificacao'
import LayoutNotificacaoBloqueio from './layout-notificacao-bloqueio'
import LayoutObjetoFoto from './layout-objeto-foto'
import LayoutPergunta from './layout-pergunta'
import LayoutPostItsFoto from './layout-post-its-foto'
import LayoutProdutoReal from './layout-produto-real'
import LayoutRecortes from './layout-recortes'
import LayoutReferencia from './layout-referencia'
import LayoutRelogio from './layout-relogio'
import LayoutTextoSelecionado from './layout-texto-selecionado'

// A `chave` de cada layout cadastrado em fabrica_layouts aponta para um destes
// modelos. Layout novo = novo modelo aqui + nova linha na tabela.
const MODELOS: Record<string, ComponentType<PropsLayout>> = {
  manchete: LayoutManchete,
  pergunta: LayoutPergunta,
  notificacao: LayoutNotificacao,
  comparativo: LayoutComparativo,
  etapas: LayoutEtapas,
  'busca-google': LayoutBuscaGoogle,
  'foto-fundo': LayoutFotoFundo,
  // Territórios criativos (diversificação): interface do dia a dia,
  // tipografia editorial e pessoa em cena real
  'notificacao-bloqueio': LayoutNotificacaoBloqueio,
  'nota-celular': LayoutNotaCelular,
  'marca-texto': LayoutMarcaTexto,
  'texto-selecionado': LayoutTextoSelecionado,
  'etiquetas-foto': LayoutEtiquetasFoto,
  'post-its-foto': LayoutPostItsFoto,
  // Territórios (2ª leva): conversa, enquete de stories, relógio, recortes de
  // papel, objeto-metáfora e produto de verdade
  conversa: LayoutConversa,
  enquete: LayoutEnquete,
  relogio: LayoutRelogio,
  recortes: LayoutRecortes,
  'objeto-foto': LayoutObjetoFoto,
  'produto-real': LayoutProdutoReal,
}

interface ArteCriativoProps {
  chaveLayout: string
  paleta: FabricaPaleta
  proporcao: ProporcaoArte
  texto: TextoArte
  fotoUrl?: string | null
  // Layout criado por referência: com especificação, usa o modelo genérico
  especificacao?: unknown | null
  ref?: Ref<HTMLDivElement>
}

// Desenha a arte no tamanho real (1080 px de largura). Para mostrar na tela,
// use dentro de PreviaEscalada.
function ArteCriativo({ chaveLayout, paleta, proporcao, texto, fotoUrl, especificacao, ref }: ArteCriativoProps) {
  const { largura, altura } = DIMENSOES_ARTE[proporcao]
  const cores = coresDaPaleta(paleta)
  const Modelo = especificacao ? LayoutReferencia : MODELOS[chaveLayout] ?? LayoutManchete

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
      <Modelo
        texto={texto}
        cores={cores}
        proporcao={proporcao}
        largura={largura}
        altura={altura}
        fotoUrl={fotoUrl}
        especificacao={especificacao}
      />
    </div>
  )
}

export default ArteCriativo
