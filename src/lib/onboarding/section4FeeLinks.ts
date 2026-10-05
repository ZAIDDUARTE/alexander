import type { AdditionalFeeSelection, FeeRecord, Section4Data } from "./types";

export function lateCancellationPolicyActive(section4: Section4Data): boolean {
  return (
    section4.lateCancellationFeeMode === "yes" ||
    section4.lateCancellationFeeMode === "conditional"
  );
}

export function noShowPolicyActive(section4: Section4Data): boolean {
  return section4.noShowFeeMode === "yes" || section4.noShowFeeMode === "conditional";
}

/**
 * Q45 late-cancellation ↔ Q56 Cancellation fee, and Q46 no-show ↔ Q56 No-show fee.
 * Surfaces conflicts on Section 5; does not rewrite either answer.
 */
export function section4AdditionalFeeConsistencyError(
  section4: Section4Data,
  selection: AdditionalFeeSelection[],
): string | undefined {
  const lateActive = lateCancellationPolicyActive(section4);
  const lateNo = section4.lateCancellationFeeMode === "no";
  const noShowActive = noShowPolicyActive(section4);
  const noShowNo = section4.noShowFeeMode === "no";
  const hasNone = selection.includes("none");
  const hasCancellation = selection.includes("cancellation");
  const hasNoShow = selection.includes("no_show");

  if (hasNone && (lateActive || noShowActive)) {
    if (lateActive && noShowActive) {
      return (
        "“We don’t charge additional fees” conflicts with your Scheduling answers. " +
        "You indicated late-cancellation and no-show fees there. " +
        "Include Cancellation fee and No-show fee here, or change the Scheduling answers."
      );
    }
    if (lateActive) {
      return (
        "You indicated that you charge a late-cancellation fee in Scheduling. " +
        "“We don’t charge additional fees” conflicts with that answer. " +
        "Include Cancellation fee here, or change the Scheduling answer."
      );
    }
    return (
      "You indicated that you charge a no-show fee in Scheduling. " +
      "“We don’t charge additional fees” conflicts with that answer. " +
      "Include No-show fee here, or change the Scheduling answer."
    );
  }

  const parts: string[] = [];
  if (lateActive && !hasCancellation) {
    parts.push(
      "You indicated that you charge a late-cancellation fee in Scheduling. " +
        "Please include Cancellation fee here, or change the Scheduling answer.",
    );
  }
  if (noShowActive && !hasNoShow) {
    parts.push(
      "You indicated that you charge a no-show fee in Scheduling. " +
        "Please include No-show fee here, or change the Scheduling answer.",
    );
  }
  if (lateNo && hasCancellation) {
    parts.push(
      "You selected Cancellation fee here, but Scheduling says you do not charge a late-cancellation fee. " +
        "Remove Cancellation fee here, or change the Scheduling answer.",
    );
  }
  if (noShowNo && hasNoShow) {
    parts.push(
      "You selected No-show fee here, but Scheduling says you do not charge a no-show fee. " +
        "Remove No-show fee here, or change the Scheduling answer.",
    );
  }
  return parts.length > 0 ? parts.join(" ") : undefined;
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
