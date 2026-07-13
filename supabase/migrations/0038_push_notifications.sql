-- Vinc — Notificações push (Fase 4). A central in-app (2.6) já cria uma
-- linha em `notifications` por TRIGGER nos eventos. Aqui, um trigger extra
-- em `notifications` dispara (via pg_net) a Edge Function `send-push`, que
-- entrega a notificação nos aparelhos registrados (Expo Push). A entrega
-- real exige um build EAS; a plumbing fica pronta e testável desde já.
--
-- O header x-cron-secret (CRON_SECRET) é o mesmo do run-money-jobs; o
-- literal abaixo é trocado pelo valor real no apply.

-- ---------------------------------------------------------- tokens de push
create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create index push_tokens_user on public.push_tokens (user_id);

-- O dono lê/apaga os próprios tokens; qualquer um pode RECLAMAR um token
-- (aparelho em que está logado) desde que aponte para si — necessário
-- quando outra pessoa passa a usar o mesmo aparelho.
create policy "read own push tokens"
  on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy "insert own push tokens"
  on public.push_tokens for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "claim push token"
  on public.push_tokens for update to authenticated
  using (true) with check (user_id = (select auth.uid()));
create policy "delete own push tokens"
  on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

-- ------------------------------------------------------------ trigger push
create or replace function public.dispatch_push()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  perform net.http_post(
    url := 'https://gexzpkbqodoyoxudzklb.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET-set-at-apply-time>'
    ),
    body := jsonb_build_object('notificationId', new.id)
  );
  return new;
end;
$$;

create trigger dispatch_push
  after insert on public.notifications
  for each row execute function public.dispatch_push();
