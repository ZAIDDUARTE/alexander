/**
 * One-shot direct-provider invite QA (not the shared Lambda customer pipeline).
 *
 * Default mode (Sandbox — historical):
 *   TRILLET_API_KEY from env or /tmp/alx-trillet-key
 *   STAGING_TRILLET_WORKSPACE_ID=6abd357328c5bf65189aca13
 *   INVITE_EMAIL=operator@example.com DRY_RUN=true
 *
 * Phillip mode (Step 03.8 — requires explicit allowlists):
 *   ALLOW_PHILLIP_WORKSPACE_TEST=true
 *   ALLOWED_WORKSPACE_IDS=<exact Phillip workspace id>
 *   ALLOWED_INVITE_EMAILS=operator@example.com
 *   STAGING_TRILLET_WORKSPACE_ID=<same Phillip id>
 *   DRY_RUN=true|false LIVE_SEND=true
 *
 * Never prints API keys, invitation tokens, or passwords.
 */

import { readFileSync, existsSync } from "node:fs";

const API = "https://api.trillet.ai";
const SANDBOX_NAME = "Alexander Sandbox";
const SANDBOX_ID = "6abd357328c5bf65189aca13";
const PHILLIP_NAME_RE = /^Phillip Lew'?s Workspace$/i;

type Workspace = { _id?: string; id?: string; name?: string; teamMembers?: unknown[] };

function readApiKey(): string {
  const fromEnv = (process.env.TRILLET_API_KEY || "").trim();
  if (fromEnv && fromEnv !== "[SENSITIVE]") return fromEnv;
  const path = (process.env.TRILLET_API_KEY_FILE || "/tmp/alx-trillet-key").trim();
  if (!existsSync(path)) throw new Error(`missing_api_key_file:${path}`);
  const fromFile = readFileSync(path, "utf8").trim();
  if (!fromFile || fromFile.length < 16) throw new Error("api_key_file_invalid");
  return fromFile;
}

function csvSet(raw: string | undefined): Set<string> {
  return new Set(
    (raw || "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  );
}

async function trillet(
  method: string,
  path: string,
  apiKey: string,
  workspaceId: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      "x-api-key": apiKey,
      "x-workspace-id": workspaceId,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 200) };
  }
  return { status: response.status, body: parsed };
}

function asWorkspaces(body: unknown): Workspace[] {
  if (Array.isArray(body)) return body as Workspace[];
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const rows = record.workspaces || record.data;
    if (Array.isArray(rows)) return rows as Workspace[];
  }
  return [];
}

function wid(w: Workspace): string {
  return String(w._id || w.id || "");
}

function memberEmails(workspaceDetail: unknown): string[] {
  if (!workspaceDetail || typeof workspaceDetail !== "object") return [];
  const tm = (workspaceDetail as { teamMembers?: unknown }).teamMembers;
  if (!Array.isArray(tm)) return [];
  const emails: string[] = [];
  for (const raw of tm) {
    if (!raw || typeof raw !== "object") continue;
    const nested =
      (raw as { userId?: unknown }).userId &&
      typeof (raw as { userId?: unknown }).userId === "object"
        ? ((raw as { userId: { email?: unknown } }).userId.email ?? null)
        : null;
    const email =
      (raw as { email?: unknown }).email ??
      (raw as { userEmail?: unknown }).userEmail ??
      nested;
    if (typeof email === "string" && email.includes("@")) emails.push(email.toLowerCase());
  }
  return emails;
}

