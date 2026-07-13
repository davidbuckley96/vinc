/**
 * Announcement / profile text moderation (D-040, reforçado em D-046).
 *
 * With free posting, the defense against external-classified spam and
 * off-platform deals is refusing CONTACT INFO in user text — contact
 * happens inside the app, after the (paid) choice. This also runs on the
 * profile name/bio (D-046). Pure and self-contained (Deno-safe).
 */

// 8+ digits in a row allowing common separators — BR phones with or
// without DDD/9, e.g. "99999-0000", "(81) 9 9999 0000", "081999990000".
const PHONE_PATTERN = /(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}(?!\d)/;
// Digit-by-digit disguise: "9 9 9 9 9 0 0 0 0" (8+ digits joined only by
// spaces/punctuation, never letters — so "14:00 às 18:00" and prices pass).
const SPACED_DIGITS_PATTERN = /(?:\d[\s.,()\-–—/]*){8,}/;
const EMAIL_PATTERN = /\S+@\S+\.\S+/;
const URL_PATTERN = /(https?:\/\/|www\.)\S+|\b\S+\.(com|com\.br|net|org|app|br|io)(\/\S*)?\b/i;
// "chama no zap 9 9999..." — keyword followed closely by digits.
const MESSENGER_PATTERN = /(whats(app)?|zap|telegram|insta(gram)?|@)\s*:?\s*\+?\d{4,}/i;

// Phone spelled out in words: "nove nove nove nove oito sete seis" — a run
// of 6+ number-words joined only by spaces/punctuation (legit quantities
// like "dois quartos, três horas" have real words between them → no match).
const NUMBER_WORD = "(?:zero|um|uma|dois|duas|tres|três|quatro|cinco|seis|meia|sete|oito|nove)";
const SPELLED_PHONE_PATTERN = new RegExp(`(?:\\b${NUMBER_WORD}\\b[\\s.,-]*){6,}`, "i");

// Social handles that pull the deal off-platform, even without digits:
// "meu insta é @fulano", "telegram: fulano_123", "me acha no arroba fulano".
const SOCIAL_HANDLE_PATTERN =
  /(instagram|insta|telegram|tiktok|face(book)?|snap(chat)?|kwai)\s*:?\s*@?[a-z0-9._]{3,}/i;
const AT_HANDLE_PATTERN = /(^|[^\w@.])@[a-z0-9._]{3,}/i;
const ARROBA_PATTERN = /\barroba\b/i;

/**
 * True when the text carries a phone (typed, spaced or spelled out),
 * e-mail, link, messenger handle or social profile. Kept letter-bounded so
 * times ("14:00"), prices ("R$ 1.500,00") and house numbers pass.
 */
export function containsContactInfo(text: string): boolean {
  const value = text.normalize("NFKC");
  return (
    PHONE_PATTERN.test(value) ||
    SPACED_DIGITS_PATTERN.test(value) ||
    EMAIL_PATTERN.test(value) ||
    URL_PATTERN.test(value) ||
    MESSENGER_PATTERN.test(value) ||
    SPELLED_PHONE_PATTERN.test(value) ||
    SOCIAL_HANDLE_PATTERN.test(value) ||
    AT_HANDLE_PATTERN.test(value) ||
    ARROBA_PATTERN.test(value)
  );
}

// ---------------------------------------------------------- prohibited content
/**
 * Clearly-illegal content that a gig ad must never carry (D-046).
 * Conservative on purpose (word-boundary, unambiguous terms) to avoid
 * blocking legit ads — nuanced cases (e.g. discrimination) go to the human
 * report queue instead of an automatic block. Accent-insensitive.
 */
export type ProhibitedCategory = "drogas" | "armas" | "sexual";

const PROHIBITED: Record<ProhibitedCategory, RegExp[]> = {
  drogas: [
    /\bmaconha\b/, /\bcocaina\b/, /\bcrack\b/, /\bheroina\b/, /\blsd\b/,
    /\becstasy\b/, /\bmdma\b/, /\bmetanfetamina\b/, /\bhaxixe\b/,
    /\btraficant\w*\b/, /\btrafico de drogas\b/,
  ],
  armas: [
    /\barma de fogo\b/, /\bpistola\b/, /\brevolver\b/, /\bfuzil\b/,
    /\bmetralhadora\b/, /\bgranada\b/, /\bmunicao\b/, /\bsilenciador\b/,
  ],
  sexual: [
    /\b(garot[ao]|acompanhante) de programa\b/, /\bprostitui\w*\b/,
    /\bprograma sexual\b/, /\bservicos? sexua\w*\b/, /\bfavores sexuais\b/,
    /\bconteudo adulto\b/, /\bacompanhante sexual\b/, /\bnudes\b/,
  ],
};

/** Strips accents and lowercases so "cocaína"/"COCAINA" both match. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Returns the offending category, or null when the text is clean. */
export function prohibitedContentCategory(text: string): ProhibitedCategory | null {
  const value = fold(text);
  for (const category of Object.keys(PROHIBITED) as ProhibitedCategory[]) {
    if (PROHIBITED[category].some((pattern) => pattern.test(value))) return category;
  }
  return null;
}
