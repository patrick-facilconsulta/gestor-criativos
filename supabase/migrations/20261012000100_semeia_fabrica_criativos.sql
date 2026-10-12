-- Base inicial da Fábrica de criativos, tirada da "Base de conhecimento de vendas
-- para criativos — Ramiro e Pietro" (16 reuniões, set/2026). Tudo é editável
-- depois na tela /fabrica/base. O documento completo NÃO entra aqui: ele é colado
-- na própria tela e fica só no banco.

-- Conceitos: os 8 ângulos de criativo
insert into fabrica_conceitos (nome, mensagem, personas, consciencia, objecao, roteiro_referencia, cuidados, ordem) values
  (
    'Troque o plantão pelo consultório online',
    'Suas horas livres podem virar consultas particulares, sem largar o que já é certo.',
    'Plantonista querendo sair do plantão; Especialista preso a convênio',
    'problema',
    'Não tenho horário livre.',
    'Plantão paga mal? → Comecei liberando uma noite por semana para teleconsulta → tela da notificação de consulta paga no WhatsApp → Veja se sua especialidade tem demanda.',
    'Não prometer renda nem comparar valores de plantão com faturamento.',
    1
  ),
  (
    'Paciente pronto: pago, confirmado, só mandar o link',
    'Você não negocia preço, não cobra e não responde curioso: o paciente chega pronto.',
    'Todas',
    'produto',
    'Vai me dar trabalho operacional; não sei cobrar.',
    'O paciente agenda, paga e você recebe o aviso → cada etapa em uma tela (Google → perfil → pagamento → aviso no WhatsApp) → Seu WhatsApp não aparece no site → CTA.',
    'O tempo de resposta ao paciente que desistiu varia; não citar minutos exatos.',
    2
  ),
  (
    'Pacientes sem virar influenciador',
    'O paciente do Google já está te procurando; você não precisa postar, gravar nem dançar.',
    'Médico experiente avesso a exposição; Especialista com consultório subutilizado',
    'solucao',
    'Não tenho tempo nem jeito para rede social.',
    'Cansou de gente oferecendo cuidar do seu Instagram? → Quem precisa de consulta não está no Reels, está no Google → depoimento de médico sem Instagram → CTA.',
    'Tom leve, sem ridicularizar colegas que usam Instagram.',
    3
  ),
  (
    'Comece pequeno: uma noite ou um sábado',
    'Um piloto de particular online sem largar o concurso; a agenda abre e fecha quando você quiser.',
    'Médica do SUS ou da residência sobrecarregada',
    'problema',
    'Não estou pronta; não posso me comprometer.',
    'Você nunca vai estar pronta → rotina na UBS → à noite, consulta online de casa → Comece com um sábado → CTA.',
    'Não sugerir largar o vínculo público.',
    4
  ),
  (
    'Pesquise seu nome no Google',
    'Quando o paciente busca seu nome, ele encontra só o Instagram ou um botão para agendar?',
    'Especialista com consultório subutilizado',
    'solucao',
    'Já tenho presença online.',
    'Faça esse teste agora → busca de um nome → resultado sem agenda vs. perfil com avaliações e botão de agendar → CTA.',
    'Depende de validar o termo exato do recurso do Google ("Agendar online", "parceiro oficial"). Usar nome fictício.',
    5
  ),
  (
    'A gente só ganha quando você atende',
    'A Fácil Consulta ganha com a taxa por consulta realizada; se não entregar, perde junto.',
    'Todas, sobretudo plantonistas e médicas do SUS',
    'produto',
    'Vou pagar e não vai dar retorno.',
    'Comparação entre fazer sozinho (agência, tráfego, secretária) e o modelo da Fácil Consulta.',
    'Não pode omitir a assinatura: "só paga quando atende" sozinho seria enganoso.',
    6
  ),
  (
    'Plantão cortado, renda cortada',
    'Depender de plantão é depender de alguém cortar sua escala; o particular online é uma renda sua.',
    'Plantonista; Médica do SUS',
    'problema',
    'Particular é incerto; plantão é garantido.',
    'Esse é o último mês que eu faço os extras noturnos → Imagina se a sua renda dependesse só da sua agenda → fluxo do paciente → CTA.',
    'Não prometer renda garantida.',
    7
  ),
  (
    'Colega da sua especialidade',
    'Um médico da mesma área mostra como começou e quantas horas liberou.',
    'Especialista com consultório subutilizado; Especialista preso a convênio',
    'produto',
    'Funciona para a minha área?',
    'Eu também achava que [objeção] → o que mudou → rotina atual → CTA.',
    'Só com depoimento real e autorizado. Nunca inventar depoimento nem número; usar "resultado individual". Não citar especialidade para quem não tem RQE.',
    8
  );

