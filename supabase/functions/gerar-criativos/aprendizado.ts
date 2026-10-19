import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

// Aprendizado de desempenho para a IA da Fábrica: os anúncios que mais e menos
// renderam cadastros no conceito escolhido, com seus textos. Dados vêm de
// meta_anuncios + meta_resultados_diarios (sincronizados do Meta, só leitura).
//
// Cuidados de leitura (mesmas regras da análise da conta):
// - Só campanhas de cadastro (OUTCOME_LEADS); alcance/awareness fica de fora.
// - Formulário instantâneo fica de fora (quase não registra visita à LP).
// - Só entra anúncio com gasto suficiente: pelo menos 2× o custo por cadastro
//   da conta no período. Menos que isso é ruído.
// - A referência é o custo por cadastro do "pool" (gasto total ÷ cadastros totais).
// - O mesmo criativo em vários conjuntos conta como um só (soma os números).
// - Ranking pelo custo por cadastro AJUSTADO: soma ao anúncio 10 cadastros
//   "de referência" ao custo da conta. Assim R$ 260 com 4 cadastros não passa na
//   frente de R$ 13 mil com 192: pouco volume puxa o número para a média.

const DIAS = 60
const QUANTOS = 5
const MINIMO_ANUNCIOS = 4
const CADASTROS_REFERENCIA = 10

// "002 _ Estático novo — Cópia — Cópia" → "002 _ ESTÁTICO NOVO"
function chaveCriativo(nome: string) {
  return nome.replace(/(\s*[—-]\s*c[óo]pia)+\s*$/i, '').trim().toUpperCase()
}

interface Linha {
  ad_id: string
  gasto: number
  impressoes: number
  cliques_link: number
  visitas_lp: number
  resultados: number
}

export interface Aprendizado {
  texto: string
  resumo: Record<string, unknown> | null
}

