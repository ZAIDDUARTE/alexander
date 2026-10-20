import { createHash, randomBytes } from "node:crypto";
import { invokePersistenceLambda } from "@/lib/server/aws-persistence";
import { tokenHash, verifyCall, type Binding } from "./intake";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function headers(apiKey: string, workspaceId: string): HeadersInit {
  return {
    "x-api-key": apiKey,
    "x-workspace-id": workspaceId,
    "Content-Type": "application/json",
  };
}

async function getJson(url: string, apiKey: string, workspaceId: string) {
  const response = await fetch(url, {
    headers: headers(apiKey, workspaceId),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { ok: response.ok, status: response.status, body };
}

function listCallId(row: Record<string, unknown>): string | null {
  if (typeof row._id === "string" && row._id) return row._id;
  if (typeof row.callId === "string" && row.callId) return row.callId;
  return null;
}

function parseBinding(payload: unknown): Binding | null {
  const root = asRecord(payload);
  const binding = asRecord(root?.binding);
  if (!binding) return null;
  if (
    typeof binding.id !== "string" ||
    typeof binding.customerId !== "string" ||
    typeof binding.workspaceId !== "string" ||
    typeof binding.flowId !== "string" ||
    typeof binding.agentId !== "string" ||
    typeof binding.activatedAt !== "string"
  ) {
    return null;
  }
  return {
    id: binding.id,
    customerId: binding.customerId,
    workspaceId: binding.workspaceId,
    flowId: binding.flowId,
    agentId: binding.agentId,
    activatedAt: binding.activatedAt,
    timezone: "America/Los_Angeles",
  };
}

export type PollConfig = {
  apiKey: string;
  workspaceId: string;
  flowId: string;
  agentId: string;
  webhookToken: string;
  lookbackMs?: number;
  /** When empty, poll processes nothing (fail-closed isolation). */
  approvedCallIds: string[];
  /** Explicit single-call import mode bypasses list and requires the ID in approvedCallIds. */
  onlyCallId?: string | null;
};

export function parseApprovedCallIds(raw: string | null | undefined): string[] {
  return (raw || "")
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter((part) => /^[a-zA-Z0-9_-]{8,128}$/.test(part));
}

async function resolveBinding(config: PollConfig): Promise<
  | { ok: true; binding: Binding; tokenHash: string }
  | { ok: false; reason: string; payload?: unknown }
> {
  const hash = tokenHash(config.webhookToken);
  const resolution = await invokePersistenceLambda({
    operation: "resolveRequestInstallation",
    tokenHash: hash,
  });
  if (!resolution.ok) {
    return { ok: false, reason: "installation_unresolved", payload: resolution.payload };
  }
  const finalBinding = parseBinding(resolution.payload);
  if (!finalBinding) return { ok: false, reason: "binding_missing" };
  if (
    finalBinding.workspaceId !== config.workspaceId ||
    finalBinding.flowId !== config.flowId ||
    finalBinding.agentId !== config.agentId
  ) {
    return {
      ok: false,
      reason: "binding_mismatch",
      payload: {
        workspaceId: finalBinding.workspaceId,
        flowId: finalBinding.flowId,
        agentId: finalBinding.agentId,
      },
    };
  }
  return { ok: true, binding: finalBinding, tokenHash: hash };
}

async function ingestApprovedCalls(
  config: PollConfig,
  callIds: string[],
  window: { from: string; to: string } | null,
) {
  const resolved = await resolveBinding(config);
  if (!resolved.ok) {
    return {
      ok: false as const,
      reason: resolved.reason,
      payload: resolved.payload,
    };
  }

  const results: Array<Record<string, unknown>> = [];
  for (const callId of callIds.slice(0, 25)) {
    const detail = await getJson(
      `https://api.trillet.ai/v2/api/call-history/${encodeURIComponent(callId)}`,
      config.apiKey,
      config.workspaceId,
    );
    if (!detail.ok) {
      results.push({ callId, ok: false, reason: "detail_failed", status: detail.status });
      continue;
    }
    try {
      verifyCall(detail.body, callId, resolved.binding);
    } catch (err) {
      results.push({
        callId,
        ok: false,
        reason: err instanceof Error ? err.message : "verify_failed",
      });
      continue;
    }
    const persisted = await invokePersistenceLambda({
      operation: "persistVerifiedCall",
      tokenHash: resolved.tokenHash,
      callId,
      call: detail.body,
    });
    results.push({ callId, ok: persisted.ok, payload: persisted.payload });
  }

  return {
    ok: true as const,
    listed: callIds.length,
    processed: results.length,
    results,
    window,
    isolation: "approved_call_ids_only",
  };
}

/**
 * Staging-only completed-call ingestion via Trillet call-history.
 * Fail-closed: with an empty approvedCallIds list, nothing is ingested.
 * Overlap-safe: persistence dedupes on (installation_id, call_id).
 */
export async function pollStagingCompletedCalls(config: PollConfig) {
  const approved = new Set(config.approvedCallIds);
  if (approved.size === 0) {
    return {
      ok: true as const,
      listed: 0,
      processed: 0,
      results: [],
      window: null,
      isolation: "fail_closed_no_approved_call_ids",
    };
  }

  const lookbackMs = config.lookbackMs ?? 2 * 60 * 60 * 1000;
  const from = new Date(Date.now() - lookbackMs).toISOString();
  const to = new Date().toISOString();

  if (config.onlyCallId) {
    if (!approved.has(config.onlyCallId)) {
      return {
        ok: false as const,
        reason: "call_id_not_approved",
        callId: config.onlyCallId,
      };
    }
    return ingestApprovedCalls(config, [config.onlyCallId], { from, to });
  }

  const attempts: Array<{ label: string; params: URLSearchParams }> = [
    {
      label: "agent_flow_status",
      params: new URLSearchParams({
        page: "1",
        limit: "25",
        status: "completed",
        agentId: config.agentId,
        callFlowId: config.flowId,
      }),
    },
    {
      label: "agent_status_daterange_iso_date",
      params: new URLSearchParams({
        page: "1",
        limit: "25",
        status: "completed",
        agentId: config.agentId,
        dateRange: JSON.stringify({ from: from.slice(0, 10), to: to.slice(0, 10) }),
      }),
    },
    {
      label: "status_only",
      params: new URLSearchParams({
        page: "1",
        limit: "25",
        status: "completed",
      }),
    },
  ];

  let list: { ok: boolean; status: number; body: unknown } | null = null;
  let listAttempt: string | null = null;
  for (const attempt of attempts) {
    const res = await getJson(
      `https://api.trillet.ai/v2/api/call-history?${attempt.params.toString()}`,
      config.apiKey,
      config.workspaceId,
    );
    if (res.ok) {
      list = res;
      listAttempt = attempt.label;
      break;
    }
    list = res;
    listAttempt = attempt.label;
  }
  if (!list?.ok) {
    return {
      ok: false as const,
      reason: "list_failed",
      status: list?.status ?? 0,
      error: list?.body,
      listAttempt,
    };
  }

  const root = asRecord(list.body);
  const rows = Array.isArray(list.body)
    ? list.body
    : Array.isArray(root?.data)
      ? (root!.data as unknown[])
      : Array.isArray(root?.calls)
        ? (root!.calls as unknown[])
        : [];

  const matchedIds: string[] = [];
  const skipped: Array<Record<string, unknown>> = [];
  for (const raw of rows.slice(0, 25)) {
    const row = asRecord(raw);
    if (!row) continue;
    const callId = listCallId(row);
    if (!callId || !/^[a-zA-Z0-9_-]{8,128}$/.test(callId)) {
      skipped.push({ skipped: true, reason: "invalid_call_id" });
      continue;
    }
    if (!approved.has(callId)) {
      skipped.push({ callId, skipped: true, reason: "not_in_approved_allowlist" });
      continue;
    }
    matchedIds.push(callId);
  }

  const ingested = await ingestApprovedCalls(config, matchedIds, { from, to });
  if (!ingested.ok) return ingested;
  return {
    ...ingested,
    listed: rows.length,
    skipped,
    listAttempt,
  };
}

export function mintStagingTokens() {
  const webhookToken = randomBytes(32).toString("base64url");
  const readerToken = randomBytes(32).toString("base64url");
  return {
    webhookToken,
    readerToken,
    webhookTokenHash: createHash("sha256").update(webhookToken).digest("hex"),
    readerTokenHash: createHash("sha256").update(readerToken).digest("hex"),
  };
}
