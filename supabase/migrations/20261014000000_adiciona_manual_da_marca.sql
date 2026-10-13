-- Fábrica de criativos, 14/10/2026: manual da marca no contexto da IA.
--
-- Resumo do "Manual de Marca Fácil Consulta" (Notion), focado no que importa
-- para anúncios a médicos: quem somos, personalidade e tom de voz, o que a
-- plataforma oferece ao médico parceiro. Ficam de fora preços, valores do
-- Seguro Falta e números internos (faturamento), que não podem ir para anúncio.
-- Editável em /fabrica/base › Documento da base.

alter table fabrica_base_conhecimento
  add column manual_marca text not null default '';

update fabrica_base_conhecimento set manual_marca = $manual$
QUEM SOMOS
O Fácil consulta é uma plataforma de agendamento de consultas, presenciais e por teleconsulta, que nasceu em Pelotas (RS) em 2017. Usamos a tecnologia para conectar pacientes a profissionais da saúde, colocando o paciente como protagonista: ele pesquisa, compara e escolhe o melhor profissional para o seu momento. Com o médico, o modelo é ganha-ganha: o profissional vira parceiro e se aproxima de pacientes que precisam de um especialista e não têm plano de saúde.
- Propósito: transformar a experiência das pessoas no acesso à saúde.
- Visão: ser a maior e melhor plataforma de saúde do Brasil.
- Missão: criar soluções inovadoras para trazer autonomia e segurança no agendamento de consultas, facilitando o acesso à saúde com qualidade e preço justo.
- Valores: sonho grande, humanização, inovação e mentalidade de dono.
- Posicionamento: experiência inovadora e acessível, com foco nos pacientes. As pessoas não aceitam mais ligações, filas de espera e dependência de planos ineficazes.

PERSONALIDADE E TOM DE VOZ (vale para todo anúncio)
Somos confiáveis, facilitadores, dinâmicos e conectados.
- Confiáveis: claros e diretos (simples, sem mentir, omitir ou enrolar); positivos e amigáveis (foco na solução); informação sempre atualizada.
- Facilitadores: simplificamos a solução do problema; somos educativos (explicamos de forma clara e objetiva, dando autonomia); somos gentis e cuidadosos.
- Dinâmicos: adaptáveis; levamos cada caso para a melhor solução.
- Conectados: próximos e prontos para ajudar; acompanhamos antes e depois do agendamento; comunicação assertiva e não violenta: clara, tranquila e sem gerar conflito.
- Visual e sensação: seriedade e profissionalismo, com calma e leveza. Humanizado, acessível e inclusivo: saúde é para todos, sem exclusão e com representação diversa.

O QUE OFERECEMOS AO MÉDICO PARCEIRO (nunca citar preço, parcela ou valores)
- Perfil público na plataforma, com avaliações dos pacientes, agenda online integrada, confirmação de consultas, painel de estatísticas e teleconsulta.
- Planos com mais recursos: Seguro Falta (compensação quando o paciente falta sem avisar), fotos profissionais para o perfil, criação do perfil no Google Business, destaque nas buscas, gerente de contas dedicado e maior visibilidade no Google.
- Painel do Profissional: agenda em tempo real, bloquear e liberar horários, estatísticas de consultas, pacientes e avaliações, e avisos de mudança na agenda.
- Teleconsulta: o paciente paga pela plataforma e pode ser atendido de qualquer lugar do Brasil.
- Atendimento presencial em Pelotas, Caxias do Sul, Florianópolis, Joinville, Londrina, Maringá, Porto Alegre e Santa Maria, com mais de 120 especialidades.

PACIENTES QUE CHEGAM PELA PLATAFORMA
Pessoas sem plano de saúde que querem consultar com especialista, com autonomia, agilidade e preço acessível. Muitos também usam o Fácil consulta+, assinatura de benefícios em saúde para pacientes.
$manual$;

-- Tom de voz como regras explícitas para a IA
insert into fabrica_diretrizes (tipo, texto) values
  ('usar', 'Tom de voz da marca: claro e direto, positivo e amigável, gentil e cuidadoso. Sem enrolar e sem exagero.'),
  ('usar', 'Seja educativo: explique como funciona de forma simples, dando autonomia ao médico para decidir.'),
  ('usar', 'Representação diversa e inclusiva nas pessoas das fotos e nos exemplos: saúde é para todos.'),
  ('evitar', 'Tom agressivo, alarmista ou que gere conflito. A comunicação da marca é assertiva e não violenta.');

-- O manual confirma que criar o perfil no Google Business é um recurso real dos
-- planos para médicos: o ponto pode ser usado (o termo "parceiro oficial do
-- Google" continua proibido sem validação)
update fabrica_pontos_conceito
set uso = 'seguro', texto = 'Criação do perfil do médico no Google Business (recurso dos planos com mais benefícios).'
where texto = 'Perfil do médico no Google (Google Business).';
