-- Fábrica de criativos, 14/10/2026: cada variação registra qual ponto do
-- conceito (fabrica_pontos_conceito) ela usou como assunto. Ajuda a conferir
-- que o criativo é mesmo do conceito escolhido (ex.: Plataforma, e não Google).
alter table fabrica_geracoes
  add column ponto_conceito text;