function reais(valor: number) {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`
}

function porcento(valor: number) {
  return `${(valor * 100).toFixed(1).replace('.', ',')}%`
}

function cortar(texto: string | null | undefined, limite: number) {
  if (!texto) return '—'
  const limpo = texto.replace(/\s+/g, ' ').trim()
  return limpo.length > limite ? `${limpo.slice(0, limite)}…` : limpo
}

export async function montarAprendizado(supabase: SupabaseClient, frenteId: string, nomeConceito: string): Promise<Aprendizado> {
  const desde = new Date(Date.now() - DIAS * 86_400_000).toISOString().slice(0, 10)

  const { data: anuncios, error } = await supabase
    .from('meta_anuncios')
    .select('ad_id, nome, frente_id, texto_principal, titulo, descricao, criativo_id, origem')
    .eq('objetivo', 'OUTCOME_LEADS')
    .eq('formulario_instantaneo', false)
  if (error || !anuncios?.length) {
    return { texto: '', resumo: null }
  }

  // Resultados do período, paginados (o Supabase devolve no máximo 1000 por vez)
  const ids = new Set(anuncios.map((a) => a.ad_id as string))
  const linhas: Linha[] = []
  for (let pagina = 0; pagina < 100; pagina++) {
    const { data } = await supabase
      .from('meta_resultados_diarios')
      .select('ad_id, gasto, impressoes, cliques_link, visitas_lp, resultados')
      .gte('data', desde)
      .range(pagina * 1000, pagina * 1000 + 999)
    if (!data?.length) break
    linhas.push(...(data as Linha[]).filter((l) => ids.has(l.ad_id)))
    if (data.length < 1000) break
  }

  const porAnuncio = new Map<string, Linha>()
  for (const l of linhas) {
    const atual = porAnuncio.get(l.ad_id) ?? { ad_id: l.ad_id, gasto: 0, impressoes: 0, cliques_link: 0, visitas_lp: 0, resultados: 0 }
    atual.gasto += Number(l.gasto)
    atual.impressoes += Number(l.impressoes)
    atual.cliques_link += Number(l.cliques_link)
    atual.visitas_lp += Number(l.visitas_lp)
    atual.resultados += Number(l.resultados)
    porAnuncio.set(l.ad_id, atual)
  }

  const total = [...porAnuncio.values()].reduce(
    (soma, l) => ({ gasto: soma.gasto + l.gasto, resultados: soma.resultados + l.resultados }),
    { gasto: 0, resultados: 0 },
  )
  if (total.resultados === 0) {
    return { texto: '', resumo: null }
  }
  const cplConta = total.gasto / total.resultados
  const gastoMinimo = 2 * cplConta

  // Junta o mesmo criativo rodando em conjuntos diferentes
  const grupos = new Map<string, { anuncio: (typeof anuncios)[number]; numeros: Linha; maiorGasto: number }>()
  for (const a of anuncios.filter((x) => x.frente_id === frenteId)) {
    const n = porAnuncio.get(a.ad_id as string)
    if (!n) continue
    const chave = chaveCriativo(a.nome as string)
    const atual = grupos.get(chave)
    if (!atual) {
      grupos.set(chave, { anuncio: a, numeros: { ...n }, maiorGasto: n.gasto })
      continue
    }
    for (const campo of ['gasto', 'impressoes', 'cliques_link', 'visitas_lp', 'resultados'] as const) atual.numeros[campo] += n[campo]
    // Textos e nome vêm da versão que mais gastou
    if (n.gasto > atual.maiorGasto) Object.assign(atual, { anuncio: a, maiorGasto: n.gasto })
  }

  const doConceito = [...grupos.values()]
    .filter((x) => x.numeros.gasto >= gastoMinimo)
    .map((x) => ({
      ...x,
      // Sem cadastro, o custo por cadastro é o próprio gasto (pior caso conhecido)
      cpl: x.numeros.resultados > 0 ? x.numeros.gasto / x.numeros.resultados : x.numeros.gasto,
      cplAjustado: (x.numeros.gasto + CADASTROS_REFERENCIA * cplConta) / (x.numeros.resultados + CADASTROS_REFERENCIA),
    }))
    .sort((a, b) => a.cplAjustado - b.cplAjustado)

  if (doConceito.length < MINIMO_ANUNCIOS) {
    return {
      texto: `APRENDIZADOS DE DESEMPENHO (Meta Ads, últimos ${DIAS} dias): ainda não há anúncios suficientes do conceito "${nomeConceito}" com volume para comparar (${doConceito.length} com gasto ≥ ${reais(gastoMinimo)}). Siga só a base e as diretrizes.`,
      resumo: { dias: DIAS, cpl_conta: Number(cplConta.toFixed(2)), anuncios_elegiveis: doConceito.length },
    }
  }

  // Metadados da Fábrica (ângulo, narrativa, layout e gancho) para os anúncios que vieram dela
  const criativoIds = doConceito.map((x) => x.anuncio.criativo_id).filter(Boolean) as string[]
  const fabrica = new Map<string, string>()
  if (criativoIds.length) {
    const { data: geracoes } = await supabase
      .from('fabrica_geracoes')
      .select('criativo_id, texto_arte, ponto_conceito, fabrica_conceitos(nome), fabrica_narrativas(nome), fabrica_layouts(nome)')
      .in('criativo_id', criativoIds)
    for (const g of geracoes ?? []) {
      const r = g as unknown as {
        criativo_id: string
        texto_arte?: { gancho?: string }
        ponto_conceito?: string | null
        fabrica_conceitos?: { nome?: string } | null
        fabrica_narrativas?: { nome?: string } | null
        fabrica_layouts?: { nome?: string } | null
      }
      fabrica.set(
        r.criativo_id,
        `Fábrica: ângulo ${r.fabrica_conceitos?.nome ?? '—'}; narrativa ${r.fabrica_narrativas?.nome ?? '—'}; layout ${r.fabrica_layouts?.nome ?? '—'}; ponto ${r.ponto_conceito ?? '—'}; gancho da arte "${r.texto_arte?.gancho ?? '—'}"`,
      )
    }
  }

  const melhores = doConceito.slice(0, QUANTOS)
  const piores = doConceito.slice(-QUANTOS).reverse().filter((x) => !melhores.includes(x))

  const descrever = (x: (typeof doConceito)[number]) => {
    const n = x.numeros
    const linhasTexto = [
      `- ${x.anuncio.nome}: gasto ${reais(n.gasto)}, ${n.resultados} cadastro(s), custo por cadastro ${n.resultados ? reais(x.cpl) : 'sem cadastro'}; ` +
        `cadastro por clique ${n.cliques_link ? porcento(n.resultados / n.cliques_link) : '—'}, cadastro por visita ${n.visitas_lp ? porcento(n.resultados / n.visitas_lp) : '—'}, CTR de link ${n.impressoes ? porcento(n.cliques_link / n.impressoes) : '—'}`,
      `  Texto principal: ${cortar(x.anuncio.texto_principal as string, 280)}`,
      `  Título: ${cortar(x.anuncio.titulo as string, 80)}`,
    ]
    const meta = x.anuncio.criativo_id ? fabrica.get(x.anuncio.criativo_id as string) : undefined
    if (meta) linhasTexto.push(`  ${meta}`)
    return linhasTexto.join('\n')
  }

  const texto = `APRENDIZADOS DE DESEMPENHO (Meta Ads, campanhas de cadastro, últimos ${DIAS} dias)
Referência da conta: custo por cadastro de ${reais(cplConta)} (gasto total ÷ cadastros). Só entram anúncios do conceito "${nomeConceito}" com gasto ≥ ${reais(gastoMinimo)}; a ordem considera o volume (poucos cadastros pesam menos), então compare também o número de cadastros.
O que a arte mostrava não está aqui: só os textos do anúncio e, quando o anúncio veio da Fábrica, a combinação usada.

Melhores (menor custo por cadastro, considerando o volume):
${melhores.map(descrever).join('\n')}

Piores (maior custo por cadastro, considerando o volume):
${piores.map(descrever).join('\n')}

Como usar: trate como sinal, não como regra, e NÃO copie os textos. Faça variações perto do que os melhores têm em comum (assunto, promessa, tom, formato do gancho) e evite os padrões dos piores. Mantenha cerca de 1 em cada 3 variações explorando um caminho novo, para continuar aprendendo. As regras de compliance valem acima de qualquer resultado.`

  return {
    texto,
    resumo: {
      dias: DIAS,
      cpl_conta: Number(cplConta.toFixed(2)),
      anuncios_elegiveis: doConceito.length,
      melhores: melhores.map((x) => ({ ad_id: x.anuncio.ad_id, nome: x.anuncio.nome, cpl: Number(x.cpl.toFixed(2)) })),
      piores: piores.map((x) => ({ ad_id: x.anuncio.ad_id, nome: x.anuncio.nome, cpl: Number(x.cpl.toFixed(2)) })),
    },
  }
}
