import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";
import { provisionCustomerOnboarding } from "../../src/lib/server/persistence/onboarding-access";
import { generateToken, hashToken } from "../../src/lib/server/persistence/tokens";

type SecretShape = { username?: string; password?: string };

const APP_ROLE = "alexander_app";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error("migration_not_configured");
  return value;
}

function loadCa(): string {
  return readFileSync(join(__dirname, "global-bundle.pem"), "utf8");
}

async function readSecret(client: SecretsManagerClient, arn: string): Promise<SecretShape> {
  const result = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!result.SecretString) throw new Error("secret_missing");
  return JSON.parse(result.SecretString) as SecretShape;
}

function assertSafeSql(sql: string): void {
  if (/\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX|ROLE)\b/i.test(sql)) {
    throw new Error("destructive_sql_rejected");
  }
}

async function describeOnboarding(onboardingId: string | undefined): Promise<{
  PhysicalResourceId: string;
  rows: Record<string, unknown>[];
}> {
  if (!onboardingId || !/^[0-9a-f-]{36}$/i.test(onboardingId)) throw new Error("onboarding_required");
  const secrets = new SecretsManagerClient({});
  const master = await readSecret(secrets, requireEnv("MASTER_SECRET_ARN"));
  if (!master.username || !master.password) throw new Error("secret_incomplete");
  const pool = new Pool({
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT") || "5432"),
    database: requireEnv("DB_NAME"),
    user: master.username,
    password: master.password,
    max: 1,
    ssl: { ca: loadCa(), rejectUnauthorized: true },
  });
  try {
    const result = await pool.query(
      `SELECT s.id, s.revision_number, s.persistence_state, s.content_hash_algorithm,
              s.content_revision_sha256, s.submitted_at,
              s.s3_prefix, s.s3_raw_key, s.s3_answers_key, s.s3_normalized_key, s.s3_manifest_key,
              s.raw_sha256, s.answers_sha256, s.normalized_sha256,
              s.raw_size_bytes, s.answers_size_bytes, s.normalized_size_bytes,
              (s.questionnaire_answers_json IS NOT NULL) AS answers_present,
              o.latest_submission_id, o.customer_id, o.status AS onboarding_status,
              c.customer_number, c.data_classification
       FROM customer_onboardings o
       JOIN customers c ON c.id = o.customer_id
       LEFT JOIN onboarding_submissions s ON s.onboarding_id = o.id
       WHERE o.id = $1
       ORDER BY s.revision_number`,
      [onboardingId],
    );
    return { PhysicalResourceId: "alexander-schema-001", rows: result.rows };
  } finally {
    await pool.end();
  }
}

async function provisionCustomer(input: {
  customerFacingName: string | undefined;
  dataClassification: string | undefined;
}): Promise<{
  PhysicalResourceId: string;
  customerId: string;
  customerNumber: string;
  onboardingId: string;
  invitationUrl: string;
}> {
  const name = input.customerFacingName?.trim();
  if (!name) throw new Error("name_required");
  const dataClassification =
    input.dataClassification === "real_customer" ? "real_customer" : "synthetic_test";
  const secrets = new SecretsManagerClient({});
  const master = await readSecret(secrets, requireEnv("MASTER_SECRET_ARN"));
  if (!master.username || !master.password) throw new Error("secret_incomplete");
  const pool = new Pool({
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT") || "5432"),
    database: requireEnv("DB_NAME"),
    user: master.username,
    password: master.password,
    max: 1,
    ssl: { ca: loadCa(), rejectUnauthorized: true },
  });
  try {
    const created = await provisionCustomerOnboarding(pool as unknown as Parameters<typeof provisionCustomerOnboarding>[0], {
      customerFacingName: name,
      dataClassification,
      host: "onboard.meetalexander.ai",
    });
    return { PhysicalResourceId: "alexander-schema-001", ...created };
  } finally {
    await pool.end();
  }
}

