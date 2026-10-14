/**
 * SES configuration-set feedback → Postgres (idempotent by event_id).
 * Staging only. Never logs raw message content or recipient PII beyond IDs.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { rootCertificates } from "node:tls";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";

type SecretShape = { username?: string; password?: string };

let pool: Pool | null = null;

async function getPool(): Promise<Pool> {
  if (pool) return pool;
  const secrets = new SecretsManagerClient({});
  const result = await secrets.send(
    new GetSecretValueCommand({ SecretId: process.env.APP_SECRET_ARN || "" }),
  );
  if (!result.SecretString) throw new Error("secret_missing");
  const secret = JSON.parse(result.SecretString) as SecretShape;
  if (!secret.username || !secret.password) throw new Error("secret_incomplete");
  const ca = [...rootCertificates, readFileSync(join(__dirname, "global-bundle.pem"), "utf8")];
  pool = new Pool({
    host: process.env.DB_PROXY_HOST || "",
    port: Number(process.env.DB_PORT || "5432"),
    database: process.env.DB_NAME || "alexander",
    user: secret.username,
    password: secret.password,
    max: 1,
    ssl: { ca, rejectUnauthorized: true },
    connectionTimeoutMillis: 8000,
  });
  return pool;
}

type SesEvent = {
  eventType?: string;
  mail?: { messageId?: string };
  delivery?: unknown;
  bounce?: unknown;
  complaint?: unknown;
  reject?: unknown;
};

function mapStatus(eventType: string): string | null {
  switch (eventType) {
    case "Delivery":
      return "delivered";
    case "Bounce":
      return "bounced";
    case "Complaint":
      return "complained";
    case "Reject":
      return "rejected";
    default:
      return null;
  }
}

export async function handler(event: unknown): Promise<{ ok: boolean; processed: number }> {
  const records =
    event && typeof event === "object" && "Records" in event
      ? ((event as { Records?: Array<{ Sns?: { Message?: string }; body?: string }> }).Records || [])
      : [];

  const db = await getPool();
  let processed = 0;

  for (const record of records) {
    const raw = record.Sns?.Message || record.body || "";
    if (!raw) continue;
    let payload: SesEvent;
    try {
      payload = JSON.parse(raw) as SesEvent;
    } catch {
      continue;
    }
    const eventType = String(payload.eventType || "");
    const messageId = String(payload.mail?.messageId || "");
    if (!eventType || !messageId) continue;

    // Prefer SES mail.messageId; EventBridge may wrap differently later.
    const eventId = `${messageId}:${eventType}:${hashLite(raw)}`;
    await db.query(
      `INSERT INTO email_feedback_events (provider_message_id, event_type, event_id, payload_json)
       VALUES ($1,$2,$3,$4::jsonb)
       ON CONFLICT (event_id) DO NOTHING`,
      [messageId, eventType, eventId, JSON.stringify({ eventType, messageId })],
    );

    const status = mapStatus(eventType);
    if (status) {
      const tsCol =
        status === "delivered"
          ? "delivered_at"
          : status === "bounced"
            ? "bounced_at"
            : status === "complained"
              ? "complained_at"
              : null;
      if (tsCol) {
        await db.query(
          `UPDATE email_outbox
           SET status = $2,
               ${tsCol} = COALESCE(${tsCol}, now()),
               updated_at = now()
           WHERE provider_message_id = $1
             AND status IN ('sent', 'delivered', 'processing')`,
          [messageId, status],
        );
      } else {
        await db.query(
          `UPDATE email_outbox
           SET status = $2, updated_at = now()
           WHERE provider_message_id = $1
             AND status IN ('sent', 'delivered', 'processing')`,
          [messageId, status],
        );
      }
    }
    processed += 1;
  }

  return { ok: true, processed };
}

function hashLite(raw: string): string {
  let h = 0;
  for (let i = 0; i < Math.min(raw.length, 4000); i += 1) {
    h = (h * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}
