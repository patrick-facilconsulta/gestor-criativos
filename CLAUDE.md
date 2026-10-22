# Gestor de Criativos — Fácil Consulta

Aplicação interna de Growth para registrar criativos de anúncio produzidos e medir,
em tempo real, a aderência da equipe às metas mensal e semanal de entrega.

Usuários: 5 a 10 pessoas do time interno de Growth/Criação, todas com o mesmo nível
de acesso. Não há hierarquia de permissões.

**Importante sobre o dono deste projeto:** conhecimento técnico iniciante, aprendendo
VS Code e Git agora. Portanto:

- Explique suas decisões em português simples, sem jargão desnecessário.
- Faça uma tarefa por vez. Nunca mude muitos arquivos de uma só vez.
- Avise antes de mudanças estruturais e espere confirmação.
- Nunca instale dependência nova sem justificar em uma frase.
- Ao terminar uma tarefa, diga qual comando rodar para testar o resultado.
- Quando algo der errado, diga o que fazer, não só o que aconteceu.
- Se um pedido for ambíguo, pergunte antes de escolher por conta própria.

---

## Stack — não desviar

Este projeto precisa permanecer compatível com o agente da Lovable. Isso impõe o stack
abaixo. Não substitua nenhum item sem pedido explícito.

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- react-router-dom para roteamento (NÃO Next.js, NÃO App Router)
- Supabase para banco de dados e autenticação
- TanStack Query para dados do servidor
- npm como gerenciador de pacotes
- Migrations SQL versionadas em `supabase/migrations/`

Proibido: monorepo, config custom de webpack/bundler, SSR, outro framework de CSS,
outra biblioteca de componentes.

---

## Idioma

Interface, nomes de tabelas, colunas, enums e mensagens de erro em **português do Brasil**.
Nomes de componentes, hooks e variáveis em inglês, seguindo o padrão do React.
Comentários de código em português.

---

## Domínio

### Frentes (linhas de produto — 4 fixas, editáveis em runtime)

1. Consultas Particulares
2. Plataforma
3. Google
4. Tempo Livre

### Formatos (2 fixos)

`video` e `estatico`

### Metas por frente (iguais para as 4)

| Formato | Semanal | Mensal |
|---|---|---|
| vídeo | 2 | 8 |
| estático | 3 | 12 |

Total da empresa: 32 vídeos/mês e 48 estáticos/mês.

As metas vivem na tabela `metas` e são editáveis pela interface. **Nunca escreva valores
de meta fixos no código** — sempre leia da tabela, inclusive os totais.

### Funil de status

`backlog` → `producao` → `revisao` → `aprovado` → `publicado`

Mais um estado terminal separado: `reprovado`

### Etapa de produção do vídeo

O status `producao` é um bloco só e esconde o meio do processo. A coluna `etapa`
detalha o que acontece lá dentro, **sem** substituir o funil:

`a_captar` → `captado` → `em_edicao` → `editado`

- Vale só para `formato = 'video'`. Em estático a `etapa` é sempre nula.
- É nula também em vídeo que ainda não entrou em nenhuma pauta.
- As duas dimensões são independentes: um vídeo em `producao`/`em_edicao` é legível
  nas duas. Nada em `etapa` interfere nas regras de contagem de meta.
- Um vídeo é considerado **captado** quando a etapa é `captado`, `em_edicao` ou
  `editado` (constante `ETAPAS_JA_CAPTADAS`).

---

## Regras de contagem — o núcleo do produto

Estas regras são a razão de existir do app. Trate-as como invariantes: se uma mudança
de código exigir alterar uma delas, pare e pergunte.

1. A meta **mensal** é a fonte de verdade. A meta semanal é apenas indicador de ritmo.
2. Um criativo só conta para a meta quando `status` é `aprovado` ou `publicado`.
3. A data que determina em qual semana e mês o criativo é contado é `data_entrega`.
   **Nunca** `created_at`.
4. `data_entrega` é preenchida automaticamente com a data de hoje ao registrar um arquivo
   ou link do Google Drive pela tela de Entregas.
5. Uma nova entrega substitui o arquivo ou link anterior e atualiza `data_entrega` para a
   data do novo envio.
