/**
 * Trillet workspace provisioning adapter (documented APIs only).
 *
 * Create Workspace (docs):
 *   POST https://api.trillet.ai/v1/api/workspaces
 *   Headers: x-api-key, x-workspace-id (any membership workspace for auth middleware)
 *   Body: { name, initials }
 *   Effect: creates a workspace owned by the authenticated API-key user.
 *
 * Confirmed contract gaps:
 *   - No parent_workspace_id / agency_id / master-agency field is documented.
 *   - x-workspace-id is auth context only — it does not nest the new workspace under an Agency.
 *   - Therefore Agency-managed child workspaces are NOT supported by the public API contract.
 *
 * Policy: never guess, never reuse Phillip's master workspace, never auto-assign
 * STAGING_TRILLET_WORKSPACE_ID as a customer tenant. Return workspace_provisioning_blocked.
 */

import { TRILLET_API_BASE } from "./trillet-invite";

export const TRILLET_CREATE_WORKSPACE_PATH = `${TRILLET_API_BASE}/v1/api/workspaces`;

/** Hard-blocked workspace ids that must never be auto-assigned to customers. */
export const TRILLET_WORKSPACE_HARD_BLOCKLIST = new Set<string>([
  // Phillip Lew production workspace — never customer automation target.
  // Operators may still map a dedicated sandbox via markTrilletWorkspaceReady.
]);

export type AgencyWorkspaceContract = {
  agencyParentManagementSupported: false;
  createWorkspaceDocumented: true;
  createWorkspaceNestsUnderAgency: false;
  detail: string;
  docs: {
    createWorkspace: string;
    inviteTeamMember: string;
  };
};

export type WorkspaceProvisionEnv = {
  TRILLET_WORKSPACE_PROVISION_POLICY?: string;
  STAGING_TRILLET_WORKSPACE_ID?: string;
  TRILLET_INVITE_ALLOWED_WORKSPACE_IDS?: string;
  [key: string]: string | undefined;
};

export type WorkspaceAdapterResult =
  | {
      ok: true;
      mode: "already_mapped";
      workspaceId: string;
      agencyParentManagementSupported: false;
    }
  | {
      ok: false;
      reason: "workspace_provisioning_blocked";
      agencyParentManagementSupported: false;
      detail: string;
      contract: AgencyWorkspaceContract;
    }
  | {
      ok: false;
      reason: "workspace_hard_blocked";
      detail: string;
      workspaceId: string;
    };

export function evaluateAgencyWorkspaceContract(): AgencyWorkspaceContract {
  return {
    agencyParentManagementSupported: false,
    createWorkspaceDocumented: true,
    createWorkspaceNestsUnderAgency: false,
    detail:
      "Create Workspace documents name+initials only; x-workspace-id is auth middleware context, not a parent Agency. No API field nests a customer workspace under a master Agency. Isolated Agency-managed provisioning is blocked until Trillet confirms that contract.",
    docs: {
      createWorkspace: "https://docs.trillet.ai/v1/api-reference/endpoints/workspace/create-workspace",
      inviteTeamMember:
        "https://docs.trillet.ai/v1/api-reference/endpoints/workspace/invite-team-member",
    },
  };
}

/**
 * Default policy is agency_required: refuse auto-create / auto-assign.
 * Other policies are rejected so we never silently fall back to a shared master workspace.
 */
export function resolveWorkspaceProvisionPolicy(
  env: WorkspaceProvisionEnv = process.env,
): "agency_required" {
  const raw = (env.TRILLET_WORKSPACE_PROVISION_POLICY || "agency_required").trim().toLowerCase();
  if (raw && raw !== "agency_required") {
    // Explicitly refuse unknown policies (including create_isolated) until Agency is confirmed.
    return "agency_required";
  }
  return "agency_required";
}

/**
 * Resolve an isolated customer workspace using only confirmed contracts.
 * When no trusted mapping exists, returns workspace_provisioning_blocked.
 */
export function resolveCustomerWorkspaceProvisioning(input: {
  mappedWorkspaceId: string | null | undefined;
  env?: WorkspaceProvisionEnv;
}): WorkspaceAdapterResult {
  const contract = evaluateAgencyWorkspaceContract();
  const mapped = (input.mappedWorkspaceId || "").trim();

  if (mapped) {
    if (TRILLET_WORKSPACE_HARD_BLOCKLIST.has(mapped)) {
      return {
        ok: false,
        reason: "workspace_hard_blocked",
        detail: "workspace_id is on the hard blocklist and cannot be used for customer automation",
        workspaceId: mapped,
      };
    }
    return {
      ok: true,
      mode: "already_mapped",
      workspaceId: mapped,
      agencyParentManagementSupported: false,
    };
  }

  // Never invent a workspace from staging env / allowlists — those are invite allowlists only.
  void resolveWorkspaceProvisionPolicy(input.env);
  void input.env?.STAGING_TRILLET_WORKSPACE_ID;
  void input.env?.TRILLET_INVITE_ALLOWED_WORKSPACE_IDS;

  return {
    ok: false,
    reason: "workspace_provisioning_blocked",
    agencyParentManagementSupported: false,
    detail: contract.detail,
    contract,
  };
}
