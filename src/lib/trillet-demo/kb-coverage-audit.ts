import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { CustomerPolicyProfileV1 } from "../policy-profile/types";

export type KbCoverageRow = {
  domain: string;
  kbSection: string;
  status: "covered" | "partial" | "gap" | "prompt_only";
  notes: string;
};

export type KbCoverageReport = {
  knowledgePath: string;
  profileSourcePath: string;
  rows: KbCoverageRow[];
  contradictions: string[];
  qaSupplementRecommended: boolean;
};

const KB_PATH = resolve(
  import.meta.dirname,
  "../../../output/trillet-demo/company-knowledge.md",
);

export function auditMarinaKbCoverage(
  profile: CustomerPolicyProfileV1,
  kbMarkdown = readFileSync(KB_PATH, "utf8"),
): KbCoverageReport {
  const lower = kbMarkdown.toLowerCase();
  const rows: KbCoverageRow[] = [
    {
      domain: "Company identity & prohibited claims",
      kbSection: "Identity & trust",
      status: lower.includes("never claim") && lower.includes("marina del rey") ? "covered" : "gap",
      notes: "Legal name, license line, permitted/never claims.",
    },
    {
      domain: "Office / field / answering / emergency hours",
      kbSection: "Hours (distinct types)",
      status: lower.includes("office hours") && lower.includes("emergency service hours") ? "covered" : "partial",
      notes: "Distinct hour types documented.",
    },
    {
      domain: "Services, diagnostics, property eligibility",
      kbSection: "Services & territory",
      status: lower.includes("plumbing services matrix") ? "covered" : "gap",
      notes: "Matrices with conditions.",
    },
    {
      domain: "Service area & exclusions",
      kbSection: "Service area / Excluded territory",
      status: lower.includes("90292") && lower.includes("excluded territory") ? "covered" : "gap",
      notes: "ZIP list and exclusion rules.",
    },
    {
      domain: "Urgency & emergency triggers",
      kbSection: "Emergencies",
      status: lower.includes("suspected gas leak") ? "covered" : "gap",
      notes: "Classifications and triggers; immediate safety steps belong in agent instructions.",
    },
    {
      domain: "Scheduling intake fields & windows",
      kbSection: "Scheduling (intake)",
      status: lower.includes("appointment windows") ? "covered" : "partial",
      notes: "Booking mode in KB is reference; live call is request-only per instructions.",
    },
    {
      domain: "Authorized price rows & quote permission",
      kbSection: "Pricing & payments",
      status: lower.includes("authorized price rows") ? "covered" : "gap",
      notes: "Starting/exact diagnostic rows present.",
    },
    {
      domain: "Cancellation / no-show / ancillary fees",
      kbSection: "Pricing & payments",
      status: "gap",
      notes: "Profile configures fees (Q45/Q46/Q56) but KB lacks enforceable fee amounts; REVIEW_REQUIRED — do not quote cancellation/no-show fees.",
    },
    {
      domain: "Prior work, complaints, restricted disclosures",
      kbSection: "Customer care",
      status: lower.includes("restricted disclosures") ? "covered" : "partial",
      notes: "High-level actions; executable warranty predicates not in KB.",
    },
    {
      domain: "Languages, agent name, AI disclosure",
      kbSection: "Voice & conversation (Lisa)",
      status: lower.includes("opening_ai_receptionist") ? "covered" : "gap",
      notes: "Greeting disclosure also fixed in agent instructions.",
    },
    {
      domain: "Integration / CRM connectivity",
      kbSection: "Integration note (demo)",
      status: "covered",
      notes: "States systems are not live in demo.",
    },
    {
      domain: "Conversational intelligence (3A/9A/11A)",
      kbSection: "—",
      status: "prompt_only",
      notes: "Must remain in agent instructions, not KB search.",
    },
    {
      domain: "Request-only honesty & tool outcomes",
      kbSection: "—",
      status: "prompt_only",
      notes: "Mandatory operating rules in instructions.",
    },
    {
      domain: "Exception approvers & contact routing",
      kbSection: "—",
      status: "gap",
      notes: "Approver roles without reachable contact IDs in profile — do not route exceptions autonomously.",
    },
  ];

  const contradictions: string[] = [];
  if (/book_appointment/i.test(kbMarkdown) && /attempt the designated office or on-call transfer/i.test(kbMarkdown)) {
    contradictions.push(
      "KB scheduling/answering text describes book_appointment and transfer attempts; live request-only agent instructions override — do not book or claim transfer without tool proof.",
    );
  }
  if (/Lisa may offer same-day appointments/i.test(kbMarkdown)) {
    contradictions.push(
      "KB same-day rule assumes schedulable slots; request-only deployment must not promise same-day or confirmed slots on the call.",
    );
  }

  const qaSupplementRecommended = rows.some((r) => r.status === "gap" && r.domain.includes("Cancellation"));

  return {
    knowledgePath: KB_PATH,
    profileSourcePath:
      "docs/alexander-readiness/dev-artifacts/phillip-policy-profile-v1.json (Alexander versioned source — not embedded in Trillet instructions)",
    rows,
    contradictions,
    qaSupplementRecommended,
  };
}

export function formatUnresolvedPolicyGaps(profile: CustomerPolicyProfileV1): string[] {
  const gaps: string[] = [];
  for (const issue of profile.review.issues) {
    gaps.push(`[${issue.severity}] ${issue.code}: ${issue.message}`);
  }
  gaps.push(
    "installation.timezone unset in profile export — use America/Los_Angeles only as documented reference timezone; do not claim live open/closed without tool time.",
  );
  gaps.push(
    "installation.company_id and installation.currency not in export — do not infer billing currency or tenant identity from caller data.",
  );
  gaps.push(
    "Cancellation/no-show fee amounts not publishable until PROFILE-06 / REMEDY_NONE_WITH_FEES review resolved — refuse to state fee dollars on the call.",
  );
  return gaps;
}