6. Mudanças de status não alteram `data_entrega`.
7. `data_entrega` não é editável manualmente.
8. Semana = semana ISO, de segunda a domingo.
9. Mês = mês calendário da `data_entrega`.
10. Ritmo esperado até hoje = `meta_mensal × (dia de hoje ÷ dias no mês)`, arredondado
    para baixo. Dias corridos, não dias úteis.
11. Farol: verde se entregue ≥ ritmo esperado; âmbar se ≥ 80% do ritmo; vermelho abaixo.
    Em meses passados ou futuros, comparar direto com a meta mensal cheia.

---

## Schema

### `frentes`
| coluna | tipo | notas |
|---|---|---|
| id | uuid | PK |
| nome | text | not null |
| ordem | integer | not null |
| ativa | boolean | default true |

### `metas`
| coluna | tipo | notas |
|---|---|---|
| id | uuid | PK |
| frente_id | uuid | FK → frentes.id, not null |
| formato | text | check in ('video','estatico') |
| meta_semanal | integer | not null |
| meta_mensal | integer | not null |

Unique em `(frente_id, formato)`.

### `criativos`
| coluna | tipo | notas |
|---|---|---|
| id | uuid | PK |
| titulo | text | not null |
| frente_id | uuid | FK → frentes.id, not null |
| formato | text | check in ('video','estatico') |
| status | text | default 'backlog', check no funil acima |
| responsavel | text | nullable, texto livre — NÃO é FK para usuário |
| link_arquivo | text | nullable, URL do Google Drive quando a entrega é por link |
| arquivo_path / arquivo_nome / arquivo_tipo / arquivo_tamanho | text / bigint | nullable, arquivo enviado ao bucket privado `entregas` |
| link_inspiracao | text | nullable (antigo `link_briefing`) |
| data_prevista | date | nullable |
| data_entrega | date | nullable |
| briefing | text | nullable (antigo `observacoes`) |
| texto_principal | text | nullable, copy do anúncio no Meta |
| titulo_anuncio | text | nullable, copy do anúncio no Meta |
| descricao_anuncio | text | nullable, copy do anúncio no Meta |
| chamada_acao | text | nullable, rótulo do botão (texto livre, não é enum do Meta) |
| url_destino | text | nullable |
| etapa | text | nullable, check nas 4 etapas acima; só vídeo |
| data_captacao | date | nullable, dia em que o vídeo é gravado |
| editor | text | nullable, texto livre — NÃO é FK para usuário |
| campanha | text | nullable, nome da campanha do Meta em que foi publicado |
| data_publicacao | date | nullable, dia em que foi ao ar. Só com status `publicado`; não afeta metas |
| meta_ad_id / meta_status | text | nullable, anúncio criado pelo sistema no Meta e o status dele lá |
| motivo_reprovacao | text | nullable, o que a revisão pediu para ajustar. Gravado ao reprovar, limpo ao aprovar |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

Índices em `data_entrega`, em `status` e em `data_captacao`.

`data_captacao` é o vínculo entre o criativo e a pauta de um dia: um vídeo está na
pauta do dia X quando `data_captacao = X`. Um vídeo é gravado num dia só, então não
existe tabela de junção. **Não confundir com `data_entrega`** — as regras 3 a 7 acima
continuam valendo e só o fluxo de Entregas escreve `data_entrega`.

### `dias_producao`
| coluna | tipo | notas |
|---|---|---|
| id | uuid | PK |
| data | date | not null, unique |
| tipo | text | default 'home', check in ('presencial','home') |
| observacao | text | nullable |
| created_at | timestamptz | default now() |

Índice em `data`. **Dia sem linha nesta tabela é `home`** — só grava linha quando
alguém mexe no toggle da tela de Produção. O upsert usa `onConflict: 'data'`.

### Tabelas da Fábrica de criativos (`fabrica_*`)

Criadas em `20261012000000_cria_fabrica_criativos.sql` e preenchidas em
`20261012000100_semeia_fabrica_criativos.sql`. Tudo é editável em `/fabrica/base`.

