// Teste das travas de segurança do Meta (_shared/meta.ts).
// Rodar: npm run test:meta-travas  (precisa do Node 22.6+)
// Se algum caso falhar, NÃO publique as funções do Meta.
import { validarCriacao, validarLeitura, META_BASE } from './meta.ts'
const conta = 'act_1540602703464423'
const fabrica = new Set(['900', '901'])  // campanha 900 e conjunto 901 criados pelo sistema
let falhas = 0
function deve(descricao: string, permitido: boolean, fn: () => unknown) {
  let ok: boolean
  let res: unknown
  try { res = fn(); ok = true } catch (e) { ok = false; res = (e as Error).message }
  const passou = ok === permitido
  if (!passou) falhas++
  console.log(passou ? 'OK  ' : 'FALHA', descricao, '->', ok ? String(JSON.stringify(res) ?? "ok").slice(0, 80) : res)
}
// Permitidos
deve('cria campanha com spend_cap', true, () => validarCriacao({ caminho: `${conta}/campaigns`, campos: { name: 'x', spend_cap: 300000, status: 'ACTIVE' } }, conta, fabrica))
deve('cria conjunto na campanha da Fábrica', true, () => validarCriacao({ caminho: `${conta}/adsets`, campos: { campaign_id: '900', daily_budget: 5000 } }, conta, fabrica))
deve('cria anúncio em conjunto da Fábrica', true, () => validarCriacao({ caminho: `${conta}/ads`, campos: { adset_id: '901', status: 'ACTIVE' } }, conta, fabrica))
deve('envia imagem', true, () => validarCriacao({ caminho: `${conta}/adimages`, campos: { bytes: 'AAA' } }, conta, fabrica))
deve('cria criativo', true, () => validarCriacao({ caminho: `${conta}/adcreatives`, campos: { name: 'c' } }, conta, fabrica))
const r = validarCriacao({ caminho: `${conta}/ads`, campos: { adset_id: '901', status: 'ACTIVE' } }, conta, fabrica)
deve('status ACTIVE vira PAUSED', true, () => { if (r.campos.status !== 'PAUSED') throw new Error('status ' + r.campos.status); return r.campos.status })
deve('leitura de insights', true, () => validarLeitura(`${META_BASE}/${conta}/insights?level=ad`))
// Proibidos
deve('POST no id de campanha existente (editar/pausar)', false, () => validarCriacao({ caminho: '120249589830740044', campos: { status: 'PAUSED' } }, conta, fabrica))
deve('POST em campanha existente com caminho composto', false, () => validarCriacao({ caminho: `120249589830740044/adsets`, campos: { campaign_id: '120249589830740044', daily_budget: 100 } }, conta, fabrica))
deve('outra conta', false, () => validarCriacao({ caminho: 'act_1038820213600422/campaigns', campos: { spend_cap: 100 } }, conta, fabrica))
deve('caminho com sobra', false, () => validarCriacao({ caminho: `${conta}/ads/extra`, campos: { adset_id: '901' } }, conta, fabrica))
deve('edge não permitido (customaudiences)', false, () => validarCriacao({ caminho: `${conta}/customaudiences`, campos: {} }, conta, fabrica))
deve('conjunto em campanha existente', false, () => validarCriacao({ caminho: `${conta}/adsets`, campos: { campaign_id: '120249589830740044', daily_budget: 5000 } }, conta, fabrica))
deve('anúncio em conjunto existente (aprendizado!)', false, () => validarCriacao({ caminho: `${conta}/ads`, campos: { adset_id: '120249146853900044' } }, conta, fabrica))
deve('orçamento diário acima do teto', false, () => validarCriacao({ caminho: `${conta}/adsets`, campos: { campaign_id: '900', daily_budget: 30001 } }, conta, fabrica))
deve('orçamento vitalício', false, () => validarCriacao({ caminho: `${conta}/adsets`, campos: { campaign_id: '900', daily_budget: 5000, lifetime_budget: 1 } }, conta, fabrica))
deve('campanha com orçamento próprio', false, () => validarCriacao({ caminho: `${conta}/campaigns`, campos: { spend_cap: 1000, daily_budget: 5000 } }, conta, fabrica))
deve('campanha sem limite de gasto', false, () => validarCriacao({ caminho: `${conta}/campaigns`, campos: { name: 'x' } }, conta, fabrica))
deve('campo method=delete na criação', false, () => validarCriacao({ caminho: `${conta}/ads`, campos: { adset_id: '901', METHOD: 'delete' } }, conta, fabrica))
deve('cópia de anúncio existente', false, () => validarCriacao({ caminho: `${conta}/ads`, campos: { adset_id: '901', source_ad_id: '1' } }, conta, fabrica))
deve('leitura com method=post', false, () => validarLeitura(`${META_BASE}/120249589830740044?method=post&status=PAUSED`))
deve('leitura com batch', false, () => validarLeitura(`${META_BASE}/?batch=[]`))
deve('leitura fora do Graph', false, () => validarLeitura(`https://evil.example.com/${conta}`))
deve('leitura em outra versão', false, () => validarLeitura(`https://graph.facebook.com/v18.0/${conta}`))
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTodas as travas se comportaram como esperado.')
if (falhas) process.exit(1)
