# Fábrica de criativos

A página **Fábrica** (`/fabrica`) gera criativos novos sempre que o gestor de tráfego precisar.

- **O que vai em cada criativo:** Conceito + Formato + Narrativa.
- **O que varia de uma versão para outra:** o argumento (a IA escreve), o layout e as cores. Layout e cores trocam na hora, sem gastar IA.
- **De onde vem o conteúdo:** da base de conhecimento das reuniões de vendas e das regras de compliance que o marketing definiu.

Cada variação traz:
- a arte pronta em PNG (1080×1080, 1080×1350 ou 1080×1920);
- os textos do anúncio no Meta (texto principal, título, descrição e chamada para ação), com botão de copiar;
- para Reels, o roteiro e uma capa;
- alertas de compliance, quando houver algo a conferir.

Na própria variação dá para:
- baixar o PNG;
- copiar todos os textos de uma vez;
- **enviar para revisão**: o criativo entra em Entregas › Em revisão já com a imagem e os textos, e segue o fluxo normal de aprovação.

A base (conceitos, argumentos, narrativas, formatos, layouts, paletas, regras e o documento completo) é editada em `/fabrica/base`.

## Como colocar no ar (uma vez só)

### 1. Banco de dados

No painel do Supabase, abra **SQL Editor** e rode estes dois arquivos, nesta ordem:

1. `supabase/migrations/20261012000000_cria_fabrica_criativos.sql`, que cria as tabelas;
2. `supabase/migrations/20261012000100_semeia_fabrica_criativos.sql`, que preenche a base inicial: 8 conceitos, 56 argumentos, 5 narrativas, 4 formatos, 6 layouts, 5 paletas e 26 regras.

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
