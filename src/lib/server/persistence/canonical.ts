import { createHash } from "node:crypto";

/** Deterministic JSON. These exact bytes are what we hash and write to S3. */
export function canonicalStringify(value: unknown): string {
  return stringify(value);
}

function stringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stringify(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stringify(record[key])}`)
    .join(",")}}`;
}

export function canonicalJsonBytes(value: unknown): Buffer {
  return Buffer.from(canonicalStringify(value), "utf8");
}

export function sha256Hex(bytes: Buffer | string): string {
  const data = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : bytes;
  return createHash("sha256").update(data).digest("hex");
}
