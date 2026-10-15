-- Publicação nas campanhas, 15/10/2026: em Entregas, o criativo aprovado pode ser
-- marcado como publicado (status 'publicado', que já existia no funil), com o nome
-- da campanha do Meta e o dia em que entrou no ar. Não mexe em `data_entrega`:
-- a contagem de metas continua igual (aprovado e publicado contam).
alter table criativos
  add column campanha text,
  add column data_publicacao date;