async function fixCustomerNameAndRotateInvitation(input: {
  customerId: string | undefined;
  onboardingId: string | undefined;
  customerFacingName: string | undefined;
}): Promise<{
  PhysicalResourceId: string;
  customerId: string;
  customerNumber: string;
  onboardingId: string;
  invitationUrl: string;
  nameUpdated: boolean;
  invitationsRevoked: number;
}> {
  const customerId = input.customerId?.trim() ?? "";
  const onboardingId = input.onboardingId?.trim() ?? "";
  const name = input.customerFacingName?.trim() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(customerId)) throw new Error("customer_required");
  if (!/^[0-9a-f-]{36}$/i.test(onboardingId)) throw new Error("onboarding_required");
  if (!name) throw new Error("name_required");

  const secrets = new SecretsManagerClient({});
  const master = await readSecret(secrets, requireEnv("MASTER_SECRET_ARN"));
  if (!master.username || !master.password) throw new Error("secret_incomplete");
  const pool = new Pool({
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT") || "5432"),
    database: requireEnv("DB_NAME"),
    user: master.username,
    password: master.password,
    max: 1,
    ssl: { ca: loadCa(), rejectUnauthorized: true },
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const linked = await client.query(
      `SELECT c.id AS customer_id, c.customer_number, o.id AS onboarding_id
       FROM customers c
       JOIN customer_onboardings o ON o.customer_id = c.id
       WHERE c.id = $1
         AND o.id = $2
       FOR UPDATE OF c, o`,
      [customerId, onboardingId],
    );
    if (!linked.rows[0]) {
      await client.query("ROLLBACK");
      throw new Error("customer_onboarding_mismatch");
    }
    const renamed = await client.query(
      `UPDATE customers
       SET customer_facing_name = $2
       WHERE id = $1
       RETURNING customer_number`,
      [customerId, name],
    );
    const revoked = await client.query(
      `UPDATE onboarding_invitations
       SET revoked_at = now()
       WHERE onboarding_id = $1
         AND revoked_at IS NULL`,
      [onboardingId],
    );
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await client.query(
      `INSERT INTO onboarding_invitations (onboarding_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [onboardingId, hashToken(token), expiresAt],
    );
    await client.query("COMMIT");
    return {
      PhysicalResourceId: "alexander-schema-001",
      customerId,
      customerNumber: String(renamed.rows[0]?.customer_number ?? ""),
      onboardingId,
      invitationUrl: `https://onboard.meetalexander.ai/i#${token}`,
      nameUpdated: true,
      invitationsRevoked: revoked.rowCount ?? 0,
    };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Surface the original failure.
    }
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function handler(event: {
  RequestType?: string;
  PhysicalResourceId?: string;
  action?: string;
  customerFacingName?: string;
  dataClassification?: string;
  onboardingId?: string;
  customerId?: string;
}): Promise<{
  PhysicalResourceId: string;
  customerId?: string;
  customerNumber?: string;
  onboardingId?: string;
  invitationUrl?: string;
  nameUpdated?: boolean;
  invitationsRevoked?: number;
}> {
  const physicalId = event.PhysicalResourceId ?? "alexander-schema-001";
  if (event.RequestType === "Delete") {
    return { PhysicalResourceId: physicalId };
  }
  if (event.action === "provisionSynthetic" || event.action === "provisionCustomer") {
    return provisionCustomer({
      customerFacingName: event.customerFacingName,
      dataClassification:
        event.action === "provisionSynthetic" ? "synthetic_test" : event.dataClassification,
    });
  }
  if (event.action === "fixCustomerNameAndRotateInvitation") {
    return fixCustomerNameAndRotateInvitation({
      customerId: event.customerId,
      onboardingId: event.onboardingId,
      customerFacingName: event.customerFacingName,
    });
  }
  if (event.action === "describeOnboarding") {
    return describeOnboarding(event.onboardingId);
  }

  const secrets = new SecretsManagerClient({});
  const master = await readSecret(secrets, requireEnv("MASTER_SECRET_ARN"));
  const app = await readSecret(secrets, requireEnv("APP_SECRET_ARN"));
  if (!master.username || !master.password || !app.password) {
    throw new Error("secret_incomplete");
  }

  const databaseName = requireEnv("DB_NAME");
  if (!/^[a-z_][a-z0-9_]*$/.test(databaseName)) {
    throw new Error("invalid_db_name");
  }

  const pool = new Pool({
    host: requireEnv("DB_HOST"),
    port: Number(requireEnv("DB_PORT") || "5432"),
    database: databaseName,
    user: master.username,
    password: master.password,
    max: 1,
    ssl: { ca: loadCa(), rejectUnauthorized: true },
  });

  const client = await pool.connect();
  try {
    const quoted = await client.query<{ literal: string }>("SELECT quote_literal($1) AS literal", [
      app.password,
    ]);
    const passwordLiteral = quoted.rows[0]?.literal;
    if (!passwordLiteral) throw new Error("password_quote_failed");

    const roleExists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [APP_ROLE]);
    if (roleExists.rowCount === 0) {
      await client.query(`CREATE ROLE ${APP_ROLE} LOGIN PASSWORD ${passwordLiteral}`);
    } else {
      await client.query(`ALTER ROLE ${APP_ROLE} WITH LOGIN PASSWORD ${passwordLiteral}`);
    }

    const sqlFiles = readdirSync(__dirname)
      .filter((name) => /^\d+.+\.sql$/.test(name))
      .sort();
    if (sqlFiles.length === 0) throw new Error("migration_sql_missing");
    for (const name of sqlFiles) {
      const sql = readFileSync(join(__dirname, name), "utf8");
      assertSafeSql(sql);
      await client.query(sql);
    }

    await client.query(`
      GRANT CONNECT ON DATABASE ${databaseName} TO ${APP_ROLE};
      GRANT USAGE ON SCHEMA public TO ${APP_ROLE};
      GRANT SELECT, INSERT, UPDATE ON TABLE onboarding_sessions TO ${APP_ROLE};
      GRANT SELECT, INSERT, UPDATE ON TABLE onboarding_submissions TO ${APP_ROLE};
      GRANT SELECT ON TABLE schema_migrations TO ${APP_ROLE};
    `);
  } finally {
    client.release();
    await pool.end();
  }

  return { PhysicalResourceId: physicalId };
}
