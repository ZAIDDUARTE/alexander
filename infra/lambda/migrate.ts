import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { Pool } from "pg";

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

export async function handler(event: { RequestType?: string; PhysicalResourceId?: string }): Promise<{
  PhysicalResourceId: string;
}> {
  const physicalId = event.PhysicalResourceId ?? "alexander-schema-001";
  if (event.RequestType === "Delete") {
    return { PhysicalResourceId: physicalId };
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
