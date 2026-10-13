-- Fábrica de criativos, 13/10/2026: OpenAI como segunda IA (texto e foto).
--
-- 1. fabrica_modelos_ia: catálogo de modelos de IA (Anthropic e OpenAI) com os
--    preços usados na estimativa de custo. Editável em /fabrica/base, porque os
--    modelos e preços mudam com frequência. Preços em dólar por milhão de tokens,
--    conferidos nas páginas oficiais em 13/10/2026.
-- 2. Fotos geradas pela OpenAI: caminho e descrição em fabrica_geracoes, arquivo
--    no bucket privado `fabrica`.
-- 3. fabrica_lotes passa a registrar também o custo de cada foto (tipo 'foto').
-- 4. Novo layout "Foto de fundo".

-- 1. Catálogo de modelos -----------------------------------------------------------

create table fabrica_modelos_ia (
  id uuid primary key default gen_random_uuid(),
  provedor text not null check (provedor in ('anthropic', 'openai')),
  -- Nome exato do modelo na API (ex.: claude-opus-5-5, gpt-6.1-sol)
  modelo text not null unique,
  nome text not null,
  descricao text,
  tipo text not null check (tipo in ('texto', 'imagem')),
  -- Dólares por milhão de tokens. Para imagem: entrada = texto do pedido,
  -- saída = tokens da imagem gerada.
  preco_entrada numeric(10, 4) not null default 0,
  preco_cache_leitura numeric(10, 4) not null default 0,
  preco_saida numeric(10, 4) not null default 0,
  -- Só imagem: estimativa por foto, usada quando a API não informa os tokens
  preco_por_imagem numeric(10, 4) not null default 0,
  -- Só Anthropic: refaz em outro modelo se o filtro de segurança recusar
  suporta_fallback boolean not null default false,
  -- Modelo escolhido por padrão (um por tipo)
  padrao boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

alter table fabrica_modelos_ia enable row level security;

create policy "Acesso total para usuários autenticados" on fabrica_modelos_ia
  for all to authenticated using (true) with check (true);

insert into fabrica_modelos_ia
  (provedor, modelo, nome, descricao, tipo, preco_entrada, preco_cache_leitura, preco_saida, preco_por_imagem, suporta_fallback, padrao, ordem)
values
  -- Texto: Anthropic (Claude)
  ('anthropic', 'claude-opus-5-5', 'Claude Opus 5.5', 'Padrão: ótima qualidade de texto', 'texto', 4, 0.2, 20, 0, true, true, 1),
  ('anthropic', 'claude-sonnet-5-5', 'Claude Sonnet 5.5', 'Metade do preço do Opus', 'texto', 2, 0.2, 10, 0, true, false, 2),
  ('anthropic', 'claude-haiku-5-5', 'Claude Haiku 5.5', 'O mais barato e rápido', 'texto', 0.1, 0.01, 0.5, 0, false, false, 3),
  ('anthropic', 'claude-fable-5-1', 'Claude Fable 5.1', 'O mais capaz; 2,5× o preço do Opus', 'texto', 10, 0.25, 50, 0, true, false, 4),
  -- Texto: OpenAI (GPT)
  ('openai', 'gpt-6.1-sol', 'GPT-6.1 Sol', 'Principal da OpenAI; preço parecido com o Sonnet', 'texto', 2, 0.1, 10, 0, false, false, 5),
  ('openai', 'gpt-6-astra', 'GPT-6 Astra', 'O mais capaz da OpenAI', 'texto', 10, 1, 50, 0, false, false, 6),
  ('openai', 'gpt-6-luna', 'GPT-6 Luna', 'O mais barato da OpenAI', 'texto', 0.1, 0.01, 0.5, 0, false, false, 7),
  -- Imagem: OpenAI. O preço por foto é estimativa (qualidade média, 1024×1536)
  ('openai', 'gpt-image-2.5-sunburst', 'GPT Image 2.5 Sunburst', 'Fotos: o mais recente', 'imagem', 5, 1.25, 30, 0.06, false, true, 8),
  ('openai', 'gpt-image-2', 'GPT Image 2', 'Fotos: versão anterior, mesmo preço', 'imagem', 5, 1.25, 30, 0.06, false, false, 9),
  ('openai', 'gpt-image-1-mini', 'GPT Image 1 Mini', 'Fotos: mais barato, qualidade menor', 'imagem', 2, 0.2, 8, 0.015, false, false, 10);

-- 2. Fotos -------------------------------------------------------------------------

alter table fabrica_geracoes
  -- Arquivo da foto no bucket `fabrica` (a mesma foto serve ao quadrado e ao stories)
  add column foto_path text,
  -- Descrição da cena: sugerida pela IA de texto e editável antes de gerar
  add column foto_prompt text;

insert into storage.buckets (id, name, public)
values ('fabrica', 'fabrica', false)
on conflict (id) do nothing;

create policy "Usuários autenticados leem a fábrica"
  on storage.objects for select to authenticated
  using (bucket_id = 'fabrica');

create policy "Usuários autenticados enviam à fábrica"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'fabrica');

create policy "Usuários autenticados atualizam a fábrica"
  on storage.objects for update to authenticated
  using (bucket_id = 'fabrica')
  with check (bucket_id = 'fabrica');

create policy "Usuários autenticados excluem da fábrica"
  on storage.objects for delete to authenticated
  using (bucket_id = 'fabrica');

-- 3. Custo das fotos -----------------------------------------------------------------

alter table fabrica_lotes
  add column tipo text not null default 'texto' check (tipo in ('texto', 'foto')),
  -- Só foto: a variação que recebeu a foto
  add column geracao_id uuid references fabrica_geracoes (id) on delete set null;

-- 4. Layout com foto -----------------------------------------------------------------

insert into fabrica_layouts (chave, nome, descricao, ordem) values
  ('foto-fundo', 'Foto de fundo', 'Foto ocupando a arte inteira, com o texto por cima. Gere a foto na variação.', 7)
on conflict (chave) do nothing;

-- Pessoas geradas por IA são permitidas nas fotos, com cuidado
insert into fabrica_diretrizes (tipo, texto) values
  ('proibido', 'Apresentar pessoa gerada por IA como médico real, cliente ou autor de depoimento.');