-- Argumentos de cada conceito (ganchos, argumentos e provas)
insert into fabrica_argumentos (conceito_id, tipo, texto, origem, uso)
select c.id, a.tipo, a.texto, a.origem, a.uso
from (values
  -- 1. Troque o plantão
  ('Troque o plantão pelo consultório online', 'gancho', 'Plantão paga mal? Comece sua agenda particular por teleconsulta.', '"Esses plantão pagam muito mal" (R-LUI)', 'seguro'),
  ('Troque o plantão pelo consultório online', 'gancho', 'Troque uma tarde de plantão por consultas particulares.', 'Plantão de R$ 700 por tarde (R-FER1)', 'seguro'),
  ('Troque o plantão pelo consultório online', 'gancho', 'Você perde uma semana por mês sem plantão? Atenda online nela.', '"Eu perco essa semana do mês" (P-JOA)', 'seguro'),
  ('Troque o plantão pelo consultório online', 'gancho', 'Unimed tem horário daqui a dois meses. Particular, para amanhã.', 'Fala do vendedor aceita pela médica (P-JEA)', 'seguro'),
  ('Troque o plantão pelo consultório online', 'gancho', 'Agenda cheia de convênio e a conta ainda não fecha?', '"A minha agenda de Unimed é completa" (P-JEA)', 'seguro'),
  ('Troque o plantão pelo consultório online', 'argumento', 'Comece com uma noite por semana, sem largar o que já é certo.', '"Eu nunca recomendo que o profissional largue coisas que já estão certas… das 7 às 9 da noite" (P-EDU)', 'seguro'),
  ('Troque o plantão pelo consultório online', 'argumento', 'Teleconsulta de casa, à noite ou no sábado, no horário que você escolher.', 'Desejo citado em 5 de 16 reuniões', 'seguro'),
  ('Troque o plantão pelo consultório online', 'argumento', 'O paciente que pesquisa no Google já sabe que precisa consultar e quer marcar logo.', 'Usado nas 16 reuniões', 'seguro'),
  -- 2. Paciente pronto
  ('Paciente pronto: pago, confirmado, só mandar o link', 'gancho', 'O paciente agenda, paga e você recebe o aviso no WhatsApp.', 'Fluxo descrito em R-FER2 e P-NAL', 'seguro'),
  ('Paciente pronto: pago, confirmado, só mandar o link', 'gancho', 'Consulta já paga e confirmada. Você só manda o link.', '"Só mandar o link no horário" (P-NAL)', 'seguro'),
  ('Paciente pronto: pago, confirmado, só mandar o link', 'gancho', 'Quem responde primeiro leva o paciente. A gente responde por você.', 'Janela de 2 a 3 minutos (P-NAL); tempo exato não validado', 'validar'),
  ('Paciente pronto: pago, confirmado, só mandar o link', 'argumento', 'Teleconsulta paga no agendamento: sem inadimplência e sem precisar cobrar.', 'Usado em 12 de 16 reuniões', 'seguro'),
  ('Paciente pronto: pago, confirmado, só mandar o link', 'argumento', 'Você recebe a notificação da consulta confirmada no WhatsApp; o paciente não tem o seu número.', 'Usado em 8 de 16 reuniões', 'seguro'),
  ('Paciente pronto: pago, confirmado, só mandar o link', 'argumento', 'O paciente pode parcelar a consulta e você recebe o valor integral.', 'Usado em 8 de 16 reuniões ("+40% de agendamentos" sem fonte: não citar)', 'seguro'),
  ('Paciente pronto: pago, confirmado, só mandar o link', 'argumento', 'O paciente que desistiu de agendar é recuperado pela equipe.', 'Usado em 6 de 16 reuniões; não citar minutos', 'seguro'),
  ('Paciente pronto: pago, confirmado, só mandar o link', 'argumento', 'Você não negocia preço, não cobra e não responde curioso.', 'Benefício mais elogiado (P-NAL, P-JOA, R-FER2)', 'seguro'),
  -- 3. Sem influenciador
  ('Pacientes sem virar influenciador', 'gancho', 'Pacientes particulares pelo Google. Sem dancinha no Instagram.', '"Fazendo dancinha" (R-NAT)', 'seguro'),
  ('Pacientes sem virar influenciador', 'gancho', 'Pacientes particulares sem gravar vídeo nem postar nada.', '"Gravando vídeo… aí eu já venho logo na minha ferida" (P-FAB)', 'seguro'),
  ('Pacientes sem virar influenciador', 'gancho', 'O paciente procura você no Google. Você não precisa aparecer.', 'Frase do Pietro (P-FAB)', 'seguro'),
  ('Pacientes sem virar influenciador', 'gancho', 'Cansou de gente oferecendo cuidar do seu Instagram?', '"Gente me oferecendo pra fazer meu Instagram, isso tem três vezes por dia" (R-NAT)', 'seguro'),
  ('Pacientes sem virar influenciador', 'argumento', 'Não precisa fazer conteúdo, postar nem botar a cara na câmera.', 'P-FAB', 'seguro'),
  ('Pacientes sem virar influenciador', 'argumento', 'Quem precisa de consulta não está no Reels, está no Google.', 'R-FER1', 'seguro'),
  ('Pacientes sem virar influenciador', 'argumento', 'A Fácil Consulta faz o anúncio no Google com verba própria; você não paga anúncio.', 'Usado nas 16 reuniões', 'seguro'),
  ('Pacientes sem virar influenciador', 'prova', 'Oftalmologista sem Instagram com mais de mil avaliações.', 'Case citado em P-FAB; precisa de autorização', 'validar'),
  -- 4. Comece pequeno
  ('Comece pequeno: uma noite ou um sábado', 'gancho', '60 horas por semana e nenhum tempo para quem você ama?', '"Eu estou trabalhando 60 horas semanais" (P-PAU)', 'seguro'),
  ('Comece pequeno: uma noite ou um sábado', 'gancho', 'Comece no particular online só aos sábados. Sem largar o concurso.', 'Piloto aos sábados (P-PAU)', 'seguro'),
  ('Comece pequeno: uma noite ou um sábado', 'gancho', 'Residente: comece sua carteira particular antes de terminar a residência.', '"Eu quero já ir começando" (P-VAN)', 'seguro'),
  ('Comece pequeno: uma noite ou um sábado', 'gancho', 'Você nunca vai estar pronta. O primeiro paciente ensina mais que o curso.', '"Feito é melhor do que perfeito" (P-PAU)', 'seguro'),
  ('Comece pequeno: uma noite ou um sábado', 'gancho', 'O paciente prefere hoje às 21h a amanhã cedo. Sua agenda está aberta?', 'Dado de comportamento citado (P-VAN)', 'seguro'),
  ('Comece pequeno: uma noite ou um sábado', 'argumento', 'A agenda é viva: abre e fecha quando você quiser.', 'Frase do Pietro', 'seguro'),
  ('Comece pequeno: uma noite ou um sábado', 'argumento', 'Um gerente de contas orienta preço, horários e duração da consulta.', 'Usado nas 16 reuniões', 'seguro'),
  ('Comece pequeno: uma noite ou um sábado', 'argumento', 'É melhor ter 2 horários em 5 dias do que 10 horários num dia só. Mas não tem regra.', 'R-FER2', 'seguro'),
  ('Comece pequeno: uma noite ou um sábado', 'argumento', 'Atender online usa ferramentas que você já tem, como Google Meet e o receituário gratuito do CFM.', 'R-FER2', 'seguro'),
  -- 5. Pesquise seu nome
  ('Pesquise seu nome no Google', 'gancho', 'Pesquise seu nome no Google. Aparece um botão "Agendar"?', 'Demo ao vivo do Ramiro (R-FER1, R-JES)', 'validar'),
  ('Pesquise seu nome no Google', 'gancho', 'Tem plataforma de teleconsulta, mas não tem paciente?', '"Tenho plano de teleconsulta, mas não tem demanda" (R-LAU)', 'seguro'),
  ('Pesquise seu nome no Google', 'gancho', 'Gastou com anúncio no Google e quase nenhum paciente veio?', '"Gastei 2.000… e consegui só seis pacientes" (P-EDU)', 'seguro'),
  ('Pesquise seu nome no Google', 'gancho', 'Consultório próprio, agenda vazia. Você estudou muito para isso.', '"O consultório é meu e eu estudei muito para isso" (R-NAT)', 'seguro'),
  ('Pesquise seu nome no Google', 'argumento', 'O Google é a maior vitrine que existe: o paciente já está procurando.', 'Frase do Pietro', 'seguro'),
  ('Pesquise seu nome no Google', 'argumento', 'Você segue usando a sua agenda e a sua ferramenta de teleconsulta; a gente é só o canal.', 'R-JES', 'seguro'),
  ('Pesquise seu nome no Google', 'argumento', 'Não são coisas soltas: Google, perfil, agendamento, pagamento e confirmação, tudo amarrado.', 'Frase do Pietro (P-EDU)', 'seguro'),
  ('Pesquise seu nome no Google', 'argumento', 'Parceiro oficial do Google com botão "Agendar online".', 'Termo exato precisa de validação', 'validar'),
  -- 6. Só ganha quando atende
  ('A gente só ganha quando você atende', 'gancho', 'Seu horário livre é sua matéria-prima. A gente traz o paciente.', '"A matéria-prima que o médico pode oferecer é o horário" (P-NAL)', 'seguro'),
  ('A gente só ganha quando você atende', 'argumento', 'A Fácil Consulta lucra com uma taxa por consulta realizada: quanto mais consultas entrega, mais ganha.', 'Usado nas 16 reuniões; deixar claro que há assinatura', 'seguro'),
  ('A gente só ganha quando você atende', 'argumento', 'A Fácil Consulta faz o anúncio no Google com verba própria; você não paga anúncio.', 'Usado nas 16 reuniões', 'seguro'),
  ('A gente só ganha quando você atende', 'argumento', 'Fazer sozinho exige agência, tráfego, site com agenda e secretária: de 3 a 5 mil reais por mês.', 'Estimativa dos vendedores (P-JOA, P-FAB, P-PAU); sem fonte', 'validar'),
  ('A gente só ganha quando você atende', 'argumento', 'Um gerente de contas orienta preço, horários e duração da consulta.', 'Usado nas 16 reuniões', 'seguro'),
  -- 7. Plantão cortado
  ('Plantão cortado, renda cortada', 'gancho', 'Seus plantões extras foram cortados? Suas noites podem virar consultas online.', 'Prefeitura cortando os extras (P-NAL)', 'seguro'),
  ('Plantão cortado, renda cortada', 'gancho', 'E se você tivesse começado há seis meses?', 'Pergunta do custo de não agir (P-ROS)', 'seguro'),
  ('Plantão cortado, renda cortada', 'gancho', 'Seu horário livre é sua matéria-prima. A gente traz o paciente.', '"A matéria-prima que o médico pode oferecer é o horário" (P-NAL)', 'seguro'),
  ('Plantão cortado, renda cortada', 'argumento', 'Depender de plantão é depender de alguém cortar sua escala.', 'P-NAL', 'seguro'),
  ('Plantão cortado, renda cortada', 'argumento', 'O paciente que pesquisa no Google já sabe que precisa consultar e quer marcar logo.', 'Usado nas 16 reuniões', 'seguro'),
  -- 8. Colega da especialidade
  ('Colega da sua especialidade', 'gancho', 'Generalista também tem paciente particular online.', 'Objeção de P-JOA; usar só com depoimento de generalista', 'validar'),
  ('Colega da sua especialidade', 'argumento', 'Não é para todo médico: funciona quando a especialidade tem demanda na cidade e há horário livre.', 'Os dois vendedores admitem limites e isso gera confiança', 'seguro'),
  ('Colega da sua especialidade', 'argumento', 'O método: especialidade e cidade, agenda disponível e preço certo.', 'Usado nas 16 reuniões', 'seguro'),
  ('Colega da sua especialidade', 'prova', 'Endocrinologista com 21 consultas em uma quinzena.', 'R-JES; precisa de caso documentado e autorizado', 'validar'),
  ('Colega da sua especialidade', 'prova', 'Ginecologista com 105 consultas em seis meses.', 'P-PAU; precisa de caso documentado e autorizado', 'validar')
) as a (conceito, tipo, texto, origem, uso)
join fabrica_conceitos c on c.nome = a.conceito;

