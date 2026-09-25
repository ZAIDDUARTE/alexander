import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const cardPath = join(dirname(fileURLToPath(import.meta.url)), "Card.tsx");

describe("QuestionCard — structural regression", () => {
  const source = readFileSync(cardPath, "utf8");

  it("visual card border is on outer container, not on fieldset", () => {
    assert.match(source, /question-card rounded-xl border/);
    assert.match(source, /<fieldset className="min-w-0 border-0 p-0">/);
    assert.doesNotMatch(source, /<fieldset className="rounded-xl border/);
  });

  it("keeps semantic legend inside the card", () => {
    assert.match(source, /<legend className="[^"]*block w-full/);
  });

  it("documents question-level error ownership", () => {
    assert.match(source, /question-level cross-field/);
  });
});
