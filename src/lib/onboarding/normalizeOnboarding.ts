import { normalizeSection1 } from "./normalize/section1";
import { normalizeSection2 } from "./normalize/section2";
import { normalizeSection3 } from "./normalize/section3";
import { normalizeSection4 } from "./normalize/section4";
import { normalizeSection5 } from "./normalize/section5";
import { normalizeSection6 } from "./normalize/section6";
import { normalizeSection7 } from "./normalize/section7";
import { normalizeSection8 } from "./normalize/section8";
import type { OnboardingDraft } from "./types";

export function normalizeOnboardingDraft(draft: OnboardingDraft) {
  return {
    schema_version: draft.schemaVersion,
    company: normalizeSection1(draft.section1),
    services: normalizeSection2(draft.section2),
    emergencies: normalizeSection3(draft.section3, draft.contacts),
    scheduling: normalizeSection4(draft.section4, draft.contacts, draft.fees, draft.section2),
    pricing: normalizeSection5(draft.section5, draft.section2, draft.contacts, draft.fees),
    customer_care: normalizeSection6(draft.section6, draft.contacts),
    voice_profile: normalizeSection7(draft.section7),
    integration_profile: normalizeSection8(draft.section8, draft.systems),
    submission: {
      status: draft.submission.status,
      submitted_at: draft.submission.submittedAt,
      confirmations: draft.submission.confirmations,
    },
  };
}
