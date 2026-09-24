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
import {
  createDefaultDraft,
  type OnboardingDraft,
  type OnboardingNavigation,
  type Section1Data,
  type Section2Data,
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
  setNavigation: (nav: Partial<OnboardingNavigation>) => void;
  markSectionComplete: (sectionId: number) => void;
  setCurrentRoute: (route: string) => void;
  flushSave: () => Promise<void>;
  saveDraftNow: (next: OnboardingDraft) => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const TEXT_DEBOUNCE_MS = 500;

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
        const next = touchUpdatedAt(updater(prev));
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
      setNavigation,
      markSectionComplete,
      setCurrentRoute,
      flushSave,
      saveDraftNow,
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
      setNavigation,
      markSectionComplete,
      setCurrentRoute,
      flushSave,
      saveDraftNow,
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
