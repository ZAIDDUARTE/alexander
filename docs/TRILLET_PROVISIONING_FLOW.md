# Trillet provisioning (manual hybrid)

After questionnaire submission, set:

`customer_trillet_workspaces.status = awaiting_internal_setup`

Internal operators configure/test the workspace in Trillet UI, then call authenticated:

`markTrilletWorkspaceReady`

with workspace id + legitimate invitation/access URL.

Only then enqueue Email #2 (`dashboard_ready`).

No Trillet API automation is claimed in this phase.
