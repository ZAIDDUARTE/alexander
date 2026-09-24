import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EXCEPTION_TYPES,
  CALLER_TYPES,
  APPOINTMENT_WINDOW_TEMPLATES,
  CONFIRMATION_INFO_OPTIONS,
  NO_AVAILABILITY_FALLBACK_OPTIONS,
  CAPACITY_POLICY_ROWS,
} from "./section4Catalog";

function assertUniqueIds(items: readonly { id: string }[], label: string): void {
  const ids = items.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, `${label} IDs must be unique`);
}

describe("section4Catalog stable IDs", () => {
  it("every catalog list uses unique semantic IDs", () => {
    assertUniqueIds(EXCEPTION_TYPES, "EXCEPTION_TYPES");
    assertUniqueIds(CALLER_TYPES, "CALLER_TYPES");
    assertUniqueIds(APPOINTMENT_WINDOW_TEMPLATES, "APPOINTMENT_WINDOW_TEMPLATES");
    assertUniqueIds(CONFIRMATION_INFO_OPTIONS, "CONFIRMATION_INFO_OPTIONS");
    assertUniqueIds(NO_AVAILABILITY_FALLBACK_OPTIONS, "NO_AVAILABILITY_FALLBACK_OPTIONS");
    assertUniqueIds(CAPACITY_POLICY_ROWS, "CAPACITY_POLICY_ROWS");
  });

  it("includes Homeowner in caller types (review addition)", () => {
    assert.ok(CALLER_TYPES.some((c) => c.id === "homeowner"));
  });

  it("IDs are semantic slugs, not array indexes", () => {
    for (const [index, row] of CALLER_TYPES.entries()) {
      assert.match(row.id, /^[a-z][a-z0-9_]*$/);
      assert.notEqual(row.id, String(index));
    }
  });
});
