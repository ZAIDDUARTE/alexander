import { createRequire } from "node:module";
import { resolve } from "node:path";
import { provisionCustomerOnboarding, type SqlPool } from "../src/lib/server/persistence/onboarding-access";

const require = createRequire(resolve(process.cwd(), "infra/package.json"));

type PgModule = {
  Pool: new (config: { connectionString: string; max?: number }) => SqlPool;
};

async function main(): Promise<void> {
  const url = process.env.ONBOARDING_DATABASE_URL;
  const host = process.env.ONBOARDING_HOST || "onboard.meetalexander.ai";
  if (!url) {
    throw new Error("ONBOARDING_DATABASE_URL is required");
  }
  const nameFlag = process.argv.indexOf("--name");
  const classFlag = process.argv.indexOf("--classification");
  const customerFacingName = nameFlag >= 0 ? process.argv[nameFlag + 1] : null;
  const classificationArg = classFlag >= 0 ? process.argv[classFlag + 1] : "real_customer";
  const dataClassification = classificationArg === "synthetic_test" ? "synthetic_test" : "real_customer";
  const { Pool } = require("pg") as PgModule;
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const created = await provisionCustomerOnboarding(pool, {
      customerFacingName,
      dataClassification,
      host,
    });
    process.stdout.write(`${JSON.stringify(created)}\n`);
  } finally {
    await (pool as SqlPool & { end?: () => Promise<void> }).end?.();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "provision_failed";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
