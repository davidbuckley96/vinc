-- Vinc — Suporte & moderação, fundação de dados (docs/09, fase S1).
-- Unifica denúncias, cria tickets/mensagens de suporte (base da Vi) e a
-- base de conhecimento (FAQ) que alimenta tanto os cards quanto a IA.

-- ============================================================ denúncias
-- Generaliza gig_reports (D-040) para qualquer alvo: vaga, mensagem, perfil.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('gig', 'message', 'profile')),
  target_id uuid not null,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  reason text not null check (char_length(reason) between 3 and 1000),
  status text not null default 'pending' check (status in ('pending', 'actioned', 'dismissed')),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (target_type, target_id, reporter_id)
);
alter table public.reports enable row level security;

create policy "users create their own reports"
  on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

create policy "admins read reports"
  on public.reports for select to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin
  ));

create index reports_status on public.reports (status, created_at desc);

-- Migra as denúncias de vaga já existentes e aposenta gig_reports.
insert into public.reports (target_type, target_id, reporter_id, category, reason, created_at)
  select 'gig', gig_id, reporter_id, 'conteudo', reason, created_at from public.gig_reports
  on conflict do nothing;
drop table public.gig_reports;

-- ============================================================ tickets
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  topic text,
  status text not null default 'ai' check (status in ('ai', 'waiting_support', 'resolved')),
  assigned_admin uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;

create policy "users read their own tickets"
  on public.support_tickets for select to authenticated
  using (user_id = (select auth.uid())
    or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin));

create index support_tickets_user on public.support_tickets (user_id, updated_at desc);
create index support_tickets_queue on public.support_tickets (status, updated_at desc);

-- Writes (open a ticket, append messages, escalate, resolve) go through
-- Edge Functions with the service role — no direct client write policy.

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  sender text not null check (sender in ('user', 'ai', 'agent')),
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.support_messages enable row level security;

create policy "read messages of tickets you can see"
  on public.support_messages for select to authenticated
  using (exists (
    select 1 from public.support_tickets t
    where t.id = ticket_id
      and (t.user_id = (select auth.uid())
        or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin))
  ));

create index support_messages_ticket on public.support_messages (ticket_id, created_at);

-- ============================================================ FAQ / base
create table public.faq_articles (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);
alter table public.faq_articles enable row level security;

create policy "faq is public to authenticated"
  on public.faq_articles for select to authenticated using (true);

insert into public.faq_articles (question, answer, category, sort_order) values
  ('Como funciona o pagamento de uma vaga?',
   'Publicar é grátis. Você só paga quando escolhe um candidato: nesse momento paga por Pix o valor do serviço + a taxa de 10%. O dinheiro fica guardado pelo app e é liberado ao prestador depois do serviço concluído.',
   'Pagamentos', 10),
  ('Quando recebo pelo serviço que fiz?',
   'O pagamento entra na sua carteira quando o serviço é concluído e fica 7 dias em processamento (prazo para qualquer contestação). Depois disso vira saldo disponível para sacar pela sua chave Pix.',
   'Pagamentos', 20),
  ('Como saco meu dinheiro?',
   'Na aba Carteira, toque em "Sacar via Pix". O dinheiro vai para a chave Pix que você cadastrou no perfil (Receber pagamentos). Cadastre a chave antes do primeiro saque.',
   'Pagamentos', 30),
  ('Posso cancelar uma vaga?',
   'Antes de escolher um candidato, você pode excluir a vaga sem custo (nada foi pago ainda). Depois de escolher e pagar, o cancelamento tem multa, para proteger quem já estava contando com o serviço.',
   'Vagas', 40),
  ('Como escolho um candidato?',
   'Sua vaga fica aberta juntando candidatos. Na tela do serviço você compara os candidatos (nota, serviços feitos, elogios) e toca em "Escolher". Aí você paga o Pix para confirmar.',
   'Vagas', 50),
  ('O que é o código de início?',
   'É um código de 4 dígitos que aparece para o anunciante. Quando o prestador chega, o anunciante mostra o código e o prestador digita no app para iniciar o serviço — é a prova de que o serviço começou.',
   'Serviços', 60),
  ('Algo deu errado no serviço. O que faço?',
   'Em vez de confirmar a conclusão, você pode contestar pelo próprio serviço (link "Algo deu errado?"). O pagamento fica retido e a equipe analisa o caso.',
   'Serviços', 70),
  ('Como denuncio uma vaga, conversa ou perfil?',
   'Toque no botão de denúncia disponível na vaga, na conversa ou no perfil. A equipe do Vinc analisa e toma providências. Denúncias são confidenciais.',
   'Segurança', 80);
