const QA_AGENT_NAME = "Alexander Plumbing — E2E QA";
const QA_FLOW_NAME = "Alexander Plumbing — E2E QA Flow";

const QA_PROMPT = `You are Alex, the transparent AI receptionist for Alexander Plumbing QA — a fictional plumbing company used only for Alexander platform end-to-end testing (tenant ALX-C000007). Speak warmly, professionally, and concisely.

# Sandbox Safety
This is request-only QA mode. Answer factual questions and collect service requests. Never claim to have booked, rescheduled, cancelled, dispatched, transferred, charged, refunded, or changed any record. No live phone routing, CRM writes, Primary calendar, payment, or dispatch action is connected. When a caller asks for such an action, collect the request and say the team must confirm it.

# Greeting
Open naturally: "Thank you for calling Alexander Plumbing QA. I'm Alex, the AI receptionist. How can I help you today?"

# Factual Questions
Answer only from approved fictional QA facts: residential plumbing repair and drain clearing in a fictional service area; normal hours Monday–Friday 8:00–17:00 America/Los_Angeles; after-hours emergencies are collected for callback, not dispatched live. If a fact is missing, say the team will review it. Do not create a service request for information-only calls.

# Service Requests
Create a verbal request only when the caller clearly asks for service, an appointment, a callback about service, or help with an active plumbing issue. Collect one item at a time: caller name; callback number (read back); service address or city; problem/service requested; urgency; preferred appointment window. Before closing, summarize and clearly say the request is pending team confirmation — not a confirmed appointment.

# Emergencies
For suspected gas odor/leak, tell the caller to leave and contact emergency services or the gas utility from a safe location. For water near electricity or immediate danger, tell them to avoid contact and call emergency services. Then collect only minimum safe callback details for urgent human review.

# Closing
Information-only: answer and close without a request. Service requests: recap confirmed details and say the team will contact them to confirm next steps.`;

function headers(apiKey: string, workspaceId: string): HeadersInit {
  return {
    "x-api-key": apiKey,
    "x-workspace-id": workspaceId,
    "Content-Type": "application/json",
  };
}

