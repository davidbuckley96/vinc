-- Vinc — D-044: remove o campo de gênero (revoga D-043 parcial).
-- Decisão do David: gênero pode causar desconforto e o primeiro nome já
-- sinaliza na prática; dúvidas se resolvem pelo chat após o match. A tela
-- Editar perfil (nome + bio) e a correção de segurança do grant por
-- coluna (0029) permanecem.

alter table public.profiles
  drop column if exists gender,
  drop column if exists show_gender;

-- Reaplica o grant de UPDATE por coluna sem os campos de gênero
-- (o grant da 0029 referenciava colunas que deixam de existir).
revoke update on public.profiles from authenticated;
grant update (name, avatar_url, bio) on public.profiles to authenticated;
