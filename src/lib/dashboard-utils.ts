import { STATUS_CONTA_PARA_META } from './constantes'
import { getMesCalendario } from './date-utils'
import type { Criativo, Formato } from '@/types/database'

function contaParaMeta(criativo: Criativo): boolean {
  return criativo.data_entrega !== null && STATUS_CONTA_PARA_META.includes(criativo.status)
}

export function filtrarPorMes(criativos: Criativo[], ano: number, mes: number): Criativo[] {
  return criativos.filter((criativo) => {
    if (!contaParaMeta(criativo) || !criativo.data_entrega) return false
    const dataEntrega = getMesCalendario(criativo.data_entrega)
    return dataEntrega.ano === ano && dataEntrega.mes === mes
  })
}

export function filtrarPorIntervalo(criativos: Criativo[], inicioISO: string, fimISO: string): Criativo[] {
  return criativos.filter((criativo) => {
    if (!contaParaMeta(criativo) || !criativo.data_entrega) return false
    return criativo.data_entrega >= inicioISO && criativo.data_entrega <= fimISO
  })
}

export function contarPorFormato(criativos: Criativo[]): Record<Formato, number> {
  return {
    video: criativos.filter((criativo) => criativo.formato === 'video').length,
    estatico: criativos.filter((criativo) => criativo.formato === 'estatico').length,
  }
}

export function agruparPorFrente(criativos: Criativo[]): Map<string, Criativo[]> {
  const mapa = new Map<string, Criativo[]>()

  for (const criativo of criativos) {
    const lista = mapa.get(criativo.frente_id) ?? []
    lista.push(criativo)
    mapa.set(criativo.frente_id, lista)
  }

  return mapa
}