| tabela | para quê |
|---|---|
| `fabrica_conceitos` | **ângulos** de criativo (nome, mensagem, personas, consciência, objeção, roteiro de referência, cuidados, `frente_ids`, `narrativa_ids`) |
| `fabrica_argumentos` | ganchos/argumentos/provas por conceito. `uso = 'validar'` fica guardado mas a IA não usa |
| `fabrica_narrativas` | estrutura da história (uma etapa por linha) e `frente_ids` |
| `fabrica_formatos` | `tipo` (`video`/`estatico`, mesmos valores de `criativos.formato`) e `proporcao` (`1:1`, `4:5`, `9:16`) |
| `fabrica_layouts` | `chave` aponta para um modelo em `src/components/fabrica/arte/` (`MODELOS` em `arte-criativo.tsx`); `territorio` diz a família visual |
| `fabrica_referencias` | referências da pasta do Pinterest: `pin_id`, imagem no bucket `fabrica` (`referencias-pinterest/`), `territorio` (ou `novo:<nome>`), `analise`, `status` (`nova`/`em_uso`/`descartada`) |
| `fabrica_paletas` | 4 cores `#RRGGBB`: fundo, texto, destaque, apoio |
| `fabrica_diretrizes` | regras de linguagem e compliance (`usar`, `evitar`, `proibido`) |
| `fabrica_base_conhecimento` | uma linha só com o documento completo, colado na tela (não vai para o git) |
| `fabrica_geracoes` | histórico do que foi gerado; `criativo_id` liga a variação ao criativo enviado |

Itens da base nunca são apagados: `ativo = false` tira da Fábrica sem quebrar o histórico.

### Tabelas do Meta Ads (`meta_*`)

Criadas em `20261019000000_cria_integracao_meta.sql`.

| tabela | para quê | quem grava |
|---|---|---|
| `meta_configuracao` | 1 linha: conjunto padrão do público, orçamentos, limite da campanha, evento de resultado, última sincronização | usuário (exceto `ultima_sincronizacao`) |
| `meta_lancamentos` | cada lançamento (quem, quando, orçamento, ids criados, erro) | só servidor |
| `meta_objetos` | **tudo o que o sistema criou no Meta** — é a lista branca das travas | só servidor |
| `meta_anuncios` | anúncios da conta lidos do Meta (textos, conceito inferido, origem `fabrica`/`conta`) | só servidor |
| `meta_resultados_diarios` | gasto, impressões, cliques no link, visitas à LP e cadastros por anúncio/dia | só servidor |
| `meta_prefixos_conceito` | termo no nome do anúncio → conceito (ex.: `PLATAFORMA` → Plataforma) | usuário |
| `meta_conceito_manual` | conceito escolhido à mão (olhando a imagem) para anúncio sem conceito no nome | usuário |
| `meta_leituras_visuais` | leitura visual de cada criativo por modelo de IA (questionário fechado: texto na arte, tipo de peça, pessoas…), função `ler-criativos` | só servidor |
| `meta_piloto_visual` | os 10 criativos do piloto da leitura visual (Claude × GPT, avaliado pela equipe) | migration |
| `meta_leitura_correcoes` | correções da equipe na leitura visual, campo a campo (valem por cima da leitura da IA) | usuário |

Conceito que vale para um anúncio: o do nome (ou do criativo da Fábrica); só na falta dele, o manual.
`meta_anuncios.imagem_url` é a imagem em tamanho cheio (capa, no vídeo), aberta na janela do anúncio em `/desempenho`.
`fabrica_lotes.aprendizado` guarda o resumo de desempenho que a IA recebeu em cada rodada.

### RLS

Habilitado em todas as tabelas. Uma única política por tabela liberando SELECT, INSERT,
UPDATE e DELETE para qualquer usuário autenticado. Os dados são compartilhados pela
equipe — não crie políticas por usuário.

**Exceção de propósito:** `meta_lancamentos`, `meta_objetos`, `meta_anuncios` e
`meta_resultados_diarios` são só leitura para usuários (escreve a service role nas Edge
Functions). Se `meta_objetos` aceitasse escrita do navegador, alguém poderia registrar uma
campanha existente como "da Fábrica" e burlar a trava do lançamento. Não abra essas tabelas.

---

## Telas

