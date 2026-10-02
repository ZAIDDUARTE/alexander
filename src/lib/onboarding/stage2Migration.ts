import { EMERGENCY_SCENARIOS } from "./section3Catalog";
import { EMERGENCY_ROW_DEFAULTS } from "./section3Defaults";
import type {
  AfterHoursCallClass,
  AfterHoursDisposition,
  AfterHoursDispositionOption,
  DefaultBookingMode,
  EmergencyClassification,
  OnboardingDraft,
} from "./types";
import { createDefaultAfterHoursDisposition } from "./types";

/**
 * Stage 2 answer migration.
 *
 * Legacy values are translated here, when a draft is loaded. Current
 * questionnaire options do not include the old choices. A valid current
 * answer is kept. Running this twice does not replace that answer with
 * the row default.
 */

export type Stage2MigrationStatus =
  | "PRESERVED"
  | "PRESERVED_CURRENT"
  | "MAPPED"
  | "DEFAULTED_FROM_LEGACY"
  | "DEFAULTED_FROM_UNKNOWN"
  | "DROPPED_OBSOLETE"
  | "NEEDS_QA"
  | "DEFAULTED_NEW_FIELD"
  | "MAPPED_FROM_LEGACY"
  | "RECIPIENT_PRESERVED"
  | "RECIPIENT_NEEDS_QA";

export type Stage2MigrationField = {
  path: string;
  from: string;
  to: string;
  status: Stage2MigrationStatus;
};

export type Stage2MigrationNote = Omit<Stage2MigrationField, "status"> & {
  status: Exclude<Stage2MigrationStatus, "PRESERVED" | "PRESERVED_CURRENT">;
};

const CURRENT_EMERGENCY = new Set<string>(["emergency", "urgent", "routine", "human_review"]);

const CURRENT_AFTER_HOURS = new Set<string>([
  "contact_on_call",
  "schedule_service",
  "take_message",
]);

const AFTER_HOURS_MAPPED: Record<string, AfterHoursDispositionOption> = {
  attempt_contact: "contact_on_call",
  confirm_or_book: "schedule_service",
  schedule_next_available: "schedule_service",
};

const AFTER_HOURS_UNMAPPED = new Set<string>([
  "submit_for_review",
  "arrange_callback",
  "info_only",
  "no_service",
]);

const CURRENT_BOOKING = new Set<string>(["book_appointment", "send_to_team"]);

const BOOKING_MAPPED: Record<string, DefaultBookingMode> = {
  confirm_immediately: "book_appointment",
  submit_for_approval: "send_to_team",
};

const BOOKING_UNMAPPED = new Set<string>(["arrange_callback"]);

const AFTER_HOURS_ROWS: AfterHoursCallClass[] = ["emergency", "urgent_contained", "routine"];

export function isCurrentEmergencyClassification(value: string): value is EmergencyClassification {
  return CURRENT_EMERGENCY.has(value);
}

export function isCurrentAfterHoursDisposition(value: string): value is AfterHoursDispositionOption {
  return CURRENT_AFTER_HOURS.has(value);
}

export function isCurrentBookingMode(value: string): value is DefaultBookingMode {
  return CURRENT_BOOKING.has(value);
}

type Classified<T extends string> = {
  to: T;
  status: Stage2MigrationStatus;
  record: boolean;
};

function classifyEmergency(scenarioId: string, raw: unknown): Classified<EmergencyClassification> {
  const fallback = EMERGENCY_ROW_DEFAULTS[scenarioId];
  if (raw === undefined || raw === "") {
    return { to: fallback, status: "PRESERVED", record: false };
  }
  if (typeof raw !== "string" || !CURRENT_EMERGENCY.has(raw)) {
    if (raw === "recommended_default") {
      return { to: fallback, status: "DEFAULTED_FROM_LEGACY", record: true };
    }
    return { to: fallback, status: "DEFAULTED_FROM_UNKNOWN", record: true };
  }
  return { to: raw as EmergencyClassification, status: "PRESERVED", record: true };
}

