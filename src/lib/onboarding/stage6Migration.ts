import type { FailureFallbackMode } from "./section8Catalog";
import type { Stage2MigrationNote } from "./stage2Migration";
import type { OnboardingDraft, Section8Data } from "./types";

/**
 * Stage 6 integration migration.
 *
 * Current CRM, scheduling, phone, per-category software names, and a saved
 * connection acknowledgement stay. Dispatch and the capability checklist
 * are not turned into other answers.
 */

const CURRENT_OWNERS = new Set(["self_authorized", "someone_else"]);
const CURRENT_FAILURES = new Set(["collect_and_send", "connect_team", "custom"]);

function append(notes: Stage2MigrationNote[], note: Stage2MigrationNote) {
  notes.push(note);
}

export function migrateStage6Integrations(
  draft: OnboardingDraft,
  rawSection8?: Partial<Section8Data> | null,
): { draft: OnboardingDraft } {
  if (!rawSection8) return { draft };

  const notes: Stage2MigrationNote[] = [];
  const section8: Section8Data = {
    ...draft.section8,
    authorizedCapabilities: [...draft.section8.authorizedCapabilities],
    additionalSoftwareCategories: [...draft.section8.additionalSoftwareCategories],
    additionalSoftwareCards: draft.section8.additionalSoftwareCards.map((card) => ({ ...card })),
  };

  const dispatchProvider = String(rawSection8.dispatchProvider ?? "");
  const dispatchName = String(rawSection8.dispatchCustomName ?? "").trim();
  if (dispatchProvider || dispatchName) {
    append(notes, {
      path: "section8.dispatchProvider",
      from: dispatchProvider || dispatchName,
      to: "",
      status: "DROPPED_OBSOLETE",
    });
    append(notes, {
      path: "section8.dispatchProvider.qa",
      from: dispatchProvider || dispatchName,
      to: "",
      status: "NEEDS_QA",
    });
    section8.dispatchProvider = "";
    section8.dispatchCustomName = "";
    section8.dispatchSoftwareId = "";
  }

  const rawCaps = rawSection8.authorizedCapabilities;
  const rawOther = String(rawSection8.authorizedCapabilityOther ?? "").trim();
  if ((Array.isArray(rawCaps) && rawCaps.length > 0) || rawOther) {
    append(notes, {
      path: "section8.authorizedCapabilities",
      from: Array.isArray(rawCaps) ? rawCaps.join(",") : rawOther,
      to: "",
      status: "DROPPED_OBSOLETE",
    });
    append(notes, {
      path: "section8.authorizedCapabilities.qa",
      from: Array.isArray(rawCaps) ? rawCaps.join(",") : rawOther,
      to: "",
      status: "NEEDS_QA",
    });
    section8.authorizedCapabilities = [];
    section8.authorizedCapabilityOther = "";
  }

  const owner = String(rawSection8.connectionOwnerMode ?? "");
  if (owner && !CURRENT_OWNERS.has(owner)) {
    section8.connectionOwnerMode = "";
    append(notes, {
      path: "section8.connectionOwnerMode",
      from: owner,
      to: "",
      status: "NEEDS_QA",
    });
  }

  const failure = String(rawSection8.failureFallback ?? "");
  if (!failure) {
    section8.failureFallback = "collect_and_send";
  } else if (CURRENT_FAILURES.has(failure)) {
    section8.failureFallback = failure as FailureFallbackMode;
  } else {
    section8.failureFallback = "collect_and_send";
    append(notes, {
      path: "section8.failureFallback",
      from: failure,
      to: "collect_and_send",
      status: failure === "callback" ? "DEFAULTED_FROM_LEGACY" : "DEFAULTED_FROM_UNKNOWN",
    });
    append(notes, {
      path: "section8.failureFallback.qa",
      from: failure,
      to: "collect_and_send",
      status: "NEEDS_QA",
    });
  }

  const previous = draft.stage2Migration ?? [];
  const newPaths = new Set(notes.map((note) => note.path));
  const mergedNotes =
    notes.length > 0
      ? [...previous.filter((note) => !newPaths.has(note.path)), ...notes]
      : draft.stage2Migration;

  const next: OnboardingDraft = { ...draft, section8 };
  if (mergedNotes && mergedNotes.length > 0) next.stage2Migration = mergedNotes;
  else delete next.stage2Migration;
  return { draft: next };
}