| Rota | Conteúdo |
|---|---|
| `/login` | e-mail e senha. Sem confirmação de e-mail. Tem recuperação de senha (link enviado por e-mail via Supabase Auth). |
| `/esqueci-senha` | formulário com e-mail; dispara o link de recuperação. Não revela se o e-mail existe na base. |
| `/redefinir-senha` | página para onde o link do e-mail redireciona; formulário de nova senha. |
| `/criativos` | tabela operacional. Página inicial após login. |
| `/fabrica` | Fábrica de criativos: gera variações (arte + textos) com IA a partir da base de conhecimento de vendas. |
| `/fabrica/base` | cadastro da base da fábrica: conceitos, argumentos, narrativas, formatos, layouts, paletas, regras e documento. |
| `/desempenho` | resultados dos anúncios do Meta (só leitura): período, conceito, origem, testes da Fábrica. |
| `/producao` | cronograma de captação do mês e esteira de edição. |
| `/entregas` | envio de arquivo ou link do Google Drive vinculado ao criativo planejado. |
| `/dashboard` | contadores e farol de metas. |
| `/configuracoes` | edição de metas, frentes e limites do Meta Ads. |

### `/login`, `/esqueci-senha`, `/redefinir-senha`

Recuperação de senha via `supabase.auth.resetPasswordForEmail`, com `redirectTo` apontando
para `/redefinir-senha`. Essa página chama `supabase.auth.updateUser({ password })`. Requer
que a URL de redirecionamento esteja cadastrada em Authentication → URL Configuration no
painel do Supabase (uma por ambiente: local, e depois produção).

### `/criativos`

Tabela: Título | Frente | Formato | Status | Responsável | Prevista | Entrega | Links | Ações

- Status é dropdown editável na própria linha, salvando na hora, sem confirmação.
- Links: dois ícones (arquivo e briefing), abrem em nova aba, desabilitados quando vazios.
- Ordenação padrão por `data_prevista` crescente, nulos no fim. 50 linhas por página.
- Filtros combináveis: busca por título, frente (multi), formato, status (multi, com
  `reprovado` desmarcado por padrão), e período por `data_entrega` com atalhos
  "Semana atual", "Mês atual", "Mês anterior", "Tudo". Padrão: Mês atual.
- Modal de criação/edição reaproveitado somente para dados de planejamento. Arquivo e
   `data_entrega` pertencem exclusivamente ao fluxo de Entregas.
- Ação "Criar em lote": frente, formato, responsável, quantidade (1 a 20) e prefixo de
  título gerando N criativos em `backlog` com sufixo numérico.

### `/dashboard`

Seletor de mês no topo; toda a página respeita a seleção. Todos os cálculos no frontend,
a partir de um único SELECT dos criativos do mês. Não criar views nem funções RPC.

1. **Total da empresa** — dois cards grandes (Vídeos, Estáticos): entregue em destaque,
   meta total somada da tabela `metas`, percentual, barra de progresso com cor do farol,
   e "Ritmo esperado até hoje: X".
2. **Por frente** — grade de 4 cards na ordem do campo `ordem`, duas linhas cada
   (vídeo e estático) com entregue/meta, barra e farol.
3. **Ritmo semanal** — tabela compacta, uma linha por frente, colunas de vídeo e
   estático da semana ISO corrente, células coloridas pelo farol contra a meta semanal.
   Só aparece quando o mês selecionado é o mês corrente.
4. **Em andamento** — barra horizontal com a contagem atual em `backlog`, `producao` e
   `revisao`, sem filtro de mês. Números clicáveis, levando a `/criativos` com o filtro
   de status já aplicado.

### `/producao`

O meio do processo, entre o briefing e a entrega. Seletor de mês no topo, igual ao
dashboard; funciona para qualquer mês, sem nada cravado no código.

1. **Faixa de indicadores** — meta de vídeos, captados, faltam captar, estáticos
   entregues, dias presenciais e ritmo necessário por dia presencial.
2. **Progresso** — duas barras. Vídeo conta por `etapa` captada; estático conta por
   `data_entrega`, exatamente como no dashboard.
3. **Alertas** — gerados do estado real: semana com meta e sem dia presencial, ritmo
   acima de ~3 vídeos por dia presencial, vídeos da meta sem dia definido, e vídeo
   pendurado em dia de home office.
