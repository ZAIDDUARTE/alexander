import type { FeeRecord } from "../types";

const POSITIVE_MONEY_REGEX = /^\d+(\.\d{1,2})?$/;

export function isPositiveMoney(value: string): boolean {
  const trimmed = value.trim();
  if (!POSITIVE_MONEY_REGEX.test(trimmed)) return false;
  return parseFloat(trimmed) > 0;
}

export function isPositivePercentage(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return false;
  return parseFloat(trimmed) > 0;
}

/** Fee card has any user-entered Q68 field (started but maybe incomplete). */
export function feeCardStarted(fee: FeeRecord): boolean {
  if (fee.name.trim()) return true;
  if (fee.amountKind) return true;
  if (fee.amountFixed.trim() || fee.amountMin.trim() || fee.amountMax.trim()) return true;
  if (fee.amountPercentage.trim()) return true;
  if (fee.applicationRule.trim()) return true;
  if (fee.quoteAuthority) return true;
  if (fee.creditTowardWork) return true;
  if (fee.waiverPolicy) return true;
  if (fee.waiverRule.trim()) return true;
  return false;
}

export function activeMeaningfulFees(fees: FeeRecord[]): FeeRecord[] {
  return fees.filter((f) => f.active && (feeCardStarted(f) || f.feeKey !== ""));
}

export type FeeFieldErrors = Partial<Record<string, string>>;

/**
 * Full Q68 fee-card validation. `requireNotice` for late-cancellation
 * enrichment from Section 4.
 */
export function validateFeeCard(
  fee: FeeRecord,
  errors: FeeFieldErrors,
  prefix: string,
  options?: { requireNotice?: boolean },
): void {
  if (!fee.name.trim()) {
    errors[`${prefix}.name`] = "Enter a fee name or type.";
  }

  if (!fee.amountKind) {
    errors[`${prefix}.amountKind`] = "Select how this fee amount is represented.";
  } else if (fee.amountKind === "fixed") {
    if (!isPositiveMoney(fee.amountFixed)) {
      errors[`${prefix}.amountFixed`] = "Enter a valid fixed amount greater than zero.";
    }
  } else if (fee.amountKind === "range") {
    if (!isPositiveMoney(fee.amountMin)) {
      errors[`${prefix}.amountMin`] = "Enter a valid minimum amount.";
    }
    if (!isPositiveMoney(fee.amountMax)) {
      errors[`${prefix}.amountMax`] = "Enter a valid maximum amount.";
    }
    if (
      isPositiveMoney(fee.amountMin) &&
      isPositiveMoney(fee.amountMax) &&
      parseFloat(fee.amountMin) > parseFloat(fee.amountMax)
    ) {
      errors[`${prefix}.amountRange`] = "Minimum must be less than or equal to maximum.";
    }
  } else if (fee.amountKind === "percentage") {
    if (!isPositivePercentage(fee.amountPercentage)) {
      errors[`${prefix}.amountPercentage`] = "Enter a valid percentage greater than zero.";
    }
  }

  if (!fee.applicationRule.trim()) {
    errors[`${prefix}.applicationRule`] = "Describe when this fee applies.";
  }

  if (!fee.quoteAuthority) {
    errors[`${prefix}.quoteAuthority`] = "Select whether Alexander may quote this fee.";
  } else if (fee.quoteAuthority === "after_confirmation" && !fee.applicationRule.trim()) {
    errors[`${prefix}.applicationRule`] =
      "Describe when this fee applies, including team confirmation requirements.";
  }

  if (!fee.creditTowardWork) {
    errors[`${prefix}.creditTowardWork`] = "Select whether this fee may be credited toward work.";
  }

  if (!fee.waiverPolicy) {
    errors[`${prefix}.waiverPolicy`] = "Select whether this fee can be waived.";
  } else if (
    (fee.waiverPolicy === "yes" || fee.waiverPolicy === "sometimes") &&
    !fee.waiverRule.trim()
  ) {
    errors[`${prefix}.waiverRule`] = "Describe when this fee may be waived.";
  }

  if (options?.requireNotice && !fee.noticeRequired.trim()) {
    errors[`${prefix}.noticeRequired`] = "Enter the notice required before cancellation.";
  }
}
