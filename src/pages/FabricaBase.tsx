import { useState } from 'react'
import { ArrowLeft, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import ArteCriativo from '@/components/fabrica/arte/arte-criativo'
import PreviaEscalada from '@/components/fabrica/arte/previa-escalada'
import ModalItemBase, { type CampoBase, type ValorCampo } from '@/components/fabrica/base/modal-item-base'
import TabelaBase, { type ColunaBase, type ItemBase } from '@/components/fabrica/base/tabela-base'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useArgumentos,
  useBaseConhecimento,
  useBaseFabrica,
  useDiretrizes,
  usePontosConceito,
  useSalvarBaseConhecimento,
  useSalvarItemBase,
  type TabelaBase as NomeTabela,
} from '@/hooks/use-fabrica'
import { useFrentes } from '@/hooks/use-frentes'
import { ROTULO_FORMATO } from '@/lib/constantes'
import {
  DIMENSOES_ARTE,
  ROTULO_CONSCIENCIA,
  ROTULO_TIPO_ARGUMENTO,
  ROTULO_TIPO_DIRETRIZ,
  ROTULO_TIPO_PONTO,
  ROTULO_USO_ARGUMENTO,
} from '@/lib/fabrica'
import type {
  ConscienciaConceito,
  FabricaPaleta,
  Formato,
  TipoArgumento,
  TipoDiretriz,
  TipoPontoConceito,
  UsoArgumento,
} from '@/types/database'

type Secao = 'pontos' | 'conceitos' | 'argumentos' | 'narrativas' | 'formatos' | 'layouts' | 'paletas' | 'regras' | 'documento'

// Linha genérica de qualquer tabela da base
type Linha = ItemBase & Record<string, unknown>

interface ConfigSecao {
  tabela: NomeTabela
  singular: string
  descricao: string
  itens: Linha[]
  campos: CampoBase[]
  colunas: ColunaBase<Linha>[]
  padrao: Record<string, ValorCampo>
  podeCriar: boolean
}

// Na tela: "conceitos" da fábrica = Ângulos; frentes = Conceitos
const ROTULOS_SECAO: Record<Secao, string> = {
  pontos: 'Pontos dos conceitos',
  narrativas: 'Narrativas',
  conceitos: 'Ângulos',
  argumentos: 'Argumentos',
  formatos: 'Formatos',
  layouts: 'Layouts',
  paletas: 'Paletas',
  regras: 'Regras',
  documento: 'Documento da base',
}

const PROPORCOES = ['1:1', '4:5', '9:16'] as const

function opcoesDe<T extends string>(rotulos: Record<T, string>) {
  return (Object.keys(rotulos) as T[]).map((valor) => ({ valor, rotulo: rotulos[valor] }))
}

function texto(valor: unknown) {
  return typeof valor === 'string' ? valor : ''
}

function Corte({ children }: { children: string }) {
  return <span className="line-clamp-2 text-sm">{children}</span>
}

// Texto de exemplo para a prévia das paletas
const TEXTO_EXEMPLO = {
  gancho: 'Plantão paga mal? Comece sua agenda particular online.',
  apoio: 'O paciente agenda, paga e você recebe o aviso no WhatsApp.',
  destaque: 'Sem largar o plantão',
  cta: 'Veja se tem demanda',
  itens: [],
  antes: '',
  depois: '',
}

