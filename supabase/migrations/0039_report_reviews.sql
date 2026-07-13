-- Denúncia de avaliações injustas/ofensivas (D-052, pedido do David):
-- estende a tabela genérica `reports` para aceitar o alvo 'review'.
-- O alvo aponta para reviews.id. As policies existentes (o denunciante só
-- cria as próprias; admin lê) continuam valendo sem alteração.
alter table public.reports drop constraint reports_target_type_check;

alter table public.reports
  add constraint reports_target_type_check
  check (target_type in ('gig', 'message', 'profile', 'review'));
