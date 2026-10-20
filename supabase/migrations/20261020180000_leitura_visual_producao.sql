-- Leitura visual em produção, 20/10/2026 (depois do piloto: Claude Opus 5.5,
-- 96% de acerto nos estáticos).
-- 1. Tipo de mídia do anúncio, vindo do Meta na sincronização. TRAVA: vídeo
--    nunca recebe leitura visual (a capa não representa o vídeo); a função
--    ler-criativos recusa tudo que não for 'imagem'.
-- 2. Correções feitas pela equipe na leitura (olhando a imagem). A leitura da
--    IA continua só leitura para usuários; a correção fica numa tabela própria
--    e, campo a campo, vale por cima da leitura.

alter table meta_anuncios
  add column tipo_midia text check (tipo_midia in ('imagem', 'video', 'outro'));

create table meta_leitura_correcoes (
  ad_id text primary key,
  campos jsonb not null default '{}'::jsonb,
  corrigido_por text,
  updated_at timestamptz not null default now()
);

alter table meta_leitura_correcoes enable row level security;

create policy "Acesso total para usuários autenticados"
  on meta_leitura_correcoes for all to authenticated using (true) with check (true);
