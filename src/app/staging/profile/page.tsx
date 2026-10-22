"use client";

import { useCallback, useMemo, useState } from "react";

type EditableSetting = {
  questionId: string;
  sectionId: string;
  debugLabel: string;
  classification: string;
  impact: string;
  answerKind: string;
};

type ProfileResponse = {
  ok?: boolean;
  reason?: string;
  authMode?: string;
  profile?: {
    customerId: string;
    currentRevision: number;
    fields: Record<string, { value?: unknown } | unknown>;
    publication: {
      status: string;
      approvedProfileRevision: number | null;
      configContentSha256: string | null;
      qaRequirements: Array<{ id: string; label: string; required: boolean; satisfied: boolean }>;
      lastFailure: { code: string; message: string } | null;
    };
  };
  editableCatalog?: Record<string, EditableSetting[]>;
};

function fieldDisplay(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && value !== null && "value" in value) {
    return fieldDisplay((value as { value: unknown }).value);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export default function StagingProfileEditorPage() {
  const [customerId, setCustomerId] = useState("");
  const [bearer, setBearer] = useState("");
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [history, setHistory] = useState<unknown[]>([]);
  const [generatePreview, setGeneratePreview] = useState<string>("");

  const headers = useMemo(() => {
    const h: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
    if (bearer.trim()) h.Authorization = `Bearer ${bearer.trim()}`;
    return h;
  }, [bearer]);

  const load = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/staging/profile?customerId=${encodeURIComponent(customerId)}`, {
        headers,
        cache: "no-store",
      });
      const json = (await res.json()) as ProfileResponse;
      setData(json);
      if (!json.ok) {
        setMessage(json.reason || `HTTP ${res.status}`);
        return;
      }
      const nextDrafts: Record<string, string> = {};
      for (const [qid, payload] of Object.entries(json.profile?.fields || {})) {
        if (qid.startsWith("_")) continue;
        nextDrafts[qid] = fieldDisplay(payload);
      }
      setDrafts(nextDrafts);
      setMessage(`Loaded revision ${json.profile?.currentRevision}`);
    } catch {
      setMessage("load_failed");
    } finally {
      setBusy(false);
    }
  }, [customerId, headers]);

  const loadHistory = useCallback(async () => {
    const res = await fetch(
      `/api/staging/profile/history?customerId=${encodeURIComponent(customerId)}`,
      { headers, cache: "no-store" },
    );
    const json = (await res.json()) as { ok?: boolean; revisions?: unknown[] };
    setHistory(json.revisions || []);
  }, [customerId, headers]);

  const savePatch = useCallback(async () => {
    if (!data?.profile) return;
    setBusy(true);
    setMessage("");
    try {
      const patch: Record<string, unknown> = {};
      for (const [qid, text] of Object.entries(drafts)) {
        const prior = fieldDisplay(data.profile.fields[qid]);
        if (text !== prior) {
          let parsed: unknown = text;
          if (text.startsWith("{") || text.startsWith("[")) {
            try {
              parsed = JSON.parse(text);
            } catch {
              parsed = text;
            }
          }
          patch[qid] = parsed;
        }
      }
      const res = await fetch("/api/staging/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          customerId,
          expectedRevision: data.profile.currentRevision,
          patch,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        reason?: string;
        revisionNumber?: number;
        diff?: { revisionImpact?: string; changes?: unknown[] };
      };
      if (!json.ok) {
        setMessage(json.reason || `HTTP ${res.status}`);
        return;
      }
      setMessage(
        `Saved revision ${json.revisionNumber} (${json.diff?.revisionImpact}, ${json.diff?.changes?.length || 0} fields)`,
      );
      await load();
      await loadHistory();
    } catch {
      setMessage("save_failed");
    } finally {
      setBusy(false);
    }
  }, [customerId, data, drafts, headers, load, loadHistory]);

  const generate = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/staging/profile/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({ customerId }),
      });
      const json = await res.json();
      setGeneratePreview(JSON.stringify(json, null, 2));
      setMessage(json.ok ? `Generated ${json.contentSha256?.slice(0, 12)}…` : json.reason || "generate_failed");
      await load();
    } finally {
      setBusy(false);
    }
  }, [customerId, headers, load]);

  const markQaAndPublish = useCallback(async () => {
    setBusy(true);
    try {
      const reqs = data?.profile?.publication?.qaRequirements || [];
      for (const req of reqs) {
        await fetch("/api/staging/profile/publish", {
          method: "POST",
          headers,
          body: JSON.stringify({
            customerId,
            action: "mark_qa",
            requirementId: req.id,
            satisfied: true,
          }),
        });
      }
      const res = await fetch("/api/staging/profile/publish", {
        method: "POST",
        headers,
        body: JSON.stringify({ customerId, action: "publish" }),
      });
      const json = await res.json();
      setMessage(json.ok ? `Publication ${json.publication?.status}` : json.reason || "publish_failed");
      await load();
    } finally {
      setBusy(false);
    }
  }, [customerId, data, headers, load]);

  const dryRunSync = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/staging/profile/sync-dry-run", {
        method: "POST",
        headers,
        body: JSON.stringify({ customerId }),
      });
      const json = await res.json();
      setGeneratePreview(JSON.stringify(json, null, 2));
      setMessage(json.ok ? `Dry-run plan (${json.plan?.length || 0} ops)` : json.reason || "dry_run_failed");
    } finally {
      setBusy(false);
    }
  }, [customerId, headers]);

  const rollback = useCallback(async () => {
    if (!data?.profile) return;
    setBusy(true);
    try {
      const res = await fetch("/api/staging/profile/rollback", {
        method: "POST",
        headers,
        body: JSON.stringify({
          customerId,
          expectedRevision: data.profile.currentRevision,
        }),
      });
      const json = await res.json();
      setMessage(json.ok ? `Rolled back to rev ${json.publication?.approvedProfileRevision}` : json.reason || "rollback_failed");
      await load();
      await loadHistory();
    } finally {
      setBusy(false);
    }
  }, [customerId, data, headers, load, loadHistory]);

  const sections = Object.entries(data?.editableCatalog || {});

  return (
    <main
      style={{
        fontFamily: "ui-sans-serif, system-ui",
        margin: "1.5rem auto",
        maxWidth: 1100,
        padding: "0 1rem",
        color: "#1a1a1a",
      }}
    >
      <h1 style={{ fontSize: "1.6rem", marginBottom: 4 }}>Staging business profile editor</h1>
      <p style={{ color: "#555", marginTop: 0 }}>
        Questionnaire-derived settings → immutable revisions → config generate → Trillet dry-run.
        Production customer editing stays disabled until tenant auth is verified.
      </p>

      <section
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "1fr 1fr auto",
          alignItems: "end",
          marginBottom: "1rem",
        }}
      >
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#666" }}>Customer UUID</span>
          <input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="customer uuid"
            style={{ padding: "0.55rem 0.7rem", border: "1px solid #ccc", borderRadius: 6 }}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 12, color: "#666" }}>Staging admin / profile bearer</span>
          <input
            value={bearer}
            onChange={(e) => setBearer(e.target.value)}
            placeholder="Bearer token"
            style={{ padding: "0.55rem 0.7rem", border: "1px solid #ccc", borderRadius: 6 }}
          />
        </label>
        <button
          type="button"
          disabled={busy || !customerId}
          onClick={() => {
            void load();
            void loadHistory();
          }}
          style={{
            padding: "0.65rem 1rem",
            borderRadius: 6,
            border: "none",
            background: "#06152b",
            color: "#c8ff00",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Load
        </button>
      </section>

      {message && (
        <p style={{ background: "#f4f7fb", border: "1px solid #d7deea", padding: "0.6rem 0.8rem", borderRadius: 6 }}>
          {message}
        </p>
      )}

      {data?.profile && (
        <section style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <span>Revision <strong>{data.profile.currentRevision}</strong></span>
            <span>Publication <strong>{data.profile.publication.status}</strong></span>
            <span>
              Approved{" "}
              <strong>{data.profile.publication.approvedProfileRevision ?? "—"}</strong>
            </span>
            <span>Auth <strong>{data.authMode}</strong></span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            <button type="button" disabled={busy} onClick={() => void savePatch()}>
              Save revision
            </button>
            <button type="button" disabled={busy} onClick={() => void generate()}>
              Generate AI config
            </button>
            <button type="button" disabled={busy} onClick={() => void dryRunSync()}>
              Trillet dry-run
            </button>
            <button type="button" disabled={busy} onClick={() => void markQaAndPublish()}>
              Mark QA + publish
            </button>
            <button type="button" disabled={busy} onClick={() => void rollback()}>
              Rollback to approved
            </button>
          </div>
          {data.profile.publication.lastFailure && (
            <p style={{ color: "#8a1f1f" }}>
              {data.profile.publication.lastFailure.code}: {data.profile.publication.lastFailure.message}
            </p>
          )}
          <ul style={{ fontSize: 13, color: "#444" }}>
            {data.profile.publication.qaRequirements.map((q) => (
              <li key={q.id}>
                [{q.satisfied ? "x" : " "}] {q.label}
                {q.required ? " (required)" : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.map(([sectionId, settings]) => (
        <section key={sectionId} style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem", borderBottom: "1px solid #e5e5e5", paddingBottom: 4 }}>
            Section {sectionId}
          </h2>
          <div style={{ display: "grid", gap: "0.75rem" }}>
            {settings.map((setting) => (
              <label key={setting.questionId} style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 13 }}>
                  <strong>{setting.questionId}</strong> — {setting.debugLabel}{" "}
                  <em style={{ color: "#666" }}>
                    ({setting.classification}, {setting.impact})
                  </em>
                </span>
                <textarea
                  value={drafts[setting.questionId] ?? ""}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [setting.questionId]: e.target.value }))
                  }
                  rows={setting.answerKind === "weekly_schedule" || setting.answerKind.includes("matrix") ? 5 : 2}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.65rem",
                    border: "1px solid #ccc",
                    borderRadius: 6,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                  }}
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      {history.length > 0 && (
        <section style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.1rem" }}>Change history</h2>
          <pre
            style={{
              background: "#0f1720",
              color: "#d7e2f0",
              padding: "0.75rem",
              borderRadius: 8,
              overflow: "auto",
              fontSize: 12,
            }}
          >
            {JSON.stringify(history, null, 2)}
          </pre>
        </section>
      )}

      {generatePreview && (
        <section>
          <h2 style={{ fontSize: "1.1rem" }}>Generator / dry-run output</h2>
          <pre
            style={{
              background: "#0f1720",
              color: "#d7e2f0",
              padding: "0.75rem",
              borderRadius: 8,
              overflow: "auto",
              fontSize: 12,
              maxHeight: 480,
            }}
          >
            {generatePreview}
          </pre>
        </section>
      )}
    </main>
  );
}
