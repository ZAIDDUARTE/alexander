import { createRequire } from "node:module";
import { invokePersistenceLambda } from "@/lib/server/aws-persistence";
import type { SqlPool } from "@/lib/server/persistence/onboarding-access";

let pool: SqlPool | null = null;
let poolUrl: string | null = null;

export async function directAccessPool(): Promise<SqlPool | null> {
  const url = process.env.ONBOARDING_DATABASE_URL;
  if (!url) return null;
  if (pool && poolUrl === url) return pool;
  try {
    const require = createRequire(import.meta.url);
    const loaded = require("pg") as {
      Pool: new (config: { connectionString: string; max?: number }) => SqlPool;
    };
    pool = new loaded.Pool({ connectionString: url, max: 2 });
    poolUrl = url;
    return pool;
  } catch {
    return null;
  }
}

export async function callOnboardingAccess<T>(
  direct: (pool: SqlPool) => Promise<T>,
  lambdaBody: Record<string, unknown>,
): Promise<T> {
  const local = await directAccessPool();
  if (local) return direct(local);
  const invoked = await invokePersistenceLambda(lambdaBody);
  return invoked.payload as T;
}
