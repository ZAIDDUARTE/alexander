import { randomUUID } from "node:crypto";
import type { SqlPool } from "../persistence/onboarding-access";
import { object, verifyCall, type Binding } from "./intake";

function binding(row: Record<string, unknown>): Binding {
  return { id: String(row.id), customerId: String(row.customer_id), workspaceId: String(row.workspace_id),
    flowId: String(row.flow_id), agentId: String(row.agent_id), timezone: "America/Los_Angeles",
    activatedAt: new Date(String(row.activated_at)).toISOString() };
}

export async function upsertStagingRequestInstallation(
  pool: SqlPool,
  input: {
    installationId: string;
    customerId: string;
    workspaceId: string;
    flowId: string;
    agentId: string;
    webhookTokenHash: string;
    readerTokenHash: string;
    enabled?: boolean;
  },
) {
  if (!/^[0-9a-f-]{36}$/i.test(input.installationId) || !/^[0-9a-f-]{36}$/i.test(input.customerId)) {
    return { ok: false as const, reason: "invalid_ids" };
  }
  if (!/^[a-f0-9]{64}$/.test(input.webhookTokenHash) || !/^[a-f0-9]{64}$/.test(input.readerTokenHash)) {
    return { ok: false as const, reason: "invalid_token_hash" };
  }
  if (!input.workspaceId || !input.flowId || !input.agentId) {
    return { ok: false as const, reason: "invalid_binding" };
  }
  await pool.query(
    `INSERT INTO request_installations (
       id, customer_id, workspace_id, flow_id, agent_id, timezone,
       webhook_token_hash, reader_token_hash, enabled, activated_at
     ) VALUES ($1,$2,$3,$4,$5,'America/Los_Angeles',$6,$7,$8, now())
     ON CONFLICT (id) DO UPDATE SET
       customer_id = EXCLUDED.customer_id,
       workspace_id = EXCLUDED.workspace_id,
       flow_id = EXCLUDED.flow_id,
       agent_id = EXCLUDED.agent_id,
       webhook_token_hash = EXCLUDED.webhook_token_hash,
       reader_token_hash = EXCLUDED.reader_token_hash,
       enabled = EXCLUDED.enabled`,
    [
      input.installationId,
      input.customerId,
      input.workspaceId,
      input.flowId,
      input.agentId,
      input.webhookTokenHash,
      input.readerTokenHash,
      input.enabled !== false,
    ],
  );
  return { ok: true as const, installationId: input.installationId, customerId: input.customerId };
}