4. **Cronograma** — semanas ISO do mês, cada dia útil com toggle Presencial / Home.
   A meta de vídeos da semana se redistribui **só entre os dias presenciais**; a de
   estáticos se divide entre todos os dias úteis, porque não depende do local.
   Botão de sugestão preenche N presenciais por semana, só nas semanas ainda vazias
   e só em dias futuros — nunca sobrescreve escolha manual.
5. **Pauta do dia** — modal que lista os vídeos daquele dia e permite puxar vídeos
   do briefing que ainda não têm data. Marcar "captado" é o que move o contador.
6. **Esteira de edição** — três colunas (Captados, Em edição, Editados) com botão de
   avançar. Sem arrastar e soltar.

Regras de cálculo do mês vivem em `src/lib/cronograma-utils.ts` (calendário puro) e
`src/lib/producao-utils.ts` (cruzamento com o banco, alertas e sugestão). A meta vem
sempre da tabela `metas` — nunca escrever 32/48 no código.

Feriados não são tratados: marque o dia como Home na mão.

### `/configuracoes`

Tabela editável com as 8 linhas de `metas` e um único botão Salvar. Abaixo, seção de
frentes: renomear, ativar/desativar e adicionar. Ao adicionar uma frente, criar
automaticamente suas duas linhas de meta zeradas.

Frentes com `ativa = false` desaparecem do dashboard e dos dropdowns de novo criativo,
mas seus criativos históricos continuam existindo e visíveis em `/criativos`.

### `/entregas`

Lista criativos em `backlog`, `producao`, `revisao` e `reprovado`, sem limite de paginação.
O envio de arquivo vai para o bucket privado `entregas` e registra seus metadados. A entrega
por link salva a URL do Google Drive em `link_arquivo`, sem enviar o arquivo ao Supabase e
sem limite de tamanho de upload no app. Ambas registram a data do envio e mudam o status
para `revisao`. Uma nova entrega substitui a anterior; se havia arquivo no bucket, ele é
removido. Revisão, aprovação e publicação exigem um arquivo ou link associado.

Na seção "Em revisão", cada entrega pode ser aprovada ou reprovada. Reprovar pede o que precisa
ajustar (`motivo_reprovacao`), muda o status para `reprovado` e devolve o criativo aos pendentes
como "Ajustar", com o pedido à vista. A nova entrega leva de volta para `revisao` (o pedido anterior
continua visível para quem revisa) e aprovar limpa o motivo. Não muda `data_entrega` nem as metas.

Na seção "Entregas aprovadas" (aprovados e publicados do mês da `data_entrega`), cada item
pode ser marcado como publicado: status vai para `publicado` e grava `campanha` (opcional) e
`data_publicacao`. Dá para editar ou desmarcar (volta a `aprovado` e limpa os dois campos).
Filtro: Todas / A publicar / Publicadas. Nada disso muda `data_entrega` nem a contagem de metas.

Estáticos aprovados ainda não lançados têm caixa de seleção: até 6 viram um teste no Meta pelo
botão "Lançar no Meta" (ver "Meta Ads — regras"). A sincronização marca o criativo como
`publicado` (com campanha e data) quando o anúncio tem a primeira impressão.

---

## Marca (Manual de Marca Fácil Consulta, no Notion)

Fonte: https://typical-notebook-dc3.notion.site/2b4f91d63d03473f9d4d7767413a2c75 (resumo para a IA
em `fabrica_base_conhecimento.manual_marca`).
- **Propósito:** transformar a experiência das pessoas no acesso à saúde. **Visão:** ser a maior e
  melhor plataforma de saúde do Brasil. **Valores:** sonho grande, humanização, inovação, mentalidade de dono.
- **Personalidade/tom:** confiáveis (claros, diretos, positivos), facilitadores (educativos, gentis e
  cuidadosos), dinâmicos e conectados; comunicação assertiva e não violenta. Visual: seriedade com
  calma e leveza; inclusivo e com representação diversa.
- **Tipografia:** títulos em Poppins (Semibold no manual; Bold nos H1/H2 do Guia de estilo Nacional,
  que é o mais recente e vale para criativos); Poppins Light para apoio de campanhas; Inter para
  texto corrido digital; Bitter Light só em material impresso.
