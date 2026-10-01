import { CALLER_TYPES } from "./section4Catalog";
import type { Stage2MigrationField, Stage2MigrationNote } from "./stage2Migration";
import {
  CALLER_AUTHORITY_DEFAULTS,
  type CallerAuthority,
  type OnboardingDraft,
} from "./types";

/**
 * Stage 3 caller-authorization migration.
 *
 * Old drafts store a permission array per caller. Those arrays are not
 * converted into an authority level. Every legacy row receives that
 * caller's October 1 default. A saved current authority is kept.
 */

const CURRENT_AUTHORITY = new Set<string>([
  "schedule_only",
  "schedule_diagnostic",
  "full_authorization",
  "human_approval_required",
]);

const CALLER_NOTE_PREFIX = "section4.callerPermissions.";

export function isCurrentCallerAuthority(value: string): value is CallerAuthority {
  return CURRENT_AUTHORITY.has(value);
}

export const CALLER_AUTHORITY_OPTIONS: {
  value: CallerAuthority;
  label: string;
  description: string;
}[] = [
  {
    value: "schedule_only",
    label: "Schedule only",
    description: "Can request and schedule service, but cannot approve charges or repairs.",
  },
  {
    value: "schedule_diagnostic",
    label: "Schedule + diagnostic fee",
    description: "Can schedule service and approve the standard service or diagnostic fee.",
  },
  {
    value: "full_authorization",
    label: "Full authorization",
    description: "Can schedule service, approve fees and repairs, and agree to payment.",
  },
  {
    value: "human_approval_required",
    label: "Human approval required",
    description: "Alexander must get approval before accepting authorization from this caller.",
  },
];

function fallbackFor(callerId: string): CallerAuthority {
  return CALLER_AUTHORITY_DEFAULTS[callerId] ?? "human_approval_required";
}

export function migrateStage3CallerAuthorization(draft: OnboardingDraft): {
  draft: OnboardingDraft;
  fields: Stage2MigrationField[];
} {
  const raw = draft.section4.callerPermissions as Record<string, unknown>;
  const legacyShape = CALLER_TYPES.some((row) => Array.isArray(raw?.[row.id]));
  const fields: Stage2MigrationField[] = [];
  const callerPermissions: Record<string, CallerAuthority | ""> = {};

  for (const row of CALLER_TYPES) {
    const current = raw?.[row.id];
    const fallback = fallbackFor(row.id);
    const path = `${CALLER_NOTE_PREFIX}${row.id}`;

    if (legacyShape) {
      callerPermissions[row.id] = fallback;
      fields.push({
        path,
        from: Array.isArray(current) ? JSON.stringify(current) : String(current ?? ""),
        to: fallback,
        status: "DEFAULTED_FROM_LEGACY",
      });
      continue;
    }

    if (current === undefined || current === "") {
      callerPermissions[row.id] = fallback;
      continue;
    }

    if (typeof current === "string" && isCurrentCallerAuthority(current)) {
      callerPermissions[row.id] = current;
      fields.push({ path, from: current, to: current, status: "PRESERVED_CURRENT" });
      continue;
    }

    callerPermissions[row.id] = fallback;
    fields.push({
      path,
      from: String(current),
      to: fallback,
      status: "DEFAULTED_FROM_UNKNOWN",
    });
  }

  const callerChanges = fields.filter(
    (field) => field.status !== "PRESERVED_CURRENT",
  ) as Stage2MigrationNote[];
  const previous = draft.stage2Migration ?? [];
  const notes =
    callerChanges.length > 0
      ? [...previous.filter((note) => !note.path.startsWith(CALLER_NOTE_PREFIX)), ...callerChanges]
      : previous;

  const next: OnboardingDraft = {
    ...draft,
    section4: {
      ...draft.section4,
      callerPermissions,
    },
  };
  if (notes.length > 0) next.stage2Migration = notes;
  else delete next.stage2Migration;
  return { draft: next, fields };
}
