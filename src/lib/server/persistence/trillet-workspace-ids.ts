/**
 * Confirmed Trillet workspace ids used by provisioning guards.
 * Presence here is not Studio association and is not an assignment.
 */

/** Phillip Lew master workspace. Never a customer automation target. */
export const PHILLIP_LEW_MASTER_WORKSPACE_ID = "6abab4bdf22720afb93099c6";

/**
 * Existing QA shell. Valid for deny-list tests only.
 * Studio managed-client association is not established by this id.
 */
export const ALEXANDER_QA_CANDIDATE_WORKSPACE_ID = "6ad84631243624378abbcfc6";

/** Always denied, even when TRILLET_WORKSPACE_DENY_IDS is unset. */
export const TRILLET_WORKSPACE_HARD_BLOCKLIST = new Set<string>([
  PHILLIP_LEW_MASTER_WORKSPACE_ID,
]);