- **Cores:** azul primário/CTA #2985F0, secundário #004CA8, navy do hero #0A2C53 → #061C36, fundos
  claros #E1EFFF/#EAF1FB, sucesso #28A745, aviso #FFC107, erro #DC3545.
- **Logo:** nunca reconstruir; usar só os arquivos originais (`docs/*.svg`).
- **Nome:** "Fácil consulta", com "c" minúsculo (decisão do Patrick, igual ao logotipo).

## Fábrica de criativos — regras

- **Nomes na interface:** a tabela `frentes` aparece na tela como **"Conceito"** (no
  sistema todo), e `fabrica_conceitos` aparece como **"Ângulo"**. Tabelas, colunas e
  variáveis no código mantêm os nomes antigos.
- **Cascata:** Conceito (frente) → Narrativa → Ângulo. `fabrica_narrativas.frente_ids` e
  `fabrica_conceitos.frente_ids` / `narrativa_ids` dizem onde cada item aparece; lista
  vazia = todos. A regra está em `src/lib/fabrica.ts` e copiada na função.
- **Estático = quadrado (1:1) + stories (9:16)**, a mesma arte. O criativo guarda a
  versão stories em `criativos.arquivo_stories_path` / `arquivo_stories_nome`; Entregas
  mostra e baixa as duas. Vídeo tem só a capa, na proporção do formato.
- **Marca:** escreva sempre "Fácil consulta", com "c" minúsculo.
- **Layouts por referência:** a função `analisar-referencia` (OpenAI com visão, modelo de texto
  da OpenAI escolhido na tela a partir do catálogo) recria a
  referência como template HTML (`especificacao.tipo = 'html'`, um por medida), com marcadores
  ({{GANCHO}} etc.), variáveis de cor da paleta (--cor-*) e `data-papel="logo|foto"`. O navegador
  limpa o HTML (`montarHtmlTemplate` em `src/lib/layout-referencia.ts`) antes de desenhar. Cores
  sempre da paleta da marca, nunca da referência.
- **Pontos dos conceitos** (`fabrica_pontos_conceito`): dores, desejos, benefícios e provas
  de cada conceito (frente). Os `uso = 'seguro'` entram no prompt.
- **OpenAI:** texto (Responses API, saída estruturada) em `gerar-criativos` e fotos (Image
  API) na função `gerar-foto`. Chave `OPENAI_API_KEY` só como segredo das funções. Fotos no
  bucket privado `fabrica`; o navegador baixa com `download()` e usa endereço `blob:` (funciona
  na exportação do PNG). Catálogo de modelos e preços em `fabrica_modelos_ia` (editável).
- **Modelo e custo (texto, antigo):** o modelo de IA é escolhido na tela (lista em `src/lib/fabrica.ts`
  `MODELOS_IA` e, com preços, em `MODELOS` na função). Cada rodada grava tokens e custo
  estimado (USD e BRL, cotação do dia) em `fabrica_lotes` (id = `fabrica_geracoes.lote_id`).
- **IA só pela Edge Function** `supabase/functions/gerar-criativos`. A chave
  `ANTHROPIC_API_KEY` é segredo da função (`supabase secrets set`) e nunca vai para o
  cliente nem para `.env.local`. Modelo: `claude-opus-5-5`, com saída estruturada (JSON).
- **Compliance é inegociável** (vem da base de conhecimento de vendas): nada de preço,
  promessa de resultado/faturamento, garantia, número sem fonte, depoimento inventado,
  especialidade sem RQE, nome de concorrente ou urgência falsa. As regras estão no
  prompt da função, em `fabrica_diretrizes` e na conferência de `src/lib/compliance.ts`.
- **Texto principal do anúncio** (padrão do Patrick, 22/10/2026, em `INSTRUCOES` de
  `gerar-criativos`): estrutura ABT (gancho com dor/desejo, contraste com UM benefício do Fácil
  consulta, conclusão com CTA da campanha) em 3 blocos com linha em branco, uma ideia central, 30 a
  55 palavras de referência, 1 ou 2 emojis obrigatórios (sóbrios, nunca de dinheiro), sem introdução institucional nem lista de
  funcionalidades. Título (até 40 caracteres) traz o benefício; descrição (até 30) complementa. O
  cartão da variação conta as palavras do texto principal.
