-- Meta Ads, 20/10/2026.
-- 1. Imagem em tamanho cheio do anúncio (a miniatura do Meta é pequena demais
--    para avaliar o criativo). Para vídeo, é a capa.
-- 2. Conceito escolhido à mão, olhando a imagem, para os anúncios cujo nome não
--    indica o conceito (ex.: "011 | ESTÁTICO"). Fica numa tabela própria, editável
--    pela equipe: meta_anuncios continua só leitura (é escrita pela sincronização).
--    Vale só quando o conceito não veio do nome nem do criativo da Fábrica.

alter table meta_anuncios
  add column imagem_url text;

create table meta_conceito_manual (
  ad_id text primary key,
  frente_id uuid not null references frentes (id) on delete cascade,
  definido_por text,
  updated_at timestamptz not null default now()
);

alter table meta_conceito_manual enable row level security;

create policy "Acesso total para usuários autenticados"
  on meta_conceito_manual for all to authenticated using (true) with check (true);
