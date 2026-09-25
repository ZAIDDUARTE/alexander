import { createDefaultSection7, createPronunciationEntryId, type Section7Data } from "./types";

export function fullyValidSection7(): Section7Data {
  const data = createDefaultSection7();
  data.englishOnly = false;
  data.callerLanguages = ["english", "spanish"];
  data.voiceSelection = "voice_a";
  data.communicationStyle = "warm_professional";
  data.spokenNameMode = "alexander";
  data.aiDisclosureStyle = "opening_ai_receptionist";
  data.pronunciationMode = "none";
  data.languageSwitchingPolicy = "ask_preference";
  return data;
}

export function fullyValidSection7WithPronunciation(): Section7Data {
  const data = fullyValidSection7();
  data.pronunciationMode = "yes";
  const id = createPronunciationEntryId();
  data.pronunciationEntries = [
    { id, term: "Lancaster", pronunciation: "LAN-cas-ter", audioSampleReference: "" },
  ];
  return data;
}
