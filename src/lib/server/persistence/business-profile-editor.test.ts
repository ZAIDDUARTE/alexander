import assert from "node:assert/strict";
import { describe, it, before, after } from "node:test";
import {
  applyCustomerProfileEdit,
  assertEditingAllowed,
  getBusinessProfile,
  rollbackToApprovedConfiguration,
  updatePublicationState,
  validateFieldPatch,
} from "./business-profile-editor";
import { markQaRequirement, type PublicationState } from "./profile-publication";

describe("business-profile-editor gates and validation", () => {
  it("keeps production editing disabled by default", () => {
    const gate = assertEditingAllowed({
      NODE_ENV: "production",
      ALEXANDER_CUSTOMER_PROFILE_EDITING_ENABLED: "true",
      VERCEL_ENV: "production",
      ALEXANDER_CUSTOMER_PROFILE_PRODUCTION_EDITING_ENABLED: "",
    } as unknown as NodeJS.ProcessEnv);
    assert.equal(gate.ok, false);
  });

  it("allows Preview even when NODE_ENV is production", () => {
    const gate = assertEditingAllowed({
      NODE_ENV: "production",
      ALEXANDER_CUSTOMER_PROFILE_EDITING_ENABLED: "true",
      VERCEL_ENV: "preview",
    } as unknown as NodeJS.ProcessEnv);
    assert.equal(gate.ok, true);
  });

  it("rejects unknown or non-root patch keys", () => {
    const bad = validateFieldPatch({ Q9999: "x", _entities: {} });
    assert.equal(bad.ok, false);
  });

  it("accepts editable root answers", () => {
    const ok = validateFieldPatch({
      Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Acme" },
    });
    assert.equal(ok.ok, true);
  });
});

