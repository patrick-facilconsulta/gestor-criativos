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

---

## Regras de contagem — o núcleo do produto

Estas regras são a razão de existir do app. Trate-as como invariantes: se uma mudança
de código exigir alterar uma delas, pare e pergunte.

1. A meta **mensal** é a fonte de verdade. A meta semanal é apenas indicador de ritmo.
2. Um criativo só conta para a meta quando `status` é `aprovado` ou `publicado`.
3. A data que determina em qual semana e mês o criativo é contado é `data_entrega`.
   **Nunca** `created_at`.
4. `data_entrega` é preenchida automaticamente com a data de hoje na primeira vez que
   o status muda para `aprovado`, se estiver vazia.
5. Se o status voltar para `backlog`, `producao`, `revisao` ou `reprovado`,
   `data_entrega` é limpada e o criativo deixa de contar.
6. Na transição `aprovado` → `publicado`, `data_entrega` permanece inalterada.
7. `data_entrega` é editável manualmente e a edição manual sobrepõe o automático.
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
| link_arquivo | text | nullable |
| link_briefing | text | nullable |
| data_prevista | date | nullable |
| data_entrega | date | nullable |
| observacoes | text | nullable |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

Índices em `data_entrega` e em `status`.

### RLS

Habilitado nas três tabelas. Uma única política por tabela liberando SELECT, INSERT,
UPDATE e DELETE para qualquer usuário autenticado. Os dados são compartilhados pela
equipe — não crie políticas por usuário.

---

## Telas

| Rota | Conteúdo |
|---|---|
| `/login` | e-mail e senha. Sem confirmação de e-mail. Tem recuperação de senha (link enviado por e-mail via Supabase Auth). |
| `/esqueci-senha` | formulário com e-mail; dispara o link de recuperação. Não revela se o e-mail existe na base. |
| `/redefinir-senha` | página para onde o link do e-mail redireciona; formulário de nova senha. |
| `/criativos` | tabela operacional. Página inicial após login. |
| `/dashboard` | contadores e farol de metas. |
| `/configuracoes` | edição de metas e de frentes. |

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
- Modal de criação/edição reaproveitado. `data_entrega` editável apenas na edição.
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

### `/configuracoes`

Tabela editável com as 8 linhas de `metas` e um único botão Salvar. Abaixo, seção de
frentes: renomear, ativar/desativar e adicionar. Ao adicionar uma frente, criar
automaticamente suas duas linhas de meta zeradas.

Frentes com `ativa = false` desaparecem do dashboard e dos dropdowns de novo criativo,
mas seus criativos históricos continuam existindo e visíveis em `/criativos`.

---

## Fora de escopo — não implementar sem pedido

Kanban com arrastar e soltar. Upload de arquivos (só links). Histórico de mudanças de
status. Gráficos de biblioteca (recharts etc. — barras em CSS bastam). Papéis e
permissões. Integração com a API do Meta Ads. Notificações e e-mails. Comentários e
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