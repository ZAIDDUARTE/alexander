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

export type TrilletFlowSummary = {
  id: string;
  workspaceId: string;
  name: string;
  direction: string | null;
  agentId: string | null;
  isActive: boolean | null;
  promptType: string | null;
  agentWebhookUrl: string | null;
  inboundWebhookUrl: string | null;
  webhookCount: number;
};

export type TrilletAgentSummary = {
  id: string;
  workspaceId: string;
  name: string;
  type: string | null;
  status: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function summarizeFlow(raw: unknown): TrilletFlowSummary | null {
  const row = asRecord(raw);
  if (!row || typeof row._id !== "string") return null;
  const settings = asRecord(row.settings);
  const settingsWebhooks = asRecord(settings?.webhooks);
  const webhooks = Array.isArray(row.webhooks) ? row.webhooks : [];
  return {
    id: row._id,
    workspaceId: typeof row.workspaceId === "string" ? row.workspaceId : "",
    name: typeof row.name === "string" ? row.name : "",
    direction: typeof row.direction === "string" ? row.direction : null,
    agentId:
      typeof row.agent === "string"
        ? row.agent
        : row.agent && typeof row.agent === "object" && typeof (row.agent as { _id?: unknown })._id === "string"
          ? String((row.agent as { _id: string })._id)
          : null,
    isActive: typeof row.isActive === "boolean" ? row.isActive : null,
    promptType: typeof row.promptType === "string" ? row.promptType : null,
    agentWebhookUrl:
      typeof row.agentWebhookUrl === "string"
        ? row.agentWebhookUrl
        : typeof settingsWebhooks?.agent === "string"
          ? settingsWebhooks.agent
          : null,
    inboundWebhookUrl:
      typeof row.inboundWebhookUrl === "string"
        ? row.inboundWebhookUrl
        : typeof settingsWebhooks?.inbound === "string"
          ? settingsWebhooks.inbound
          : null,
    webhookCount: webhooks.length,
  };
}

function summarizeAgent(raw: unknown): TrilletAgentSummary | null {
  const row = asRecord(raw);
  if (!row || typeof row._id !== "string") return null;
  return {
    id: row._id,
    workspaceId: typeof row.workspaceId === "string" ? row.workspaceId : "",
    name: typeof row.name === "string" ? row.name : "",
    type: typeof row.type === "string" ? row.type : null,
    status: typeof row.status === "string" ? row.status : null,
  };
}

function scoreSandboxFlow(flow: TrilletFlowSummary): number {
  const name = flow.name.toLowerCase();
  let score = 0;
  if (/sandbox|qa|alexander|plumbing|receptionist|demo|test/.test(name)) score += 5;
  if (/lisa|production|prod|live customer/.test(name)) score -= 20;
  if (flow.isActive === true) score += 2;
  if (flow.direction === "inbound" || flow.direction === "bidirectional") score += 1;
  if (flow.agentId) score += 1;
  return score;
}

function compactErrorBody(body: unknown): unknown {
  const row = asRecord(body);
  if (!row) return typeof body === "string" ? body.slice(0, 200) : null;
  return {
    message: typeof row.message === "string" ? row.message.slice(0, 200) : undefined,
    error: typeof row.error === "string" ? row.error.slice(0, 200) : undefined,
    code: typeof row.code === "string" ? row.code : undefined,
  };
}

export async function discoverTrilletSandbox(
  apiKey: string,
  workspaceIdHint: string | null,
  envFlowId: string | null = null,
  envAgentId: string | null = null,
) {
  if (!apiKey) throw new Error("trillet_api_key_missing");
  if (!workspaceIdHint) {
    return {
      ok: false as const,
      stage: "workspace_hint",
      reason: "STAGING_TRILLET_WORKSPACE_ID_missing",
    };
  }

  // Documented: GET /v1/api/workspaces/{workspaceId}
  const workspaceRes = await getJson(
    `https://api.trillet.ai/v1/api/workspaces/${encodeURIComponent(workspaceIdHint)}`,
    apiKey,
    workspaceIdHint,
  );
  const workspaceRow = workspaceRes.ok ? asRecord(workspaceRes.body) : null;
  const sandbox = {
    id: workspaceIdHint,
    name:
      workspaceRow && typeof workspaceRow.name === "string" && workspaceRow.name
        ? workspaceRow.name
        : "(name unverified)",
    verifiedByGet: Boolean(workspaceRes.ok && workspaceRow && workspaceRow._id === workspaceIdHint),
    getStatus: workspaceRes.status,
    getError: workspaceRes.ok ? null : compactErrorBody(workspaceRes.body),
  };

  // Documented list-user-workspaces (path inferred from sibling get-by-id).
  const allWorkspacesRes = await getJson("https://api.trillet.ai/v1/api/workspaces", apiKey, workspaceIdHint);
  const allWorkspaceSummaries = (Array.isArray(allWorkspacesRes.body) ? allWorkspacesRes.body : [])
    .map((raw) => {
      const row = asRecord(raw);
      if (!row || typeof row._id !== "string") return null;
      return { id: row._id, name: typeof row.name === "string" ? row.name : "" };
    })
    .filter((row): row is { id: string; name: string } => Boolean(row));

  // Cross-workspace inventory (read-only) so we do not miss the QA plumbing flow
  // if STAGING_TRILLET_WORKSPACE_ID points at a partial sandbox.
  const inventory: Array<{
    workspaceId: string;
    workspaceName: string;
    flowsStatus: number;
    agentsStatus: number;
    flows: TrilletFlowSummary[];
    agents: TrilletAgentSummary[];
  }> = [];
  for (const ws of allWorkspaceSummaries.length ? allWorkspaceSummaries : [{ id: sandbox.id, name: sandbox.name }]) {
    const wsFlows = await getJson("https://api.trillet.ai/v1/api/call-flows", apiKey, ws.id);
    const wsAgents = await getJson("https://api.trillet.ai/v1/api/agents", apiKey, ws.id);
    inventory.push({
      workspaceId: ws.id,
      workspaceName: ws.name,
      flowsStatus: wsFlows.status,
      agentsStatus: wsAgents.status,
      flows: (Array.isArray(wsFlows.body) ? wsFlows.body : [])
        .map(summarizeFlow)
        .filter((row): row is TrilletFlowSummary => Boolean(row)),
      agents: (Array.isArray(wsAgents.body) ? wsAgents.body : [])
        .map(summarizeAgent)
        .filter((row): row is TrilletAgentSummary => Boolean(row)),
    });
  }

  const envFlowLocation = envFlowId
    ? inventory
        .flatMap((entry) =>
          entry.flows
            .filter((flow) => flow.id === envFlowId)
            .map((flow) => ({
              workspaceId: entry.workspaceId,
              workspaceName: entry.workspaceName,
              flow,
            })),
        )[0] || null
    : null;

  // Direct get-by-id probe for Preview STAGING_TRILLET_FLOW_ID (may live outside list results).
  let envFlowProbe: {
    status: number;
    found: boolean;
    id: string | null;
    name: string | null;
    workspaceId: string | null;
    agentId: string | null;
    direction: string | null;
    error: unknown;
  } | null = null;
  if (envFlowId) {
    const probe = await getJson(
      `https://api.trillet.ai/v1/api/call-flows/${encodeURIComponent(envFlowId)}`,
      apiKey,
      workspaceIdHint,
    );
    const summary = probe.ok ? summarizeFlow(probe.body) : null;
    envFlowProbe = {
      status: probe.status,
      found: Boolean(summary),
      id: summary?.id ?? null,
      name: summary?.name ?? null,
      workspaceId: summary?.workspaceId ?? null,
      agentId: summary?.agentId ?? null,
      direction: summary?.direction ?? null,
      error: probe.ok ? null : compactErrorBody(probe.body),
    };
  }

  const flowsRes = await getJson("https://api.trillet.ai/v1/api/call-flows", apiKey, workspaceIdHint);
  const agentsRes = await getJson("https://api.trillet.ai/v1/api/agents", apiKey, workspaceIdHint);
  if (!flowsRes.ok || !agentsRes.ok) {
    return {
      ok: false as const,
      stage: "list_resources",
      reason: "trillet_list_failed",
      workspace: sandbox,
      flowsStatus: flowsRes.status,
      agentsStatus: agentsRes.status,
      flowsError: compactErrorBody(flowsRes.body),
      agentsError: compactErrorBody(agentsRes.body),
    };
  }

  const flows = (Array.isArray(flowsRes.body) ? flowsRes.body : [])
    .map(summarizeFlow)
    .filter((row): row is TrilletFlowSummary => Boolean(row))
    .filter((row) => !row.workspaceId || row.workspaceId === sandbox.id);

  const agents = (Array.isArray(agentsRes.body) ? agentsRes.body : [])
    .map(summarizeAgent)
    .filter((row): row is TrilletAgentSummary => Boolean(row))
    .filter((row) => !row.workspaceId || row.workspaceId === sandbox.id);

  const ranked = [...flows]
    .map((flow) => ({ flow, score: scoreSandboxFlow(flow) }))
    .sort((a, b) => b.score - a.score);

  const top = ranked.filter((row) => row.score > 0);

  // Prefer exact env FLOW_ID when it exists in this workspace (already configured).
  const envMatchedFlow = envFlowId ? flows.find((flow) => flow.id === envFlowId) || null : null;
  let selected: TrilletFlowSummary | null = envMatchedFlow;
  let selectionMethod: string | null = envMatchedFlow ? "env_STAGING_TRILLET_FLOW_ID" : null;

  if (!selected) {
    selected =
      top.length === 1 || (top[0] && top[0].score >= (top[1]?.score ?? -999) + 2)
        ? top[0]?.flow ?? null
        : null;
    if (selected) selectionMethod = "heuristic_unique_or_clear_winner";
  }

  let selectedAgent = selected?.agentId
    ? agents.find((agent) => agent.id === selected!.agentId) || null
    : null;
  if (!selectedAgent && envAgentId) {
    selectedAgent = agents.find((agent) => agent.id === envAgentId) || null;
  }

  // Fetch full flow when uniquely selected to inspect webhook fields.
  let selectedFlowDetail: TrilletFlowSummary | null = selected;
  let selectedFlowRawKeys: string[] | null = null;
  if (selected) {
    const detail = await getJson(
      `https://api.trillet.ai/v1/api/call-flows/${encodeURIComponent(selected.id)}`,
      apiKey,
      sandbox.id,
    );
    if (detail.ok) {
      selectedFlowDetail = summarizeFlow(detail.body) || selected;
      const raw = asRecord(detail.body);
      selectedFlowRawKeys = raw ? Object.keys(raw).sort() : null;
    }
  }

  // Never auto-select a Lisa / production-named flow even if it is the only row.
  if (selected && /lisa|production|prod|live customer/i.test(selected.name)) {
    selected = null;
    selectedAgent = null;
    selectedFlowDetail = null;
    selectionMethod = "rejected_lisa_or_production_name";
  }
  if (!selected && flows.length > 0 && top.length === 0) {
    selectionMethod = selectionMethod || "no_safe_qa_flow_in_workspace";
  }

  // Enrich candidates with GET call-flow detail (agent/webhooks).
  const candidateDetails: TrilletFlowSummary[] = [];
  for (const row of (!selected ? (top.length ? top : ranked).slice(0, 5) : [])) {
    const detail = await getJson(
      `https://api.trillet.ai/v1/api/call-flows/${encodeURIComponent(row.flow.id)}`,
      apiKey,
      sandbox.id,
    );
    if (detail.ok) {
      const summary = summarizeFlow(detail.body);
      if (summary) candidateDetails.push(summary);
    }
  }

  // Read-only Google Calendar inventory for sandbox flow(s). Does not create/modify events.
  const calendarProbes: Array<{
    flowId: string;
    status: number;
    calendars: Array<{ id: string; summary: string | null; primary: boolean | null }>;
    error: unknown;
  }> = [];
  for (const flow of flows.slice(0, 3)) {
    const calRes = await getJson(
      `https://api.trillet.ai/v1/api/gcal/calendars?pathwayId=${encodeURIComponent(flow.id)}`,
      apiKey,
      sandbox.id,
    );
    const body = asRecord(calRes.body);
    const rows = Array.isArray(body?.calendars) ? body!.calendars : Array.isArray(calRes.body) ? calRes.body : [];
    calendarProbes.push({
      flowId: flow.id,
      status: calRes.status,
      calendars: rows
        .map((raw) => {
          const row = asRecord(raw);
          if (!row || typeof row.id !== "string") return null;
          return {
            id: row.id,
            summary: typeof row.summary === "string" ? row.summary : null,
            primary: typeof row.primary === "boolean" ? row.primary : null,
          };
        })
        .filter((row): row is { id: string; summary: string | null; primary: boolean | null } => Boolean(row)),
      error: calRes.ok ? null : compactErrorBody(calRes.body),
    });
  }

  const agentDetails: Array<Record<string, unknown>> = [];
  for (const agent of agents.slice(0, 5)) {
    const detail = await getJson(
      `https://api.trillet.ai/v1/api/agents/${encodeURIComponent(agent.id)}`,
      apiKey,
      sandbox.id,
    );
    if (!detail.ok) {
      agentDetails.push({ id: agent.id, status: detail.status, error: compactErrorBody(detail.body) });
      continue;
    }
    const row = asRecord(detail.body) || {};
    const settings = asRecord(row.settings) || {};
    agentDetails.push({
      id: agent.id,
      name: row.name,
      type: row.type,
      status: row.status,
      workspaceId: row.workspaceId,
      settingKeys: Object.keys(settings).sort(),
      timezone:
        typeof settings.timezone === "string"
          ? settings.timezone
          : typeof row.timezone === "string"
            ? row.timezone
            : null,
    });
  }

  return {
    ok: true as const,
    workspace: sandbox,
    workspaces: allWorkspaceSummaries.length ? allWorkspaceSummaries : [sandbox],
    allWorkspacesStatus: allWorkspacesRes.status,
    envFlowProbe,
    inventory: inventory.map((entry) => ({
      workspaceId: entry.workspaceId,
      workspaceName: entry.workspaceName,
      flowsStatus: entry.flowsStatus,
      agentsStatus: entry.agentsStatus,
      flowCount: entry.flows.length,
      agentCount: entry.agents.length,
      flows: entry.flows.map((flow) => ({
        id: flow.id,
        name: flow.name,
        direction: flow.direction,
        agentId: flow.agentId,
        isActive: flow.isActive,
        score: scoreSandboxFlow(flow),
      })),
      agents: entry.agents.map((agent) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
      })),
    })),
    flows: ranked.map(({ flow, score }) => ({ ...flow, score })),
    agents,
    selectedFlow: selectedFlowDetail,
    selectedAgent,
    selectionMethod,
    selectionAmbiguous: !selected && (top.length > 1 || flows.length >= 1),
    candidates: !selected
      ? (top.length ? top : ranked).slice(0, 5).map(({ flow, score }) => ({ ...flow, score }))
      : [],
    candidateDetails,
    calendarProbes,
    agentDetails,
    envAlignment: {
      workspaceIdPresent: true,
      flowIdPresent: Boolean(envFlowId),
      agentIdPresent: Boolean(envAgentId),
      flowIdMatchesSelected: Boolean(envFlowId && selected && envFlowId === selected.id),
      agentIdMatchesSelected: Boolean(envAgentId && selectedAgent && envAgentId === selectedAgent.id),
      envFlowFoundInWorkspace: Boolean(envMatchedFlow),
      envFlowLocation: envFlowLocation
        ? {
            workspaceId: envFlowLocation.workspaceId,
            workspaceName: envFlowLocation.workspaceName,
            flowId: envFlowLocation.flow.id,
            flowName: envFlowLocation.flow.name,
            agentId: envFlowLocation.flow.agentId,
          }
        : null,
    },
    selectedFlowRawKeys,
    webhookNotes: {
      inboundWebhookDocs:
        "Trillet inbound webhook is for call-start dynamic variables (expects variables response), not post-call intake.",
      agentWebhookUrlField:
        "Flow field agentWebhookUrl is described as agent-related events; payload/auth not fully documented as post-call.",
      toolWebhooksArray:
        "Flow webhooks[] entries create in-call tool webhooks; updates append and can duplicate.",
      alexanderReceiverExpects:
        "POST JSON {callId,timestamp} with Authorization Bearer; then Alexander reads call-history.",
    },
  };
}
