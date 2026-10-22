import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyIntake, normalizeIntake, verifyCall, type Binding } from "./intake";
import { checkTestCalendar } from "./google-calendar";
import { createJobberTestRequest, probeJobberRequestMutations } from "./jobber";

const QA_BINDING: Binding = {
  id: "install-qa",
  customerId: "00000000-0000-4000-8000-000000000007",
  workspaceId: "ws-alexander-sandbox",
  flowId: "flow-qa",
  agentId: "agent-qa",
  activatedAt: "2026-10-01T00:00:00.000Z",
  timezone: "America/Los_Angeles",
};

describe("QA agent call → request → Jobber/GCal (fictional, safe)", () => {
  it("creates a request-only decision from a completed fictional QA call", () => {
    const ended = Math.floor(Date.now() / 1000) - 120;
    const verified = verifyCall(
      {
        _id: "call_fictional_001",
        workspaceId: QA_BINDING.workspaceId,
        callFlowId: QA_BINDING.flowId,
        agentId: QA_BINDING.agentId,
        status: "completed",
        endTime: ended,
        analyzedData: {
          caller_name: "Jordan Example",
          callback_number: "+1-555-0100",
          service_requested: "clogged kitchen sink",
          problem_description: "Standing water after dinner; fictional QA only",
          property_type: "residential",
          property_address_or_city: "Fictional City, CA",
          urgency: "routine",
          preferred_appointment_time: "tomorrow morning",
          customer_message: null,
          human_follow_up_required: true,
          service_area_eligibility: "likely",
          call_outcome: "appointment_requested_not_confirmed",
          call_summary: "Caller asked for sink clearing; no booking confirmed.",
        },
      },
      "call_fictional_001",
      QA_BINDING,
    );

    assert.equal(verified.create, true);
    assert.equal(verified.status, "Pending Review");
    assert.equal(verified.reason, "request_only");
    assert.equal(verified.fields.caller_name, "Jordan Example");
  });

  it("does not create a CRM request for information-only fictional calls", () => {
    const fields = normalizeIntake({
      caller_name: "Sam Example",
      callback_number: "+1-555-0199",
      service_requested: null,
      problem_description: null,
      property_type: null,
      property_address_or_city: null,
      urgency: null,
      preferred_appointment_time: null,
      customer_message: "What are your hours?",
      human_follow_up_required: false,
      service_area_eligibility: null,
      call_outcome: "completed_information_only",
      call_summary: "Hours question only",
    });
    const decision = classifyIntake(fields);
    assert.equal(decision.create, false);
    assert.equal(decision.reason, "information_only");
  });

  it("keeps Jobber request writes blocked", () => {
    assert.throws(() => createJobberTestRequest(), /jobber_request_schema_not_verified/);
  });

  it("probes Jobber mutations as read-only schema inspection", async () => {
    const fetcher: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: {
            __type: {
              fields: [
                { name: "requestCreate", args: [{ name: "input", type: { kind: "INPUT_OBJECT", name: "RequestCreateInput" } }] },
                { name: "clientCreate", args: [] },
              ],
            },
          },
          extensions: { versioning: { version: "2026-09-25" } },
        }),
        { status: 200 },
      );

    const probe = await probeJobberRequestMutations("token", fetcher);
    assert.equal(probe.writesEnabledInApp, false);
    assert.equal(probe.createJobberTestRequestBlocked, true);
    assert.ok(probe.requestMutationNames.includes("requestCreate"));
  });

  it("uses Google Calendar freeBusy diagnostic only (no Primary, no writes)", async () => {
    const calendarId = "qa-fictional-calendar@group.calendar.google.com";
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("/calendars/")) {
        return new Response(
          JSON.stringify({ id: calendarId, timeZone: "America/Los_Angeles" }),
          { status: 200 },
        );
      }
      if (url.includes("/freeBusy")) {
        assert.equal(init?.method, "POST");
        const body = JSON.parse(String(init?.body || "{}")) as {
          items: Array<{ id: string }>;
        };
        assert.equal(body.items[0]?.id, calendarId);
        assert.notEqual(body.items[0]?.id, "primary");
        return new Response(
          JSON.stringify({
            calendars: {
              [calendarId]: { busy: [{ start: "2026-10-22T16:00:00Z", end: "2026-10-22T17:00:00Z" }] },
            },
          }),
          { status: 200 },
        );
      }
      return new Response("nope", { status: 404 });
    };

    const result = await checkTestCalendar(
      "ya29.fictional",
      calendarId,
      "2026-10-22T00:00:00Z",
      "2026-10-23T00:00:00Z",
      fetcher,
    );
    assert.equal(result.calendarId, calendarId);
    assert.equal(result.busy.length, 1);

    await assert.rejects(
      () =>
        checkTestCalendar(
          "ya29.fictional",
          "primary",
          "2026-10-22T00:00:00Z",
          "2026-10-23T00:00:00Z",
          fetcher,
        ),
      /dedicated_calendar_required/,
    );
  });
});
