-- Leitura visual dos criativos do Meta, 20/10/2026 (fase de piloto).
-- Uma IA com visão responde um questionário fechado sobre a imagem de cada
-- anúncio (texto na arte, tipo de peça, pessoas, quantidade de texto etc.).
-- No piloto, 10 criativos são lidos por dois modelos (Claude e GPT) e a equipe
-- avalia o que cada um acertou, para escolher o modelo e as perguntas confiáveis.
-- Leituras são gravadas só pela Edge Function `ler-criativos` (service role).

create table meta_leituras_visuais (
  id uuid primary key default gen_random_uuid(),
  ad_id text not null,
  modelo text not null,
  leitura jsonb,
  erro text,
  tokens_entrada integer not null default 0,
  tokens_saida integer not null default 0,
  custo_brl numeric(10, 4) not null default 0,
  criado_por text,
  created_at timestamptz not null default now(),
  unique (ad_id, modelo)
);

alter table meta_leituras_visuais enable row level security;

create policy "Leitura para usuários autenticados"
  on meta_leituras_visuais for select to authenticated using (true);

-- Criativos do piloto (escolhidos entre os que mais investiram, variados em
-- conceito, tipo e resultado)
create table meta_piloto_visual (
  ad_id text primary key,
  ordem integer not null
);

alter table meta_piloto_visual enable row level security;

create policy "Leitura para usuários autenticados"
  on meta_piloto_visual for select to authenticated using (true);

insert into meta_piloto_visual (ad_id, ordem) values
  ('120235774293740044', 1),   -- 011 | ESTÁTICO
  ('120249146854050044', 2),   -- PARTICULAR_AGENDA_01
  ('120248895553490044', 3),   -- GOOGLE_ESTATICO_6
  ('120247209418240044', 4),   -- 004 | VÍDEO
  ('120246509137310044', 5),   -- 006 _ Vídeo
  ('120235796665680044', 6),   -- 013 | ESTÁTICO
  ('120249098322780044', 7),   -- PLATAFORMA_CAPTACAO_1
  ('120249098283590044', 8),   -- GOOGLE_DESTAQUE_1
  ('120249590822760044', 9),   -- PARTICULAR_AGENDA_03_VIDEO_v2
  ('120249462914700044', 10);  -- [18/09] Card 01

-- Custo das leituras entra no mesmo registro de custos da Fábrica
alter table fabrica_lotes drop constraint if exists fabrica_lotes_tipo_check;
alter table fabrica_lotes
  add constraint fabrica_lotes_tipo_check check (tipo in ('texto', 'foto', 'layout', 'leitura'));
