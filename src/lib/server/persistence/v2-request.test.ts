import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldRouteSubmitThroughPersistenceV2 } from "./v2-request";

describe("shouldRouteSubmitThroughPersistenceV2", () => {
  it("uses V2 when the global flag is on", () => {
    assert.equal(
      shouldRouteSubmitThroughPersistenceV2({
        persistenceV2Enabled: true,
        hasAccessToken: false,
      }),
      true,
    );
  });

  it("uses V2 for invited access cookies even when the global flag is off", () => {
    assert.equal(
      shouldRouteSubmitThroughPersistenceV2({
        persistenceV2Enabled: false,
        hasAccessToken: true,
      }),
      true,
    );
  });

  it("does not force V2 for anonymous browsers when the flag is off", () => {
    assert.equal(
      shouldRouteSubmitThroughPersistenceV2({
        persistenceV2Enabled: false,
        hasAccessToken: false,
      }),
      false,
    );
  });
});
