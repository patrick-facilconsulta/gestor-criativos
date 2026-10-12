-- Ajustes da Fábrica de criativos pedidos pelo Patrick em 13/10/2026:
--
-- 1. Na interface, "Frente" passa a se chamar "Conceito" e os conceitos da
--    Fábrica (fabrica_conceitos) passam a se chamar "Ângulos". Os nomes das
--    tabelas e colunas NÃO mudam — só os rótulos na tela.
-- 2. As escolhas da Fábrica viram uma cascata: Conceito (frente) → Narrativa →
--    Ângulo. Cada escolha filtra a próxima. Lista vazia = serve para todos.
-- 3. Estático sai sempre em duas versões da mesma arte: quadrada (1:1) e
--    stories (9:16). O criativo guarda a segunda imagem em colunas próprias.
-- 4. "Fácil consulta" se escreve com "c" minúsculo.

-- 2. Cascata -----------------------------------------------------------------

-- Conceitos (frentes) e narrativas em que cada ângulo pode ser usado
alter table fabrica_conceitos
  add column frente_ids uuid[] not null default '{}',
  add column narrativa_ids uuid[] not null default '{}';

-- A antiga "frente sugerida" vira o primeiro item da lista
update fabrica_conceitos set frente_ids = array[frente_id] where frente_id is not null;
alter table fabrica_conceitos drop column frente_id;

-- Conceitos (frentes) em que cada narrativa pode ser usada
alter table fabrica_narrativas
  add column frente_ids uuid[] not null default '{}';

-- Ligação inicial ângulo → conceitos (frentes). É uma proposta: o marketing
-- ajusta em /fabrica/base. Se a frente tiver outro nome, a lista fica vazia
-- (= vale para todos os conceitos).
update fabrica_conceitos c
set frente_ids = coalesce(
  (select array_agg(f.id order by f.ordem) from frentes f where f.nome = any (m.frentes)),
  '{}'
)
from (values
  ('Troque o plantão pelo consultório online', array['Tempo Livre', 'Consultas Particulares']),
  ('Paciente pronto: pago, confirmado, só mandar o link', array['Plataforma']),
  ('Pacientes sem virar influenciador', array['Google']),
  ('Comece pequeno: uma noite ou um sábado', array['Tempo Livre']),
  ('Pesquise seu nome no Google', array['Google']),
  ('A gente só ganha quando você atende', array['Plataforma']),
  ('Plantão cortado, renda cortada', array['Tempo Livre', 'Consultas Particulares']),
  ('Colega da sua especialidade', array['Consultas Particulares'])
) as m (angulo, frentes)
where c.nome = m.angulo and c.frente_ids = '{}';

-- Ligação inicial ângulo → narrativas que combinam com ele (também proposta)
update fabrica_conceitos c
set narrativa_ids = coalesce(
  (select array_agg(n.id order by n.ordem) from fabrica_narrativas n where n.nome = any (m.narrativas)),
  '{}'
)
from (values
  ('Troque o plantão pelo consultório online', array['Gancho → Desenvolvimento → Prova → CTA', 'Pergunta poderosa', 'Contraste antes/depois', 'Para quem não é']),
  ('Paciente pronto: pago, confirmado, só mandar o link', array['Gancho → Desenvolvimento → Prova → CTA', 'Mecanismo em etapas']),
  ('Pacientes sem virar influenciador', array['Gancho → Desenvolvimento → Prova → CTA', 'Pergunta poderosa', 'Contraste antes/depois']),
  ('Comece pequeno: uma noite ou um sábado', array['Gancho → Desenvolvimento → Prova → CTA', 'Pergunta poderosa', 'Para quem não é']),
  ('Pesquise seu nome no Google', array['Gancho → Desenvolvimento → Prova → CTA', 'Pergunta poderosa', 'Mecanismo em etapas']),
  ('A gente só ganha quando você atende', array['Gancho → Desenvolvimento → Prova → CTA', 'Contraste antes/depois', 'Mecanismo em etapas']),
  ('Plantão cortado, renda cortada', array['Gancho → Desenvolvimento → Prova → CTA', 'Pergunta poderosa', 'Contraste antes/depois']),
  ('Colega da sua especialidade', array['Gancho → Desenvolvimento → Prova → CTA', 'Para quem não é'])
) as m (angulo, narrativas)
where c.nome = m.angulo and c.narrativa_ids = '{}';

-- 3. Estático = quadrado + stories ---------------------------------------------

-- Um formato estático só. Para estático a proporção cadastrada é ignorada:
-- a arte sai sempre em 1:1 e 9:16.
update fabrica_formatos
set nome = 'Estático (quadrado + stories)',
    descricao = 'A mesma arte em 1080×1080 (feed) e 1080×1920 (stories).'
where nome = 'Feed quadrado';

update fabrica_formatos set ativo = false where nome in ('Feed vertical', 'Stories');

-- Segunda imagem do criativo (versão stories), no mesmo bucket `entregas`
alter table criativos
  add column arquivo_stories_path text,
  add column arquivo_stories_nome text;

-- 4. "Fácil consulta" ------------------------------------------------------------

update fabrica_conceitos set
  nome = replace(nome, 'Fácil Consulta', 'Fácil consulta'),
  mensagem = replace(mensagem, 'Fácil Consulta', 'Fácil consulta'),
  personas = replace(personas, 'Fácil Consulta', 'Fácil consulta'),
  objecao = replace(objecao, 'Fácil Consulta', 'Fácil consulta'),
  roteiro_referencia = replace(roteiro_referencia, 'Fácil Consulta', 'Fácil consulta'),
  cuidados = replace(cuidados, 'Fácil Consulta', 'Fácil consulta');

update fabrica_argumentos set
  texto = replace(texto, 'Fácil Consulta', 'Fácil consulta'),
  origem = replace(origem, 'Fácil Consulta', 'Fácil consulta');

update fabrica_narrativas set
  nome = replace(nome, 'Fácil Consulta', 'Fácil consulta'),
  estrutura = replace(estrutura, 'Fácil Consulta', 'Fácil consulta'),
  descricao = replace(descricao, 'Fácil Consulta', 'Fácil consulta');

update fabrica_formatos set descricao = replace(descricao, 'Fácil Consulta', 'Fácil consulta');

update fabrica_layouts set
  nome = replace(nome, 'Fácil Consulta', 'Fácil consulta'),
  descricao = replace(descricao, 'Fácil Consulta', 'Fácil consulta');

update fabrica_diretrizes set texto = replace(texto, 'Fácil Consulta', 'Fácil consulta');

update fabrica_base_conhecimento set conteudo = replace(conteudo, 'Fácil Consulta', 'Fácil consulta');

update fabrica_geracoes set
  argumento_central = replace(argumento_central, 'Fácil Consulta', 'Fácil consulta'),
  texto_arte = replace(texto_arte::text, 'Fácil Consulta', 'Fácil consulta')::jsonb,
  texto_principal = replace(texto_principal, 'Fácil Consulta', 'Fácil consulta'),
  titulo_anuncio = replace(titulo_anuncio, 'Fácil Consulta', 'Fácil consulta'),
  descricao_anuncio = replace(descricao_anuncio, 'Fácil Consulta', 'Fácil consulta'),
  roteiro = replace(roteiro, 'Fácil Consulta', 'Fácil consulta');

insert into fabrica_diretrizes (tipo, texto) values
  ('usar', 'Escreva sempre "Fácil consulta", com "c" minúsculo em "consulta".');
