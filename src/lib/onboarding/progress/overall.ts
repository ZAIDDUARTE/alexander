export type NodeState = "completed" | "current" | "future";

export type OverallProgressInput = {
  totalSections: number;
  currentSection: number;
  completedSections: number[];
  /** Fraction (0–1) of the active section's applicable questions completed. */
  currentSectionProgress: number;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Visual state for a single section node.
 *
 * "completed" always wins over "current" — a section stays marked
 * complete while it is being re-edited, so re-opening an already
 * completed section never demotes its node back to "in progress".
 */
export function getSectionNodeState(
  sectionId: number,
  completedSections: number[],
  currentSection: number,
): NodeState {
  if (completedSections.includes(sectionId)) return "completed";
  if (sectionId === currentSection) return "current";
  return "future";
}

/**
 * Fill fraction (0–1) for the connector immediately after a section
 * node. Mirrors getSectionNodeState: a completed section's connector
 * is always fully filled regardless of live edits happening right now,
 * so momentarily invalid data while re-typing a field never regresses
 * an already-banked connector.
 */
export function getConnectorFill(
  sectionId: number,
  completedSections: number[],
  currentSection: number,
  currentSectionProgress: number,
): number {
  if (completedSections.includes(sectionId)) return 1;
  if (sectionId === currentSection) return clamp01(currentSectionProgress);
  return 0;
}

/**
 * Overall onboarding completion, expressed as a fraction (0–1) of total
 * sections.
 *
 * This intentionally does NOT compute `(completedSections.length +
 * currentSectionProgress) / total` unconditionally — that formula
 * double-counts a section that is already complete and currently being
 * re-edited (its contribution is already banked in completedSections).
 * The live `currentSectionProgress` only contributes when the current
 * section is a genuine "frontier" section that has never been
 * completed before; re-editing a finished section neither adds to nor
 * subtracts from the banked total.
 */
export function getOverallCompletionProgress(input: OverallProgressInput): number {
  const { totalSections, currentSection, completedSections, currentSectionProgress } = input;
  if (totalSections <= 0) return 0;

  const isCurrentAlreadyComplete = completedSections.includes(currentSection);
  const frontierContribution = isCurrentAlreadyComplete ? 0 : clamp01(currentSectionProgress);

  return (completedSections.length + frontierContribution) / totalSections;
}