function classifyAfterHours(
  row: AfterHoursCallClass,
  raw: unknown,
): Classified<AfterHoursDispositionOption> {
  const fallback = createDefaultAfterHoursDisposition()[row] as AfterHoursDispositionOption;
  if (raw === undefined || raw === "") {
    return { to: fallback, status: "PRESERVED", record: false };
  }
  if (typeof raw === "string" && CURRENT_AFTER_HOURS.has(raw)) {
    return { to: raw as AfterHoursDispositionOption, status: "PRESERVED", record: true };
  }
  if (typeof raw === "string" && raw in AFTER_HOURS_MAPPED) {
    return { to: AFTER_HOURS_MAPPED[raw], status: "MAPPED", record: true };
  }
  if (typeof raw === "string" && AFTER_HOURS_UNMAPPED.has(raw)) {
    return { to: fallback, status: "DEFAULTED_FROM_LEGACY", record: true };
  }
  return { to: fallback, status: "DEFAULTED_FROM_UNKNOWN", record: true };
}

function classifyBooking(raw: unknown): Classified<DefaultBookingMode> {
  const fallback: DefaultBookingMode = "book_appointment";
  if (raw === undefined || raw === "") {
    return { to: fallback, status: "PRESERVED", record: false };
  }
  if (typeof raw === "string" && CURRENT_BOOKING.has(raw)) {
    return { to: raw as DefaultBookingMode, status: "PRESERVED", record: true };
  }
  if (typeof raw === "string" && raw in BOOKING_MAPPED) {
    return { to: BOOKING_MAPPED[raw], status: "MAPPED", record: true };
  }
  if (typeof raw === "string" && BOOKING_UNMAPPED.has(raw)) {
    return { to: fallback, status: "DEFAULTED_FROM_LEGACY", record: true };
  }
  return { to: fallback, status: "DEFAULTED_FROM_UNKNOWN", record: true };
}

export function migrateStage2Answers(draft: OnboardingDraft): {
  draft: OnboardingDraft;
  fields: Stage2MigrationField[];
} {
  const fields: Stage2MigrationField[] = [];
  const classifications = { ...draft.section3.emergencyClassifications };

  for (const scenario of EMERGENCY_SCENARIOS) {
    const from = classifications[scenario.id] ?? "";
    const result = classifyEmergency(scenario.id, from);
    classifications[scenario.id] = result.to;
    if (result.record) {
      fields.push({
        path: `section3.emergencyClassifications.${scenario.id}`,
        from: String(from),
        to: result.to,
        status: result.status,
      });
    }
  }

  const disposition: AfterHoursDisposition = { ...draft.section3.afterHoursDisposition };
  for (const row of AFTER_HOURS_ROWS) {
    const from = disposition[row] ?? "";
    const result = classifyAfterHours(row, from);
    disposition[row] = result.to;
    if (result.record) {
      fields.push({
        path: `section3.afterHoursDisposition.${row}`,
        from: String(from),
        to: result.to,
        status: result.status,
      });
    }
  }

  const booking = classifyBooking(draft.section4.defaultBookingMode);
  if (booking.record) {
    fields.push({
      path: "section4.defaultBookingMode",
      from: String(draft.section4.defaultBookingMode ?? ""),
      to: booking.to,
      status: booking.status,
    });
  }

  const changes = fields.filter((field) => field.status !== "PRESERVED") as Stage2MigrationNote[];
  const notes = changes.length > 0 ? changes : draft.stage2Migration;
  const next: OnboardingDraft = {
    ...draft,
    section3: {
      ...draft.section3,
      emergencyClassifications: classifications,
      afterHoursDisposition: disposition,
    },
    section4: {
      ...draft.section4,
      defaultBookingMode: booking.to,
    },
  };
  if (notes && notes.length > 0) next.stage2Migration = notes;
  else delete next.stage2Migration;
  return { draft: next, fields };
}
