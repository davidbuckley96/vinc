-- Vinc — robustez das referências do suporte (docs/09 S4).
-- assigned_admin (ticket) e resolved_by (denúncia) apontam para um admin;
-- se essa conta for removida um dia, não deve travar a exclusão nem
-- apagar o histórico do usuário. Passam a ON DELETE SET NULL.

alter table public.support_tickets
  drop constraint support_tickets_assigned_admin_fkey,
  add constraint support_tickets_assigned_admin_fkey
    foreign key (assigned_admin) references public.profiles (id) on delete set null;

alter table public.reports
  drop constraint reports_resolved_by_fkey,
  add constraint reports_resolved_by_fkey
    foreign key (resolved_by) references public.profiles (id) on delete set null;
