import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const DEFAULT_EXTRACTED = resolve(
  import.meta.dirname,
  "../../../docs/alex-trillet-prompts/v1.2-extracted.txt",
);

/** Runtime shared prompt only (excludes developer installation notes). */
export function loadV12SharedPrompt(extractedPath = DEFAULT_EXTRACTED): string {
  const raw = readFileSync(extractedPath, "utf8");
  const start = raw.indexOf("1. ROLE AND PURPOSE");
  if (start < 0) {
    throw new Error("v1.2 shared prompt start not found in extracted docx text");
  }
  let body = raw.slice(start).trim();
  // Drop trailing platform URL junk if present on last section line.
  body = body.replace(/\nPlatform references[\s\S]*$/i, "").trim();
  return `ALEXANDER REUSABLE AGENT INSTRUCTIONS\nVersion 1.2 | Customer policy profile version 1.0 | Plumbing receptionist\n\n${body}`;
}

/** Extract a numbered subsection (e.g. `3A.`) through the next numbered section header. */
export function extractV12Subsection(extractedRaw: string, sectionHeaderPrefix: string): string {
  const start = extractedRaw.indexOf(sectionHeaderPrefix);
  if (start < 0) {
    throw new Error(`v1.2 subsection not found: ${sectionHeaderPrefix}`);
  }
  const tail = extractedRaw.slice(start);
  const next = tail.search(/\n\d{1,2}[A-Z]?\. [A-Z]/);
  const body = next > 0 ? tail.slice(0, next) : tail;
  return body.trim();
}

export function loadV12ExtractedRaw(extractedPath = DEFAULT_EXTRACTED): string {
  return readFileSync(extractedPath, "utf8");
}
