import type { AdditionalSoftwareCategoryId } from "./section8Catalog";
import { crmAllowsSchedulingSameAs, upsertAdditionalSoftware, upsertRoleSoftware } from "./softwareRegistry";
import type { OnboardingDraft, Section8Data } from "./types";

export function applyCrmProviderChange(
  draft: OnboardingDraft,
  provider: Section8Data["crmFsmProvider"],
): OnboardingDraft {
  const section8: Section8Data = {
    ...draft.section8,
    crmFsmProvider: provider,
    crmFsmCustomName: provider === "custom" ? draft.section8.crmFsmCustomName : "",
  };
  let systems = draft.systems;

  if (provider === "none" || provider === "") {
    section8.crmFsmSoftwareId = "";
    if (section8.schedulingProvider === "same_as_crm") {
      section8.schedulingProvider = "";
      section8.schedulingSoftwareId = "";
    }
  } else {
    const upsert = upsertRoleSoftware(
      systems,
      section8.crmFsmSoftwareId,
      "crm_fsm",
      provider,
      provider === "custom" ? section8.crmFsmCustomName : undefined,
    );
    systems = upsert.systems;
    section8.crmFsmSoftwareId = upsert.id;
  }

  return reconcileDispatchAfterScheduling({ ...draft, section8, systems });
}

export function applyCrmCustomNameChange(draft: OnboardingDraft, name: string): OnboardingDraft {
  if (draft.section8.crmFsmProvider !== "custom") {
    return { ...draft, section8: { ...draft.section8, crmFsmCustomName: name } };
  }
  const upsert = upsertRoleSoftware(
    draft.systems,
    draft.section8.crmFsmSoftwareId,
    "crm_fsm",
    "custom",
    name,
  );
  return {
    ...draft,
    systems: upsert.systems,
    section8: { ...draft.section8, crmFsmCustomName: name, crmFsmSoftwareId: upsert.id },
  };
}

export function applySchedulingProviderChange(
  draft: OnboardingDraft,
  provider: Section8Data["schedulingProvider"],
): OnboardingDraft {
  const section8: Section8Data = {
    ...draft.section8,
    schedulingProvider: provider,
    schedulingCustomName: provider === "custom" ? draft.section8.schedulingCustomName : "",
  };
  let systems = draft.systems;

  if (provider === "same_as_crm") {
    section8.schedulingSoftwareId = "";
  } else if (provider === "none" || provider === "") {
    section8.schedulingSoftwareId = "";
    if (section8.dispatchProvider === "same_as_scheduling") {
      section8.dispatchProvider = "";
      section8.dispatchSoftwareId = "";
    }
  } else if (provider !== "custom") {
    const upsert = upsertRoleSoftware(systems, section8.schedulingSoftwareId, "scheduling", provider);
    systems = upsert.systems;
    section8.schedulingSoftwareId = upsert.id;
  }

  return reconcileDispatchAfterScheduling({ ...draft, section8, systems });
}

export function applySchedulingCustomNameChange(draft: OnboardingDraft, name: string): OnboardingDraft {
  const upsert = upsertRoleSoftware(
    draft.systems,
    draft.section8.schedulingSoftwareId,
    "scheduling",
    "custom",
    name,
  );
  return {
    ...draft,
    systems: upsert.systems,
    section8: {
      ...draft.section8,
      schedulingCustomName: name,
      schedulingSoftwareId: upsert.id,
    },
  };
}

export function applyDispatchProviderChange(
  draft: OnboardingDraft,
  provider: Section8Data["dispatchProvider"],
): OnboardingDraft {
  const section8: Section8Data = {
    ...draft.section8,
    dispatchProvider: provider,
    dispatchCustomName: provider === "custom" ? draft.section8.dispatchCustomName : "",
  };
  let systems = draft.systems;

  if (provider === "same_as_scheduling") {
    section8.dispatchSoftwareId = "";
  } else if (provider === "none" || provider === "") {
    section8.dispatchSoftwareId = "";
  } else if (provider === "custom") {
    // wait for name
  } else {
    const upsert = upsertRoleSoftware(systems, section8.dispatchSoftwareId, "dispatch", provider);
    systems = upsert.systems;
    section8.dispatchSoftwareId = upsert.id;
  }

  return { ...draft, section8, systems };
}

export function applyDispatchCustomNameChange(draft: OnboardingDraft, name: string): OnboardingDraft {
  const upsert = upsertRoleSoftware(
    draft.systems,
    draft.section8.dispatchSoftwareId,
    "dispatch",
    "custom",
    name,
  );
  return {
    ...draft,
    systems: upsert.systems,
    section8: {
      ...draft.section8,
      dispatchCustomName: name,
      dispatchSoftwareId: upsert.id,
    },
  };
}

