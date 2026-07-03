-- Vinc — gig edits/deletes move to Edge Functions (Fase 1, D-017)
-- The client UPDATE policy from 0001 let posters change ANY column of an
-- open gig — including price_cents/fee_cents, which are financially bound
-- to the escrow paid at creation (D-013/D-014). Editing now goes through
-- the update-gig function (validates the draft, price immutable) and
-- deletion through delete-gig (net refund, fee kept), both service-role.

drop policy "posters edit their open gigs" on public.gigs;
