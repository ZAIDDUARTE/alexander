import {
  hasAdditionalApprovedVoices,
  isApprovedVoiceId,
} from "./approvedVoiceCatalog";
import { VOICE_CHOICE_ANOTHER } from "./section7Catalog";
import type { Section7Data } from "./types";

export function resolveEffectiveVoiceId(data: Section7Data): string | null {
  if (!data.voiceSelection) return null;
  if (data.voiceSelection === VOICE_CHOICE_ANOTHER) {
    const id = data.anotherApprovedVoiceId.trim();
    return id || null;
  }
  return data.voiceSelection;
}

export function isValidVoiceSelection(data: Section7Data): boolean {
  if (!data.voiceSelection) return false;
  if (data.voiceSelection === VOICE_CHOICE_ANOTHER) {
    if (!hasAdditionalApprovedVoices()) return false;
    const id = data.anotherApprovedVoiceId.trim();
    return Boolean(id && isApprovedVoiceId(id));
  }
  return isApprovedVoiceId(data.voiceSelection);
}

export function pronunciationEntryComplete(entry: Section7Data["pronunciationEntries"][number]): boolean {
  return Boolean(entry.term.trim() && entry.pronunciation.trim());
}

export function pronunciationEntryStarted(entry: Section7Data["pronunciationEntries"][number]): boolean {
  return Boolean(
    entry.term.trim() || entry.pronunciation.trim() || entry.audioSampleReference.trim(),
  );
}
