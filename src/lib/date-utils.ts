// Todas as funções abaixo trabalham com datas "de calendário" (sem hora), evitando
// bugs de fuso horário que aconteceriam se déssemos `new Date('2026-09-01')` direto
// (o JS interpreta isso como UTC meia-noite, o que muda o dia em fusos negativos).

export function hojeISO(): string {
  const hoje = new Date()
  return formatarDataISO(hoje)
}

export function formatarDataISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function parseDataLocal(dataISO: string): Date {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

export function formatarDataBR(dataISO: string | null): string {
  if (!dataISO) return '—'
  const [ano, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}/${ano}`
}

export function getDiasNoMes(ano: number, mes: number): number {
  // mes é 1-12; dia 0 do mês seguinte é o último dia do mês atual
  return new Date(ano, mes, 0).getDate()
}

export function getMesCalendario(dataISO: string): { ano: number; mes: number } {
  const [ano, mes] = dataISO.split('-').map(Number)
  return { ano, mes }
}

// Semana ISO: segunda a domingo (regra 8 do CLAUDE.md)
export function getInicioSemanaIso(data: Date): Date {
  const diaDaSemana = data.getDay() // 0 = domingo, 1 = segunda, ..., 6 = sábado
  const deslocamento = diaDaSemana === 0 ? -6 : 1 - diaDaSemana
  const inicio = new Date(data.getFullYear(), data.getMonth(), data.getDate() + deslocamento)
  return inicio
}

export function getFimSemanaIso(data: Date): Date {
  const inicio = getInicioSemanaIso(data)
  return new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6)
}

export type PeriodoAtalho = 'semana_atual' | 'mes_atual' | 'mes_anterior' | 'tudo'

// Retorna null para "tudo" (sem filtro de data nenhum)
export function getIntervaloPeriodo(
  periodo: PeriodoAtalho,
  hoje: Date = new Date(),
): { inicio: string; fim: string } | null {
  if (periodo === 'tudo') {
    return null
  }

  if (periodo === 'semana_atual') {
    return {
      inicio: formatarDataISO(getInicioSemanaIso(hoje)),
      fim: formatarDataISO(getFimSemanaIso(hoje)),
    }
  }

  if (periodo === 'mes_atual') {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    return { inicio: formatarDataISO(inicio), fim: formatarDataISO(fim) }
  }

  // mes_anterior
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
  return { inicio: formatarDataISO(inicio), fim: formatarDataISO(fim) }
}
