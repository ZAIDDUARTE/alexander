import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPositiveMoney,
  isStructuredMoney,
  normalizeMoneyInput,
  sanitizeMoneyInput,
} from "./money";

describe("structured money input", () => {
  it("keeps digits and at most two decimal places, without a dollar sign", () => {
    assert.equal(sanitizeMoneyInput("123"), "123");
    assert.equal(sanitizeMoneyInput("123.45"), "123.45");
    assert.equal(sanitizeMoneyInput("123.456"), "123.45");
    assert.equal(sanitizeMoneyInput("$123.40"), "123.40");
    assert.equal(sanitizeMoneyInput("$1,234.50"), "1234.50");
    assert.equal(sanitizeMoneyInput(normalizeMoneyInput("12.")), "12");
  });

  it("rejects negatives, letters, and a stored dollar sign", () => {
    assert.equal(sanitizeMoneyInput("-12.5"), "12.5");
    assert.equal(sanitizeMoneyInput("abc"), "");
    assert.equal(sanitizeMoneyInput("12a.3b"), "12.3");
    assert.equal(isPositiveMoney("$10"), false);
    assert.equal(isPositiveMoney("-1"), false);
    assert.equal(isPositiveMoney("10.555"), false);
    assert.equal(isStructuredMoney("0"), true);
    assert.equal(isPositiveMoney("0"), false);
    assert.equal(isPositiveMoney("0.50"), true);
    assert.equal(isPositiveMoney("75.00"), true);
  });
});
