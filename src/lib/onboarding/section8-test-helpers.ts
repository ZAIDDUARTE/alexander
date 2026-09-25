import { upsertRoleSoftware } from "./softwareRegistry";
import {
  createDefaultSection8,
  createDefaultSubmission,
  type OnboardingDraft,
  type Section8Data,
  type SoftwareRecord,
} from "./types";

export function seedCrmSoftware(
  section8: Section8Data,
  systems: SoftwareRecord[],
  provider: Section8Data["crmFsmProvider"],
  customName = "",
): { section8: Section8Data; systems: SoftwareRecord[] } {
  const s8 = { ...section8, crmFsmProvider: provider };
  if (provider === "none" || provider === "") {
    return { section8: s8, systems };
  }
  if (provider === "custom") {
    s8.crmFsmCustomName = customName;
  }
  const { systems: nextSystems, id } = upsertRoleSoftware(
    systems,
    s8.crmFsmSoftwareId,
    "crm_fsm",
    provider,
    provider === "custom" ? s8.crmFsmCustomName : undefined,
  );
  s8.crmFsmSoftwareId = id;
  return { section8: s8, systems: nextSystems };
}

export function fullyValidSection8(): { section8: Section8Data; systems: SoftwareRecord[] } {
  let systems: SoftwareRecord[] = [];
  let section8 = createDefaultSection8();

  ({ section8, systems } = seedCrmSoftware(section8, systems, "servicetitan"));
  section8.schedulingProvider = "same_as_crm";
  section8.dispatchProvider = "same_as_scheduling";
  section8.phoneProvider = "ringcentral";
  const phoneUpsert = upsertRoleSoftware(
    systems,
    section8.phoneSoftwareId,
    "phone",
    "ringcentral",
  );
  systems = phoneUpsert.systems;
  section8.phoneSoftwareId = phoneUpsert.id;

  section8.connectionOwnerMode = "self_authorized";
  section8.connectionNoticeAcknowledged = true;
  section8.failureFallback = "callback";

  return { section8, systems };
}

export function attachSection8ToDraft(draft: OnboardingDraft): OnboardingDraft {
  const { section8, systems } = fullyValidSection8();
  return {
    ...draft,
    section8,
    systems: [...draft.systems, ...systems],
    submission: createDefaultSubmission(),
  };
}