-- Narrativas
insert into fabrica_narrativas (nome, estrutura, descricao, ordem) values
  (
    'Gancho → Desenvolvimento → Prova → CTA',
    E'Gancho: a dor ou a pergunta nos primeiros 3 segundos\nDesenvolvimento: como funciona, em linguagem do médico\nProva: o mecanismo concreto (sem número inventado)\nCTA: convite para ver se a especialidade tem demanda',
    'Estrutura padrão de Reels de 20 a 30 segundos e de estáticos com título e apoio.',
    1
  ),
  (
    'Pergunta poderosa',
    E'Pergunta que o médico responde mentalmente\nPausa: reconhece a situação dele\nResposta: o caminho possível\nCTA',
    'Baseada nas perguntas dos vendedores que faziam o médico falar da própria dor.',
    2
  ),
  (
    'Contraste antes/depois',
    E'Hoje: a rotina ou a dor atual\nCom a Fácil Consulta: a mesma situação resolvida\nCTA',
    'Bom para comparar plantão × consultório online, Instagram × Google, fazer sozinho × Fácil Consulta.',
    3
  ),
  (
    'Mecanismo em etapas',
    E'Promessa do resultado (sem número)\nEtapa 1, 2, 3: o caminho do paciente até a consulta\nCTA',
    'Mostra o funil concreto: Google → perfil → pagamento → aviso no WhatsApp.',
    4
  ),
  (
    'Para quem não é',
    E'Filtro: para quem a solução NÃO serve\nPara quem serve: horário livre e especialidade com demanda\nCTA qualificado',
    'Admitir limites gera confiança e qualifica o lead (hipótese A/B nº 6).',
    5
  );

