-- Vinc — Painel do Suporte (docs/09, fase S4 · D-045).
-- O painel /admin ganha, além da fila de disputas, o contexto 360° do
-- usuário. Para isso o admin precisa LER o dinheiro de qualquer usuário
-- (ledger + cobranças Pix). Todas as ESCRITAS do painel (resolver
-- denúncia, responder/resolver ticket, cancelar vaga em nome do usuário)
-- passam pela Edge Function support-panel-action com o service role — não
-- há policy de escrita direta do cliente, para tudo ficar auditável.

-- Admin lê o extrato de qualquer usuário (histórico de pagamentos 360°).
create policy "admins read all ledger"
  on public.ledger_entries for select to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin
  ));

-- Admin lê as cobranças Pix de qualquer vaga.
create policy "admins read all gig payments"
  on public.gig_payments for select to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin
  ));

-- Registro de ações do suporte no painel (auditoria de quem fez o quê).
create table public.support_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles (id),
  action text not null,
  target_type text,
  target_id uuid,
  note text,
  created_at timestamptz not null default now()
);
alter table public.support_actions enable row level security;

create policy "admins read support actions"
  on public.support_actions for select to authenticated
  using (exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin
  ));

create index support_actions_admin on public.support_actions (admin_id, created_at desc);
create index support_actions_target on public.support_actions (target_type, target_id);
