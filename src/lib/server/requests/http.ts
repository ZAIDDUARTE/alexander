export async function readLimitedBody(request: Request, maxBytes = 64 * 1024): Promise<Uint8Array> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > maxBytes) throw new Error("payload_too_large");
  if (!request.body) throw new Error("invalid_payload");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > maxBytes) { await reader.cancel(); throw new Error("payload_too_large"); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return result;
}
