import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ACCOUNT_SETUP_EMAIL_KIND,
  ACCOUNT_SETUP_EMAIL_TEMPLATE,
  queueAccountSetupEmail,
} from "./account-setup-email";
import { renderAccountSetupEmail } from "./email-templates";

describe("account-setup-email", () => {
  it("renders the approved subject and setup copy", () => {
    const rendered = renderAccountSetupEmail({
      firstName: "Zaid",
      companyDisplayName: "Acme Plumbing QA",
    });
    assert.equal(rendered.subject, "We're Setting Up Your Alexander Account");
    assert.match(rendered.text, /Acme Plumbing QA/);
    assert.match(rendered.text, /configuring Alexander/);
  });

  it("uses the reserved profile_updated outbox template without a new migration", () => {
    assert.equal(ACCOUNT_SETUP_EMAIL_TEMPLATE, "profile_updated");
    assert.equal(ACCOUNT_SETUP_EMAIL_KIND, "account_setup_in_progress");
  });

  it("is idempotent on dedupe_key", async () => {
    const rows: Array<{ dedupe_key: string; id: string }> = [];
    const pool = {
      query: async (sql: string, params: unknown[]) => {
        if (sql.includes("SELECT id FROM email_outbox")) {
          const hit = rows.find((r) => r.dedupe_key === params[0]);
          return { rows: hit ? [hit] : [] };
        }
        if (sql.includes("INSERT INTO email_outbox")) {
          const dedupe = String(params[3]);
          const existing = rows.find((r) => r.dedupe_key === dedupe);
          if (existing) return { rows: [existing] };
          const id = `job-${rows.length + 1}`;
          rows.push({ id, dedupe_key: dedupe });
          return { rows: [{ id }] };
        }
        throw new Error(`unexpected sql: ${sql}`);
      },
    };

    const first = await queueAccountSetupEmail(pool as never, {
      customerId: "cust-1",
      submissionId: "sub-1",
      recipient: "zaidduartee@gmail.com",
      firstName: "Zaid",
    });
    const second = await queueAccountSetupEmail(pool as never, {
      customerId: "cust-1",
      submissionId: "sub-1",
      recipient: "zaidduartee@gmail.com",
      firstName: "Zaid",
    });
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (first.ok && second.ok) {
      assert.equal(first.created, true);
      assert.equal(second.created, false);
      assert.equal(first.emailJobId, second.emailJobId);
      assert.equal(rows.length, 1);
    }
  });
});
