-- Fábrica de criativos: a base de conteúdo que alimenta a geração de criativos
-- por IA (/fabrica) e o histórico do que já foi gerado.
--
-- A base de cada criativo é Conceito + Formato + Narrativa. O que varia são os
-- argumentos de cada conceito, o layout da arte e as cores (paleta).
-- Tudo aqui é editável pelo marketing na tela /fabrica/base. Nada é apagado de
-- verdade: itens saem de uso com ativo = false, para o histórico continuar válido.

-- Conceitos: os "ângulos" de criativo da base de conhecimento de vendas
create table fabrica_conceitos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- A mensagem central, em uma frase
  mensagem text not null,
  -- Para quem é (texto livre, ex.: "Plantonista; Convênio")
  personas text,
  consciencia text not null default 'problema'
    check (consciencia in ('problema', 'solucao', 'produto')),
  -- A objeção que o criativo antecipa
  objecao text,
  -- Roteiro de referência da base de conhecimento
  roteiro_referencia text,
  -- Cuidados de compliance específicos deste conceito
  cuidados text,
  -- Frente sugerida ao enviar para revisão (opcional)
  frente_id uuid references frentes (id) on delete set null,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

-- Argumentos de cada conceito: ganchos, argumentos e provas que a IA usa como
-- matéria-prima para escrever variações novas
create table fabrica_argumentos (
  id uuid primary key default gen_random_uuid(),
  conceito_id uuid not null references fabrica_conceitos (id) on delete cascade,
  tipo text not null default 'gancho'
    check (tipo in ('gancho', 'argumento', 'prova')),
  texto text not null,
  -- De onde veio (ex.: fala de médico na reunião, frase do vendedor)
  origem text,
  -- 'validar' = depende de validação jurídica/de dados; a IA não usa
  uso text not null default 'seguro' check (uso in ('seguro', 'validar')),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index fabrica_argumentos_conceito_idx on fabrica_argumentos (conceito_id);

-- Narrativas: a estrutura em que a história é contada
create table fabrica_narrativas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- Uma etapa por linha
  estrutura text not null,
  descricao text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

-- Formatos de peça. `tipo` usa os mesmos valores do formato de `criativos`.
create table fabrica_formatos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('video', 'estatico')),
  proporcao text not null check (proporcao in ('1:1', '4:5', '9:16')),
  descricao text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

-- Layouts da arte. A `chave` aponta para um modelo desenhado no código
-- (src/components/fabrica/arte); por isso layout novo exige programação e o
-- marketing só renomeia, descreve e ativa/desativa.
create table fabrica_layouts (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

-- Paletas de cores aplicadas sobre qualquer layout
create table fabrica_paletas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor_fundo text not null check (cor_fundo ~ '^#[0-9a-fA-F]{6}$'),
  cor_texto text not null check (cor_texto ~ '^#[0-9a-fA-F]{6}$'),
  cor_destaque text not null check (cor_destaque ~ '^#[0-9a-fA-F]{6}$'),
  cor_apoio text not null check (cor_apoio ~ '^#[0-9a-fA-F]{6}$'),
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

-- Regras de linguagem e compliance que a IA precisa seguir
create table fabrica_diretrizes (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('usar', 'evitar', 'proibido')),
  texto text not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- O documento completo da base de conhecimento (uma linha só). Fica no banco,
-- protegido por login, e não no código do site.
create table fabrica_base_conhecimento (
  id uuid primary key default gen_random_uuid(),
  conteudo text not null default '',
  updated_at timestamptz not null default now()
);

-- Histórico de tudo que a fábrica gerou
create table fabrica_geracoes (
  id uuid primary key default gen_random_uuid(),
  -- Agrupa as variações geradas no mesmo clique
  lote_id uuid not null,
  frente_id uuid references frentes (id) on delete set null,
  conceito_id uuid references fabrica_conceitos (id) on delete set null,
  narrativa_id uuid references fabrica_narrativas (id) on delete set null,
  formato_id uuid references fabrica_formatos (id) on delete set null,
  -- Layout e paleta escolhidos por último na tela (mudam sem gastar IA)
  layout_id uuid references fabrica_layouts (id) on delete set null,
  paleta_id uuid references fabrica_paletas (id) on delete set null,
  persona text,
  argumento_central text,
  -- Textos que vão dentro da arte: { gancho, apoio, destaque, cta, itens[] }
  texto_arte jsonb not null default '{}'::jsonb,
  -- Copy do anúncio, com os mesmos nomes das colunas de `criativos`
  texto_principal text,
  titulo_anuncio text,
  descricao_anuncio text,
  chamada_acao text,
  -- Só para formatos de vídeo
  roteiro text,
  alertas text[] not null default '{}',
  -- Preenchido quando a variação é enviada para revisão
  criativo_id uuid references criativos (id) on delete set null,
  criado_por text,
  created_at timestamptz not null default now()
);

create index fabrica_geracoes_created_at_idx on fabrica_geracoes (created_at desc);
create index fabrica_geracoes_conceito_idx on fabrica_geracoes (conceito_id);

-- RLS: mesma regra das outras tabelas, equipe inteira com acesso idêntico
alter table fabrica_conceitos enable row level security;
alter table fabrica_argumentos enable row level security;
alter table fabrica_narrativas enable row level security;
alter table fabrica_formatos enable row level security;
alter table fabrica_layouts enable row level security;
alter table fabrica_paletas enable row level security;
alter table fabrica_diretrizes enable row level security;
alter table fabrica_base_conhecimento enable row level security;
alter table fabrica_geracoes enable row level security;

create policy "Acesso total para usuários autenticados" on fabrica_conceitos
  for all to authenticated using (true) with check (true);

create policy "Acesso total para usuários autenticados" on fabrica_argumentos
  for all to authenticated using (true) with check (true);

create policy "Acesso total para usuários autenticados" on fabrica_narrativas
  for all to authenticated using (true) with check (true);

create policy "Acesso total para usuários autenticados" on fabrica_formatos
  for all to authenticated using (true) with check (true);

create policy "Acesso total para usuários autenticados" on fabrica_layouts
  for all to authenticated using (true) with check (true);

create policy "Acesso total para usuários autenticados" on fabrica_paletas
  for all to authenticated using (true) with check (true);

create policy "Acesso total para usuários autenticados" on fabrica_diretrizes
  for all to authenticated using (true) with check (true);

create policy "Acesso total para usuários autenticados" on fabrica_base_conhecimento
  for all to authenticated using (true) with check (true);

create policy "Acesso total para usuários autenticados" on fabrica_geracoes
  for all to authenticated using (true) with check (true);
