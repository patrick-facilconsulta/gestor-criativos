// Cruza o calendário (cronograma-utils) com o que está no banco — os dias marcados
// como presenciais e os vídeos pendurados em cada dia — e produz o que a tela de
// Produção desenha. Também é aqui que moram as regras dos alertas e da sugestão
// de dias presenciais.

import type { Criativo, TipoDia } from '@/types/database'
import { ETAPAS_JA_CAPTADAS } from './constantes'
import type { DiaCronograma, SemanaCronograma } from './cronograma-utils'
import { distribuirEntreDias, distribuirMetaPorSemana } from './cronograma-utils'

// Acima disso o dia presencial vira uma maratona de gravação pouco realista.
// O cronograma original já apontava ~3 vídeos por dia presencial como o teto.
export const VIDEOS_POR_DIA_PRESENCIAL_CONFORTAVEL = 3

export interface ResumoDia {
  dia: DiaCronograma
  tipo: TipoDia
  metaVideo: number
  metaEstatico: number
  pauta: Criativo[]
  captados: number
  // Dia de home office que ficou com vídeo pendurado: não bloqueia, mas avisa.
  pautaEmDiaHome: boolean
}

export interface ResumoSemana {
  semana: SemanaCronograma
  metaVideo: number
  metaEstatico: number
  diasPresenciais: string[]
  dias: ResumoDia[]
}

export function contarCaptados(criativos: Criativo[]): number {
  return criativos.filter((criativo) => criativo.etapa && ETAPAS_JA_CAPTADAS.includes(criativo.etapa)).length
}

interface MontarResumoOpcoes {
  semanas: SemanaCronograma[]
  metaVideoMensal: number
  metaEstaticoMensal: number
  tipoPorData: Record<string, TipoDia>
  pautaPorData: Record<string, Criativo[]>
}

export function montarResumoDoMes({
  semanas,
  metaVideoMensal,
  metaEstaticoMensal,
  tipoPorData,
  pautaPorData,
}: MontarResumoOpcoes): ResumoSemana[] {
  const metasVideo = distribuirMetaPorSemana(metaVideoMensal, semanas)
  const metasEstatico = distribuirMetaPorSemana(metaEstaticoMensal, semanas)

  return semanas.map((semana, indice) => {
    const diasPresenciais = semana.diasUteisNoMes.filter(
      (data) => (tipoPorData[data] ?? 'home') === 'presencial',
    )

    // Vídeo só se divide entre os dias presenciais. Estático é indiferente ao
    // local — é feito com IA — então se divide entre todos os dias úteis.
    const videoPorDia = distribuirEntreDias(metasVideo[indice], diasPresenciais)
    const estaticoPorDia = distribuirEntreDias(metasEstatico[indice], semana.diasUteisNoMes)

    const dias = semana.dias.map((dia): ResumoDia => {
      const tipo = tipoPorData[dia.dataISO] ?? 'home'
      const pauta = pautaPorData[dia.dataISO] ?? []
      const ehDiaUtilDoMes = !dia.ehFimDeSemana && !dia.ehDeOutroMes

      return {
        dia,
        tipo,
        metaVideo: videoPorDia[dia.dataISO] ?? 0,
        metaEstatico: estaticoPorDia[dia.dataISO] ?? 0,
        pauta,
        captados: contarCaptados(pauta),
        pautaEmDiaHome: ehDiaUtilDoMes && tipo === 'home' && pauta.length > 0,
      }
    })

    return {
      semana,
      metaVideo: metasVideo[indice],
      metaEstatico: metasEstatico[indice],
      diasPresenciais,
      dias,
    }
  })
}

export type NivelAlerta = 'critico' | 'atencao'

export interface Alerta {
  nivel: NivelAlerta
  texto: string
}

interface MontarAlertasOpcoes {
  resumos: ResumoSemana[]
  metaVideoMensal: number
  totalNaPauta: number
  totalCaptados: number
  diasPresenciaisRestantes: number
  ehMesEncerrado: boolean
}

