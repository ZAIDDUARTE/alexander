/**
 * Questionnaire-local structured money values.
 *
 * The stored string is digits with at most two decimal places and no `$`.
 * Required fee checks still use `isPositiveMoney` (greater than zero).
 * `isStructuredMoney` accepts zero so the input shape and the required-amount
 * rule stay separate.
 */

const STRUCTURED_MONEY_PATTERN = /^\d+(\.\d{1,2})?$/;

export function sanitizeMoneyInput(raw: string): string {
  const cleaned = raw.replace(/[$,\s]/g, "").replace(/-/g, "").replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  const whole = cleaned.slice(0, dot);
  const fraction = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  const normalizedWhole = whole === "" ? "0" : whole;
  return `${normalizedWhole}.${fraction}`;
}

/** Drop a trailing decimal point left while the customer is still typing. */
export function normalizeMoneyInput(raw: string): string {
  const sanitized = sanitizeMoneyInput(raw);
  return sanitized.endsWith(".") ? sanitized.slice(0, -1) : sanitized;
}

export function isStructuredMoney(value: string): boolean {
  const trimmed = value.trim();
  if (!STRUCTURED_MONEY_PATTERN.test(trimmed)) return false;
  return parseFloat(trimmed) >= 0;
}

export function isPositiveMoney(value: string): boolean {
  const trimmed = value.trim();
  if (!isStructuredMoney(trimmed)) return false;
  return parseFloat(trimmed) > 0;
}
