-- Vinc — moderação do perfil (D-046). O nome e a bio são texto público,
-- então passam pela Edge Function update-profile (containsContactInfo),
-- igual ao anúncio. Tira o UPDATE direto do cliente sobre name/bio; deixa
-- só avatar_url para o cliente (upload futuro). is_admin segue fechado.

revoke update on public.profiles from authenticated;
grant update (avatar_url) on public.profiles to authenticated;