- A lista de chamadas para ação existe em `src/lib/constantes.ts` (`OPCOES_CHAMADA_ACAO`)
  e copiada na função. Mudou numa, mude na outra.
- Layout e paleta trocam na tela sem chamar a IA. A arte é HTML desenhado em tamanho real
  e convertido em PNG com `html-to-image` (`src/lib/exportar-png.ts`).
- "Enviar para revisão" cria um criativo no backlog e, para estático, registra o PNG pelo
  fluxo normal de Entregas (`useRegistrarEntrega`). As regras de contagem não mudam.
- `gravações de vendedores/` e `Base de conhecimento.md` ficam fora do git (LGPD).
- **Territórios criativos** (diversificação pedida pelo gerente de contas do Meta, 21/10/2026):
  cada layout tem um território em `fabrica_layouts.territorio` (`classico`, `interface`,
  `editorial`, `pessoa`, `conversa`, `enquete`, `relogio`, `recortes`, `objeto`, `produto`,
  `referencia`; rótulos em `src/lib/territorios.ts`). `gerar-criativos` escolhe o layout de cada
  variação **antes** da IA (`distribuirLayouts`: um território por vez, sem repetir enquanto houver
  outro) e manda a orientação de texto do território (`ORIENTACAO_TERRITORIO`). Os 12 modelos dos
  territórios foram aprovados no piloto de 22/10/2026. Novo território só depois de piloto aprovado.
- **Só 1:1 e 9:16.** 4:5 é do orgânico; o foco é anúncio. Não proponha 4:5.
- **Tamanho dos textos por layout:** `src/lib/limites-texto.ts` (cópia em
  `supabase/functions/gerar-criativos/limites.ts`; mudou num, mude no outro) guarda o máximo de
  caracteres de cada campo em cada layout, medido nos textos do piloto aprovado. A IA recebe os
  limites de cada variação; o que passar volta uma vez para a IA encurtar (`encurtarTextos`). A IA
  devolve a chave do layout em cada variação (campo `layout`) e o texto é ligado ao layout por ela,
  não pela ordem (em 22/10/2026 a IA devolveu fora de ordem e textos foram parar no layout errado).
  Na tela, cada campo tem contador e o cartão avisa quando o texto não cabe no layout escolhido.
  Layout novo: medir no piloto e cadastrar o limite nos dois arquivos.
- **Foto automática:** layouts que precisam de foto (`LAYOUTS_PRECISAM_FOTO` em
  `cartao-variacao.tsx`: `foto-fundo`, `etiquetas-foto`, `post-its-foto`, `objeto-foto`) pedem a foto
  sozinhos quando a variação acaba de ser gerada (até 15 min), uma vez só, com o enquadramento do
  território (`ENQUADRAMENTOS` em `gerar-foto`). Custo de cerca de R$ 0,30 por foto.
- **Rosto nunca coberto:** `src/lib/rosto.ts` detecta o rosto no navegador (MediaPipe
  `@mediapipe/tasks-vision`, versão exata; motor wasm do jsDelivr, modelo em
  `public/mediapipe/blaze_face_short_range.tflite`). Os layouts com pessoa enquadram a foto pelo rosto
  (`enquadrarRosto`) e põem etiquetas e post-its só onde não sobrepõem o rosto (`escolherPosicoes`);
  se não couber, o item fica de fora.
- **Referências do Pinterest:** a pasta "referências de design" do Pinterest é o gerenciador. A
  equipe salva pins lá e pede ao Claude "atualiza as referências"; o roteiro está na skill local
  `atualizar-referencias-fabrica` (lê a pasta sem login, registra só os novos em
  `fabrica_referencias`). Aparecem na aba **Referências** de `/fabrica/base`. Imagens de terceiros:
  **só inspiração interna, nunca entram num anúncio.**

---

## Meta Ads — regras

**O sistema nunca edita, pausa, despublica nem exclui nada no Meta.** Só lê, e só cria
PAUSADO, dentro da campanha própria "[FÁBRICA] Testes". A equipe ativa no Gerenciador.
Isso protege as campanhas que já rodam (pausar ou mexer leva ao aprendizado).

