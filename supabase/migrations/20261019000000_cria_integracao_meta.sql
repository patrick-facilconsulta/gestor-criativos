-- Integração com o Meta Ads, 19/10/2026.
--
-- 1. Lançamento: o sistema cria, SEMPRE PAUSADO, campanha/conjunto/anúncio só
--    dentro da campanha própria da Fábrica. Nunca edita, pausa nem exclui nada
--    que já existe no Meta. Tudo o que ele cria fica registrado em meta_objetos.
-- 2. Leitura: resultados diários por anúncio da conta inteira (só leitura no
--    Meta), usados na página /desempenho e como aprendizado da IA da Fábrica.
--
-- As tabelas de registro (meta_objetos, meta_lancamentos, meta_anuncios,
-- meta_resultados_diarios) são SÓ LEITURA para os usuários: quem grava é a
-- Edge Function, com a service role. Assim ninguém consegue "registrar" uma
-- campanha existente como se fosse da Fábrica e burlar a trava do lançamento.

-- Configuração (uma linha só) ------------------------------------------------
create table meta_configuracao (
  id integer primary key default 1 check (id = 1),
  -- Conjunto de onde o lançamento copia público, evento e otimização
  conjunto_publico_id text,
  orcamento_diario_padrao numeric(10, 2) not null default 50 check (orcamento_diario_padrao > 0),
  -- A função ainda aplica uma trava fixa no código (R$ 300/dia)
  orcamento_diario_maximo numeric(10, 2) not null default 150 check (orcamento_diario_maximo > 0),
  -- Limite de gasto total da campanha da Fábrica (spend_cap), aplicado ao criá-la
  teto_campanha numeric(10, 2) not null default 3000 check (teto_campanha > 0),
  -- Ação do Meta que conta como resultado (cadastro na LP)
  evento_resultado text not null default 'offsite_conversion.fb_pixel_custom.cadastro_lp_profissional',
  ultima_sincronizacao timestamptz,
  updated_at timestamptz not null default now()
);

insert into meta_configuracao (id) values (1);

alter table meta_configuracao enable row level security;

create policy "Leitura para usuários autenticados"
  on meta_configuracao for select to authenticated using (true);

create policy "Edição para usuários autenticados"
  on meta_configuracao for update to authenticated using (true) with check (true);

-- Usuário edita só os limites e o conjunto padrão; a data da sincronização é do servidor
revoke update on meta_configuracao from authenticated;
grant update (conjunto_publico_id, orcamento_diario_padrao, orcamento_diario_maximo, teto_campanha, evento_resultado, updated_at)
  on meta_configuracao to authenticated;

-- Lançamentos feitos pelo sistema ---------------------------------------------
create table meta_lancamentos (
  id uuid primary key default gen_random_uuid(),
  nome_teste text not null,
  conjunto_publico_id text not null,
  orcamento_diario numeric(10, 2) not null,
  criativo_ids uuid[] not null,
  campanha_meta_id text,
  conjunto_meta_id text,
  status text not null default 'em_andamento' check (status in ('em_andamento', 'concluido', 'erro')),
  erro text,
  criado_por text,
  created_at timestamptz not null default now()
);

-- Tudo o que o sistema criou no Meta (a "lista branca" do lançamento)
create table meta_objetos (
  id uuid primary key default gen_random_uuid(),
  meta_id text not null unique,
  tipo text not null check (tipo in ('campaign', 'adset', 'adcreative', 'ad', 'adimage')),
  pai_meta_id text,
  nome text,
  criativo_id uuid references criativos (id) on delete set null,
  lancamento_id uuid references meta_lancamentos (id) on delete set null,
  created_at timestamptz not null default now()
);

create index meta_objetos_tipo_idx on meta_objetos (tipo);

-- Anúncios da conta (lidos do Meta) -------------------------------------------
create table meta_anuncios (
  ad_id text primary key,
  nome text not null,
  conjunto_id text,
  conjunto_nome text,
  campanha_id text,
  campanha_nome text,
  objetivo text,
  status_efetivo text,
  criado_em_meta timestamptz,
  texto_principal text,
  titulo text,
  descricao text,
  url text,
  thumbnail_url text,
  -- Conceito inferido pelo nome (meta_prefixos_conceito) ou pelo criativo da Fábrica
  frente_id uuid references frentes (id) on delete set null,
  criativo_id uuid references criativos (id) on delete set null,
  origem text not null default 'conta' check (origem in ('fabrica', 'conta')),
  -- Formulário instantâneo quase não registra visita à LP: fica fora das comparações
  formulario_instantaneo boolean not null default false,
  atualizado_em timestamptz not null default now()
);

create index meta_anuncios_frente_idx on meta_anuncios (frente_id);

-- Resultado diário por anúncio
create table meta_resultados_diarios (
  ad_id text not null,
  data date not null,
  gasto numeric(12, 2) not null default 0,
  impressoes integer not null default 0,
  alcance integer not null default 0,
  cliques_link integer not null default 0,
  visitas_lp integer not null default 0,
  resultados numeric(12, 2) not null default 0,
  acoes jsonb,
  primary key (ad_id, data)
);

create index meta_resultados_diarios_data_idx on meta_resultados_diarios (data);

alter table meta_lancamentos enable row level security;
alter table meta_objetos enable row level security;
alter table meta_anuncios enable row level security;
alter table meta_resultados_diarios enable row level security;

-- Só leitura: não há política de insert/update/delete para usuários
create policy "Leitura para usuários autenticados" on meta_lancamentos for select to authenticated using (true);
create policy "Leitura para usuários autenticados" on meta_objetos for select to authenticated using (true);
create policy "Leitura para usuários autenticados" on meta_anuncios for select to authenticated using (true);
create policy "Leitura para usuários autenticados" on meta_resultados_diarios for select to authenticated using (true);

-- Termos no nome do anúncio que indicam o conceito ------------------------------
create table meta_prefixos_conceito (
  id uuid primary key default gen_random_uuid(),
  termo text not null unique,
  frente_id uuid not null references frentes (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table meta_prefixos_conceito enable row level security;

create policy "Acesso total para usuários autenticados"
  on meta_prefixos_conceito for all to authenticated using (true) with check (true);

-- Padrão de nomes da conta [PARCEIROS]: PLATAFORMA_…, GOOGLE_…, PARTICULAR_AGENDA_…
insert into meta_prefixos_conceito (termo, frente_id)
select termo, f.id
from (values
  ('PARTICULAR', 'consultas particulares'),
  ('PLATAFORMA', 'plataforma'),
  ('GOOGLE', 'google'),
  ('TELECONSULTA', 'teleconsulta'),
  ('TEMPO LIVRE', 'tempo livre'),
  ('TEMPO_LIVRE', 'tempo livre')
) as t (termo, nome)
join frentes f on lower(f.nome) = t.nome;

-- Criativo lançado pelo sistema ------------------------------------------------
alter table criativos
  add column meta_ad_id text,
  add column meta_status text;

-- Aprendizado de desempenho usado em cada rodada da Fábrica
alter table fabrica_lotes
  add column aprendizado jsonb;
