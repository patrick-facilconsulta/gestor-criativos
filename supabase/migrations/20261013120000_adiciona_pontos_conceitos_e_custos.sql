-- Fábrica de criativos, 13/10/2026:
-- 1. Conceito "Teleconsulta" ativo e "Tempo Livre" desativado (o Patrick já fez
--    isso na tela; aqui garantimos o mesmo estado e trocamos os vínculos dos
--    ângulos e narrativas de Tempo Livre para Teleconsulta).
-- 2. Pontos de cada conceito (dores, desejos, benefícios e provas), tirados do
--    documento "Planejamento criativos OUT-26" do marketing. A IA usa os
--    marcados como 'seguro' junto com os argumentos do ângulo.
-- 3. Registro de cada rodada de geração (fabrica_lotes): modelo de IA usado,
--    tokens e custo estimado em dólar e em reais.

-- 1. Teleconsulta -------------------------------------------------------------

-- Cria o conceito se ainda não existir, com metas zeradas (mesmo padrão da tela)
with nova as (
  insert into frentes (nome, ordem)
  select 'Teleconsulta', (select coalesce(max(ordem), 0) + 1 from frentes)
  where not exists (select 1 from frentes where nome ilike 'teleconsulta')
  returning id
)
insert into metas (frente_id, formato, meta_semanal, meta_mensal)
select id, formato, 0, 0 from nova cross join (values ('video'), ('estatico')) as f (formato);

update frentes set ativa = true where nome ilike 'teleconsulta';
update frentes set ativa = false where nome ilike 'tempo livre';

-- Onde estava Tempo Livre, passa a valer Teleconsulta (sem repetir ids)
update fabrica_conceitos
set frente_ids = array(
  select distinct case when id = (select id from frentes where nome ilike 'tempo livre' limit 1)
    then (select id from frentes where nome ilike 'teleconsulta' limit 1) else id end
  from unnest(frente_ids) as id
)
where exists (select 1 from frentes where nome ilike 'tempo livre');

update fabrica_narrativas
set frente_ids = array(
  select distinct case when id = (select id from frentes where nome ilike 'tempo livre' limit 1)
    then (select id from frentes where nome ilike 'teleconsulta' limit 1) else id end
  from unnest(frente_ids) as id
)
where exists (select 1 from frentes where nome ilike 'tempo livre');

-- 2. Pontos de cada conceito ----------------------------------------------------

create table fabrica_pontos_conceito (
  id uuid primary key default gen_random_uuid(),
  frente_id uuid not null references frentes (id) on delete cascade,
  tipo text not null check (tipo in ('dor', 'desejo', 'beneficio', 'prova')),
  texto text not null,
  -- 'validar' = depende de fonte ou validação; fica guardado, mas a IA não usa
  uso text not null default 'seguro' check (uso in ('seguro', 'validar')),
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index fabrica_pontos_conceito_frente_idx on fabrica_pontos_conceito (frente_id);

alter table fabrica_pontos_conceito enable row level security;

create policy "Acesso total para usuários autenticados" on fabrica_pontos_conceito
  for all to authenticated using (true) with check (true);

-- Do documento "Planejamento criativos OUT-26". O conceito é encontrado pelo
-- nome; se não existir, a linha é ignorada.
insert into fabrica_pontos_conceito (frente_id, tipo, texto, uso, ordem)
select f.id, p.tipo, p.texto, p.uso, p.ordem
from (values
  -- Particular
  ('%particular%', 'desejo', 'Aumentar o faturamento com consultas particulares (sem prometer valor).', 'seguro', 1),
  ('%particular%', 'desejo', 'Flexibilidade de tempo: atender no horário que escolher.', 'seguro', 2),
  ('%particular%', 'dor', 'Dependência de convênio.', 'seguro', 3),
  ('%particular%', 'dor', 'Dependência de plantões.', 'seguro', 4),
  -- Google
  ('google', 'beneficio', 'O Google é a maior vitrine do planeta: o paciente já está procurando.', 'seguro', 1),
  ('google', 'beneficio', 'No Google está o paciente qualificado, com intenção de agendar.', 'seguro', 2),
  ('google', 'beneficio', 'Conteúdo educativo: como o Google funciona para médicos.', 'seguro', 3),
  ('google', 'prova', 'Uma das maiores contas de tráfego pago do setor (volume investido).', 'validar', 4),
  ('google', 'prova', '10 anos de experiência otimizando anúncios no Google.', 'validar', 5),
  ('google', 'beneficio', 'Perfil do médico no Google (Google Business).', 'validar', 6),
  -- Plataforma
  ('plataforma', 'beneficio', 'Agendamento fácil para o paciente, 24 horas por dia.', 'seguro', 1),
  ('plataforma', 'beneficio', 'Transforma curiosos em pacientes.', 'seguro', 2),
  ('plataforma', 'beneficio', 'Recuperação ativa: a equipe vai atrás do paciente que não concluiu o agendamento.', 'seguro', 3),
  ('plataforma', 'beneficio', 'Paciente que chega não é retrabalho: é paciente.', 'seguro', 4),
  ('plataforma', 'beneficio', 'Visão estratégica com gerente de contas (ainda pouco usado nos anúncios).', 'seguro', 5),
  ('plataforma', 'beneficio', 'Base de pacientes ativos na plataforma.', 'seguro', 6),
  ('plataforma', 'beneficio', 'Pagamento facilitado dentro da plataforma: o médico só atende.', 'seguro', 7),
  -- Teleconsulta
  ('teleconsulta', 'beneficio', 'A busca por teleconsulta está crescendo e ganha espaço nos agendamentos do mercado.', 'validar', 1),
  ('teleconsulta', 'beneficio', 'Teleconsulta funciona também em especialidades não óbvias (sem citar especialidade).', 'seguro', 2),
  ('teleconsulta', 'beneficio', 'Demanda no país inteiro, não só na sua cidade.', 'seguro', 3),
  ('teleconsulta', 'desejo', 'Flexibilidade de horário e de lugar.', 'seguro', 4),
  ('teleconsulta', 'beneficio', 'Custo menor e baixa barreira de entrada: não precisa de consultório.', 'seguro', 5)
) as p (padrao_nome, tipo, texto, uso, ordem)
join frentes f on f.nome ilike p.padrao_nome;

-- 3. Rodadas de geração (modelo, tokens e custo) ---------------------------------

create table fabrica_lotes (
  -- Mesmo id gravado em fabrica_geracoes.lote_id
  id uuid primary key,
  modelo text not null,
  quantidade integer not null,
  tokens_entrada integer not null default 0,
  tokens_cache_escrita integer not null default 0,
  tokens_cache_leitura integer not null default 0,
  tokens_saida integer not null default 0,
  custo_usd numeric(10, 4) not null default 0,
  cotacao_dolar numeric(8, 4) not null,
  custo_brl numeric(10, 4) not null default 0,
  criado_por text,
  created_at timestamptz not null default now()
);

create index fabrica_lotes_created_at_idx on fabrica_lotes (created_at desc);

alter table fabrica_lotes enable row level security;

create policy "Acesso total para usuários autenticados" on fabrica_lotes
  for all to authenticated using (true) with check (true);
