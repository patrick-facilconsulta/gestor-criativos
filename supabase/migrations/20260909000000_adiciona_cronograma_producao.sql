-- Cronograma de captação e esteira de edição — o "meio" do processo, entre o
-- briefing (/criativos) e a entrega do material final (/entregas).

-- Dias do cronograma: marca quais dias úteis são presenciais (quando dá para
-- gravar bastidores) e quais são home office.
-- Regra: dia SEM linha nesta tabela é considerado 'home'. Só grava linha quando
-- alguém mexe no toggle da tela de Produção.
create table dias_producao (
  id uuid primary key default gen_random_uuid(),
  data date not null unique,
  tipo text not null default 'home' check (tipo in ('presencial', 'home')),
  observacao text,
  created_at timestamptz not null default now()
);

create index dias_producao_data_idx on dias_producao (data);

-- RLS: mesma regra das outras tabelas, equipe inteira com acesso idêntico
alter table dias_producao enable row level security;

create policy "Acesso total para usuários autenticados" on dias_producao
  for all to authenticated using (true) with check (true);

-- Etapa de produção do vídeo. Vive em paralelo ao funil de `status`, sem
-- substituí-lo: um vídeo em status 'producao' pode estar em qualquer uma
-- destas etapas. Fica nula para estático e para vídeo que ainda não entrou
-- em nenhuma pauta.
alter table criativos
  add column etapa text
    check (etapa in ('a_captar', 'captado', 'em_edicao', 'editado')),
  -- Dia em que o vídeo é gravado. É também o vínculo com a pauta: um vídeo
  -- está na pauta do dia X quando data_captacao = X. Não confundir com
  -- data_entrega, que continua sendo escrita apenas pelo fluxo de Entregas.
  add column data_captacao date,
  -- Quem edita. Texto livre, mesmo padrão de `responsavel` — não é FK.
  add column editor text;

create index criativos_data_captacao_idx on criativos (data_captacao);
