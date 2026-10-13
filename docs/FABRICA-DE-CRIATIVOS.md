# Fábrica de criativos

A página **Fábrica** (`/fabrica`) gera criativos novos sempre que o gestor de tráfego precisar.

- **O que vai em cada criativo:** Conceito → Narrativa → Ângulo, nessa ordem (cada escolha filtra a próxima), mais o Formato.
- **O que varia de uma versão para outra:** o argumento (a IA escreve), o layout e as cores. Layout e cores trocam na hora, sem gastar IA.
- **De onde vem o conteúdo:** da base de conhecimento das reuniões de vendas e das regras de compliance que o marketing definiu.

Cada variação traz:
- a arte pronta em PNG, para estático sempre em duas medidas da mesma arte: quadrada (1080×1080) e stories (1080×1920);
- os textos do anúncio no Meta (texto principal, título, descrição e chamada para ação), com botão de copiar;
- para Reels, o roteiro e uma capa;
- alertas de compliance, quando houver algo a conferir.

Na própria variação dá para:
- baixar o PNG;
- copiar todos os textos de uma vez;
- **enviar para revisão**: o criativo entra em Entregas › Em revisão já com as duas imagens e os textos, e segue o fluxo normal de aprovação.

Nomes: o que antes se chamava "Frente" agora se chama **Conceito** no sistema todo, e os conceitos da Fábrica se chamam **Ângulos**. A marca se escreve sempre **"Fácil consulta"**, com "c" minúsculo.

A base (conceitos, argumentos, narrativas, formatos, layouts, paletas, regras e o documento completo) é editada em `/fabrica/base`.

## Como colocar no ar (uma vez só)

### 1. Banco de dados

No painel do Supabase, abra **SQL Editor** e rode estes dois arquivos, nesta ordem:

1. `supabase/migrations/20261012000000_cria_fabrica_criativos.sql`, que cria as tabelas;
2. `supabase/migrations/20261012000100_semeia_fabrica_criativos.sql`, que preenche a base inicial: 8 ângulos, 56 argumentos, 5 narrativas, 4 formatos, 6 layouts, 5 paletas e 26 regras;
3. `supabase/migrations/20261013000000_ajusta_fabrica_cascata_e_stories.sql`, que liga ângulos e narrativas aos conceitos, deixa o estático em quadrado + stories e corrige "Fácil consulta".

### 2. Chave da IA

