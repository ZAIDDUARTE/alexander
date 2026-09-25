import { validateSection8 } from "../validation/section8";
import type { Section8Data, SoftwareRecord } from "../types";

type ProgressUnit = { id: string; applicable: boolean; complete: boolean };

function q104Complete(data: Section8Data): boolean {
  if (!data.crmFsmProvider) return false;
  if (data.crmFsmProvider === "custom") return data.crmFsmCustomName.trim().length >= 2;
  return true;
}

function q105Complete(data: Section8Data): boolean {
  if (!data.schedulingProvider) return false;
  if (data.schedulingProvider === "custom") return data.schedulingCustomName.trim().length >= 2;
  return true;
}

function q106Complete(data: Section8Data): boolean {
  if (!data.dispatchProvider) return false;
  if (data.dispatchProvider === "custom") return data.dispatchCustomName.trim().length >= 2;
  return true;
}

function q107Complete(data: Section8Data): boolean {
  if (!data.phoneProvider) return false;
  if (data.phoneProvider === "custom") return data.phoneCustomName.trim().length >= 2;
  return true;
}

function q108Complete(data: Section8Data): boolean {
  const cats = data.additionalSoftwareCategories;
  if (cats.length === 0) return true;
  if (cats.includes("none")) return cats.length === 1;
  return cats.every((cat) => {
    const card = data.additionalSoftwareCards.find((c) => c.categoryId === cat);
    if (!card) return false;
    if (card.systemName.trim().length < 2 || card.desiredAccess.trim().length < 2) return false;
    if (cat === "other") {
      return card.otherCategoryLabel.trim().length >= 2 && card.otherDetails.trim().length >= 2;
    }
    return true;
  });
}

function q109Complete(data: Section8Data): boolean {
  return data.authorizedCapabilities.length > 0;
}

function q110Complete(data: Section8Data): boolean {
  if (!data.connectionOwnerMode) return false;
  if (data.connectionOwnerMode !== "someone_else") return true;
  return (
    data.connectionOwnerName.trim().length >= 2 &&
    data.connectionOwnerEmail.trim().length > 0 &&
    data.connectionOwnerPhone.trim().length > 0
  );
}

export function getSection8ProgressUnits(data: Section8Data): ProgressUnit[] {
  return [
    { id: "q104", applicable: true, complete: q104Complete(data) },
    { id: "q105", applicable: true, complete: q105Complete(data) },
    { id: "q106", applicable: true, complete: q106Complete(data) },
    { id: "q107", applicable: true, complete: q107Complete(data) },
    { id: "q108", applicable: true, complete: q108Complete(data) },
    { id: "q109", applicable: true, complete: q109Complete(data) },
    { id: "q110", applicable: true, complete: q110Complete(data) },
    { id: "q111", applicable: true, complete: data.connectionNoticeAcknowledged },
    { id: "q112", applicable: true, complete: Boolean(data.failureFallback) },
    { id: "q113", applicable: true, complete: true },
  ];
}

export function getSection8Progress(data: Section8Data): number {
  const units = getSection8ProgressUnits(data).filter((u) => u.applicable);
  if (units.length === 0) return 0;
  return units.filter((u) => u.complete).length / units.length;
}

export function section8ProgressIsFullyValid(data: Section8Data, systems: SoftwareRecord[]): boolean {
  return Object.keys(validateSection8(data, systems)).length === 0;
}
