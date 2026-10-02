import {
  DEFAULT_NON_SERVICE_DISPOSITIONS,
  NON_SERVICE_CALL_TYPE_ROWS,
  type NonServiceCallTypeId,
} from "./section6Catalog";
import type { Stage2MigrationNote } from "./stage2Migration";
import {
  contactHasIdentity,
  type NonServiceDisposition,
  type OnboardingDraft,
  type Section6Data,
} from "./types";

/**
 * Stage 5 non-service routing migration.
 *
 * Current eight-row answers are kept. Approved referral is not turned into
 * a transfer. Removed caller rows are not copied onto a surviving row.
 */

const CURRENT_DISPOSITIONS = new Set<string>([
  "send_specific",
  "take_message",
  "politely_decline",
  "human_review",
]);

const REMOVED_CALL_TYPES = ["service_not_offered", "outside_service_area"] as const;

type LegacyPolicy = { disposition?: string; contactId?: string };

function append(notes: Stage2MigrationNote[], note: Stage2MigrationNote) {
  notes.push(note);
}

function rawPoliciesOf(
  rawSection6?: Partial<Section6Data> | null,
): Record<string, LegacyPolicy> | undefined {
  const policies = rawSection6?.nonServiceCallPolicies;
  if (!policies) return undefined;
  return policies as Record<string, LegacyPolicy>;
}

export function migrateStage5CustomerCare(
  draft: OnboardingDraft,
  rawSection6?: Partial<Section6Data> | null,
): { draft: OnboardingDraft } {
  const rawPolicies = rawPoliciesOf(rawSection6);
  if (!rawPolicies) return { draft };

  const notes: Stage2MigrationNote[] = [];
  const policies = { ...draft.section6.nonServiceCallPolicies };

  for (const removed of REMOVED_CALL_TYPES) {
    if (!(removed in rawPolicies)) continue;
    const from = String(rawPolicies[removed]?.disposition ?? "");
    append(notes, {
      path: `section6.nonServiceCallPolicies.${removed}`,
      from,
      to: "",
      status: "DROPPED_OBSOLETE",
    });
    delete (policies as Record<string, unknown>)[removed];
  }

  for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
    if (!(row.id in rawPolicies)) continue;
    const raw = rawPolicies[row.id] ?? {};
    const disposition = String(raw.disposition ?? "");
    const contactId = String(raw.contactId ?? "");
    const fallback = DEFAULT_NON_SERVICE_DISPOSITIONS[row.id];

    if (CURRENT_DISPOSITIONS.has(disposition)) {
      policies[row.id] = {
        disposition: disposition as NonServiceDisposition,
        contactId,
      };
      if (disposition === "send_specific" && contactId.trim()) {
        const contact = draft.contacts.find((item) => item.id === contactId);
        if (!contact || !contactHasIdentity(contact)) {
          policies[row.id] = { disposition: "send_specific", contactId: "" };
          append(notes, {
            path: `section6.nonServiceCallPolicies.${row.id}.contactId`,
            from: contactId,
            to: "",
            status: "RECIPIENT_NEEDS_QA",
          });
        }
      }
      continue;
    }

    if (disposition === "message_callback") {
      policies[row.id] = { disposition: "take_message", contactId };
      append(notes, {
        path: `section6.nonServiceCallPolicies.${row.id}.disposition`,
        from: "message_callback",
        to: "take_message",
        status: "MAPPED_FROM_LEGACY",
      });
      continue;
    }

    if (disposition === "approved_referral") {
      policies[row.id] = { disposition: fallback, contactId: "" };
      append(notes, {
        path: `section6.nonServiceCallPolicies.${row.id}.disposition`,
        from: "approved_referral",
        to: fallback,
        status: "DEFAULTED_FROM_LEGACY",
      });
      append(notes, {
        path: `section6.nonServiceCallPolicies.${row.id}.approvedReferral`,
        from: "approved_referral",
        to: fallback,
        status: "NEEDS_QA",
      });
      continue;
    }

    if (!disposition) {
      policies[row.id] = { disposition: fallback, contactId: "" };
      continue;
    }

    policies[row.id] = { disposition: fallback, contactId: "" };
    append(notes, {
      path: `section6.nonServiceCallPolicies.${row.id}.disposition`,
      from: disposition,
      to: fallback,
      status: "DEFAULTED_FROM_UNKNOWN",
    });
  }

  const currentPolicies = {} as Section6Data["nonServiceCallPolicies"];
  for (const row of NON_SERVICE_CALL_TYPE_ROWS) {
    const id = row.id as NonServiceCallTypeId;
    currentPolicies[id] = policies[id] ?? {
      disposition: DEFAULT_NON_SERVICE_DISPOSITIONS[id],
      contactId: "",
    };
  }

  const previous = draft.stage2Migration ?? [];
  const newPaths = new Set(notes.map((note) => note.path));
  const mergedNotes =
    notes.length > 0
      ? [...previous.filter((note) => !newPaths.has(note.path)), ...notes]
      : draft.stage2Migration;

  const next: OnboardingDraft = {
    ...draft,
    section6: { ...draft.section6, nonServiceCallPolicies: currentPolicies },
  };
  if (mergedNotes && mergedNotes.length > 0) next.stage2Migration = mergedNotes;
  else delete next.stage2Migration;
  return { draft: next };
}
