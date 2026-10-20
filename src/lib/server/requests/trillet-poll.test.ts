import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mintStagingTokens, parseApprovedCallIds } from "./trillet-poll";
import { tokenHash } from "./intake";

describe("trillet-poll helpers", () => {
  it("mints high-entropy webhook and reader tokens with sha256 hashes", () => {
    const minted = mintStagingTokens();
    assert.match(minted.webhookToken, /^[A-Za-z0-9_-]{40,}$/);
    assert.match(minted.readerToken, /^[A-Za-z0-9_-]{40,}$/);
    assert.equal(minted.webhookTokenHash, tokenHash(minted.webhookToken));
    assert.equal(minted.readerTokenHash, tokenHash(minted.readerToken));
    assert.notEqual(minted.webhookToken, minted.readerToken);
  });

  it("parses approved call IDs and drops invalid tokens", () => {
    assert.deepEqual(parseApprovedCallIds(""), []);
    assert.deepEqual(parseApprovedCallIds("call-abc12345, bad, call_def67890"), [
      "call-abc12345",
      "call_def67890",
    ]);
  });
});
