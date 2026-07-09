/**
 * Announcement text moderation (D-040): with free posting, the defense
 * against external-classified spam is refusing CONTACT INFO in the ad —
 * contact happens inside the app, after the (paid) choice. Pure and
 * self-contained (Deno-safe).
 */

// 8+ digits in a row allowing common separators — BR phones with or
// without DDD/9, e.g. "99999-0000", "(81) 9 9999 0000", "081999990000".
const PHONE_PATTERN = /(?:\(?\d{2,3}\)?[\s.-]?)?\d{4,5}[\s.-]?\d{4}(?!\d)/;
const EMAIL_PATTERN = /\S+@\S+\.\S+/;
const URL_PATTERN = /(https?:\/\/|www\.)\S+|\b\S+\.(com|com\.br|net|org|app|br|io)(\/\S*)?\b/i;
// "chama no zap 9 9999..." — keyword followed closely by digits.
const MESSENGER_PATTERN = /(whats(app)?|zap|telegram|insta(gram)?|@)\s*:?\s*\+?\d{4,}/i;

/**
 * True when the text carries a phone, e-mail, link or messenger handle.
 * Kept deliberately strict: times ("14:00"), prices ("R$ 1.500,00") and
 * house numbers don't reach 8 joined digits, so they pass.
 */
export function containsContactInfo(text: string): boolean {
  const value = text.normalize("NFKC");
  return (
    PHONE_PATTERN.test(value) ||
    EMAIL_PATTERN.test(value) ||
    URL_PATTERN.test(value) ||
    MESSENGER_PATTERN.test(value)
  );
}
