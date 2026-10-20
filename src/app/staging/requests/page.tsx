import { cookies, headers } from "next/headers";

export const dynamic = "force-dynamic";

type Board = {
  ok?: boolean;
  counts?: Record<string, number>;
  requests?: Array<{
    id: string;
    call_id: string;
    status: string;
    reason: string;
    created_at: string;
    fields_json?: Record<string, unknown>;
  }>;
  attention?: Array<{ call_id: string; disposition: string; received_at: string }>;
  error?: string;
  reason?: string;
};

const STATUSES = ["Received", "Pending Review", "Synced", "Failed", "Needs Attention"] as const;

async function loadBoard(): Promise<Board> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "alexander-jobber-staging.vercel.app";
  const proto = h.get("x-forwarded-proto") || "https";
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const auth = h.get("authorization");
  try {
    const response = await fetch(`${proto}://${host}/api/staging/service-requests`, {
      headers: {
        ...(auth ? { authorization: auth } : {}),
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        accept: "application/json",
      },
      cache: "no-store",
    });
    return (await response.json()) as Board;
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

export default async function StagingRequestsPage() {
  const board = await loadBoard();
  const counts = board.counts || Object.fromEntries(STATUSES.map((s) => [s, 0]));

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", margin: "2rem auto", maxWidth: 960, padding: "0 1rem" }}>
      <h1 style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>Staging service requests</h1>
      <p style={{ color: "#444", marginTop: 0 }}>
        QA board for persisted Alexander request states. No CRM writes. Production is not connected.
      </p>

      {!board.ok && (
        <p style={{ background: "#fff4e5", padding: "0.75rem 1rem", borderRadius: 8 }}>
          Unable to load board ({board.error || board.reason || "unauthorized"}). Authenticate with the staging
          Jobber admin token (Bearer) or a signed admin cookie from Jobber connect.
        </p>
      )}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "0.75rem", margin: "1.5rem 0" }}>
        {STATUSES.map((status) => (
          <div key={status} style={{ border: "1px solid #ddd", borderRadius: 8, padding: "0.75rem" }}>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>{status}</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{counts[status] ?? 0}</div>
          </div>
        ))}
      </section>

      <h2 style={{ fontSize: "1.2rem" }}>Requests</h2>
      {(board.requests || []).length === 0 ? (
        <p style={{ color: "#666" }}>No durable service requests yet.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {(board.requests || []).map((row) => (
            <li key={row.id} style={{ borderTop: "1px solid #eee", padding: "0.75rem 0" }}>
              <strong>{row.status}</strong> · {row.reason}
              <div style={{ fontSize: "0.85rem", color: "#555" }}>
                call {row.call_id} · {row.created_at}
              </div>
              {row.fields_json?.caller_name || row.fields_json?.service_requested ? (
                <div style={{ fontSize: "0.9rem", marginTop: 4 }}>
                  {String(row.fields_json?.caller_name || "Unknown")} — {String(row.fields_json?.service_requested || "")}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: "1.2rem", marginTop: "2rem" }}>Attention events</h2>
      {(board.attention || []).length === 0 ? (
        <p style={{ color: "#666" }}>No attention events.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {(board.attention || []).map((row) => (
            <li key={`${row.call_id}-${row.received_at}`} style={{ borderTop: "1px solid #eee", padding: "0.5rem 0" }}>
              {row.disposition} · call {row.call_id}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