- **Única porta:** `supabase/functions/_shared/meta.ts`. Nenhuma outra função chama
  `graph.facebook.com`. Travas: POST só em `act_<conta>/{campaigns,adsets,adimages,adcreatives,ads}`;
  status sempre `PAUSED`; conjunto só em campanha da Fábrica e anúncio só em conjunto da Fábrica
  (lista em `meta_objetos`); orçamento só no conjunto, com teto fixo (R$ 300/dia); parâmetros
  `method`/`batch` bloqueados (no Graph API eles viram escrita/exclusão).
- **Antes de publicar qualquer mudança nessas funções:** `npm run test:meta-travas` tem que
  passar inteiro.
- **Cada lançamento é um conjunto novo** (anúncio novo em conjunto existente reinicia o
  aprendizado). Público, evento e otimização são copiados por leitura de um conjunto escolhido.
- Criativos com melhorias automáticas do Advantage+ desligadas (`degrees_of_freedom_spec`),
  para o anúncio sair exatamente como aprovado. Imagem 9:16 em stories/reels e 1:1 no resto.
- Nome do anúncio: `FAB_<TERMO DO CONCEITO>_<nº>`, no padrão da conta.
- Funções: `lancar-no-meta` (listar conjuntos, simular, lançar) e `meta-sincronizar`
  (insights por anúncio/dia, 90 dias na 1ª vez e 7 depois). Segredos: `META_ACCESS_TOKEN`
  (System User do Business Manager), `META_AD_ACCOUNT_ID`, `META_PAGE_ID`,
  `META_INSTAGRAM_ID`, opcional `META_APP_SECRET`. Versão da API em `META_VERSAO`.
- **Leitura visual** (`ler-criativos`, regras em `_shared/leitura-visual.ts`): Claude Opus 5.5
  responde um questionário fechado sobre a imagem dos estáticos com volume (texto da arte, tipo de
  peça, pessoas, produto, botão, cores). Escolhido no piloto de 20/10/2026 (96% de acerto × 94% do
  GPT-6 Astra, e mais barato). Quantidade de texto é contada pelo sistema, não pela IA. **TRAVA:
  vídeo nunca recebe leitura visual** (a capa não representa o vídeo): a função recusa tudo que não
  for `meta_anuncios.tipo_midia = 'imagem'` ou `'carrossel'`, que vem do Meta na sincronização.
  Carrossel (só de imagens; com algum card em vídeo vira vídeo) é lido com todos os cards juntos
  (`meta_anuncios.cartoes`). A equipe corrige estáticos na janela do anúncio em `/desempenho`; o
  aprendizado usa a leitura corrigida.
- **Inspiração das variações:** cada variação da Fábrica grava `fabrica_geracoes.inspiracao`
  (`referencia` com o anúncio seguido e o padrão, `exploracao` ou `sem_dados`). A Fábrica mostra o
  painel "Esta rodada aprendeu com" (de `fabrica_lotes.aprendizado`) e o selo em cada variação;
  clicar abre o anúncio de referência.
- **Leitura dos números** (também no aprendizado da IA, `gerar-criativos/aprendizado.ts`):
  só campanhas `OUTCOME_LEADS`, sem formulário instantâneo; referência = gasto total ÷
  cadastros (pool); anúncio com gasto < 2× essa referência tem "pouco dado"; conversão sempre
  em cadastro/clique e cadastro/visita.

---

## Fora de escopo — não implementar sem pedido

Kanban com arrastar e soltar. Histórico de mudanças de
status. Gráficos de biblioteca (recharts etc. — barras em CSS bastam). Papéis e
permissões. Editar, pausar ou ativar no Meta pelo sistema. Notificações e e-mails. Comentários e
aprovação dentro do app. Modo escuro. Exportação PDF.

---

## Convenções de trabalho

- Toda mudança de schema entra como arquivo novo em `supabase/migrations/`, nunca
  editando uma migration já aplicada.
- Commits pequenos, em português, no imperativo: "adiciona filtro por frente".
- Rodar `npm run build` antes de considerar uma tarefa concluída.
- Não instalar dependência nova sem avisar e justificar.
- Segredos apenas em `.env.local`, que precisa estar no `.gitignore`. Somente a URL do
  Supabase e a chave anon vão para o cliente.
