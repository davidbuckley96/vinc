-- Vinc — creation-time service fee (D-013, docs/02 §5.1)
-- gigs.price_cents becomes the NET amount (what the worker sees/receives);
-- fee_cents is the non-refundable platform fee paid by the poster at
-- creation. Creation moves to the create-gig Edge Function so the upfront
-- payment (fee + escrow) can't be bypassed — the client INSERT policy is
-- removed.

alter table public.gigs add column fee_cents integer not null default 0
  check (fee_cents >= 0);

drop policy "posters create their own gigs" on public.gigs;

-- Poster edits of open gigs remain client-side (unchanged); deletion and
-- refunds will come via an edge function (Fase 1, editar/excluir).
