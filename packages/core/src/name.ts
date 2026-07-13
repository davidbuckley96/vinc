/**
 * Display names across the app use only the FIRST name (D-051): "David"
 * applying to "Ana"'s gig, never "David Buckley" / "Ana Abuso". Sign-up asks
 * for the first name only, but existing accounts may hold a full name, so we
 * also trim to the first token at display time. Pure and idempotent —
 * firstName("David") === "David".
 */
export function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0]!;
}