async function main(): Promise<void> {
  const apiKey = readApiKey();
  const workspaceId = (process.env.STAGING_TRILLET_WORKSPACE_ID || "").trim();
  const email = (process.env.INVITE_EMAIL || "").trim().toLowerCase();
  if (!email.includes("@")) throw new Error("invite_email_required");
  const dryRun = (process.env.DRY_RUN || "true").toLowerCase() !== "false";
  const liveSend = (process.env.LIVE_SEND || "").toLowerCase() === "true";
  const allowPhillip = (process.env.ALLOW_PHILLIP_WORKSPACE_TEST || "").toLowerCase() === "true";
  const allowedWorkspaceIds = csvSet(process.env.ALLOWED_WORKSPACE_IDS);
  const allowedEmails = csvSet(process.env.ALLOWED_INVITE_EMAILS);

  if (!workspaceId) throw new Error("missing_STAGING_TRILLET_WORKSPACE_ID");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("invalid_email");

  if (allowPhillip) {
    if (!allowedWorkspaceIds.has(workspaceId)) {
      throw new Error("phillip_mode_requires_ALLOWED_WORKSPACE_IDS_exact_match");
    }
    if (allowedEmails.size === 0 || !allowedEmails.has(email)) {
      throw new Error("phillip_mode_requires_ALLOWED_INVITE_EMAILS_exact_match");
    }
  } else {
    // Historical Sandbox-only path.
    if (workspaceId !== SANDBOX_ID) throw new Error("sandbox_mode_requires_alexander_sandbox_id");
    const allowed = csvSet(process.env.ALLOWED_INVITE_EMAILS);
    if (!allowed.has(email)) throw new Error("recipient_not_approved_for_sandbox_script");
  }

  // List-all is currently broken for this key (HTTP 500). In Phillip allowlist mode,
  // fall back to GET-by-id name verification. Sandbox mode still requires list success
  // when available, otherwise verifies Sandbox via GET-by-id only.
  const listed = await trillet("GET", "/v1/api/workspaces", apiKey, workspaceId);
  let workspaces = asWorkspaces(listed.body).map((w) => ({ id: wid(w), name: w.name || null }));
  if (listed.status === 200) {
    console.log(JSON.stringify({ ok: true, step: "list_workspaces", workspaces }, null, 2));
  } else {
    console.log(
      JSON.stringify({
        ok: false,
        step: "list_workspaces",
        status: listed.status,
        fallback: "get_workspace_by_id",
      }),
    );
    if (!allowPhillip && workspaceId !== SANDBOX_ID) {
      process.exit(2);
    }
  }

  const detail = await trillet(
    "GET",
    `/v1/api/workspaces/${encodeURIComponent(workspaceId)}`,
    apiKey,
    workspaceId,
  );
  const detailName =
    detail.body && typeof detail.body === "object"
      ? String((detail.body as { name?: string }).name || "")
      : "";
  const alreadyMember = memberEmails(detail.body).includes(email);
  const members = memberEmails(detail.body);
  console.log(
    JSON.stringify({
      ok: detail.status === 200,
      step: "verify_workspace",
      status: detail.status,
      name: detailName,
      workspaceId,
      alreadyMember,
      memberCount: members.length,
      mode: allowPhillip ? "phillip_allowlisted" : "sandbox",
    }),
  );
  if (detail.status !== 200) process.exit(2);

  if (allowPhillip) {
    if (!PHILLIP_NAME_RE.test(detailName)) throw new Error(`phillip_name_mismatch:${detailName}`);
    if (workspaceId === SANDBOX_ID || detailName === SANDBOX_NAME) {
      throw new Error("refusing_sandbox_in_phillip_mode");
    }
  } else {
    if (detailName !== SANDBOX_NAME) throw new Error(`target_not_alexander_sandbox:${detailName}`);
    if (PHILLIP_NAME_RE.test(detailName)) throw new Error("refusing_phillip_workspace");
  }

  if (listed.status === 200) {
    const target = workspaces.find((w) => w.id === workspaceId);
    if (!target) throw new Error("target_workspace_not_in_list");
  }

  // Roles / viewer permissions (read-only; no mutations).
  const rolesRes = await trillet(
    "GET",
    "/v1/api/roles-and-permissions/roles",
    apiKey,
    workspaceId,
  );
  let viewerPermissions: unknown = null;
  let viewerRoleName: string | null = null;
  if (rolesRes.status === 200) {
    const rows = Array.isArray(rolesRes.body)
      ? rolesRes.body
      : rolesRes.body && typeof rolesRes.body === "object"
        ? ((rolesRes.body as { roles?: unknown[] }).roles || [])
        : [];
    for (const raw of rows) {
      if (!raw || typeof raw !== "object") continue;
      const name = String((raw as { name?: string }).name || "");
      if (name.toLowerCase() === "viewer") {
        // Prefer exact invite role token "viewer" over display-case "Viewer".
        if (name === "viewer" || viewerPermissions == null) {
          viewerRoleName = name;
          viewerPermissions = (raw as { permissions?: unknown }).permissions ?? null;
        }
      }
    }
  }
  console.log(
    JSON.stringify({
      ok: true,
      step: "viewer_role",
      rolesHttpStatus: rolesRes.status,
      viewerRoleName,
      viewerPermissions,
    }),
  );

  const agentsRes = await trillet("GET", "/v1/api/agents", apiKey, workspaceId);
  const agentRows = Array.isArray(agentsRes.body)
    ? agentsRes.body
    : agentsRes.body && typeof agentsRes.body === "object"
      ? ((agentsRes.body as { agents?: unknown[] }).agents ||
        (agentsRes.body as { data?: unknown[] }).data ||
        [])
      : [];
  const agents = (agentRows || [])
    .filter((a): a is Record<string, unknown> => !!a && typeof a === "object")
    .map((a) => ({
      id: a._id || a.id || null,
      name: a.name || null,
      status: a.status || null,
    }));
  console.log(
    JSON.stringify({ ok: agentsRes.status === 200, step: "agents", status: agentsRes.status, agents }),
  );

  const planned = {
    endpoint: `POST ${API}/v1/api/workspaces/${workspaceId}/invite`,
    email,
    role: "viewer",
    workspaceId,
    workspaceName: detailName,
    alreadyMember,
  };
  console.log(JSON.stringify({ ok: true, step: "dry_run_payload", planned }, null, 2));

  if (alreadyMember) {
    console.log(
      JSON.stringify({
        ok: false,
        step: "blocked",
        reason: "recipient_already_member",
      }),
    );
    process.exit(4);
  }

  if (dryRun || !liveSend) {
    console.log(JSON.stringify({ ok: true, step: "stopped_before_live", reason: "DRY_RUN" }));
    return;
  }

  if (allowPhillip && (process.env.CONFIRM_PHILLIP_LIVE_INVITE || "").toLowerCase() !== "true") {
    console.log(
      JSON.stringify({
        ok: false,
        step: "blocked",
        reason: "CONFIRM_PHILLIP_LIVE_INVITE_required",
      }),
    );
    process.exit(5);
  }

  const sent = await trillet(
    "POST",
    `/v1/api/workspaces/${encodeURIComponent(workspaceId)}/invite`,
    apiKey,
    workspaceId,
    { email, role: "viewer" },
  );
  const record = sent.body && typeof sent.body === "object" ? (sent.body as Record<string, unknown>) : {};
  console.log(
    JSON.stringify(
      {
        ok: sent.status >= 200 && sent.status < 300 && record.success !== false,
        step: "live_invite",
        httpStatus: sent.status,
        success: record.success ?? null,
        message: typeof record.message === "string" ? record.message.slice(0, 200) : null,
        recipient: email,
        role: "viewer",
        workspaceId,
        workspaceName: detailName,
      },
      null,
      2,
    ),
  );
  if (!(sent.status >= 200 && sent.status < 300 && record.success !== false)) process.exit(3);
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: String(error instanceof Error ? error.message : error) }));
  process.exit(1);
});
