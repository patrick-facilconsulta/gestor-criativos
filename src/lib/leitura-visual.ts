// Leitura visual dos criativos estáticos (questionário da função ler-criativos,
// regras em supabase/functions/_shared/leitura-visual.ts). Aqui ficam os nomes
// mostrados na tela e o que dá para corrigir.

export type LeituraVisual = Record<string, unknown>

interface Opcao {
  valor: string
  rotulo: string
}

export interface CampoLeitura {
  id: string
  nome: string
  tipo: 'texto' | 'texto_longo' | 'opcoes' | 'sim_nao'
  opcoes?: Opcao[]
}

export const CAMPOS_LEITURA: CampoLeitura[] = [
  { id: 'titulo_principal', nome: 'Título da arte', tipo: 'texto' },
  {
    id: 'formato_titulo',
    nome: 'Formato do título',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'pergunta', rotulo: 'Pergunta' },
      { valor: 'afirmacao', rotulo: 'Afirmação' },
      { valor: 'numero_ou_estatistica', rotulo: 'Número ou estatística' },
      { valor: 'convite_ou_ordem', rotulo: 'Convite ou chamada' },
      { valor: 'sem_titulo', rotulo: 'Sem título' },
    ],
  },
  { id: 'texto_na_arte', nome: 'Todo o texto da arte', tipo: 'texto_longo' },
  {
    id: 'tipo_peca',
    nome: 'Tipo de peça',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'foto', rotulo: 'Foto' },
      { valor: 'foto_com_texto', rotulo: 'Foto com texto' },
      { valor: 'arte_grafica', rotulo: 'Arte gráfica' },
      { valor: 'tela_de_celular_ou_sistema', rotulo: 'Tela de celular ou sistema' },
      { valor: 'busca_do_google', rotulo: 'Imita busca do Google' },
      { valor: 'pessoa_falando_para_camera', rotulo: 'Pessoa falando para a câmera' },
      { valor: 'outro', rotulo: 'Outro' },
    ],
  },
  {
    id: 'pessoas',
    nome: 'Pessoas',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'nenhuma', rotulo: 'Nenhuma' },
      { valor: 'medico', rotulo: 'Médico' },
      { valor: 'paciente', rotulo: 'Paciente' },
      { valor: 'medico_e_paciente', rotulo: 'Médico e paciente' },
      { valor: 'pessoa_sem_papel_claro', rotulo: 'Pessoa sem papel claro' },
    ],
  },
  { id: 'mostra_produto', nome: 'Mostra a plataforma', tipo: 'sim_nao' },
  { id: 'elemento_principal', nome: 'Chama atenção primeiro', tipo: 'texto' },
  { id: 'tem_botao', nome: 'Botão desenhado', tipo: 'sim_nao' },
  { id: 'tem_logo', nome: 'Logo da Fácil consulta', tipo: 'sim_nao' },
  {
    id: 'fundo',
    nome: 'Fundo',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'claro', rotulo: 'Claro' },
      { valor: 'escuro', rotulo: 'Escuro' },
      { valor: 'colorido', rotulo: 'Colorido' },
      { valor: 'foto', rotulo: 'Foto' },
    ],
  },
  {
    id: 'cor_predominante',
    nome: 'Cor predominante',
    tipo: 'opcoes',
    opcoes: [
      { valor: 'azul', rotulo: 'Azul' },
      { valor: 'branco', rotulo: 'Branco' },
      { valor: 'preto_ou_azul_marinho', rotulo: 'Preto ou azul-marinho' },
      { valor: 'verde', rotulo: 'Verde' },
      { valor: 'amarelo_ou_laranja', rotulo: 'Amarelo ou laranja' },
      { valor: 'vermelho_ou_rosa', rotulo: 'Vermelho ou rosa' },
      { valor: 'cinza', rotulo: 'Cinza' },
      { valor: 'outra', rotulo: 'Outra' },
    ],
  },
  { id: 'resumo', nome: 'Resumo', tipo: 'texto_longo' },
]

export const ROTULO_QUANTIDADE: Record<string, string> = { pouco: 'Pouco', medio: 'Médio', muito: 'Muito' }

export function mostrarValor(campo: CampoLeitura, valor: unknown): string {
  if (campo.tipo === 'sim_nao') return valor ? 'Sim' : 'Não'
  if (campo.tipo === 'opcoes') return campo.opcoes?.find((o) => o.valor === valor)?.rotulo ?? String(valor ?? '—')
  const texto = String(valor ?? '').trim()
  return texto || '—'
}

// Quantidade de texto: o sistema conta as palavras da transcrição (mesma regra da função)
export function quantidadeTexto(textoNaArte: string) {
  const palavras = textoNaArte.replace(/\|/g, ' ').split(/\s+/).filter((p) => /[\p{L}\p{N}]/u.test(p)).length
  return { palavras, quantidade: palavras <= 8 ? 'pouco' : palavras <= 25 ? 'medio' : 'muito' }
}

// Correção da equipe vale por cima da leitura da IA, campo a campo
export function leituraFinal(leitura: LeituraVisual | null, correcao: LeituraVisual | null): LeituraVisual | null {
  if (!leitura) return null
  const final = { ...leitura, ...(correcao ?? {}) }
  if (correcao && typeof correcao.texto_na_arte === 'string') Object.assign(final, quantidadeTexto(correcao.texto_na_arte))
  return final
}
