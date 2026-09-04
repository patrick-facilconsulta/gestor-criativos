alter table criativos
  add column if not exists texto_principal text,
  add column if not exists titulo_anuncio text,
  add column if not exists descricao_anuncio text,
  add column if not exists chamada_acao text,
  add column if not exists url_destino text;