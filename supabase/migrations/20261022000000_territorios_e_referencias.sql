-- 22/10/2026. Diversificação criativa (pedido do gerente de contas do Meta).
--
-- 1. Territórios criativos: cada layout pertence a um território (uma família
--    visual bem diferente das outras). A Fábrica distribui as variações de uma
--    rodada entre territórios diferentes, em vez de sortear qualquer layout.
--    Os 12 layouts novos foram aprovados no piloto dos territórios.
-- 2. Referências do Pinterest: a pasta "referências de design" é o gerenciador
--    de referências. Quando a equipe pede, o Claude lê os pins novos, analisa e
--    registra aqui (imagem no bucket `fabrica`, pasta referencias-pinterest/).
--    São só inspiração interna: nunca entram num anúncio.

-- Territórios ------------------------------------------------------------------
alter table fabrica_layouts
  add column territorio text;

update fabrica_layouts set territorio = 'classico'
  where chave in ('manchete', 'pergunta', 'notificacao', 'comparativo', 'etapas', 'busca-google', 'foto-fundo');
update fabrica_layouts set territorio = 'referencia'
  where especificacao is not null;

insert into fabrica_layouts (chave, nome, descricao, ordem, territorio) values
  ('notificacao-bloqueio', 'Notificação na tela bloqueada', 'Celular inclinado com avisos de consulta agendada, confirmada e lembrete.', 9, 'interface'),
  ('nota-celular', 'Nota do celular', 'App de Notas com o título grifado e uma lista de tarefas (itens).', 10, 'interface'),
  ('marca-texto', 'Marca-texto', 'Frase grande com o trecho em destaque grifado, papel com textura.', 11, 'editorial'),
  ('texto-selecionado', 'Texto selecionado', 'Trecho em destaque selecionado como no celular e círculo feito à mão.', 12, 'editorial'),
  ('etiquetas-foto', 'Etiquetas sobre a foto', 'Foto do médico com etiquetas dos recursos (itens), fora do rosto.', 13, 'pessoa'),
  ('post-its-foto', 'Post-its sobre a foto', 'Faixa de papel com a pergunta e post-its com as dores (itens), fora do rosto.', 14, 'pessoa'),
  ('conversa', 'Conversa no celular', 'Paciente pede horário tarde da noite e recebe o link de agendamento.', 15, 'conversa'),
  ('enquete', 'Enquete de stories', 'Pergunta de sim/não num adesivo de enquete, sem votos.', 16, 'enquete'),
  ('relogio', 'Relógio', 'Relógio marcando tarde da noite e aviso de nova consulta agendada.', 17, 'relogio'),
  ('recortes', 'Recortes de papel', 'Cada palavra do título num recorte de papel; destaque em papel colorido.', 18, 'recortes'),
  ('objeto-foto', 'Objeto e frase', 'Foto de um objeto (sem pessoa) com frase curta no espaço livre.', 19, 'objeto'),
  ('produto-real', 'Tela do produto', 'Celular com o perfil e a agenda, e adesivos com os recursos (itens).', 20, 'produto')
on conflict (chave) do nothing;

-- Referências do Pinterest -------------------------------------------------------
create table fabrica_referencias (
  id uuid primary key default gen_random_uuid(),
  -- Identificador do pin no Pinterest (para saber o que já foi registrado)
  pin_id text not null unique,
  imagem_path text,
  descricao_pin text,
  -- Território em que a referência se encaixa (ou sugestão de território novo)
  territorio text,
  -- O que vale aproveitar da referência, escrito na análise
  analise text,
  status text not null default 'nova' check (status in ('nova', 'em_uso', 'descartada')),
  observacao text,
  adicionada_em timestamptz not null default now()
);

alter table fabrica_referencias enable row level security;

create policy "Acesso total para usuários autenticados"
  on fabrica_referencias for all to authenticated using (true) with check (true);