describe("business-profile-editor persistence (pglite)", () => {
  let pool: {
    connect: () => Promise<{
      query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
      release: () => void;
    }>;
    query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
    end?: () => Promise<void>;
  };
  let customerId = "";
  const prevEditing = process.env.ALEXANDER_CUSTOMER_PROFILE_EDITING_ENABLED;
  const prevVercel = process.env.VERCEL_ENV;

  before(async () => {
    process.env.ALEXANDER_CUSTOMER_PROFILE_EDITING_ENABLED = "true";
    process.env.VERCEL_ENV = "preview";
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite();
    customerId = "11111111-1111-4111-8111-111111111099";
    await db.exec(`
      CREATE TABLE customers (
        id UUID PRIMARY KEY,
        customer_number TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active',
        data_classification TEXT NOT NULL DEFAULT 'synthetic_test',
        customer_facing_name TEXT,
        primary_email TEXT,
        portal_admin_email TEXT
      );
      CREATE TABLE customer_business_profiles (
        customer_id UUID PRIMARY KEY REFERENCES customers (id),
        current_revision INTEGER NOT NULL DEFAULT 0,
        profile_schema_version INTEGER NOT NULL DEFAULT 1,
        profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
        source_submission_id UUID NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE customer_profile_revisions (
        id UUID PRIMARY KEY,
        customer_id UUID NOT NULL REFERENCES customers (id),
        revision_number INTEGER NOT NULL,
        profile_schema_version INTEGER NOT NULL DEFAULT 1,
        profile_data JSONB NOT NULL,
        change_source TEXT NOT NULL,
        source_submission_id UUID NULL,
        actor_type TEXT NOT NULL DEFAULT 'system',
        actor_ref TEXT NULL,
        change_impact TEXT NOT NULL DEFAULT 'unknown',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (customer_id, revision_number)
      );
      CREATE TABLE customer_trillet_workspaces (
        id UUID PRIMARY KEY,
        customer_id UUID NOT NULL UNIQUE REFERENCES customers (id),
        status TEXT NOT NULL DEFAULT 'not_required',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await db.query(
      `INSERT INTO customers (id, customer_number, customer_facing_name, primary_email)
       VALUES ($1, 'ALX-C000099', 'Fictional Plumbing', 'qa@example.test')`,
      [customerId],
    );
    await db.query(
      `INSERT INTO customer_business_profiles (customer_id, current_revision, profile_data)
       VALUES ($1, 1, $2::jsonb)`,
      [
        customerId,
        JSON.stringify({
          schema: "alexander_business_profile_v1",
          fields: {
            Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Fictional Plumbing" },
            Q4: { question_id: "Q4", answer_kind: "scalar_text", value: "https://example.test" },
          },
        }),
      ],
    );
    await db.query(
      `INSERT INTO customer_profile_revisions (
         id, customer_id, revision_number, profile_data, change_source, change_impact, status
       ) VALUES ($1, $2, 1, $3::jsonb, 'initial_questionnaire', 'unknown', 'active')`,
      [
        "22222222-2222-4222-8222-222222222001",
        customerId,
        JSON.stringify({
          schema: "alexander_business_profile_v1",
          fields: {
            Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Fictional Plumbing" },
            Q4: { question_id: "Q4", answer_kind: "scalar_text", value: "https://example.test" },
          },
        }),
      ],
    );

    pool = {
      query: (sql, params) => db.query(sql, params) as never,
      connect: async () => {
        const client = {
          query: (sql: string, params?: unknown[]) => db.query(sql, params) as never,
          release: () => undefined,
        };
        return client;
      },
    };
  });

  after(() => {
    process.env.ALEXANDER_CUSTOMER_PROFILE_EDITING_ENABLED = prevEditing;
    process.env.VERCEL_ENV = prevVercel;
  });

  it("applies optimistic concurrency, classifies changes, and supports publish/rollback", async () => {
    const conflict = await applyCustomerProfileEdit(pool as never, {
      customerId,
      expectedRevision: 0,
      patch: { Q1: "Nope" },
    });
    assert.equal(conflict.ok, false);
    if (!conflict.ok) assert.equal(conflict.reason, "revision_conflict");

    const edited = await applyCustomerProfileEdit(pool as never, {
      customerId,
      expectedRevision: 1,
      patch: {
        Q1: { question_id: "Q1", answer_kind: "scalar_text", value: "Fictional Plumbing QA" },
      },
      actorRef: "test",
    });
    assert.equal(edited.ok, true);
    if (!edited.ok) return;
    assert.equal(edited.revisionNumber, 2);
    assert.equal(edited.diff.revisionImpact, "low");

    await updatePublicationState(pool as never, customerId, (publication, profileData) => {
      (profileData as { _runtime_config?: unknown })._runtime_config = {
        contentSha256: "abc123",
        artifacts: { agentInstructions: "x", companyKnowledge: "y" },
      };
      let next: PublicationState = {
        ...publication,
        status: "config_generated",
        configContentSha256: "abc123",
        profileRevision: 2,
      };
      for (const req of next.qaRequirements) {
        next = markQaRequirement(next, req.id, true);
      }
      return {
        ...next,
        status: "published",
        approvedProfileRevision: 2,
        approvedConfigContentSha256: "abc123",
      };
    });

    const sensitive = await applyCustomerProfileEdit(pool as never, {
      customerId,
      expectedRevision: 2,
      patch: {
        Q8: {
          question_id: "Q8",
          answer_kind: "weekly_schedule",
          value: { monday: { closed: true, start: null, end: null } },
        },
      },
    });
    assert.equal(sensitive.ok, true);
    if (!sensitive.ok) return;
    assert.equal(sensitive.diff.revisionImpact, "high");
    assert.equal(sensitive.trilletSyncRequired, true);

    const rolled = await rollbackToApprovedConfiguration(pool as never, {
      customerId,
      expectedRevision: 3,
      actorRef: "test-rollback",
    });
    assert.equal(rolled.ok, true);
    if (!rolled.ok) return;
    assert.equal(rolled.publication.status, "rolled_back");
    assert.equal(rolled.publication.approvedProfileRevision, 2);

    const snapshot = await getBusinessProfile(pool as never, customerId);
    assert.ok(snapshot);
    assert.equal(snapshot?.currentRevision, 4);
    assert.equal(
      (snapshot?.fields.Q1 as { value?: string })?.value,
      "Fictional Plumbing QA",
    );
  });
});
