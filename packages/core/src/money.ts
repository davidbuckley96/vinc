/**
 * Money is always handled as integer cents (BRL) to avoid floating point
 * errors. Formatting is centralized here so the whole app renders values
 * consistently (docs/04-design.md: "dinheiro sempre claro").
 */

export function formatBRL(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
