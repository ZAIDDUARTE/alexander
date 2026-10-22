import type { RuntimeConfigurationV1 } from "@/lib/runtime-config/types";

/**
 * Dry-run Trillet configuration sync.
 *
 * Supported documented operations only (see docs.trillet.ai):
 * - GET  /v1/api/workspaces/{workspaceId}
 * - GET  /v1/api/agents
 * - GET  /v1/api/agents/{agentId}
 * - GET  /v1/api/call-flows
 * - GET  /v1/api/call-flows/{id}
 * - GET  /v1/api/knowledge-base (list)
 * - PUT  /v1/api/call-flows/{id}          (planned only in dry-run)
 * - PUT  /v1/api/agents/{agentId}         (planned only in dry-run)
 * - POST /v1/api/knowledge-base           (planned only in dry-run)
 * - PUT  /v1/api/knowledge-base/{id}      (planned only in dry-run)
 * - POST /v1/api/knowledge-base/{id}/text (planned only in dry-run)
 *
 * Never mutates Phillip / Lisa / Marina agents. Live writes are not implemented.
 */

export const TRILLET_CONFIG_SYNC_MODE = "dry_run" as const;

export type TrilletSyncPlanOp =
  | {
      op: "get_workspace" | "list_agents" | "list_call_flows" | "list_knowledge_bases";
      method: "GET";
      path: string;
      executeInDryRun: true;
    }
  | {
      op: "get_agent" | "get_call_flow" | "get_knowledge_base";
      method: "GET";
      path: string;
      executeInDryRun: true;
      targetId: string;
    }
  | {
      op: "update_call_flow_prompt" | "update_agent_metadata" | "create_or_update_knowledge_base";
      method: "PUT" | "POST";
      path: string;
      executeInDryRun: false;
      plannedBody: Record<string, unknown>;
      reasonHeld: "dry_run_only";
    };

export type TrilletSyncDryRunResult = {
  ok: true;
  mode: typeof TRILLET_CONFIG_SYNC_MODE;
  workspaceId: string;
  blockedTargets: string[];
  plan: TrilletSyncPlanOp[];
  observations: Record<string, unknown>;
  wouldWrite: boolean;
};

export type TrilletSyncDryRunFailure = {
  ok: false;
  reason: string;
  detail?: unknown;
};

const BLOCKED_NAME_PATTERNS = [/phillip/i, /\blisa\b/i, /marina/i];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nameOf(value: unknown): string {
  const row = asRecord(value);
  return row && typeof row.name === "string" ? row.name : "";
}

function idOf(value: unknown): string | null {
  const row = asRecord(value);
  if (row && typeof row._id === "string") return row._id;
  if (row && typeof row.id === "string") return row.id;
  return null;
}

function isBlockedName(name: string): boolean {
  return BLOCKED_NAME_PATTERNS.some((re) => re.test(name));
}

