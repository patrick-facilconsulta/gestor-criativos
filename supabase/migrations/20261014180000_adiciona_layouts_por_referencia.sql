-- Fábrica de criativos, 14/10/2026: layouts criados a partir de imagens de
-- referência. A IA analisa a referência e devolve uma especificação (estrutura,
-- alinhamento, estilo do fundo, elementos) que um modelo genérico desenha no
-- quadrado e no stories. Assim o marketing cria layouts sem programação.

alter table fabrica_layouts
  -- Especificação do layout por referência; nula nos layouts desenhados em código
  add column especificacao jsonb,
  -- Imagens de referência enviadas (bucket `fabrica`, pasta referencias/)
  add column referencia_paths text[] not null default '{}';

-- A análise da referência também tem custo de IA e entra no histórico de custos
alter table fabrica_lotes drop constraint if exists fabrica_lotes_tipo_check;
alter table fabrica_lotes
  add constraint fabrica_lotes_tipo_check check (tipo in ('texto', 'foto', 'layout'));
