// Monta o calendário do mês em semanas ISO e distribui as metas mensais entre
// as semanas e entre os dias presenciais. Tudo aqui é função pura, sem React e
// sem acesso ao banco — o que entra são números e datas, o que sai são números.

import { formatarDataISO, getDiasNoMes, getInicioSemanaIso, hojeISO } from './date-utils'

const ROTULOS_DIA_SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

const NOMES_MES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export interface DiaCronograma {
  dataISO: string
  diaDoMes: number
  rotuloDiaSemana: string
  ehFimDeSemana: boolean
  // Dias das pontas da semana que caem no mês vizinho: aparecem apagados e não
  // recebem meta nenhuma. É o que faz a última semana "curta" funcionar sozinha.
  ehDeOutroMes: boolean
  ehHoje: boolean
}

export interface SemanaCronograma {
  indice: number
  rotulo: string
  intervaloLabel: string
  // Sempre 7 posições, de segunda a domingo (regra 8 do CLAUDE.md)
  dias: DiaCronograma[]
  // Só os dias úteis que realmente pertencem ao mês selecionado
  diasUteisNoMes: string[]
}

// Semanas ISO que cruzam o mês, de segunda a domingo.
export function montarSemanasDoMes(ano: number, mes: number): SemanaCronograma[] {
  const primeiroDoMes = new Date(ano, mes - 1, 1)
  const ultimoDoMes = new Date(ano, mes - 1, getDiasNoMes(ano, mes))
  const hoje = hojeISO()

  const bruto: SemanaCronograma[] = []
  const cursor = getInicioSemanaIso(primeiroDoMes)

  while (cursor <= ultimoDoMes) {
    const dias: DiaCronograma[] = []

    for (let i = 0; i < 7; i++) {
      const data = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i)
      const diaDaSemana = data.getDay()
      dias.push({
        dataISO: formatarDataISO(data),
        diaDoMes: data.getDate(),
        rotuloDiaSemana: ROTULOS_DIA_SEMANA[diaDaSemana],
        ehFimDeSemana: diaDaSemana === 0 || diaDaSemana === 6,
        ehDeOutroMes: data.getFullYear() !== ano || data.getMonth() !== mes - 1,
        ehHoje: formatarDataISO(data) === hoje,
      })
    }

    const diasDoMes = dias.filter((dia) => !dia.ehDeOutroMes)

    bruto.push({
      indice: bruto.length,
      rotulo: '',
      intervaloLabel: montarIntervaloLabel(diasDoMes, mes),
      dias,
      diasUteisNoMes: diasDoMes.filter((dia) => !dia.ehFimDeSemana).map((dia) => dia.dataISO),
    })

    cursor.setDate(cursor.getDate() + 7)
  }

  // Um mês que começa ou termina no fim de semana gera uma semana com nenhum
  // dia útil — uma linha vazia, sem meta e sem nada para marcar. Fora.
  return bruto
    .filter((semana) => semana.diasUteisNoMes.length > 0)
    .map((semana, indice) => ({ ...semana, indice, rotulo: `Semana ${indice + 1}` }))
}

function montarIntervaloLabel(diasDoMes: DiaCronograma[], mes: number): string {
  if (diasDoMes.length === 0) return ''
  const nomeMes = NOMES_MES[mes - 1]
  const primeiro = diasDoMes[0].diaDoMes
  const ultimo = diasDoMes[diasDoMes.length - 1].diaDoMes
  if (primeiro === ultimo) return `${primeiro} de ${nomeMes}`
  return `${primeiro}–${ultimo} de ${nomeMes}`
}

// Reparte a meta do mês entre as semanas, proporcional aos dias úteis de cada
// uma. Usa o método do maior resto, então a soma bate exatamente com a meta —
// e a semana curta do fim do mês recebe menos sem ninguém precisar ajustar.
export function distribuirMetaPorSemana(
  metaMensal: number,
  semanas: SemanaCronograma[],
): number[] {
  const totalDiasUteis = semanas.reduce((soma, semana) => soma + semana.diasUteisNoMes.length, 0)

  if (metaMensal <= 0 || totalDiasUteis === 0) {
    return semanas.map(() => 0)
  }

  const exatos = semanas.map((semana) => (metaMensal * semana.diasUteisNoMes.length) / totalDiasUteis)
  const metas = exatos.map((valor) => Math.floor(valor))

  const jaDistribuido = metas.reduce((soma, valor) => soma + valor, 0)
  const resto = metaMensal - jaDistribuido

  // Quem tem a maior fração perdida no arredondamento recebe primeiro
  const candidatos = semanas
    .map((semana, indice) => ({ indice, diasUteis: semana.diasUteisNoMes.length }))
    .filter((candidato) => candidato.diasUteis > 0)
    .sort((a, b) => {
      const fracaoA = exatos[a.indice] - metas[a.indice]
      const fracaoB = exatos[b.indice] - metas[b.indice]
      if (fracaoB !== fracaoA) return fracaoB - fracaoA
      if (b.diasUteis !== a.diasUteis) return b.diasUteis - a.diasUteis
      return a.indice - b.indice
    })

  for (let i = 0; i < resto; i++) {
    metas[candidatos[i % candidatos.length].indice] += 1
  }

  return metas
}

// Divide a meta da semana entre os dias escolhidos: divisão inteira e o resto
// vai para os primeiros. Sem nenhum dia na lista devolve mapa vazio — é o caso
// da semana sem presencial, que a tela mostra como alerta.
export function distribuirEntreDias(alvo: number, datasISO: string[]): Record<string, number> {
  const mapa: Record<string, number> = {}
  if (alvo <= 0 || datasISO.length === 0) return mapa

  const base = Math.floor(alvo / datasISO.length)
  const resto = alvo % datasISO.length

  datasISO.forEach((data, indice) => {
    mapa[data] = base + (indice < resto ? 1 : 0)
  })

  return mapa
}

export function listarDiasUteisDoMes(semanas: SemanaCronograma[]): string[] {
  return semanas.flatMap((semana) => semana.diasUteisNoMes)
}

// Dias úteis de hoje em diante. Em mês passado dá 0, em mês futuro dá o mês inteiro.
export function contarDiasUteisRestantes(semanas: SemanaCronograma[], hoje: string): number {
  return listarDiasUteisDoMes(semanas).filter((data) => data >= hoje).length
}