export function applyPhoneProviderChange(
  draft: OnboardingDraft,
  provider: Section8Data["phoneProvider"],
): OnboardingDraft {
  const section8: Section8Data = {
    ...draft.section8,
    phoneProvider: provider,
    phoneCustomName: provider === "custom" ? draft.section8.phoneCustomName : "",
  };
  const systems = draft.systems;

  if (provider === "not_sure" || provider === "") {
    section8.phoneSoftwareId = "";
    return { ...draft, section8, systems };
  }

  if (provider === "custom") {
    return { ...draft, section8, systems };
  }

  const upsert = upsertRoleSoftware(systems, section8.phoneSoftwareId, "phone", provider);
  return {
    ...draft,
    systems: upsert.systems,
    section8: { ...section8, phoneSoftwareId: upsert.id },
  };
}

export function applyPhoneCustomNameChange(draft: OnboardingDraft, name: string): OnboardingDraft {
  const upsert = upsertRoleSoftware(
    draft.systems,
    draft.section8.phoneSoftwareId,
    "phone",
    "custom",
    name,
  );
  return {
    ...draft,
    systems: upsert.systems,
    section8: {
      ...draft.section8,
      phoneCustomName: name,
      phoneSoftwareId: upsert.id,
    },
  };
}

function reconcileDispatchAfterScheduling(draft: OnboardingDraft): OnboardingDraft {
  const { section8 } = draft;
  if (section8.dispatchProvider === "same_as_scheduling") {
    return { ...draft, section8: { ...section8, dispatchSoftwareId: "" } };
  }
  return draft;
}

export function schedulingSameAsCrmDisabled(section8: Section8Data): boolean {
  return !crmAllowsSchedulingSameAs(section8);
}

export function toggleAdditionalCategory(
  draft: OnboardingDraft,
  categoryId: AdditionalSoftwareCategoryId,
): OnboardingDraft {
  const current = draft.section8.additionalSoftwareCategories;
  if (categoryId === "none") {
    return {
      ...draft,
      section8: {
        ...draft.section8,
        additionalSoftwareCategories: ["none"],
        additionalSoftwareCards: [],
      },
    };
  }

  const withoutNone = current.filter((c) => c !== "none");
  const has = withoutNone.includes(categoryId);
  const nextCategories = has
    ? withoutNone.filter((c) => c !== categoryId)
    : [...withoutNone, categoryId];

  let cards = draft.section8.additionalSoftwareCards;
  if (!has) {
    cards = [
      ...cards,
      {
        categoryId,
        softwareId: "",
        systemName: "",
        desiredAccess: "",
        otherCategoryLabel: "",
        otherDetails: "",
      },
    ];
  } else if (has) {
    cards = cards.filter((c) => c.categoryId !== categoryId);
  }

  return {
    ...draft,
    section8: {
      ...draft.section8,
      additionalSoftwareCategories: nextCategories,
      additionalSoftwareCards: cards,
    },
  };
}

export function updateAdditionalCard(
  draft: OnboardingDraft,
  categoryId: AdditionalSoftwareCategoryId,
  patch: Partial<Section8Data["additionalSoftwareCards"][number]>,
): OnboardingDraft {
  const cards = draft.section8.additionalSoftwareCards.map((card) => {
    if (card.categoryId !== categoryId) return card;
    return { ...card, ...patch };
  });
  const card = cards.find((c) => c.categoryId === categoryId);
  if (!card) return { ...draft, section8: { ...draft.section8, additionalSoftwareCards: cards } };

  const upsert = upsertAdditionalSoftware(
    draft.systems,
    card.softwareId,
    categoryId,
    patch.systemName ?? card.systemName,
    patch.desiredAccess ?? card.desiredAccess,
  );

  const nextCards = cards.map((c) =>
    c.categoryId === categoryId ? { ...c, softwareId: upsert.id } : c,
  );

  return {
    ...draft,
    systems: upsert.systems,
    section8: { ...draft.section8, additionalSoftwareCards: nextCards },
  };
}

export function toggleCapability(
  section8: Section8Data,
  capabilityId: Section8Data["authorizedCapabilities"][number],
): Section8Data {
  const has = section8.authorizedCapabilities.includes(capabilityId);
  const next = has
    ? section8.authorizedCapabilities.filter((c) => c !== capabilityId)
    : [...section8.authorizedCapabilities, capabilityId];
  return { ...section8, authorizedCapabilities: next };
}
