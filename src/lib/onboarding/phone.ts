/** E.164: + followed by 1–15 digits; country code cannot start with 0. */
export const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export function isValidE164(value: string): boolean {
  return E164_REGEX.test(value);
}

/** Strip letters and other disallowed characters while typing. */
export function sanitizePhoneInput(raw: string): string {
  let out = "";
  let digitCount = 0;

  for (const c of raw) {
    if (c >= "0" && c <= "9") {
      if (digitCount >= 15) continue;
      out += c;
      digitCount++;
    } else if (c === "+" && out.length === 0) {
      out += c;
    } else if (
      (c === " " || c === "(" || c === ")" || c === "-") &&
      out.length > 0
    ) {
      out += c;
    }
  }

  return out;
}

/** Normalize formatted input to compact E.164 (+[1-9]…). */
export function normalizeToE164(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  const limited = digits.slice(0, 15);
  return `+${limited}`;
}

export const PHONE_INVALID_MESSAGE =
  "Enter a valid phone number including the country code, for example +1 415 555 2671.";
