-- Reprovação na revisão, 22/10/2026: em Entregas, quem revisa pode reprovar uma
-- entrega dizendo o que precisa ajustar. O status vai para 'reprovado' (que já
-- existia no funil), o criativo volta para a lista de pendentes como "Ajustar" e
-- o motivo fica guardado aqui. Não mexe em `data_entrega` nem nas metas
-- (reprovado não conta).
alter table criativos
  add column motivo_reprovacao text;
