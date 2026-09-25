import type { FeeRecord, Section4Data } from "./types";

export function lateCancellationPolicyActive(section4: Section4Data): boolean {
  return (
    section4.lateCancellationFeeMode === "yes" ||
    section4.lateCancellationFeeMode === "conditional"
  );
}

export function noShowPolicyActive(section4: Section4Data): boolean {
  return section4.noShowFeeMode === "yes" || section4.noShowFeeMode === "conditional";
}

/** Fee record is bound to an active Section 4 Q54/Q55 policy. */
export function isSection4LinkedFeeProtected(
  feeId: string,
  section4: Section4Data,
): boolean {
  if (feeId === section4.lateCancellationFeeId && lateCancellationPolicyActive(section4)) {
    return true;
  }
  if (feeId === section4.noShowFeeId && noShowPolicyActive(section4)) {
    return true;
  }
  return false;
}

/**
 * Active Section 4 scheduling policies require their linked fee records.
 * Blocks Q68 “no separate fees” and destructive fee removal.
 */
export function hasActiveSection4LinkedFeePolicies(
  section4: Section4Data,
  fees: FeeRecord[],
): boolean {
  if (lateCancellationPolicyActive(section4) && section4.lateCancellationFeeId.trim()) {
    const fee = fees.find((f) => f.id === section4.lateCancellationFeeId);
    if (fee?.active) return true;
  }
  if (noShowPolicyActive(section4) && section4.noShowFeeId.trim()) {
    const fee = fees.find((f) => f.id === section4.noShowFeeId);
    if (fee?.active) return true;
  }
  return false;
}