async function trilletFetch(
  method: string,
  url: string,
  apiKey: string,
  workspaceId: string,
  body?: unknown,
) {
  const response = await fetch(url, {
    method,
    headers: headers(apiKey, workspaceId),
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
  return { ok: response.ok, status: response.status, body: parsed };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function idOf(value: unknown): string | null {
  const row = asRecord(value);
  return row && typeof row._id === "string" ? row._id : null;
}

function nameOf(value: unknown): string | null {
  const row = asRecord(value);
  return row && typeof row.name === "string" ? row.name : null;
}

export async function provisionAlexanderPlumbingQa(apiKey: string, workspaceId: string) {
  if (!apiKey || !workspaceId) {
    return { ok: false as const, reason: "missing_api_or_workspace" };
  }

  const workspace = await trilletFetch(
    "GET",
    `https://api.trillet.ai/v1/api/workspaces/${encodeURIComponent(workspaceId)}`,
    apiKey,
    workspaceId,
  );
  const workspaceName = nameOf(workspace.body);
  if (!workspace.ok || workspaceName !== "Alexander Sandbox") {
    return {
      ok: false as const,
      reason: "workspace_not_alexander_sandbox",
      status: workspace.status,
      workspaceName,
    };
  }

  const agentsRes = await trilletFetch("GET", "https://api.trillet.ai/v1/api/agents", apiKey, workspaceId);
  const flowsRes = await trilletFetch("GET", "https://api.trillet.ai/v1/api/call-flows", apiKey, workspaceId);
  if (!agentsRes.ok || !flowsRes.ok) {
    return {
      ok: false as const,
      reason: "list_failed",
      agentsStatus: agentsRes.status,
      flowsStatus: flowsRes.status,
    };
  }

  const agents = Array.isArray(agentsRes.body) ? agentsRes.body : [];
  const flows = Array.isArray(flowsRes.body) ? flowsRes.body : [];

  // Never touch Lisa Synthetic Test.
  const lisaFlow = flows.find((raw) => /lisa/i.test(nameOf(raw) || ""));
  const existingAgent = agents.find((raw) => nameOf(raw) === QA_AGENT_NAME) || null;
  const existingFlow = flows.find((raw) => nameOf(raw) === QA_FLOW_NAME) || null;

  let agentId = idOf(existingAgent);
  let agentCreated = false;
  if (!agentId) {
    const created = await trilletFetch("POST", "https://api.trillet.ai/v1/api/agents", apiKey, workspaceId, {
      name: QA_AGENT_NAME,
      llmModel: "platform-llm",
      ttsModel: {
        provider: "rime",
        voiceId: "mistv2_Wildflower",
        name: "Sophie",
        language: "en",
      },
      settings: { speed: 0.7, volume: 1, temperature: 0.7 },
      smartCallback: false,
      // Explicitly no production phone numbers.
      phoneNumberIds: [],
      variables: {
        qa_mode: "alexander_e2e",
        customer_number: "ALX-C000007",
        fictional: "true",
      },
    });
    agentId = idOf(created.body);
    if (!created.ok || !agentId) {
      return {
        ok: false as const,
        reason: "agent_create_failed",
        status: created.status,
        error: created.body,
      };
    }
    agentCreated = true;
  }

  let flowId = idOf(existingFlow);
  let flowCreated = false;
  if (!flowId) {
    const created = await trilletFetch("POST", "https://api.trillet.ai/v1/api/call-flows", apiKey, workspaceId, {
      name: QA_FLOW_NAME,
      direction: "bidirectional",
      description: "Isolated Alexander Plumbing fictional E2E QA receptionist. Not Lisa. No production phones.",
      agent: agentId,
      promptType: "simple",
      prompt: QA_PROMPT,
      isActive: true,
      welcomeMessage: "customMessage",
      customWelcomeMessage:
        "Thank you for calling Alexander Plumbing QA. I'm Alex, the AI receptionist. How can I help you today?",
      settings: {
        customerLocation: "los angeles",
        utilizePriorCallsContext: false,
        callSetting: {
          trilletVoiceGuard: true,
          maxCallDuration: 900,
          endCallOnSilence: 45,
          reminderMessages: [],
        },
        security: {
          publicAccess: false,
        },
        webhooks: {
          agent: "",
          inbound: "",
        },
      },
    });
    flowId = idOf(created.body);
    if (!created.ok || !flowId) {
      return {
        ok: false as const,
        reason: "flow_create_failed",
        status: created.status,
        error: created.body,
        agentId,
        agentCreated,
      };
    }
    flowCreated = true;
  }

  // Ensure flow points at QA agent without touching Lisa.
  const flowGet = await trilletFetch(
    "GET",
    `https://api.trillet.ai/v1/api/call-flows/${encodeURIComponent(flowId)}`,
    apiKey,
    workspaceId,
  );
  const flowRow = asRecord(flowGet.body);
  if (!flowGet.ok || !flowRow) {
    return { ok: false as const, reason: "flow_readback_failed", flowId, agentId };
  }
  if (/lisa/i.test(String(flowRow.name || ""))) {
    return { ok: false as const, reason: "refusing_lisa_flow", flowId };
  }

  if (flowRow.agent !== agentId) {
    // Narrow update only. Never send webhooks[] (Trillet appends duplicates).
    const updated = await trilletFetch(
      "PUT",
      `https://api.trillet.ai/v1/api/call-flows/${encodeURIComponent(flowId)}`,
      apiKey,
      workspaceId,
      {
        agent: agentId,
        isActive: true,
        prompt: QA_PROMPT,
      },
    );
    if (!updated.ok) {
      return {
        ok: false as const,
        reason: "flow_agent_bind_failed",
        putStatus: updated.status,
        putError: updated.body,
        flowId,
        agentId,
      };
    }
  }

  const agentGet = await trilletFetch(
    "GET",
    `https://api.trillet.ai/v1/api/agents/${encodeURIComponent(agentId)}`,
    apiKey,
    workspaceId,
  );
  const flowFinal = await trilletFetch(
    "GET",
    `https://api.trillet.ai/v1/api/call-flows/${encodeURIComponent(flowId)}`,
    apiKey,
    workspaceId,
  );
  const agentFinal = asRecord(agentGet.body);
  const flowFinalRow = asRecord(flowFinal.body);
  if (!agentGet.ok || !flowFinal.ok || !agentFinal || !flowFinalRow) {
    return { ok: false as const, reason: "final_readback_failed", flowId, agentId };
  }

  const boundAgent = resolveAgentId(flowFinalRow.agent);
  // If create/update left agent unbound, retry once with create-style payload fields only.
  let rebind: { status: number; ok: boolean } | null = null;
  if (boundAgent !== agentId) {
    const retry = await trilletFetch(
      "PUT",
      `https://api.trillet.ai/v1/api/call-flows/${encodeURIComponent(flowId)}`,
      apiKey,
      workspaceId,
      {
        name: QA_FLOW_NAME,
        direction: "bidirectional",
        agent: agentId,
        promptType: "simple",
        prompt: QA_PROMPT,
        isActive: true,
      },
    );
    rebind = { status: retry.status, ok: retry.ok };
    const after = await trilletFetch(
      "GET",
      `https://api.trillet.ai/v1/api/call-flows/${encodeURIComponent(flowId)}`,
      apiKey,
      workspaceId,
    );
    const afterRow = asRecord(after.body);
    if (afterRow) {
      Object.assign(flowFinalRow, afterRow);
    }
  }

  const finalBoundAgent = resolveAgentId(flowFinalRow.agent);
  const verified =
    agentFinal.workspaceId === workspaceId &&
    flowFinalRow.workspaceId === workspaceId &&
    finalBoundAgent === agentId &&
    agentFinal.name === QA_AGENT_NAME &&
    flowFinalRow.name === QA_FLOW_NAME &&
    !/lisa/i.test(String(flowFinalRow.name || ""));

  return {
    ok: verified,
    reason: verified ? null : "verification_mismatch",
    workspace: { id: workspaceId, name: workspaceName },
    agent: {
      id: agentId,
      name: String(agentFinal.name || ""),
      status: typeof agentFinal.status === "string" ? agentFinal.status : null,
      type: typeof agentFinal.type === "string" ? agentFinal.type : null,
      created: agentCreated,
    },
    flow: {
      id: flowId,
      name: String(flowFinalRow.name || ""),
      direction: typeof flowFinalRow.direction === "string" ? flowFinalRow.direction : null,
      agentId: finalBoundAgent,
      isActive: typeof flowFinalRow.isActive === "boolean" ? flowFinalRow.isActive : null,
      created: flowCreated,
      agentWebhookUrl: typeof flowFinalRow.agentWebhookUrl === "string" ? flowFinalRow.agentWebhookUrl : "",
      inboundWebhookUrl: typeof flowFinalRow.inboundWebhookUrl === "string" ? flowFinalRow.inboundWebhookUrl : "",
      rawAgentFieldType: flowFinalRow.agent == null ? "null" : typeof flowFinalRow.agent,
      rawAgentFieldPreview:
        typeof flowFinalRow.agent === "string"
          ? flowFinalRow.agent
          : flowFinalRow.agent && typeof flowFinalRow.agent === "object"
            ? Object.keys(flowFinalRow.agent as object).slice(0, 8)
            : null,
    },
    rebind,
    lisaFlowUntouched: {
      id: idOf(lisaFlow),
      name: nameOf(lisaFlow),
    },
    names: { agent: QA_AGENT_NAME, flow: QA_FLOW_NAME },
  };
}

function resolveAgentId(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  const row = asRecord(value);
  if (row && typeof row._id === "string") return row._id;
  if (row && typeof row.id === "string") return row.id;
  return null;
}
