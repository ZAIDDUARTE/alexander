import type { PolicyAnswerSlot } from "../policy-profile/types";

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

function titleCaseDay(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

export function formatWeeklySchedule(value: unknown): string {
  if (!value || typeof value !== "object") return String(value ?? "");
  const lines: string[] = [];
  for (const day of DAY_ORDER) {
    const row = (value as Record<string, unknown>)[day];
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (r.closed === true || r.mode === "no_service") {
      lines.push(`${titleCaseDay(day)}: closed / no service`);
      continue;
    }
    const mode = r.mode ? ` (${String(r.mode)})` : "";
    lines.push(`${titleCaseDay(day)}: ${String(r.start ?? "?")}–${String(r.end ?? "?")}${mode}`);
  }
  return lines.join("\n");
}

export function formatMatrix(value: unknown): string {
  if (!value || typeof value !== "object") return String(value ?? "");
  const lines: string[] = [];
  for (const [rowId, row] of Object.entries(value as Record<string, unknown>)) {
    if (!row || typeof row !== "object") continue;
    const r = row as { value?: string; fields?: Record<string, unknown> };
    const label = rowId.replace(/-/g, " ");
    let line = `- ${label}: ${r.value ?? ""}`;
    if (r.fields?.condition) line += ` — condition: ${String(r.fields.condition)}`;
    lines.push(line);
  }
  return lines.join("\n");
}

function capitalizeWord(s: string): string {
  const t = s.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Questionnaire boilerplate often says "Alexander" / he — normalize for Lisa. */
export function humanizeAgentReferences(text: string, agentName: string): string {
  return text
    .replace(/\bAlexander\b/g, agentName)
    .replace(/\bHe\b/g, "She")
    .replace(/\bhe\b/g, "she")
    .replace(/\bHis\b/g, "Her")
    .replace(/\bhis\b/g, "her")
    .replace(/\bhim\b/g, "her");
}

function formatPlainObject(o: Record<string, unknown>, indent = ""): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(o)) {
    if (value === null || value === undefined) continue;
    const label = humanizeFieldName(key);
    if (typeof value === "object" && !Array.isArray(value)) {
      const inner = formatPlainObject(value as Record<string, unknown>, `${indent}  `);
      if (inner) lines.push(`${indent}${label}:\n${inner}`);
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      if (value.every((item) => item && typeof item === "object")) {
        for (const item of value) {
          const row = formatPlainObject(item as Record<string, unknown>, `${indent}  `);
          lines.push(`${indent}- ${row.replace(/\n/g, `\n${indent}  `)}`);
        }
        continue;
      }
      lines.push(`${indent}${label}: ${value.map(String).join("; ")}`);
      continue;
    }
    lines.push(`${indent}${label}: ${String(value)}`);
  }
  return lines.join("\n");
}

function formatLanguagesObject(o: Record<string, unknown>): string {
  const langs = o.callerLanguages;
  if (Array.isArray(langs)) {
    const list = langs.map((l) => capitalizeWord(String(l)));
    if (o.englishOnly === true) return "English only";
    return list.join(", ");
  }
  return formatPlainObject(o);
}

function formatFinancialRemediesObject(o: Record<string, unknown>): string {
  const remedies = o.remedies;
  if (Array.isArray(remedies) && remedies.length === 1 && remedies[0] === "none") {
    return "No autonomous discounts, refunds, or credits (none configured).";
  }
  if (Array.isArray(remedies)) return remedies.map((r) => policyLabel(String(r))).join(", ");
  return formatPlainObject(o);
}

function policyLabel(raw: string): string {
  return raw.replace(/_/g, " ");
}

function formatComposite(v: unknown): string {
  if (!v || typeof v !== "object") return String(v ?? "");
  const o = v as Record<string, unknown>;
  if (typeof o.excludedTerritory === "string") return o.excludedTerritory;
  if (o.definitionMode === "zip_codes" && Array.isArray(o.zipCodes)) {
    return `Service area by ZIP codes:\n${o.zipCodes.map((z) => `- ${String(z)}`).join("\n")}`;
  }
  if (o.schedule && typeof o.schedule === "object") {
    const mode = o.mode ? `Mode: ${policyLabel(String(o.mode))}\n` : "";
    return mode + formatWeeklySchedule(o.schedule);
  }
  if (o.bookingHorizonDays !== undefined) {
    const days = o.bookingHorizonNoMaximum ? "no maximum" : `${o.bookingHorizonDays} days`;
    return `Booking horizon: ${days}`;
  }
  return formatPlainObject(o);
}

function formatSingleSelectValue(v: unknown): string {
  if (typeof v === "string") return v;
  if (!v || typeof v !== "object") return String(v ?? "");
  const o = v as Record<string, unknown>;
  if (typeof o.returnVisitEligibilityRule === "string") {
    const action = o.action ? `Action: ${policyLabel(String(o.action))}. ` : "";
    return action + o.returnVisitEligibilityRule;
  }
  return formatPlainObject(o);
}

function formatRepeatable(v: unknown): string {
  if (!Array.isArray(v)) return formatPlainObject((v ?? {}) as Record<string, unknown>);
  return v
    .map((row) => {
      if (!row || typeof row !== "object") return `- ${String(row)}`;
      const r = row as Record<string, unknown>;
      const label = r.label ?? r.id ?? "item";
      const enabled = r.enabled === false ? " (disabled)" : "";
      const times = r.start && r.end ? ` ${String(r.start)}–${String(r.end)}` : "";
      const fields = r.fields && typeof r.fields === "object"
        ? ` — ${formatPlainObject(r.fields as Record<string, unknown>).replace(/\n/g, "; ")}`
        : "";
      return `- ${String(label)}${enabled}${times}${fields}`;
    })
    .join("\n");
}

export type FormatSlotOptions = {
  agentName?: string;
};

export function formatSlotValue(slot: PolicyAnswerSlot, options?: FormatSlotOptions): string {
  if (slot.state !== "PRESENT" || slot.value === null || slot.value === undefined) {
    return slot.state === "EMPTY" ? "(intentionally blank)" : `(${slot.state})`;
  }
  const v = slot.value;
  let out: string;
  switch (slot.answer_kind) {
    case "weekly_schedule":
      out = formatWeeklySchedule(v);
      break;
    case "matrix_single_select":
      out = formatMatrix(v);
      break;
    case "multi_select":
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        if (o.callerLanguages) out = formatLanguagesObject(o);
        else if (o.remedies) out = formatFinancialRemediesObject(o);
        else out = formatPlainObject(o);
      } else {
        out = Array.isArray(v) ? v.map(String).join(", ") : formatPlainObject((v ?? {}) as Record<string, unknown>);
      }
      break;
    case "ordered_select":
      out = Array.isArray(v) ? v.join(" → ") : String(v);
      break;
    case "repeatable":
      out = formatRepeatable(v);
      break;
    case "single_select":
      out = formatSingleSelectValue(v);
      break;
    case "composite":
    case "acknowledgement_group":
      out = formatComposite(v);
      break;
    default:
      out = typeof v === "string" ? v : formatPlainObject((v ?? {}) as Record<string, unknown>);
  }
  if (options?.agentName) {
    out = humanizeAgentReferences(out, options.agentName);
  }
  return out;
}

export function humanizeFieldName(field: string): string {
  return field.replace(/_/g, " ");
}