export async function listServiceRequestsByCustomer(pool: SqlPool, customerId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) return { ok: false as const, reason: "invalid_customer_id" };
  const requests = await pool.query(
    `SELECT id, call_id, fields_json, status, reason, jobber_request_id, ended_at, created_at, installation_id
     FROM service_requests WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [customerId],
  );
  const attention = await pool.query(
    `SELECT e.call_id, e.disposition, e.received_at, e.installation_id
     FROM request_call_events e
     JOIN request_installations i ON i.id = e.installation_id
     WHERE i.customer_id = $1 AND e.disposition NOT IN ('information_only', 'request_only')
     ORDER BY e.received_at DESC LIMIT 100`,
    [customerId],
  );
  const counts = await pool.query(
    `SELECT status, count(*)::int AS n FROM service_requests WHERE customer_id = $1 GROUP BY status`,
    [customerId],
  );
  const byStatus: Record<string, number> = {
    Received: 0,
    "Pending Review": 0,
    Synced: 0,
    Failed: 0,
    "Needs Attention": 0,
  };
  for (const row of counts.rows) byStatus[String(row.status)] = Number(row.n);
  return {
    ok: true as const,
    customerId,
    counts: byStatus,
    requests: requests.rows,
    attention: attention.rows,
  };
}

export async function handleRequestOperation(event: Record<string, unknown>, pool: SqlPool) {
  if (event.operation === "upsertStagingRequestInstallation") {
    return upsertStagingRequestInstallation(pool, {
      installationId: String(event.installationId || ""),
      customerId: String(event.customerId || ""),
      workspaceId: String(event.workspaceId || ""),
      flowId: String(event.flowId || ""),
      agentId: String(event.agentId || ""),
      webhookTokenHash: String(event.webhookTokenHash || ""),
      readerTokenHash: String(event.readerTokenHash || ""),
      enabled: event.enabled !== false,
    });
  }
  if (event.operation === "listServiceRequestsByCustomer") {
    return listServiceRequestsByCustomer(pool, String(event.customerId || ""));
  }

  const hash = event.tokenHash;
  if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) return { ok: false, reason: "unauthorized" };
  const read = event.operation === "listServiceRequests";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT * FROM request_installations WHERE ${read ? "reader_token_hash" : "webhook_token_hash"} = $1 AND enabled = true FOR SHARE`, [hash]);
    const row = result.rows[0];
    if (!row) { await client.query("ROLLBACK"); return { ok: false, reason: "unauthorized" }; }
    const installation = binding(row);
    if (event.operation === "resolveRequestInstallation") {
      await client.query("COMMIT"); return { ok: true, binding: installation };
    }
    if (read) {
      const requests = await client.query(
        `SELECT id, call_id, fields_json, status, reason, jobber_request_id, ended_at, created_at
         FROM service_requests WHERE installation_id = $1 AND customer_id = $2 ORDER BY created_at DESC LIMIT 100`,
        [installation.id, installation.customerId]);
      const attention = await client.query(
        `SELECT call_id, disposition, received_at FROM request_call_events
         WHERE installation_id = $1 AND disposition NOT IN ('information_only', 'request_only')
         ORDER BY received_at DESC LIMIT 100`, [installation.id]);
      await client.query("COMMIT");
      return { ok: true, requests: requests.rows, attention: attention.rows };
    }
    if (event.operation !== "persistVerifiedCall") throw new Error("invalid_operation");
    // Only the IAM-authenticated Next.js receiver can submit the provider readback.
    const raw = object(event.call);
    const verified = verifyCall(raw, String(event.callId), installation);
    const inserted = await client.query(
      `INSERT INTO request_call_events (installation_id, call_id, fingerprint, disposition)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING call_id`,
      [installation.id, verified.callId, verified.fingerprint, verified.reason]);
    if (!inserted.rowCount) {
      const prior = await client.query(
        "SELECT fingerprint FROM request_call_events WHERE installation_id = $1 AND call_id = $2",
        [installation.id, verified.callId]);
      const conflict = prior.rows[0]?.fingerprint !== verified.fingerprint;
      if (conflict) {
        await client.query("UPDATE request_call_events SET disposition = 'extraction_changed_requires_review' WHERE installation_id = $1 AND call_id = $2", [installation.id, verified.callId]);
        await client.query("UPDATE service_requests SET status = 'Needs Attention', reason = 'extraction_changed_requires_review', updated_at = now() WHERE installation_id = $1 AND call_id = $2", [installation.id, verified.callId]);
      }
      await client.query("COMMIT"); return { ok: true, duplicate: true, needsAttention: conflict };
    }
    let requestId: string | null = null;
    if (verified.create) {
      requestId = randomUUID();
      await client.query(
        `INSERT INTO service_requests (id, installation_id, customer_id, call_id, fields_json, status, reason, ended_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
        [requestId, installation.id, installation.customerId, verified.callId, JSON.stringify(verified.fields), verified.status, verified.reason, verified.endedAt]);
    }
    await client.query("COMMIT");
    return { ok: true, requestId, status: verified.status, reason: verified.reason };
  } catch {
    await client.query("ROLLBACK");
    return { ok: false, reason: "request_processing_failed" };
  } finally { client.release(); }
}
