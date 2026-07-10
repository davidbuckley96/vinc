/**
 * Profile fields (D-043). Gender is OPTIONAL and shown only when the
 * person opts in (dúvida #20). Pure and self-contained (Deno-safe).
 */

export const GENDERS = ["female", "male", "other"] as const;
export type Gender = (typeof GENDERS)[number];

const GENDER_LABELS: Record<Gender, string> = {
  female: "Mulher",
  male: "Homem",
  other: "Outro",
};

export function genderLabel(gender: Gender | null | undefined): string | null {
  return gender ? GENDER_LABELS[gender] : null;
}
