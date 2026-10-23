import type { Criativo, MetaLancamento, MetaObjeto } from '@/types/database'

// Regras da tela de Lançamentos e da janela "Lançar no Meta".

// Conta [PARCEIROS] Gerenciador (a mesma do segredo META_AD_ACCOUNT_ID); só
// para montar o link do Gerenciador de Anúncios
export const CONTA_META = '1540602703464423'

export function linkConjuntoNoGerenciador(conjuntoId: string, conta = CONTA_META) {
  return `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${conta}&selected_adset_ids=${conjuntoId}`
}

// Botões do Meta (o texto livre de chamada_acao vira um destes)
export const BOTOES_META = [
  { valor: 'LEARN_MORE', rotulo: 'Saiba mais' },
  { valor: 'SIGN_UP', rotulo: 'Cadastre-se' },
  { valor: 'APPLY_NOW', rotulo: 'Candidate-se' },
  { valor: 'CONTACT_US', rotulo: 'Fale conosco' },
  { valor: 'GET_QUOTE', rotulo: 'Solicitar orçamento' },
  { valor: 'SUBSCRIBE', rotulo: 'Assinar' },
]

export function botaoSugerido(criativos: Pick<Criativo, 'chamada_acao'>[]) {
  const texto = (criativos[0]?.chamada_acao ?? '').toLowerCase()
  if (texto.includes('cadastr')) return 'SIGN_UP'
  if (texto.includes('fale') || texto.includes('contato')) return 'CONTACT_US'
  return 'LEARN_MORE'
}

// Cada chamada da função dura no máximo 150 s: sem nada novo há mais tempo que
// isso, o lançamento "em andamento" parou (conexão caiu ou a janela foi fechada)
const PARADO_DEPOIS_MS = 3 * 60_000

export type SituacaoLancamento = 'rodando' | 'interrompido' | 'erro' | 'concluido'

export function situacaoLancamento(lancamento: MetaLancamento, objetos: MetaObjeto[], agora = Date.now()): SituacaoLancamento {
  if (lancamento.status === 'concluido') return 'concluido'
  if (lancamento.status === 'erro') return 'erro'
  const ultimaAtividade = Math.max(
    new Date(lancamento.created_at).getTime(),
    ...objetos.map((o) => new Date(o.created_at).getTime()),
  )
  return agora - ultimaAtividade > PARADO_DEPOIS_MS ? 'interrompido' : 'rodando'
}

// Texto do andamento de um lançamento em partes (botões de lançar e continuar)
export function textoProgresso(parcial: { etapa?: string; criativos_prontos?: number; anuncios_prontos?: number; total?: number } | null) {
  if (parcial?.etapa === 'anuncios') return `Criando anúncios (${parcial.anuncios_prontos} de ${parcial.total})...`
  if (parcial?.etapa === 'conjunto') return 'Criando o conjunto...'
  if (parcial) return `Enviando criativos (${parcial.criativos_prontos} de ${parcial.total})...`
  return 'Enviando ao Meta...'
}
