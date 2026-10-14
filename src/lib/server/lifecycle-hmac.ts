import { createHmac, timingSafeEqual, createHash } from "node:crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function buildLifecycleCanonicalString(input: {
  method: string;
  path: string;
  timestamp: string;
  idempotencyKey: string;
  bodySha256: string;
}): string {
  return [
    input.method.toUpperCase(),
    input.path,
    input.timestamp,
    input.idempotencyKey,
    input.bodySha256,
  ].join("\n");
}

export function signLifecycleRequest(
  secret: string,
  canonical: string,
): string {
  return createHmac("sha256", secret).update(canonical, "utf8").digest("hex");
}

export function verifyLifecycleSignature(input: {
  secret: string;
  method: string;
  path: string;
  timestamp: string;
  idempotencyKey: string;
  rawBody: string;
  signature: string;
  maxSkewSeconds?: number;
}): { ok: true } | { ok: false; reason: string } {
  const maxSkew = input.maxSkewSeconds ?? 300;
  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts)) return { ok: false, reason: "invalid_timestamp" };
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > maxSkew) return { ok: false, reason: "stale_timestamp" };

  const bodySha = sha256Hex(input.rawBody);
  const canonical = buildLifecycleCanonicalString({
    method: input.method,
    path: input.path,
    timestamp: input.timestamp,
    idempotencyKey: input.idempotencyKey,
    bodySha256: bodySha,
  });
  const expected = signLifecycleRequest(input.secret, canonical);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(input.signature.trim(), "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}