async function trilletGet(
  path: string,
  apiKey: string,
  workspaceId: string,
  fetcher: typeof fetch,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const response = await fetcher(`https://api.trillet.ai${path}`, {
    method: "GET",
    headers: {
      "x-api-key": apiKey,
      "x-workspace-id": workspaceId,
      Accept: "application/json",
    },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
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

export async function dryRunTrilletConfigSync(input: {
  apiKey: string;
  workspaceId: string;
  agentId?: string | null;
  callFlowId?: string | null;
  runtimeConfig: RuntimeConfigurationV1;
  /** Hard deny list — never plan writes against these agent/flow ids. */
  deniedAgentIds?: string[];
  deniedFlowIds?: string[];
  fetcher?: typeof fetch;
}): Promise<TrilletSyncDryRunResult | TrilletSyncDryRunFailure> {
  if (!input.apiKey || !input.workspaceId) {
    return { ok: false, reason: "missing_api_or_workspace" };
  }

  const fetcher = input.fetcher || fetch;
  const deniedAgents = new Set(input.deniedAgentIds || []);
  const deniedFlows = new Set(input.deniedFlowIds || []);
  const plan: TrilletSyncPlanOp[] = [];
  const observations: Record<string, unknown> = {};
  const blockedTargets: string[] = [];

  plan.push({
    op: "get_workspace",
    method: "GET",
    path: `/v1/api/workspaces/${encodeURIComponent(input.workspaceId)}`,
    executeInDryRun: true,
  });
  const workspace = await trilletGet(plan[0].path, input.apiKey, input.workspaceId, fetcher);
  observations.workspace = {
    ok: workspace.ok,
    status: workspace.status,
    name: nameOf(workspace.body),
  };
  if (!workspace.ok) {
    return { ok: false, reason: "workspace_lookup_failed", detail: observations.workspace };
  }

  plan.push({
    op: "list_agents",
    method: "GET",
    path: "/v1/api/agents",
    executeInDryRun: true,
  });
  plan.push({
    op: "list_call_flows",
    method: "GET",
    path: "/v1/api/call-flows",
    executeInDryRun: true,
  });
  plan.push({
    op: "list_knowledge_bases",
    method: "GET",
    path: "/v1/api/knowledge-base",
    executeInDryRun: true,
  });

  const [agentsRes, flowsRes, kbRes] = await Promise.all([
    trilletGet("/v1/api/agents", input.apiKey, input.workspaceId, fetcher),
    trilletGet("/v1/api/call-flows", input.apiKey, input.workspaceId, fetcher),
    trilletGet("/v1/api/knowledge-base", input.apiKey, input.workspaceId, fetcher),
  ]);

  const agents = Array.isArray(agentsRes.body) ? agentsRes.body : [];
  const flows = Array.isArray(flowsRes.body) ? flowsRes.body : [];
  const knowledgeBases = Array.isArray(kbRes.body) ? kbRes.body : [];

  observations.lists = {
    agentsOk: agentsRes.ok,
    flowsOk: flowsRes.ok,
    kbOk: kbRes.ok,
    agentCount: agents.length,
    flowCount: flows.length,
    kbCount: knowledgeBases.length,
  };

  for (const raw of [...agents, ...flows]) {
    const name = nameOf(raw);
    const id = idOf(raw);
    if (name && isBlockedName(name) && id) {
      blockedTargets.push(`${name}:${id}`);
      deniedAgents.add(id);
      deniedFlows.add(id);
    }
  }

  const agentId = input.agentId || null;
  const flowId = input.callFlowId || null;

  if (agentId && deniedAgents.has(agentId)) {
    return {
      ok: false,
      reason: "refusing_blocked_agent",
      detail: { agentId, blockedTargets },
    };
  }
  if (flowId && deniedFlows.has(flowId)) {
    return {
      ok: false,
      reason: "refusing_blocked_flow",
      detail: { flowId, blockedTargets },
    };
  }

  if (agentId) {
    const path = `/v1/api/agents/${encodeURIComponent(agentId)}`;
    plan.push({ op: "get_agent", method: "GET", path, executeInDryRun: true, targetId: agentId });
    const agentGet = await trilletGet(path, input.apiKey, input.workspaceId, fetcher);
    const agentName = nameOf(agentGet.body);
    observations.agent = { ok: agentGet.ok, status: agentGet.status, name: agentName };
    if (isBlockedName(agentName)) {
      return { ok: false, reason: "refusing_blocked_agent", detail: { agentId, agentName } };
    }
    plan.push({
      op: "update_agent_metadata",
      method: "PUT",
      path,
      executeInDryRun: false,
      reasonHeld: "dry_run_only",
      plannedBody: {
        name: `${input.runtimeConfig.customer.companyDisplayName} — ${input.runtimeConfig.customer.agentName}`,
        variables: {
          alexander_profile_revision: String(input.runtimeConfig.source.profileRevision),
          alexander_config_sha256: input.runtimeConfig.source.profileContentSha256,
        },
      },
    });
  }

  if (flowId) {
    const path = `/v1/api/call-flows/${encodeURIComponent(flowId)}`;
    plan.push({ op: "get_call_flow", method: "GET", path, executeInDryRun: true, targetId: flowId });
    const flowGet = await trilletGet(path, input.apiKey, input.workspaceId, fetcher);
    const flowName = nameOf(flowGet.body);
    observations.callFlow = { ok: flowGet.ok, status: flowGet.status, name: flowName };
    if (isBlockedName(flowName)) {
      return { ok: false, reason: "refusing_blocked_flow", detail: { flowId, flowName } };
    }
    const currentPrompt =
      asRecord(flowGet.body) && typeof asRecord(flowGet.body)?.prompt === "string"
        ? String(asRecord(flowGet.body)?.prompt)
        : "";
    plan.push({
      op: "update_call_flow_prompt",
      method: "PUT",
      path,
      executeInDryRun: false,
      reasonHeld: "dry_run_only",
      plannedBody: {
        promptType: "simple",
        prompt: input.runtimeConfig.artifacts.callFlow.prompt,
        welcomeMessage: "customMessage",
        customWelcomeMessage: input.runtimeConfig.artifacts.callFlow.customWelcomeMessage,
        _diff: {
          promptChanged: currentPrompt !== input.runtimeConfig.artifacts.callFlow.prompt,
          currentPromptChars: currentPrompt.length,
          nextPromptChars: input.runtimeConfig.artifacts.callFlow.prompt.length,
        },
      },
    });
  }

  const kbName = input.runtimeConfig.artifacts.callFlow.knowledgeBaseName;
  const existingKb = knowledgeBases.find((raw) => nameOf(raw) === kbName) || null;
  const kbId = idOf(existingKb);
  plan.push({
    op: "create_or_update_knowledge_base",
    method: kbId ? "PUT" : "POST",
    path: kbId
      ? `/v1/api/knowledge-base/${encodeURIComponent(kbId)}`
      : "/v1/api/knowledge-base",
    executeInDryRun: false,
    reasonHeld: "dry_run_only",
    plannedBody: {
      name: kbName,
      description: "Alexander-generated company knowledge from customer business profile",
      textChars: input.runtimeConfig.artifacts.companyKnowledge.length,
      textSha256: input.runtimeConfig.source.profileContentSha256,
    },
  });

  return {
    ok: true,
    mode: TRILLET_CONFIG_SYNC_MODE,
    workspaceId: input.workspaceId,
    blockedTargets,
    plan,
    observations,
    wouldWrite: plan.some((p) => p.executeInDryRun === false),
  };
}