-- Formatos
insert into fabrica_formatos (nome, tipo, proporcao, descricao, ordem) values
  ('Feed quadrado', 'estatico', '1:1', 'Estático 1080×1080 para feed do Instagram e Facebook.', 1),
  ('Feed vertical', 'estatico', '4:5', 'Estático 1080×1350, ocupa mais espaço no feed.', 2),
  ('Stories', 'estatico', '9:16', 'Estático 1080×1920 para Stories e Reels.', 3),
  ('Reels (roteiro)', 'video', '9:16', 'Roteiro de 20 a 30 segundos + capa 1080×1920 para a equipe gravar.', 4);

-- Layouts (a chave aponta para o modelo em src/components/fabrica/arte)
insert into fabrica_layouts (chave, nome, descricao, ordem) values
  ('manchete', 'Manchete', 'Título grande, texto de apoio e botão de CTA.', 1),
  ('pergunta', 'Pergunta', 'Gancho em forma de pergunta gigante, com a resposta embaixo.', 2),
  ('notificacao', 'Notificação no celular', 'Celular com o aviso de consulta confirmada e paga.', 3),
  ('comparativo', 'Comparativo', 'Duas colunas: hoje × com a Fácil Consulta.', 4),
  ('etapas', 'Etapas', 'O caminho em 3 passos, com check.', 5),
  ('busca-google', 'Busca no Google', 'Resultado de busca com botão de agendar. Usar só depois de validar o termo do Google.', 6);

