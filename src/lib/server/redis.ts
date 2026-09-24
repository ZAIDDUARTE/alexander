import { createClient } from "redis";

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;

export async function getRedisClient(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  if (client?.isOpen) {
    return client;
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const next = createClient({ url });
        next.on("error", (err) => {
          if (process.env.NODE_ENV === "development") {
            console.warn("[onboarding] Redis client error:", err.message);
          }
        });
        await next.connect();
        client = next;
        return next;
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[onboarding] Redis unavailable:",
            err instanceof Error ? err.message : "unknown error",
          );
        }
        client = null;
        return null;
      } finally {
        connectPromise = null;
      }
    })();
  }

  return connectPromise;
}

export function onboardingDraftKey(sessionId: string): string {
  return `alexander:onboarding:draft:${sessionId}`;
}
