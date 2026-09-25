import { validateSection7 } from "../validation/section7";
import { pronunciationEntryComplete } from "../voiceSelection";
import type { Section7Data } from "../types";
import { isApprovedVoiceId } from "../approvedVoiceCatalog";
import { VOICE_CHOICE_ANOTHER } from "../section7Catalog";
import { hasAdditionalApprovedVoices } from "../approvedVoiceCatalog";

type ProgressUnit = { id: string; applicable: boolean; complete: boolean };

function q92Complete(data: Section7Data): boolean {
  if (data.englishOnly) return true;
  if (data.callerLanguages.length === 0) return false;
  if (data.callerLanguages.includes("other") && !data.otherSupportedLanguage.trim()) return false;
  return true;
}

function q93Complete(data: Section7Data): boolean {
  if (!data.voiceSelection) return false;
  if (data.voiceSelection === VOICE_CHOICE_ANOTHER) {
    if (!hasAdditionalApprovedVoices()) return false;
    const id = data.anotherApprovedVoiceId.trim();
    return Boolean(id && isApprovedVoiceId(id));
  }
  return isApprovedVoiceId(data.voiceSelection);
}

function q94Complete(data: Section7Data): boolean {
  return Boolean(data.communicationStyle);
}

function q95Complete(data: Section7Data): boolean {
  if (!data.spokenNameMode) return false;
  if (data.spokenNameMode === "alexander") return true;
  return Boolean(data.spokenDisplayName.trim());
}

function q96Complete(data: Section7Data): boolean {
  return Boolean(data.aiDisclosureStyle);
}

function q97Complete(data: Section7Data): boolean {
  if (!data.pronunciationMode) return false;
  if (data.pronunciationMode === "none") return true;
  return data.pronunciationEntries.some(pronunciationEntryComplete);
}

function q98Complete(data: Section7Data): boolean {
  return Boolean(data.languageSwitchingPolicy);
}

function optionalComplete(): boolean {
  return true;
}

export function getSection7ProgressUnits(data: Section7Data): ProgressUnit[] {
  return [
    { id: "q92", applicable: true, complete: q92Complete(data) },
    { id: "q93", applicable: true, complete: q93Complete(data) },
    { id: "q94", applicable: true, complete: q94Complete(data) },
    { id: "q95", applicable: true, complete: q95Complete(data) },
    { id: "q96", applicable: true, complete: q96Complete(data) },
    { id: "q97", applicable: true, complete: q97Complete(data) },
    { id: "q98", applicable: true, complete: q98Complete(data) },
    { id: "q99", applicable: true, complete: optionalComplete() },
    { id: "q100", applicable: true, complete: optionalComplete() },
    { id: "q101", applicable: true, complete: optionalComplete() },
    { id: "q102", applicable: true, complete: optionalComplete() },
    { id: "q103", applicable: true, complete: optionalComplete() },
  ];
}

export function getSection7Progress(data: Section7Data): number {
  const units = getSection7ProgressUnits(data).filter((u) => u.applicable);
  if (units.length === 0) return 0;
  const done = units.filter((u) => u.complete).length;
  return done / units.length;
}

export function section7ProgressIsFullyValid(data: Section7Data): boolean {
  return Object.keys(validateSection7(data)).length === 0;
}
