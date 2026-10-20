const PILOT_ONBOARDING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type PilotEnv = {
  PERSISTENCE_V2_ENABLED?: string;
  PERSISTENCE_V2_PILOT_ONBOARDING_IDS?: string;
};

function pilotEnv(env?: PilotEnv): PilotEnv {
  return env ?? (process.env as PilotEnv);
}

export function persistenceV2Enabled(env?: PilotEnv): boolean {
  return pilotEnv(env).PERSISTENCE_V2_ENABLED === "true";
}

/** Comma-separated onboarding UUIDs. Empty unless a pilot id is configured. */
export function pilotOnboardingIds(env?: PilotEnv): string[] {
  const raw = pilotEnv(env).PERSISTENCE_V2_PILOT_ONBOARDING_IDS ?? "";
  const ids = raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part) => PILOT_ONBOARDING_ID.test(part));
  return [...new Set(ids)];
}

export function pilotOnboardingAllowed(onboardingId: string, env?: PilotEnv): boolean {
  return pilotOnboardingIds(env).includes(onboardingId.trim().toLowerCase());
}