1. Em [console.anthropic.com](https://console.anthropic.com), crie uma chave em **API Keys** e coloque crédito na conta.
2. No painel do Supabase, abra **Edge Functions › Secrets** e adicione o segredo `ANTHROPIC_API_KEY` com essa chave.

A chave fica só no servidor e nunca vai para o navegador nem para o `.env.local`.

### 3. Função que chama a IA

Publique a função `supabase/functions/gerar-criativos`. Há dois caminhos:

- **Pelo terminal:**
  ```bash
  npx supabase login
  npx supabase link --project-ref SEU_PROJECT_REF
  npx supabase functions deploy gerar-criativos
  ```
- **Pelo painel:** em **Edge Functions › Deploy a new function › Via editor**, crie uma função com o nome `gerar-criativos` e cole o conteúdo de `index.ts`.

### 4. Documento da base

Entre em `/fabrica/base`, abra a seção **Documento da base**, cole o conteúdo da `Base de conhecimento.md` e clique em **Salvar documento**.

O arquivo `Base de conhecimento.md` e a pasta `gravações de vendedores/` ficam fora do git, porque as transcrições têm nomes reais de médicos (LGPD).

## Layouts por referência

Em `/fabrica/base` › **Layouts** › **Novo layout por referência**:
1. Envie até 3 imagens de anúncios no padrão que você quer (prints, biblioteca do Meta, peças do Canva).
2. Clique em **Analisar referência**. A IA recria a composição da referência no quadrado e no stories: posição dos blocos, mockups (celular, cartões, conversas), uso de foto e hierarquia dos textos.
3. Confira a prévia trocando as paletas da marca, dê um nome e salve.

As cores, fontes, logo e textos são sempre da Fácil consulta. A IA copia o padrão, não as cores nem o texto da referência. Se o layout usa foto, a área aparece cinza até você gerar a foto na variação, e a análise sugere qual foto combina. O layout entra no rodízio da Fábrica como os outros. Cada análise custa à parte e entra no gasto do mês.

## Manual da marca

A IA recebe, em toda geração, um resumo do Manual de Marca do Fácil consulta (Notion). O resumo traz quem somos, propósito, personalidade e tom de voz, e o que a plataforma oferece ao médico parceiro, sem preços nem números internos. O tom de voz também virou regras ("usar" e "evitar").

Nas artes, o texto de apoio usa **Poppins Light**, como o manual pede para apoio de campanhas, e os títulos seguem em **Poppins Bold**, como no Guia de estilo Nacional.

Para editar o resumo: `/fabrica/base` › **Documento da base** › **Manual da marca**.

## Pontos dos conceitos

Cada conceito tem seus pontos (dores, desejos, benefícios e provas), vindos do documento "Planejamento criativos OUT-26". Eles entram no pedido à IA sempre que o conceito é escolhido, e a lista aparece no formulário. Para editar, use `/fabrica/base` › **Pontos dos conceitos**. Os marcados como "Validar antes" (números sem fonte, como "uma das maiores contas" ou "10 anos") ficam guardados, mas a IA não os usa.

## Modelo de IA e custo de cada rodada

No formulário dá para escolher o modelo de IA, para comparar a qualidade:
- Claude Opus 5.5 (padrão);
- Claude Sonnet 5.5;
- Claude Haiku 5.5;
- Claude Fable 5.1.

Cada rodada mostra o modelo usado, os tokens (entrada, cache e saída) e o custo estimado em dólar e em reais. A cotação do dólar é a do dia (AwesomeAPI), e o gasto do mês aparece em "Gerados antes". Os preços ficam na função `gerar-criativos`; se a Anthropic mudar o preço, atualize lá.

## OpenAI: texto e foto

A OpenAI entra como segunda IA:
- **Texto:** os modelos GPT aparecem no campo "Modelo de IA", ao lado dos modelos Claude, para comparar a qualidade.
- **Foto:** cada variação tem a seção "Foto com IA (OpenAI)". A descrição da cena já vem sugerida pela IA de texto e pode ser editada. Ao clicar em **Gerar foto**, a foto aparece:
  - no layout **Foto de fundo**, com o texto por cima;
  - como foto redonda em destaque nos layouts **Manchete** e **Pergunta**.

A mesma foto serve ao quadrado e ao stories. Cada foto custa à parte, e o custo aparece na variação e no gasto do mês.

As fotos podem ter pessoas geradas por IA. Toda variação com foto mostra um alerta: a pessoa não pode ser apresentada como médico real, cliente ou autor de depoimento.

Os modelos, os preços e qual modelo é o padrão ficam em `/fabrica/base` › **Modelos de IA**. O nome do modelo precisa ser exatamente o da API.

**Configuração (uma vez só):**
1. No Supabase, em **Edge Functions › Secrets**, cadastre `OPENAI_API_KEY` com a chave criada em platform.openai.com. A conta da OpenAI precisa ter crédito.
2. Rode a migration `20261013180000_adiciona_openai_e_fotos.sql`.
3. Publique a função `gerar-foto`. A `gerar-criativos` também precisa ser publicada de novo.

## Custo

O modelo usado é o Claude Opus 5.5 (US$ 4 por milhão de tokens de entrada e US$ 20 por milhão de saída). Uma geração de 3 variações custa algo entre **US$ 0,05 e US$ 0,15**.

Quem gera várias vezes seguidas paga menos. O documento da base fica em cache por 5 minutos, e a leitura em cache custa US$ 0,20 por milhão de tokens.

## Regras de compliance

O que não pode ir para o anúncio está em três lugares:
- nas instruções da função;
- nas regras cadastradas (`/fabrica/base` › Regras);
- numa conferência automática na tela (`src/lib/compliance.ts`).

Mesmo assim, **o alerta amarelo na variação é para ser lido** antes de publicar. A IA não substitui a revisão.

O layout "Busca no Google" começa desativado. Só ative depois de validar o termo exato do recurso do Google ("Agendar online", "parceiro oficial").

## Como testar

1. Em `/fabrica`, gere 3 variações de **"Paciente pronto"** em **Feed vertical**. Os ganchos devem ser diferentes entre si, sem preço e sem promessa de resultado.
2. Gere de novo o mesmo conceito: os ganchos não devem repetir os da primeira leva.
3. Troque o layout (setas) e as cores (bolinhas) e baixe o PNG. Confira se a imagem tem 1080 px de largura, o logo e as fontes da marca.
4. Clique em **Enviar para revisão** e confira o item em Entregas › Em revisão, com a imagem e os textos ("Ver textos").
5. Em `/fabrica/base`, desative um conceito e veja que ele some do formulário. Crie uma paleta e veja que ela aparece nas bolinhas de cor.
