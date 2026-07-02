# Supabase

Backend do Vinc (ver `docs/03-arquitetura.md`).

- `migrations/` — schema SQL versionado. Nunca alterar o schema pelo dashboard
  sem gerar a migration correspondente aqui.
- `functions/` — Edge Functions com as regras críticas (aceite atômico de vaga,
  escrow, multas, liberação de pagamento).

⚠️ O projeto Supabase (conta/organização do David) ainda não foi criado —
ver `docs/07-duvidas-abertas.md` #14. Até lá, migrations e functions são
desenvolvidas e versionadas aqui para aplicação futura.
