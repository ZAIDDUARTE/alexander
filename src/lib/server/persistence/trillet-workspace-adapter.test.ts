import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  TRILLET_CREATE_WORKSPACE_PATH,
  evaluateAgencyWorkspaceContract,
  resolveCustomerWorkspaceProvisioning,
  resolveWorkspaceProvisionPolicy,
} from "./trillet-workspace-adapter";

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
