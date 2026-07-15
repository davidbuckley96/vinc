-- Vinc — aba de mensagens (inbox) + push de mensagem (docs/14 · F-02/F-03, D-070).

-- 1) Novo tipo de notificação para o push de mensagem. Estas notificações NÃO
--    aparecem na central (a API filtra) — existem só pra alimentar o push.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'new_candidate', 'chosen', 'not_chosen',
  'service_started', 'service_completed', 'payment_released',
  'dispute_opened', 'dispute_resolved',
  'cancelled_by_poster', 'cancelled_by_worker', 'gig_expired',
  'job_match', 'new_message'
));

-- 2) View das conversas do usuário logado (inbox). Regra de visibilidade (D-070):
--    serviços ativos + em disputa sempre; concluídos só por 1 mês (âncora no
--    escrow_release). Chat só existe após a escolha (worker_id not null).
drop view if exists public.conversations;
create view public.conversations
with (security_invoker = on) as
select
  g.id as gig_id,
  g.title,
  g.status,
  g.starts_at,
  case when g.poster_id = (select auth.uid()) then 'poster' else 'worker' end as my_role,
  cp.id as counterpart_id,
  cp.name as counterpart_name,
  cp.avatar_url as counterpart_avatar,
  lm.body as last_message,
  lm.created_at as last_message_at,
  lm.sender_id as last_sender_id,
  coalesce(un.n, 0) as unread_count
from public.gigs g
join public.profiles cp
  on cp.id = case when g.poster_id = (select auth.uid()) then g.worker_id else g.poster_id end
left join lateral (
  select m.body, m.created_at, m.sender_id
  from public.gig_messages m
  where m.gig_id = g.id
  order by m.created_at desc
  limit 1
) lm on true
left join lateral (
  select count(*) as n
  from public.gig_messages m
  where m.gig_id = g.id
    and m.sender_id <> (select auth.uid())
    and m.created_at > coalesce(
      (select r.last_read_at from public.gig_message_reads r
        where r.gig_id = g.id and r.user_id = (select auth.uid())),
      'epoch'::timestamptz)
) un on true
where g.worker_id is not null
  and ((select auth.uid()) = g.poster_id or (select auth.uid()) = g.worker_id)
  and (
    g.status in ('accepted', 'in_progress', 'awaiting_confirmation', 'disputed')
    or (
      g.status = 'completed'
      and (
        select max(l.created_at) from public.ledger_entries l
        where l.gig_id = g.id and l.type = 'escrow_release'
      ) > now() - interval '30 days'
    )
  );

-- 3) Trigger: ao inserir uma mensagem, cria uma notificação pro DESTINATÁRIO
--    (dispara o push via dispatch_push). Anti-spam: só cria se o destinatário
--    já leu a conversa desde o último aviso — mensagens seguidas não empilham.
--    Guardado (begin/exception) pra nunca derrubar o envio da mensagem.
create or replace function public.notify_message()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  recipient uuid;
  last_read timestamptz;
begin
  begin
    select case when g.poster_id = new.sender_id then g.worker_id else g.poster_id end
      into recipient
      from public.gigs g
      where g.id = new.gig_id;
    if recipient is null then return new; end if;

    select r.last_read_at into last_read
      from public.gig_message_reads r
      where r.gig_id = new.gig_id and r.user_id = recipient;

    if not exists (
      select 1 from public.notifications n
      where n.user_id = recipient
        and n.gig_id = new.gig_id
        and n.type = 'new_message'
        and n.created_at > coalesce(last_read, 'epoch'::timestamptz)
    ) then
      insert into public.notifications (user_id, gig_id, type)
      values (recipient, new.gig_id, 'new_message');
    end if;
  exception when others then
    raise warning 'notify_message falhou (gig %): %', new.gig_id, sqlerrm;
  end;
  return new;
end;
$$;

drop trigger if exists notify_message_trg on public.gig_messages;
create trigger notify_message_trg
  after insert on public.gig_messages
  for each row execute function public.notify_message();
