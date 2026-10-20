-- 21/10/2026.
-- 1. Cada variação da Fábrica registra de onde veio: o anúncio de resultado que
--    ela seguiu (tipo 'referencia', com o padrão aproveitado), um caminho novo
--    ('exploracao') ou rodada sem dados de desempenho ('sem_dados').
--    Formato: { tipo, ad_id, nome, padrao }.
-- 2. Carrossel ganha tipo próprio e leitura visual de todos os cards juntos
--    (cada card é uma imagem estática). Vídeo continua travado: carrossel com
--    algum card em vídeo é tratado como vídeo.
--    meta_anuncios.cartoes: [{ imagem_url, titulo, descricao }] na ordem dos cards.

alter table fabrica_geracoes
  add column inspiracao jsonb;

alter table meta_anuncios drop constraint if exists meta_anuncios_tipo_midia_check;
alter table meta_anuncios
  add constraint meta_anuncios_tipo_midia_check check (tipo_midia in ('imagem', 'video', 'carrossel', 'outro'));

alter table meta_anuncios
  add column cartoes jsonb;
