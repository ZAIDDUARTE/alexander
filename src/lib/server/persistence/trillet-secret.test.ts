import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clearTrilletSecretCache,
  parseTrilletSecretJson,
  resolveTrilletApiKey,
  resolveTrilletApiKeySync,
} from "./trillet-secret";

describe("trillet-secret", () => {
  it("reads env key synchronously", () => {
    assert.equal(resolveTrilletApiKeySync({ TRILLET_API_KEY: "env-key-value-123456" }), "env-key-value-123456");
    assert.equal(resolveTrilletApiKeySync({}), null);
  });

  it("parses JSON secret shapes without exposing values in errors", () => {
    assert.equal(parseTrilletSecretJson(JSON.stringify({ TRILLET_API_KEY: "json-key-abcdefgh" })), "json-key-abcdefgh");
    assert.equal(parseTrilletSecretJson(JSON.stringify({ apiKey: "api-key-abcdefghij" })), "api-key-abcdefghij");
    assert.equal(parseTrilletSecretJson("raw-secret-key-value"), "raw-secret-key-value");
    assert.equal(parseTrilletSecretJson("short"), null);
  });

  it("loads from Secrets Manager when env key missing", async () => {
    clearTrilletSecretCache();
    const resolved = await resolveTrilletApiKey(
      { TRILLET_SECRET_ARN: "arn:aws:secretsmanager:us-east-1:123:secret:trillet" },
      async () => JSON.stringify({ TRILLET_API_KEY: "sm-key-abcdefghijklmn" }),
    );
    assert.equal(resolved.ok, true);
    if (resolved.ok) {
      assert.equal(resolved.source, "secrets_manager");
      assert.equal(resolved.key, "sm-key-abcdefghijklmn");
    }
  });

  it("fails closed when neither env nor secret provides a key", async () => {
    clearTrilletSecretCache();
    const resolved = await resolveTrilletApiKey({}, async () => null);
    assert.equal(resolved.ok, false);
  });
});
