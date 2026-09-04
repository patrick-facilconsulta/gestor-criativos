-- Extensão necessária para gerar UUIDs
create extension if not exists pgcrypto;

-- Frentes: linhas de produto do time de Growth/Criação
create table frentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem integer not null,
  ativa boolean not null default true
);

-- Metas de entrega por frente e formato
create table metas (
  id uuid primary key default gen_random_uuid(),
  frente_id uuid not null references frentes (id),
  formato text not null check (formato in ('video', 'estatico')),
  meta_semanal integer not null,
  meta_mensal integer not null,
  unique (frente_id, formato)
);

-- Criativos produzidos pelo time
create table criativos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  frente_id uuid not null references frentes (id),
  formato text not null check (formato in ('video', 'estatico')),
  status text not null default 'backlog'
    check (status in ('backlog', 'producao', 'revisao', 'aprovado', 'publicado', 'reprovado')),
  responsavel text,
  link_arquivo text,
  link_briefing text,
  data_prevista date,
  data_entrega date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index criativos_data_entrega_idx on criativos (data_entrega);
create index criativos_status_idx on criativos (status);

-- RLS: equipe inteira com o mesmo nível de acesso, sem regra por usuário
alter table frentes enable row level security;
alter table metas enable row level security;
alter table criativos enable row level security;

create policy "Acesso total para usuários autenticados" on frentes
  for all to authenticated using (true) with check (true);

create policy "Acesso total para usuários autenticados" on metas
  for all to authenticated using (true) with check (true);

create policy "Acesso total para usuários autenticados" on criativos
  for all to authenticated using (true) with check (true);

-- Dados iniciais: as 4 frentes fixas e suas metas (tudo editável depois pela interface)
insert into frentes (nome, ordem) values
  ('Consultas Particulares', 1),
  ('Plataforma', 2),
  ('Google', 3),
  ('Tempo Livre', 4);

insert into metas (frente_id, formato, meta_semanal, meta_mensal)
select id, 'video', 2, 8 from frentes
union all
select id, 'estatico', 3, 12 from frentes;