-- A busca no Google depende de validação do termo: começa desativada
update fabrica_layouts set ativo = false where chave = 'busca-google';

-- Paletas, a partir do Guia de estilo Nacional
insert into fabrica_paletas (nome, cor_fundo, cor_texto, cor_destaque, cor_apoio, ordem) values
  ('Noturno', '#0A2C53', '#FFFFFF', '#2985F0', '#061C36', 1),
  ('Azul Fácil', '#2985F0', '#FFFFFF', '#FFFFFF', '#004CA8', 2),
  ('Claro', '#FFFFFF', '#0A1628', '#2985F0', '#E1EFFF', 3),
  ('Verde confiança', '#F2FBF4', '#0A1628', '#28A745', '#D4F0DC', 4),
  ('Navy e amarelo', '#004CA8', '#FFFFFF', '#FFC107', '#0A2C53', 5);

-- Diretrizes de linguagem e compliance
insert into fabrica_diretrizes (tipo, texto) values
  ('usar', 'plantão, plantão extra, escala, "pagam muito mal", "rotina exaustiva"'),
  ('usar', 'particular, paciente particular, consultório, "meus pacientes"'),
  ('usar', 'teleconsulta, consulta online, atender de casa, "de qualquer lugar"'),
  ('usar', 'agenda, horário livre, turno, "liberar uma tarde", sábado, "depois das seis"'),
  ('usar', 'convênio, Unimed, "paga pouco", "agenda cheia"'),
  ('usar', 'retorno, "cobrir o valor", "vale a pena financeiramente"'),
  ('usar', 'qualidade de vida, liberdade, tempo com a família, "trabalhar menos"'),
  ('usar', '"no escuro", "não sei por onde começar", "primeiro contato"'),
  ('usar', 'Vender segurança e mecanismo, não desconto nem resultado financeiro.'),
  ('evitar', 'Jargão de marketing: lead, funil, tráfego, CPL, conversão, "escalar". Fale "paciente" e "agenda".'),
  ('evitar', '"Consulta barata" ou preço baixo como benefício.'),
  ('evitar', '"Médico velho": use "médico experiente".'),
  ('evitar', 'Nome de concorrente.'),
  ('evitar', 'Esconder a assinatura anual (ex.: "só paga quando atende" sozinho).'),
  ('proibido', 'Promessa absoluta de resultado: "impossível dar errado", "garanto resultado", "não tem como dar errado".'),
  ('proibido', 'Garantia de recuperar o investimento ou de cancelamento, enquanto não for política oficial escrita.'),
  ('proibido', 'Faturamento de clientes (R$ por mês, "10 a 40 vezes de retorno") sem caso real, documentado e autorizado.'),
  ('proibido', 'Números institucionais (pacientes por mês, quantidade de médicos, consultas, valor investido em Google, retenção) sem a versão oficial validada.'),
  ('proibido', '"Parceiro oficial do Google" sem confirmar o nome exato do programa.'),
  ('proibido', 'Percentuais sem fonte: "+40% de agendamentos", "falta praticamente zero", "95% de presença".'),
  ('proibido', 'Citar ou segmentar especialidade para médico sem RQE (ex.: "para psiquiatras" pensando em pós-graduandos).'),
  ('proibido', '"Uma consulta já paga a mensalidade".'),
  ('proibido', 'Urgência falsa: "só hoje", "mês do cliente".'),
  ('proibido', 'Preço ou parcela no criativo.'),
  ('proibido', 'Tirzepatida, emagrecimento e outros temas restritos pelo CFM e pela Meta.'),
  ('proibido', 'Depoimento, citação atribuída a médico ou número inventado.');

-- Linha única do documento da base de conhecimento (conteúdo colado na tela)
insert into fabrica_base_conhecimento (conteudo) values ('');
