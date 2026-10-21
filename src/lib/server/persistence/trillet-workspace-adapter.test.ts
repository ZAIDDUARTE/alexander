import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TRILLET_CREATE_WORKSPACE_PATH,
  TRILLET_WORKSPACE_HARD_BLOCKLIST,
  evaluateAgencyWorkspaceContract,
  resolveCustomerWorkspaceProvisioning,
  resolveWorkspaceProvisionPolicy,
} from "./trillet-workspace-adapter";
import {
  ALEXANDER_QA_CANDIDATE_WORKSPACE_ID,
  PHILLIP_LEW_MASTER_WORKSPACE_ID,
} from "./trillet-workspace-ids";

describe("trillet-workspace-adapter", () => {
  it("documents create workspace path without claiming Agency nesting", () => {
    assert.equal(TRILLET_CREATE_WORKSPACE_PATH, "https://api.trillet.ai/v1/api/workspaces");
    const contract = evaluateAgencyWorkspaceContract();
    assert.equal(contract.agencyParentManagementSupported, false);
    assert.equal(contract.createWorkspaceNestsUnderAgency, false);
    assert.equal(contract.createWorkspaceDocumented, true);
  });

  it("forces agency_required policy and never invents workspaces from env allowlists", () => {
    assert.equal(resolveWorkspaceProvisionPolicy({}), "agency_required");
    assert.equal(
      resolveWorkspaceProvisionPolicy({ TRILLET_WORKSPACE_PROVISION_POLICY: "create_isolated" }),
      "agency_required",
    );

    const blocked = resolveCustomerWorkspaceProvisioning({
      mappedWorkspaceId: null,
      env: {
        STAGING_TRILLET_WORKSPACE_ID: "ws-phillip-or-sandbox",
        TRILLET_INVITE_ALLOWED_WORKSPACE_IDS: "ws-a,ws-b",
      },
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.equal(blocked.reason, "workspace_provisioning_blocked");
      assert.equal(blocked.agencyParentManagementSupported, false);
    }
  });

  it("hard-blocks Phillip's master workspace and still accepts the QA candidate id", () => {
    assert.equal(TRILLET_WORKSPACE_HARD_BLOCKLIST.has(PHILLIP_LEW_MASTER_WORKSPACE_ID), true);
    assert.equal(TRILLET_WORKSPACE_HARD_BLOCKLIST.has(ALEXANDER_QA_CANDIDATE_WORKSPACE_ID), false);

    const phillip = resolveCustomerWorkspaceProvisioning({
      mappedWorkspaceId: PHILLIP_LEW_MASTER_WORKSPACE_ID,
    });
    assert.equal(phillip.ok, false);
    if (!phillip.ok) assert.equal(phillip.reason, "workspace_hard_blocked");

    const qa = resolveCustomerWorkspaceProvisioning({
      mappedWorkspaceId: ALEXANDER_QA_CANDIDATE_WORKSPACE_ID,
    });
    assert.equal(qa.ok, true);
    if (qa.ok) assert.equal(qa.workspaceId, ALEXANDER_QA_CANDIDATE_WORKSPACE_ID);
  });

  it("accepts an already-mapped isolated workspace id", () => {
    const mapped = resolveCustomerWorkspaceProvisioning({
      mappedWorkspaceId: "ws-customer-isolated-1",
    });
    assert.equal(mapped.ok, true);
    if (mapped.ok) {
      assert.equal(mapped.mode, "already_mapped");
      assert.equal(mapped.workspaceId, "ws-customer-isolated-1");
    }
  });
});
