import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOMER_PROPERTY_TYPES,
  DIAGNOSTIC_SERVICES,
  PLUMBING_SERVICES,
} from "./section2Catalog";

describe("section2Catalog stable IDs", () => {
  it("every catalog ID is unique within its own catalog", () => {
    for (const catalog of [PLUMBING_SERVICES, DIAGNOSTIC_SERVICES, CUSTOMER_PROPERTY_TYPES]) {
      const ids = catalog.map((item) => item.id);
      assert.equal(new Set(ids).size, ids.length);
    }
  });

  it("IDs are unique across all Section 2 catalogs (global reuse safety)", () => {
    const all = [
      ...PLUMBING_SERVICES,
      ...DIAGNOSTIC_SERVICES,
      ...CUSTOMER_PROPERTY_TYPES,
    ].map((item) => item.id);
    assert.equal(new Set(all).size, all.length);
  });

  it("IDs are semantic kebab-case slugs, never array-index based", () => {
    const all = [...PLUMBING_SERVICES, ...DIAGNOSTIC_SERVICES, ...CUSTOMER_PROPERTY_TYPES];
    for (const [index, item] of all.entries()) {
      assert.match(item.id, /^[a-z][a-z0-9-]*$/);
      assert.notEqual(item.id, String(index));
      assert.ok(item.id.length > 2);
    }
  });

  it("catalog row counts match the final MD (22 / 6 / 9)", () => {
    assert.equal(PLUMBING_SERVICES.length, 22);
    assert.equal(DIAGNOSTIC_SERVICES.length, 6);
    assert.equal(CUSTOMER_PROPERTY_TYPES.length, 9);
  });
});
