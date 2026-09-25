"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadLocalDraft, saveLocalDraft, type SaveStatus } from "./persistence";
import { fetchServerDraft, putServerDraft } from "./server-api";
import { reconcileDrafts, hasDraftContent, addCompletedSection } from "./draft-utils";
import { applyPostSubmissionEditPolicy } from "./submissionIntegrity";
import { isSection4LinkedFeeProtected } from "./section4FeeLinks";
import {
  createDefaultDraft,
  createEmptyContact,
  createEmptyFee,
  type Contact,
  type FeeKey,
  type FeeRecord,
  type OnboardingDraft,
  type OnboardingNavigation,
  type Section1Data,
  type Section2Data,
  type Section3Data,
  type Section4Data,
  type Section5Data,
  type Section6Data,
  type Section7Data,
  type Section8Data,
  type SoftwareRecord,
  type OnboardingSubmission,
  createCustomFee,
  createFeeId,
} from "./types";

type OnboardingContextValue = {
  draft: OnboardingDraft;
  isDraftHydrated: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
  updateSection1: (patch: Partial<Section1Data>, options?: { immediate?: boolean }) => void;
  setSection1: (data: Section1Data) => void;
  updateSection2: (patch: Partial<Section2Data>, options?: { immediate?: boolean }) => void;
  setSection2: (data: Section2Data) => void;
  updateSection3: (patch: Partial<Section3Data>, options?: { immediate?: boolean }) => void;
  setSection3: (data: Section3Data) => void;
  updateSection4: (patch: Partial<Section4Data>, options?: { immediate?: boolean }) => void;
  setSection4: (data: Section4Data) => void;
  updateSection5: (patch: Partial<Section5Data>, options?: { immediate?: boolean }) => void;
  setSection5: (data: Section5Data) => void;
  updateSection6: (patch: Partial<Section6Data>, options?: { immediate?: boolean }) => void;
  setSection6: (data: Section6Data) => void;
  updateSection7: (patch: Partial<Section7Data>, options?: { immediate?: boolean }) => void;
  setSection7: (data: Section7Data) => void;
  updateSection8: (patch: Partial<Section8Data>, options?: { immediate?: boolean }) => void;
  setSection8: (data: Section8Data) => void;
  setSystems: (systems: SoftwareRecord[], options?: { immediate?: boolean }) => void;
  updateSection8Bundle: (
    section8: Section8Data,
    systems: SoftwareRecord[],
    options?: { immediate?: boolean },
  ) => void;
  updateSubmission: (patch: Partial<OnboardingSubmission>, options?: { immediate?: boolean }) => void;
  updateSubmissionConfirmations: (
    patch: Partial<OnboardingSubmission["confirmations"]>,
    options?: { immediate?: boolean },
  ) => void;
  /** Deterministic contact-registry creation — call only from an explicit
   * user action (e.g. a button onClick), never from a render/effect. */
  addContact: () => string;
  updateContact: (id: string, patch: Partial<Contact>, options?: { immediate?: boolean }) => void;
  /**
   * Upsert a singleton Section 4 fee by feeKey (late_cancellation /
   * no_show). Reuses the same fee ID on amount/rule edits — never
   * creates duplicates on rerender. Call only from explicit user
   * actions.
   */
  upsertFeeByKey: (feeKey: FeeKey, patch: Partial<FeeRecord>, options?: { immediate?: boolean }) => string;
  updateFee: (id: string, patch: Partial<FeeRecord>, options?: { immediate?: boolean }) => void;
  addFee: (options?: { immediate?: boolean }) => string;
  removeFee: (id: string, options?: { immediate?: boolean }) => void;
  duplicateFee: (id: string, options?: { immediate?: boolean }) => string;
  setNavigation: (nav: Partial<OnboardingNavigation>) => void;
  markSectionComplete: (sectionId: number) => void;
  setCurrentRoute: (route: string) => void;
  flushSave: () => Promise<void>;
  saveDraftNow: (next: OnboardingDraft) => Promise<void>;
  getDraftSnapshot: () => OnboardingDraft;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const TEXT_DEBOUNCE_MS = 500;

const FEE_DISPLAY_NAMES: Record<FeeKey, string> = {
  late_cancellation: "Late cancellation fee",
  no_show: "No-show fee",
};

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(createDefaultDraft);
  const [isDraftHydrated, setIsDraftHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const draftRef = useRef(draft);
  const currentRouteRef = useRef("/onboarding");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedSnapshotRef = useRef<string | null>(null);
  const pendingImmediateRef = useRef(false);
  const serverRetryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const touchUpdatedAt = useCallback((prev: OnboardingDraft): OnboardingDraft => {
    if (!hasDraftContent(prev) && prev.navigation.completedSections.length === 0) {
      return prev;
    }
    return { ...prev, updatedAt: new Date().toISOString() };
  }, []);

  const runServerSave = useCallback(async (next: OnboardingDraft, route: string) => {
    const result = await putServerDraft(next, route);
    if (!result.redisAvailable) {
      setSaveStatus("saved");
      setLastSavedAt(new Date());
      return;
    }
    if (!result.savedToRedis) {
      setSaveStatus("server-pending");
      if (!serverRetryRef.current) {
        serverRetryRef.current = setTimeout(() => {
          serverRetryRef.current = null;
          void runServerSave(draftRef.current, currentRouteRef.current);
        }, 5000);
      }
      return;
    }
    if (serverRetryRef.current) {
      clearTimeout(serverRetryRef.current);
      serverRetryRef.current = null;
    }
    setSaveStatus("saved");
    setLastSavedAt(new Date());
  }, []);

  const persistDraft = useCallback(
    (next: OnboardingDraft, immediate: boolean) => {
      if (!isDraftHydrated) return;

      const run = () => {
        setSaveStatus("saving");
        try {
          saveLocalDraft(next);
        } catch {
          setSaveStatus("error");
          return;
        }
        void runServerSave(next, currentRouteRef.current);
      };

      if (immediate) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        run();
        return;
      }

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(run, TEXT_DEBOUNCE_MS);
    },
    [isDraftHydrated, runServerSave],
  );

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const local = loadLocalDraft();
      let server: OnboardingDraft | null = null;
      let redisAvailable = false;

      try {
        const result = await fetchServerDraft();
        server = result.draft;
        redisAvailable = result.redisAvailable;
      } catch {
        server = null;
      }

      if (cancelled) return;

      const { draft: winner, needsServerSync, needsLocalSync } = reconcileDrafts(
        local,
        server,
      );

      setDraft(winner);
      draftRef.current = winner;
      hydratedSnapshotRef.current = JSON.stringify(winner);

      if (needsLocalSync) {
        saveLocalDraft(winner);
      }

      if (needsServerSync && redisAvailable) {
        try {
          await putServerDraft(winner, winner.currentRoute || "/onboarding");
        } catch {
          setSaveStatus("server-pending");
        }
      }

      setIsDraftHydrated(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isDraftHydrated) return;

    const serialized = JSON.stringify(draft);
    if (hydratedSnapshotRef.current === null) {
      hydratedSnapshotRef.current = serialized;
      return;
    }
    if (hydratedSnapshotRef.current === serialized) return;
    hydratedSnapshotRef.current = serialized;

    persistDraft(draft, pendingImmediateRef.current);
    pendingImmediateRef.current = false;
  }, [draft, isDraftHydrated, persistDraft]);

  const updateDraft = useCallback(
    (updater: (prev: OnboardingDraft) => OnboardingDraft, immediate = false) => {
      if (immediate) pendingImmediateRef.current = true;
      setDraft((prev) => {
        const rawNext = updater(prev);
        const withPolicy = applyPostSubmissionEditPolicy(prev, rawNext);
        const next = touchUpdatedAt(withPolicy);
        draftRef.current = next;
        return next;
      });
    },
    [touchUpdatedAt],
  );

  const updateSection1 = useCallback(
    (patch: Partial<Section1Data>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          section1: { ...prev.section1, ...patch },
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const setSection1 = useCallback(
    (data: Section1Data) => {
      updateDraft((prev) => ({ ...prev, section1: data }), true);
    },
    [updateDraft],
  );

  const updateSection2 = useCallback(
    (patch: Partial<Section2Data>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          section2: { ...prev.section2, ...patch },
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const setSection2 = useCallback(
    (data: Section2Data) => {
      updateDraft((prev) => ({ ...prev, section2: data }), true);
    },
    [updateDraft],
  );

  const updateSection3 = useCallback(
    (patch: Partial<Section3Data>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          section3: { ...prev.section3, ...patch },
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const setSection3 = useCallback(
    (data: Section3Data) => {
      updateDraft((prev) => ({ ...prev, section3: data }), true);
    },
    [updateDraft],
  );

  const updateSection4 = useCallback(
    (patch: Partial<Section4Data>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          section4: { ...prev.section4, ...patch },
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const setSection4 = useCallback(
    (data: Section4Data) => {
      updateDraft((prev) => ({ ...prev, section4: data }), true);
    },
    [updateDraft],
  );

  const updateSection5 = useCallback(
    (patch: Partial<Section5Data>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          section5: { ...prev.section5, ...patch },
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const setSection5 = useCallback(
    (data: Section5Data) => {
      updateDraft((prev) => ({ ...prev, section5: data }), true);
    },
    [updateDraft],
  );

  const updateSection6 = useCallback(
    (patch: Partial<Section6Data>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          section6: { ...prev.section6, ...patch },
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const setSection6 = useCallback(
    (data: Section6Data) => {
      updateDraft((prev) => ({ ...prev, section6: data }), true);
    },
    [updateDraft],
  );

  const updateSection7 = useCallback(
    (patch: Partial<Section7Data>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          section7: { ...prev.section7, ...patch },
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const setSection7 = useCallback(
    (data: Section7Data) => {
      updateDraft((prev) => ({ ...prev, section7: data }), true);
    },
    [updateDraft],
  );

  const updateSection8 = useCallback(
    (patch: Partial<Section8Data>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          section8: { ...prev.section8, ...patch },
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const setSection8 = useCallback(
    (data: Section8Data) => {
      updateDraft((prev) => ({ ...prev, section8: data }), true);
    },
    [updateDraft],
  );

  const setSystems = useCallback(
    (systems: SoftwareRecord[], options?: { immediate?: boolean }) => {
      updateDraft((prev) => ({ ...prev, systems }), options?.immediate);
    },
    [updateDraft],
  );

  const updateSection8Bundle = useCallback(
    (section8: Section8Data, systems: SoftwareRecord[], options?: { immediate?: boolean }) => {
      updateDraft((prev) => ({ ...prev, section8, systems }), options?.immediate ?? true);
    },
    [updateDraft],
  );

  const updateSubmission = useCallback(
    (patch: Partial<OnboardingSubmission>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          submission: {
            ...prev.submission,
            ...patch,
            confirmations: {
              ...prev.submission.confirmations,
              ...patch.confirmations,
            },
          },
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const updateSubmissionConfirmations = useCallback(
    (patch: Partial<OnboardingSubmission["confirmations"]>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          submission: {
            ...prev.submission,
            confirmations: { ...prev.submission.confirmations, ...patch },
          },
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  /**
   * Creates exactly one new contact and appends it to the shared
   * registry. This is only ever invoked from a deliberate user action
   * (a button onClick — e.g. "+ Add another contact" or "Yes" on the
   * backup-contact question), never from a render or effect, so the
   * registry never accumulates duplicate/phantom records.
   */
  const addContact = useCallback((): string => {
    const contact = createEmptyContact();
    updateDraft((prev) => ({ ...prev, contacts: [...prev.contacts, contact] }), true);
    return contact.id;
  }, [updateDraft]);

  const updateContact = useCallback(
    (id: string, patch: Partial<Contact>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          contacts: prev.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const upsertFeeByKey = useCallback(
    (feeKey: FeeKey, patch: Partial<FeeRecord>, options?: { immediate?: boolean }): string => {
      const existing = draftRef.current.fees.find((f) => f.feeKey === feeKey);
      if (existing) {
        updateDraft(
          (prev) => ({
            ...prev,
            fees: prev.fees.map((f) =>
              f.id === existing.id ? { ...f, ...patch, feeKey, id: existing.id } : f,
            ),
          }),
          options?.immediate ?? true,
        );
        return existing.id;
      }
      const created = {
        ...createEmptyFee(feeKey, FEE_DISPLAY_NAMES[feeKey]),
        ...patch,
        feeKey,
        name: patch.name ?? FEE_DISPLAY_NAMES[feeKey],
      };
      updateDraft((prev) => ({ ...prev, fees: [...prev.fees, created] }), options?.immediate ?? true);
      return created.id;
    },
    [updateDraft],
  );

  const updateFee = useCallback(
    (id: string, patch: Partial<FeeRecord>, options?: { immediate?: boolean }) => {
      updateDraft(
        (prev) => ({
          ...prev,
          fees: prev.fees.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        }),
        options?.immediate,
      );
    },
    [updateDraft],
  );

  const addFee = useCallback(
    (options?: { immediate?: boolean }): string => {
      const created = createCustomFee();
      updateDraft((prev) => ({ ...prev, fees: [...prev.fees, created] }), options?.immediate ?? true);
      return created.id;
    },
    [updateDraft],
  );

  const duplicateFee = useCallback(
    (id: string, options?: { immediate?: boolean }): string => {
      const source = draftRef.current.fees.find((f) => f.id === id);
      if (!source) return "";
      const copy = {
        ...source,
        id: createFeeId(),
        feeKey: "" as const,
        sourceSection: 5 as const,
      };
      updateDraft((prev) => ({ ...prev, fees: [...prev.fees, copy] }), options?.immediate ?? true);
      return copy.id;
    },
    [updateDraft],
  );

  const removeFee = useCallback(
    (id: string, options?: { immediate?: boolean }) => {
      if (isSection4LinkedFeeProtected(id, draftRef.current.section4)) {
        return;
      }
      updateDraft((prev) => {
        const nextFees = prev.fees.filter((f) => f.id !== id);

        const servicePricingRules = { ...prev.section5.servicePricingRules };
        for (const [serviceId, rule] of Object.entries(servicePricingRules)) {
          if (!rule.linkedFeeIds.includes(id)) continue;
          servicePricingRules[serviceId] = {
            ...rule,
            linkedFeeIds: rule.linkedFeeIds.filter((feeId) => feeId !== id),
          };
        }

        return {
          ...prev,
          fees: nextFees,
          section5: { ...prev.section5, servicePricingRules },
        };
      }, options?.immediate ?? true);
    },
    [updateDraft],
  );

  const setNavigation = useCallback(
    (nav: Partial<OnboardingNavigation>) => {
      updateDraft(
        (prev) => ({
          ...prev,
          navigation: { ...prev.navigation, ...nav },
        }),
        true,
      );
    },
    [updateDraft],
  );

  const markSectionComplete = useCallback(
    (sectionId: number) => {
      // Banked completion is monotonic: once a section is marked
      // complete it stays complete even if the user re-opens it to
      // edit, and re-marking it is a no-op (no spurious save trigger).
      if (draftRef.current.navigation.completedSections.includes(sectionId)) return;
      updateDraft(
        (prev) => ({
          ...prev,
          navigation: {
            ...prev.navigation,
            completedSections: addCompletedSection(prev.navigation.completedSections, sectionId),
          },
        }),
        true,
      );
    },
    [updateDraft],
  );

  const setCurrentRoute = useCallback(
    (route: string) => {
      currentRouteRef.current = route;
      updateDraft((prev) => ({ ...prev, currentRoute: route }), true);
    },
    [updateDraft],
  );

  const flushSave = useCallback(async () => {
    if (!isDraftHydrated) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const next = draftRef.current;
    setSaveStatus("saving");
    saveLocalDraft(next);
    const result = await putServerDraft(next, currentRouteRef.current, { keepalive: true });
    if (!result.redisAvailable || result.savedToRedis) {
      setSaveStatus("saved");
      setLastSavedAt(new Date());
    } else {
      setSaveStatus("server-pending");
    }
  }, [isDraftHydrated]);

  const getDraftSnapshot = useCallback(() => draftRef.current, []);

  const saveDraftNow = useCallback(
    async (next: OnboardingDraft) => {
      if (!isDraftHydrated) return;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      draftRef.current = next;
      hydratedSnapshotRef.current = JSON.stringify(next);
      setDraft(next);
      setSaveStatus("saving");
      saveLocalDraft(next);
      const result = await putServerDraft(next, currentRouteRef.current, {
        keepalive: true,
      });
      if (!result.redisAvailable || result.savedToRedis) {
        setSaveStatus("saved");
        setLastSavedAt(new Date());
      } else {
        setSaveStatus("server-pending");
      }
    },
    [isDraftHydrated],
  );

  useEffect(() => {
    if (!isDraftHydrated) return;

    const onHide = () => {
      void flushSave();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        void flushSave();
      }
    };

    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isDraftHydrated, flushSave]);

  const value = useMemo(
    () => ({
      draft,
      isDraftHydrated,
      saveStatus,
      lastSavedAt,
      updateSection1,
      setSection1,
      updateSection2,
      setSection2,
      updateSection3,
      setSection3,
      updateSection4,
      setSection4,
      updateSection5,
      setSection5,
      updateSection6,
      setSection6,
      updateSection7,
      setSection7,
      updateSection8,
      setSection8,
      setSystems,
      updateSection8Bundle,
      updateSubmission,
      updateSubmissionConfirmations,
      addContact,
      updateContact,
      upsertFeeByKey,
      updateFee,
      addFee,
      removeFee,
      duplicateFee,
      setNavigation,
      markSectionComplete,
      setCurrentRoute,
      flushSave,
      saveDraftNow,
      getDraftSnapshot,
    }),
    [
      draft,
      isDraftHydrated,
      saveStatus,
      lastSavedAt,
      updateSection1,
      setSection1,
      updateSection2,
      setSection2,
      updateSection3,
      setSection3,
      updateSection4,
      setSection4,
      updateSection5,
      setSection5,
      updateSection6,
      setSection6,
      updateSection7,
      setSection7,
      updateSection8,
      setSection8,
      setSystems,
      updateSection8Bundle,
      updateSubmission,
      updateSubmissionConfirmations,
      addContact,
      updateContact,
      upsertFeeByKey,
      updateFee,
      addFee,
      removeFee,
      duplicateFee,
      setNavigation,
      markSectionComplete,
      setCurrentRoute,
      flushSave,
      saveDraftNow,
      getDraftSnapshot,
    ],
  );

  if (!isDraftHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-alexander-bg)]">
        <p className="text-sm text-[var(--color-alexander-muted)]">Loading…</p>
      </div>
    );
  }

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
