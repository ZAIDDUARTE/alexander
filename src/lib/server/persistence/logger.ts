import { sha256Hex } from "./canonical";

export type PersistenceLogEvent = {
  operation: string;
  status: "ok" | "error";
  durationMs: number;
  sessionId?: string;
  contentRevision?: string;
  errorName?: string;
};

/** Only these fields are ever written. Draft JSON cannot ride along. */
export function formatPersistenceLog(event: PersistenceLogEvent): string {
  const line: Record<string, string | number> = {
    source: "alexander-persistence",
    operation: event.operation,
    status: event.status,
    durationMs: event.durationMs,
  };
  if (event.sessionId) {
    line.sessionHash = sha256Hex(event.sessionId).slice(0, 12);
  }
  if (event.contentRevision) {
    line.revisionHashPrefix = sha256Hex(event.contentRevision).slice(0, 12);
  }
  if (event.errorName) {
    line.errorName = event.errorName;
  }
  return JSON.stringify(line);
}

export function createLineLogger(write: (line: string) => void = (line) => {
  console.log(line);
}): (event: PersistenceLogEvent) => void {
  return (event) => {
    write(formatPersistenceLog(event));
  };
}
