import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { EMERGENCY_SCENARIOS } from "./section3Catalog";

describe("section3Catalog stable IDs", () => {
  it("has exactly the 15 scenarios from the final MD", () => {
    assert.equal(EMERGENCY_SCENARIOS.length, 15);
  });

  it("every scenario ID is unique", () => {
    const ids = EMERGENCY_SCENARIOS.map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("IDs are semantic kebab-case slugs, never array-index based", () => {
    for (const [index, scenario] of EMERGENCY_SCENARIOS.entries()) {
      assert.match(scenario.id, /^[a-z][a-z0-9-]*$/);
      assert.notEqual(scenario.id, String(index));
      assert.ok(scenario.id.length > 5);
    }
  });
});
