import { mergeWithDefaults } from "./draft-utils";
import { createDefaultOfficeHours, createDefaultServiceHours } from "./schedule";
import { EMERGENCY_SCENARIOS } from "./section3Catalog";
import { FIRST_JOB_SERVICE_ID, fullyValidSection4 } from "./section4-test-helpers";
import { fullyValidSection5 } from "./section5-test-helpers";
import { fullyValidSection6 } from "./section6-test-helpers";
import { fullyValidSection7 } from "./section7-test-helpers";
import { fullyValidSection8 } from "./section8-test-helpers";
import {
  createDefaultSection1,
  createDefaultSection2,
  createDefaultSection3,
  createEmptyContact,
  type Contact,
  type OnboardingDraft,
  type Section1Data,
  type Section2Data,
  type Section3Data,
} from "./types";
import { createDefaultDraft } from "./types";
import { canSubmitQuestionnaire, validateAllSections } from "./validateOnboarding";

function fullyValidSection1(): Section1Data {
  const data = createDefaultSection1();
  data.customerFacingName = "Acme Plumbing";
  data.legalName = "Acme Plumbing LLC";
  data.mainPhone = "+14155552671";
  data.approvedClaims = ["licensed", "insured"];
  data.officeHours = createDefaultOfficeHours();
  data.serviceHours = createDefaultServiceHours();
  data.answeringMode = "24_7";
  return data;
}

function fullyValidSection2(): Section2Data {
  const data = createDefaultSection2();
  for (const item of Object.keys(data.plumbingServices)) {
    data.plumbingServices[item] = { policy: "offered", condition: "" };
  }
  for (const item of Object.keys(data.diagnosticServices)) {
    data.diagnosticServices[item] = { policy: "offered", condition: "" };
  }
  for (const item of Object.keys(data.customerPropertyTypes)) {
    data.customerPropertyTypes[item] = { policy: "offered", condition: "" };
  }
  data.customerSuppliedMaterialsPolicy = "not_offered";
  data.correctiveWorkPolicy = "not_offered";
  data.serviceAreaDefinitionMode = "cities";
  data.serviceAreaCities = ["Rosamond"];
  data.hasConditionalTerritory = "no";
  data.afterHoursAreaMode = "same";
  return data;
}

function validContact(overrides: Partial<Contact> = {}): Contact {
  return {
    ...createEmptyContact(),
    nameOrRole: "Jamie Rivera, Dispatch Manager",
    phone: "+14155552671",
    availability: createDefaultOfficeHours(),
    callCategories: ["emergencies"],
    otherCategory: "",
    ...overrides,
  };
}

function fullyValidSection3(primaryId: string): Section3Data {
  const data = createDefaultSection3(primaryId);
  for (const s of EMERGENCY_SCENARIOS) {
    data.emergencyClassifications[s.id] = "emergency";
  }
  data.dispatchApproval = ["none"];
  data.afterHoursDisposition = {
    emergency: "attempt_contact",
    urgent_contained: "arrange_callback",
    routine: "info_only",
  };
  data.emergencyServiceMode = "24_7";
  data.hasBackupContact = "no";
  data.nobodyRespondsFallback = "callback";
  data.retryRule = "move_immediately_to_next";
  data.capacityMode = "no_override";
  return data;
}

/** Best-effort fully valid draft for submission integration tests. */
export function buildSubmittableDraft(): OnboardingDraft {
  const primary = validContact();
  const { section8, systems } = fullyValidSection8();
  const section2 = fullyValidSection2();
  if (section2.plumbingServices[FIRST_JOB_SERVICE_ID]) {
    section2.plumbingServices[FIRST_JOB_SERVICE_ID] = { policy: "offered", condition: "" };
  } else if (section2.diagnosticServices[FIRST_JOB_SERVICE_ID]) {
    section2.diagnosticServices[FIRST_JOB_SERVICE_ID] = { policy: "offered", condition: "" };
  }
  const draft = mergeWithDefaults({
    section1: fullyValidSection1(),
    section2,
    section3: fullyValidSection3(primary.id),
    section4: fullyValidSection4([primary]),
    section5: fullyValidSection5(section2, [primary]),
    section6: fullyValidSection6([primary]),
    section7: fullyValidSection7(),
    section8,
    systems,
    contacts: [primary],
    submission: {
      ...createDefaultDraft().submission,
      confirmations: {
        answersAccurate: true,
        capabilitiesDependOnIntegrations: true,
        actionsRequireSupportAuthorizationConfirmation: true,
      },
    },
  });
  if (!canSubmitQuestionnaire(draft)) {
    const invalid = validateAllSections(draft).filter((r) => !r.valid).map((r) => r.sectionId);
    throw new Error(`buildSubmittableDraft: invalid sections ${invalid.join(",")}`);
  }
  return draft;
}