export function montarAlertas({
  resumos,
  metaVideoMensal,
  totalNaPauta,
  totalCaptados,
  diasPresenciaisRestantes,
  ehMesEncerrado,
}: MontarAlertasOpcoes): Alerta[] {
  const alertas: Alerta[] = []

  // 1. Semana com meta de vídeo e nenhum dia presencial: é impossível por construção.
  for (const resumo of resumos) {
    if (resumo.metaVideo > 0 && resumo.diasPresenciais.length === 0) {
      alertas.push({
        nivel: 'critico',
        texto: `${resumo.semana.rotulo} não tem nenhum dia presencial — os ${resumo.metaVideo} vídeos dela não têm como ser gravados.`,
      })
    }
  }

  const faltamCaptar = Math.max(0, metaVideoMensal - totalCaptados)

  // 2. Ritmo: quantos vídeos sobram para cada dia presencial que ainda vai acontecer.
  if (!ehMesEncerrado && faltamCaptar > 0) {
    if (diasPresenciaisRestantes === 0) {
      alertas.push({
        nivel: 'critico',
        texto: `Faltam ${faltamCaptar} vídeos e não há nenhum dia presencial marcado daqui para frente.`,
      })
    } else {
      const porDia = faltamCaptar / diasPresenciaisRestantes
      if (porDia > VIDEOS_POR_DIA_PRESENCIAL_CONFORTAVEL) {
        alertas.push({
          nivel: 'atencao',
          texto: `Ritmo puxado: ${formatarRitmo(porDia)} vídeos por dia presencial. Considere marcar mais um dia.`,
        })
      }
    }
  }

  // 3. Meta do mês que ainda não foi distribuída em nenhum dia.
  const semDia = metaVideoMensal - totalNaPauta
  if (!ehMesEncerrado && semDia > 0) {
    alertas.push({
      nivel: 'atencao',
      texto: `${semDia} ${semDia === 1 ? 'vídeo da meta ainda não tem' : 'vídeos da meta ainda não têm'} dia de captação definido.`,
    })
  }

  // 4. Vídeo pendurado em dia de home office.
  const emDiaHome = resumos.reduce(
    (soma, resumo) => soma + resumo.dias.filter((dia) => dia.pautaEmDiaHome).length,
    0,
  )
  if (emDiaHome > 0) {
    alertas.push({
      nivel: 'atencao',
      texto:
        emDiaHome === 1
          ? 'Há 1 dia de home office com vídeo na pauta.'
          : `Há ${emDiaHome} dias de home office com vídeo na pauta.`,
    })
  }

  return alertas
}

export function formatarRitmo(valor: number): string {
  return valor.toFixed(1).replace('.', ',')
}

// Ordem de preferência ao sugerir dias presenciais: terça e quinta primeiro, que
// espalham a gravação pela semana sem colar na segunda nem na sexta.
const PREFERENCIA_DIA_SEMANA = [2, 4, 3, 1, 5]

interface SugerirOpcoes {
  resumos: ResumoSemana[]
  porSemana: number
  hoje: string
}

// Só preenche semanas que ainda não têm nenhum presencial marcado — nunca
// sobrescreve uma escolha manual — e nunca sugere um dia que já passou.
export function sugerirDiasPresenciais({ resumos, porSemana, hoje }: SugerirOpcoes): string[] {
  const sugestoes: string[] = []

  for (const resumo of resumos) {
    if (resumo.diasPresenciais.length > 0) continue

    // Trabalha só com as datas (strings), não com os objetos do resumo: ordenar
    // uma lista derivada de `resumos` faria o React Compiler desistir de otimizar
    // a página inteira, achando que os dados de origem podem ser mutados.
    const candidatos = resumo.dias
      .filter((dia) => !dia.dia.ehFimDeSemana && !dia.dia.ehDeOutroMes && dia.dia.dataISO >= hoje)
      .map((dia) => dia.dia.dataISO)

    const ordenados = [...candidatos].sort((a, b) => {
      const posicaoA = PREFERENCIA_DIA_SEMANA.indexOf(diaDaSemanaDe(a))
      const posicaoB = PREFERENCIA_DIA_SEMANA.indexOf(diaDaSemanaDe(b))
      if (posicaoA !== posicaoB) return posicaoA - posicaoB
      return a.localeCompare(b)
    })

    for (const data of ordenados.slice(0, porSemana)) {
      sugestoes.push(data)
    }
  }

  return [...sugestoes].sort()
}

function diaDaSemanaDe(dataISO: string): number {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return new Date(ano, mes - 1, dia).getDay()
}
