import { getDiasNoMes } from './date-utils'

export type Farol = 'verde' | 'ambar' | 'vermelho'

// Regra 10 do CLAUDE.md: ritmo esperado até hoje = meta_mensal × (dia de hoje ÷ dias no mês),
// arredondado para baixo, em dias corridos.
export function calcularRitmoEsperado(metaMensal: number, hoje: Date): number {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const diasNoMes = getDiasNoMes(ano, mes)
  const diaDeHoje = hoje.getDate()
  return Math.floor(metaMensal * (diaDeHoje / diasNoMes))
}

interface CalcularFarolParametros {
  entregue: number
  metaMensal: number
  ritmoEsperado: number
  ehMesAtual: boolean
}

// Regra 11 do CLAUDE.md: no mês corrente compara com o ritmo esperado; em meses
// passados ou futuros, compara direto com a meta mensal cheia.
export function calcularFarol({
  entregue,
  metaMensal,
  ritmoEsperado,
  ehMesAtual,
}: CalcularFarolParametros): Farol {
  const referencia = ehMesAtual ? ritmoEsperado : metaMensal

  if (referencia <= 0) {
    return 'verde'
  }

  const percentual = entregue / referencia

  if (percentual >= 1) return 'verde'
  if (percentual >= 0.8) return 'ambar'
  return 'vermelho'
}

// O CLAUDE.md não define uma fórmula própria de ritmo esperado para a semana (só para
// o mês, na regra 10). Para o bloco de ritmo semanal, comparamos o entregue direto
// contra a meta semanal cheia, reaproveitando os mesmos limiares (100%/80%) do farol
// mensal.
export function calcularFarolSemanal(entregue: number, metaSemanal: number): Farol {
  if (metaSemanal <= 0) {
    return 'verde'
  }

  const percentual = entregue / metaSemanal

  if (percentual >= 1) return 'verde'
  if (percentual >= 0.8) return 'ambar'
  return 'vermelho'
}
