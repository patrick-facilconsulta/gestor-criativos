import type { FabricaGeracao } from '@/types/database'

// Padrões que nunca podem aparecer num anúncio (ver diretrizes "proibido" da
// Fábrica). É uma segunda conferência, além das regras que a IA já recebe.
const PADROES_PROIBIDOS: { padrao: RegExp; motivo: string }[] = [
  { padrao: /R\$\s?\d|\d+\s?reais/i, motivo: 'Cita valor em reais (preço ou faturamento).' },
  { padrao: /\d+\s?%/, motivo: 'Cita percentual: precisa de fonte.' },
  { padrao: /garant/i, motivo: 'Fala em garantia: só se virar política oficial.' },
  { padrao: /imposs[ií]vel dar errado|n[aã]o tem como dar errado/i, motivo: 'Promessa absoluta de resultado.' },
  { padrao: /s[oó] hoje|[uú]ltimas vagas|m[eê]s do cliente/i, motivo: 'Urgência falsa.' },
  { padrao: /parceiro oficial do google/i, motivo: '"Parceiro oficial do Google" precisa de validação.' },
  { padrao: /parcela|\d+\s?x\s?de/i, motivo: 'Cita parcela: preço não vai no criativo.' },
  { padrao: /psiquiatr|dermatolog|ginecolog|endocrin|neurolog|ortoped|gastro/i, motivo: 'Cita especialidade: confira RQE antes de usar.' },
  { padrao: /tirzepatida|emagrec/i, motivo: 'Tema restrito pelo CFM e pela Meta.' },
  { padrao: /F[áa]cil Consulta/, motivo: 'Escreva "Fácil consulta", com "c" minúsculo.' },
]

export function conferirCompliance(geracao: FabricaGeracao): string[] {
  const textos = [
    geracao.texto_arte.gancho,
    geracao.texto_arte.apoio,
    geracao.texto_arte.destaque,
    geracao.texto_arte.cta,
    geracao.texto_arte.antes,
    geracao.texto_arte.depois,
    ...(geracao.texto_arte.itens ?? []),
    geracao.texto_principal,
    geracao.titulo_anuncio,
    geracao.descricao_anuncio,
    geracao.roteiro,
  ]
    .filter(Boolean)
    .join('\n')

  const encontrados = PADROES_PROIBIDOS.filter(({ padrao }) => padrao.test(textos)).map(({ motivo }) => motivo)

  // Fotos podem ter pessoas geradas por IA
  if (geracao.foto_path) {
    encontrados.push('Foto gerada por IA: não apresente a pessoa como médico real, cliente ou autor de depoimento.')
  }

  // Alertas que a própria IA marcou + os encontrados aqui, sem repetir
  return [...new Set([...(geracao.alertas ?? []), ...encontrados])]
}