function FabricaBase() {
  const [secao, setSecao] = useState<Secao>('pontos')
  const [filtroConceito, setFiltroConceito] = useState('todos')
  const [filtroFrente, setFiltroFrente] = useState('todos')
  const [edicao, setEdicao] = useState<{ item: Linha | null } | null>(null)
  const [documento, setDocumento] = useState<string | null>(null)

  const { data: base, isLoading } = useBaseFabrica()
  const { data: argumentos } = useArgumentos()
  const { data: diretrizes } = useDiretrizes()
  const { data: pontos } = usePontosConceito()
  const { data: baseConhecimento } = useBaseConhecimento()
  const { data: frentes } = useFrentes()
  const salvarItem = useSalvarItemBase()
  const salvarDocumento = useSalvarBaseConhecimento()

  if (isLoading || !base) {
    return <p className="text-sm text-muted-foreground">Carregando a base da fábrica...</p>
  }

  const opcoesConceito = base.conceitos.map((c) => ({ valor: c.id, rotulo: c.nome }))
  const nomeConceito = new Map(base.conceitos.map((c) => [c.id, c.nome]))
  const opcoesFrente = (frentes ?? []).map((f) => ({ valor: f.id, rotulo: f.nome }))
  const opcoesNarrativa = base.narrativas.map((n) => ({ valor: n.id, rotulo: n.nome }))

  // Lista de nomes de um vínculo; vazio = vale para todos
  function nomesDe(ids: unknown, opcoes: { valor: string; rotulo: string }[]) {
    const lista = Array.isArray(ids) ? (ids as string[]) : []
    if (lista.length === 0) return 'Todos'
    return opcoes.filter((o) => lista.includes(o.valor)).map((o) => o.rotulo).join(', ')
  }

  const configs: Record<Exclude<Secao, 'documento'>, ConfigSecao> = {
    pontos: {
      tabela: 'fabrica_pontos_conceito',
      singular: 'ponto',
      descricao: 'Dores, desejos, benefícios e provas de cada conceito, do planejamento do marketing. A IA usa os marcados como "Seguro" sempre que o conceito é escolhido.',
      itens: ((pontos ?? []) as unknown as Linha[]).filter(
        (ponto) => filtroFrente === 'todos' || ponto.frente_id === filtroFrente,
      ),
      podeCriar: true,
      padrao: {
        frente_id: filtroFrente === 'todos' ? null : filtroFrente,
        tipo: 'beneficio',
        uso: 'seguro',
        ativo: true,
        ordem: (pontos?.length ?? 0) + 1,
      },
      campos: [
        { chave: 'frente_id', rotulo: 'Conceito', tipo: 'select', obrigatorio: true, opcoes: opcoesFrente },
        { chave: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: opcoesDe(ROTULO_TIPO_PONTO) },
        { chave: 'texto', rotulo: 'Texto', tipo: 'textarea', obrigatorio: true, linhas: 2 },
        {
          chave: 'uso',
          rotulo: 'Uso',
          tipo: 'select',
          obrigatorio: true,
          opcoes: opcoesDe(ROTULO_USO_ARGUMENTO),
          ajuda: '"Validar antes" fica guardado, mas a IA não usa até virar "Seguro" (ex.: números sem fonte).',
        },
        { chave: 'ordem', rotulo: 'Ordem', tipo: 'numero' },
        { chave: 'ativo', rotulo: 'Ativo', tipo: 'booleano' },
      ],
      colunas: [
        { rotulo: 'Texto', render: (i) => <Corte>{texto(i.texto)}</Corte> },
        { rotulo: 'Conceito', render: (i) => <span className="text-xs text-muted-foreground">{nomesDe([i.frente_id], opcoesFrente)}</span> },
        { rotulo: 'Tipo', render: (i) => ROTULO_TIPO_PONTO[i.tipo as TipoPontoConceito] },
        {
          rotulo: 'Uso',
          render: (i) => (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${i.uso === 'seguro' ? 'bg-[#e9f6ee] text-[#187a3b]' : 'bg-amber-50 text-amber-700'}`}>
              {ROTULO_USO_ARGUMENTO[i.uso as UsoArgumento]}
            </span>
          ),
        },
      ],
    },
    conceitos: {
      tabela: 'fabrica_conceitos',
      singular: 'ângulo',
      descricao: 'Os ângulos de criativo. Na Fábrica, só aparecem os ângulos ligados ao conceito e à narrativa escolhidos.',
      itens: base.conceitos as unknown as Linha[],
      podeCriar: true,
      padrao: { consciencia: 'problema', frente_ids: [], narrativa_ids: [], ativo: true, ordem: base.conceitos.length + 1 },
      campos: [
        { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
        { chave: 'mensagem', rotulo: 'Mensagem central', tipo: 'textarea', obrigatorio: true, linhas: 2 },
        { chave: 'personas', rotulo: 'Personas', tipo: 'texto', ajuda: 'Para quem é. Ex.: Plantonista; Médica do SUS' },
        { chave: 'consciencia', rotulo: 'Nível de consciência', tipo: 'select', obrigatorio: true, opcoes: opcoesDe(ROTULO_CONSCIENCIA) },
        { chave: 'objecao', rotulo: 'Objeção que antecipa', tipo: 'textarea', linhas: 2 },
        { chave: 'roteiro_referencia', rotulo: 'Roteiro de referência', tipo: 'textarea' },
        { chave: 'cuidados', rotulo: 'Cuidados de compliance', tipo: 'textarea', linhas: 2 },
        { chave: 'frente_ids', rotulo: 'Conceitos em que aparece', tipo: 'multipla', opcoes: opcoesFrente },
        { chave: 'narrativa_ids', rotulo: 'Narrativas que combinam', tipo: 'multipla', opcoes: opcoesNarrativa },
        { chave: 'ordem', rotulo: 'Ordem', tipo: 'numero' },
        { chave: 'ativo', rotulo: 'Ativo', tipo: 'booleano' },
      ],
      colunas: [
        { rotulo: 'Ângulo', render: (i) => <span className="font-medium">{texto(i.nome)}</span> },
        { rotulo: 'Mensagem', render: (i) => <Corte>{texto(i.mensagem)}</Corte> },
        { rotulo: 'Consciência', render: (i) => ROTULO_CONSCIENCIA[i.consciencia as ConscienciaConceito] },
        { rotulo: 'Conceitos', render: (i) => <span className="text-xs">{nomesDe(i.frente_ids, opcoesFrente)}</span> },
        { rotulo: 'Narrativas', render: (i) => <span className="text-xs">{nomesDe(i.narrativa_ids, opcoesNarrativa)}</span> },
      ],
    },
    argumentos: {
      tabela: 'fabrica_argumentos',
      singular: 'argumento',
      descricao: 'Ganchos, argumentos e provas de cada ângulo. A IA usa só os marcados como "Seguro".',
      itens: ((argumentos ?? []) as unknown as Linha[]).filter(
        (a) => filtroConceito === 'todos' || a.conceito_id === filtroConceito,
      ),
      podeCriar: true,
      padrao: {
        conceito_id: filtroConceito === 'todos' ? null : filtroConceito,
        tipo: 'gancho',
        uso: 'seguro',
        ativo: true,
      },
      campos: [
        { chave: 'conceito_id', rotulo: 'Ângulo', tipo: 'select', obrigatorio: true, opcoes: opcoesConceito },
        { chave: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: opcoesDe(ROTULO_TIPO_ARGUMENTO) },
        { chave: 'texto', rotulo: 'Texto', tipo: 'textarea', obrigatorio: true, linhas: 2 },
        { chave: 'origem', rotulo: 'Origem', tipo: 'texto', ajuda: 'De onde veio. Ex.: fala de médico na reunião' },
        {
          chave: 'uso',
          rotulo: 'Uso',
          tipo: 'select',
          obrigatorio: true,
          opcoes: opcoesDe(ROTULO_USO_ARGUMENTO),
          ajuda: '"Validar antes" fica guardado, mas a IA não usa até virar "Seguro".',
        },
        { chave: 'ativo', rotulo: 'Ativo', tipo: 'booleano' },
      ],
      colunas: [
        { rotulo: 'Texto', render: (i) => <Corte>{texto(i.texto)}</Corte> },
        { rotulo: 'Ângulo', render: (i) => <span className="text-xs text-muted-foreground">{nomeConceito.get(texto(i.conceito_id)) ?? '—'}</span> },
        { rotulo: 'Tipo', render: (i) => ROTULO_TIPO_ARGUMENTO[i.tipo as TipoArgumento] },
        {
          rotulo: 'Uso',
          render: (i) => (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${i.uso === 'seguro' ? 'bg-[#e9f6ee] text-[#187a3b]' : 'bg-amber-50 text-amber-700'}`}>
              {ROTULO_USO_ARGUMENTO[i.uso as UsoArgumento]}
            </span>
          ),
        },
      ],
    },
    narrativas: {
      tabela: 'fabrica_narrativas',
      singular: 'narrativa',
      descricao: 'A estrutura em que a história é contada. Na Fábrica, só aparecem as narrativas ligadas ao conceito escolhido.',
      itens: base.narrativas as unknown as Linha[],
      podeCriar: true,
      padrao: { frente_ids: [], ativo: true, ordem: base.narrativas.length + 1 },
      campos: [
        { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
        { chave: 'estrutura', rotulo: 'Estrutura', tipo: 'textarea', obrigatorio: true, linhas: 5, ajuda: 'Uma etapa por linha.' },
        { chave: 'descricao', rotulo: 'Descrição', tipo: 'textarea', linhas: 2 },
        { chave: 'frente_ids', rotulo: 'Conceitos em que aparece', tipo: 'multipla', opcoes: opcoesFrente },
        { chave: 'ordem', rotulo: 'Ordem', tipo: 'numero' },
        { chave: 'ativo', rotulo: 'Ativo', tipo: 'booleano' },
      ],
      colunas: [
        { rotulo: 'Narrativa', render: (i) => <span className="font-medium">{texto(i.nome)}</span> },
        { rotulo: 'Estrutura', render: (i) => <Corte>{texto(i.estrutura).split('\n').join(' → ')}</Corte> },
        { rotulo: 'Conceitos', render: (i) => <span className="text-xs">{nomesDe(i.frente_ids, opcoesFrente)}</span> },
      ],
    },
    formatos: {
      tabela: 'fabrica_formatos',
      singular: 'formato',
      descricao: 'Tipo de peça. Estático sai sempre em quadrado + stories (a mesma arte); vídeo gera roteiro + capa na proporção escolhida.',
      itens: base.formatos as unknown as Linha[],
      podeCriar: true,
      padrao: { tipo: 'estatico', proporcao: '1:1', ativo: true, ordem: base.formatos.length + 1 },
      campos: [
        { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
        { chave: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: opcoesDe(ROTULO_FORMATO) },
        {
          chave: 'proporcao',
          rotulo: 'Proporção',
          tipo: 'select',
          obrigatorio: true,
          opcoes: PROPORCOES.map((p) => ({ valor: p, rotulo: `${p} (${DIMENSOES_ARTE[p].largura}×${DIMENSOES_ARTE[p].altura})` })),
        },
        { chave: 'descricao', rotulo: 'Descrição', tipo: 'textarea', linhas: 2 },
        { chave: 'ordem', rotulo: 'Ordem', tipo: 'numero' },
        { chave: 'ativo', rotulo: 'Ativo', tipo: 'booleano' },
      ],
      colunas: [
        { rotulo: 'Formato', render: (i) => <span className="font-medium">{texto(i.nome)}</span> },
        { rotulo: 'Tipo', render: (i) => ROTULO_FORMATO[i.tipo as Formato] },
        { rotulo: 'Proporção', render: (i) => texto(i.proporcao) },
      ],
    },
    layouts: {
      tabela: 'fabrica_layouts',
      singular: 'layout',
      descricao: 'Os modelos de arte. Layout novo exige programação; aqui dá para renomear, descrever e ativar.',
      itens: base.layouts as unknown as Linha[],
      podeCriar: false,
      padrao: {},
      campos: [
        { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
        { chave: 'descricao', rotulo: 'Descrição', tipo: 'textarea', linhas: 2 },
        { chave: 'ordem', rotulo: 'Ordem', tipo: 'numero' },
        { chave: 'ativo', rotulo: 'Ativo', tipo: 'booleano' },
      ],
      colunas: [
        { rotulo: 'Layout', render: (i) => <span className="font-medium">{texto(i.nome)}</span> },
        { rotulo: 'Descrição', render: (i) => <Corte>{texto(i.descricao)}</Corte> },
        { rotulo: 'Modelo', render: (i) => <code className="text-xs">{texto(i.chave)}</code> },
      ],
    },
    paletas: {
      tabela: 'fabrica_paletas',
      singular: 'paleta',
      descricao: 'Cores aplicadas sobre qualquer layout.',
      itens: base.paletas as unknown as Linha[],
      podeCriar: true,
      padrao: {
        cor_fundo: '#0A2C53',
        cor_texto: '#FFFFFF',
        cor_destaque: '#2985F0',
        cor_apoio: '#061C36',
        ativo: true,
        ordem: base.paletas.length + 1,
      },
      campos: [
        { chave: 'nome', rotulo: 'Nome', tipo: 'texto', obrigatorio: true },
        { chave: 'cor_fundo', rotulo: 'Fundo', tipo: 'cor', obrigatorio: true },
        { chave: 'cor_texto', rotulo: 'Texto', tipo: 'cor', obrigatorio: true },
        { chave: 'cor_destaque', rotulo: 'Destaque (botão e selo)', tipo: 'cor', obrigatorio: true },
        { chave: 'cor_apoio', rotulo: 'Apoio (cartões e degradê)', tipo: 'cor', obrigatorio: true },
        { chave: 'ordem', rotulo: 'Ordem', tipo: 'numero' },
        { chave: 'ativo', rotulo: 'Ativo', tipo: 'booleano' },
      ],
      colunas: [
        { rotulo: 'Paleta', render: (i) => <span className="font-medium">{texto(i.nome)}</span> },
        {
          rotulo: 'Cores',
          render: (i) => (
            <span className="flex gap-1">
              {['cor_fundo', 'cor_texto', 'cor_destaque', 'cor_apoio'].map((chave) => (
                <span key={chave} title={texto(i[chave])} className="size-5 rounded-full border border-border" style={{ background: texto(i[chave]) }} />
              ))}
            </span>
          ),
        },
      ],
    },
    regras: {
      tabela: 'fabrica_diretrizes',
      singular: 'regra',
      descricao: 'Linguagem e compliance que a IA precisa seguir em todo criativo.',
      itens: (diretrizes ?? []) as unknown as Linha[],
      podeCriar: true,
      padrao: { tipo: 'proibido', ativo: true },
      campos: [
        { chave: 'tipo', rotulo: 'Tipo', tipo: 'select', obrigatorio: true, opcoes: opcoesDe(ROTULO_TIPO_DIRETRIZ) },
        { chave: 'texto', rotulo: 'Regra', tipo: 'textarea', obrigatorio: true, linhas: 3 },
        { chave: 'ativo', rotulo: 'Ativo', tipo: 'booleano' },
      ],
      colunas: [
        {
          rotulo: 'Tipo',
          className: 'w-28',
          render: (i) => (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                i.tipo === 'usar' ? 'bg-[#e9f6ee] text-[#187a3b]' : i.tipo === 'evitar' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'
              }`}
            >
              {ROTULO_TIPO_DIRETRIZ[i.tipo as TipoDiretriz]}
            </span>
          ),
        },
        { rotulo: 'Regra', render: (i) => <span className="text-sm">{texto(i.texto)}</span> },
      ],
    },
  }

  const config = secao === 'documento' ? null : configs[secao]
  const textoDocumento = documento ?? baseConhecimento?.conteudo ?? ''

  function salvar(valores: Record<string, ValorCampo>) {
    if (!config) return
    salvarItem.mutate(
      { tabela: config.tabela, id: edicao?.item?.id, campos: valores },
      {
        onSuccess: () => setEdicao(null),
        onError: () => toast.error('Não foi possível salvar. Confira os campos.'),
      },
    )
  }

  function alternarAtivo(item: Linha, ativo: boolean) {
    if (!config) return
    salvarItem.mutate(
      { tabela: config.tabela, id: item.id, campos: { ativo } },
      { onError: () => toast.error('Não foi possível atualizar.') },
    )
  }

  function salvarTextoDocumento() {
    salvarDocumento.mutate(
      { id: baseConhecimento?.id ?? null, conteudo: textoDocumento },
      {
        onSuccess: () => setDocumento(null),
        onError: () => toast.error('Não foi possível salvar o documento.'),
      },
    )
  }

  function previaPaleta(valores: Record<string, ValorCampo>) {
    const cor = (chave: string, reserva: string) => {
      const valor = String(valores[chave] ?? '')
      return /^#[0-9a-fA-F]{6}$/.test(valor) ? valor : reserva
    }
    const paleta: FabricaPaleta = {
      id: 'previa',
      nome: '',
      cor_fundo: cor('cor_fundo', '#0A2C53'),
      cor_texto: cor('cor_texto', '#FFFFFF'),
      cor_destaque: cor('cor_destaque', '#2985F0'),
      cor_apoio: cor('cor_apoio', '#061C36'),
      ativo: true,
      ordem: 0,
      created_at: '',
    }
    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Prévia</p>
        <PreviaEscalada largura={1080} altura={1350}>
          <ArteCriativo chaveLayout="manchete" paleta={paleta} proporcao="4:5" texto={TEXTO_EXEMPLO} />
        </PreviaEscalada>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/fabrica" className="inline-flex items-center gap-1 text-sm font-medium text-[#0d559f] hover:underline">
          <ArrowLeft className="size-4" /> Voltar para a Fábrica
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-normal">Base da fábrica</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tudo o que a IA usa para escrever os criativos. Alterações valem a partir da próxima geração.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Seções da base">
        {(Object.keys(ROTULOS_SECAO) as Secao[]).map((opcao) => (
          <Button
            key={opcao}
            role="tab"
            size="sm"
            variant={secao === opcao ? 'default' : 'outline'}
            aria-selected={secao === opcao}
            onClick={() => setSecao(opcao)}
          >
            {ROTULOS_SECAO[opcao]}
          </Button>
        ))}
      </div>

      {config ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-sm text-muted-foreground">{config.descricao}</p>
            <div className="flex items-center gap-2">
              {secao === 'pontos' && (
                <Select value={filtroFrente} onValueChange={setFiltroFrente}>
                  <SelectTrigger className="w-64" aria-label="Filtrar por conceito">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os conceitos</SelectItem>
                    {opcoesFrente.map((opcao) => (
                      <SelectItem key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {secao === 'argumentos' && (
                <Select value={filtroConceito} onValueChange={setFiltroConceito}>
                  <SelectTrigger className="w-64" aria-label="Filtrar por ângulo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os ângulos</SelectItem>
                    {opcoesConceito.map((opcao) => (
                      <SelectItem key={opcao.valor} value={opcao.valor}>{opcao.rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {config.podeCriar && (
                <Button onClick={() => setEdicao({ item: null })}>
                  <Plus /> Novo {config.singular}
                </Button>
              )}
            </div>
          </div>
          <TabelaBase
            itens={config.itens}
            colunas={config.colunas}
            desabilitado={salvarItem.isPending}
            onEditar={(item) => setEdicao({ item })}
            onAlternarAtivo={alternarAtivo}
          />
        </section>
      ) : (
        <section className="space-y-3 rounded-lg border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-heading text-base font-semibold">Documento da base de conhecimento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cole aqui o documento completo (as análises das reuniões de vendas). A IA lê o texto inteiro a cada geração.
              Fica guardado só no banco, protegido por login.
            </p>
          </div>
          <Textarea
            rows={20}
            className="font-mono text-xs"
            value={textoDocumento}
            placeholder="Cole aqui o conteúdo da Base de conhecimento.md"
            onChange={(event) => setDocumento(event.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {textoDocumento.length.toLocaleString('pt-BR')} caracteres
              {baseConhecimento?.updated_at && ` · salvo em ${new Date(baseConhecimento.updated_at).toLocaleString('pt-BR')}`}
            </p>
            <Button disabled={documento === null || salvarDocumento.isPending} onClick={salvarTextoDocumento}>
              {salvarDocumento.isPending ? 'Salvando...' : 'Salvar documento'}
            </Button>
          </div>
        </section>
      )}

      {config && edicao && (
        <ModalItemBase
          // Remonta o formulário a cada item aberto
          key={`${secao}-${edicao.item?.id ?? 'novo'}`}
          aberto
          titulo={edicao.item ? `Editar ${config.singular}` : `Novo ${config.singular}`}
          descricao={config.descricao}
          campos={config.campos}
          valoresIniciais={
            edicao.item
              ? Object.fromEntries(config.campos.map((campo) => [campo.chave, (edicao.item![campo.chave] ?? null) as ValorCampo]))
              : config.padrao
          }
          salvando={salvarItem.isPending}
          onFechar={() => setEdicao(null)}
          onSalvar={salvar}
          previa={secao === 'paletas' ? previaPaleta : undefined}
        />
      )}
    </div>
  )
}

export default FabricaBase
