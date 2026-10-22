export const PUBLICATION_STATUSES = [
  "draft",
  "config_generated",
  "qa_required",
  "qa_passed",
  "published",
  "sync_failed",
  "rolled_back",
] as const;

export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export type QaRequirement = {
  id: string;
  label: string;
  required: boolean;
  satisfied: boolean;
  satisfiedAt?: string | null;
};

export type PublicationState = {
  status: PublicationStatus;
  profileRevision: number;
  configContentSha256: string | null;
  approvedProfileRevision: number | null;
  approvedConfigContentSha256: string | null;
  lastFailure: { code: string; message: string; at: string } | null;
  qaRequirements: QaRequirement[];
  updatedAt: string;
};

export const DEFAULT_QA_REQUIREMENTS: QaRequirement[] = [
  {
    id: "prompt_review",
    label: "Review generated agent instructions against business policies",
    required: true,
    satisfied: false,
  },
  {
    id: "kb_review",
    label: "Review company knowledge for factual accuracy",
    required: true,
    satisfied: false,
  },
  {
    id: "fictional_call_pass",
    label: "Complete a fictional QA call covering request capture",
    required: true,
    satisfied: false,
  },
  {
    id: "integration_dry_check",
    label: "Confirm Jobber/GCal adapters stay request-only / read-only",
    required: true,
    satisfied: false,
  },
];

export function emptyPublicationState(profileRevision: number): PublicationState {
  return {
    status: "draft",
    profileRevision,
    configContentSha256: null,
    approvedProfileRevision: null,
    approvedConfigContentSha256: null,
    lastFailure: null,
    qaRequirements: DEFAULT_QA_REQUIREMENTS.map((r) => ({ ...r })),
    updatedAt: new Date().toISOString(),
  };
}

export function readPublicationState(
  profileData: Record<string, unknown>,
  currentRevision: number,
): PublicationState {
  const raw = profileData._publication;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyPublicationState(currentRevision);
  }
  const row = raw as Record<string, unknown>;
  const status = PUBLICATION_STATUSES.includes(row.status as PublicationStatus)
    ? (row.status as PublicationStatus)
    : "draft";
  const qa = Array.isArray(row.qaRequirements)
    ? (row.qaRequirements as QaRequirement[])
    : DEFAULT_QA_REQUIREMENTS.map((r) => ({ ...r }));
  return {
    status,
    profileRevision: Number(row.profileRevision || currentRevision) || currentRevision,
    configContentSha256:
      typeof row.configContentSha256 === "string" ? row.configContentSha256 : null,
    approvedProfileRevision:
      row.approvedProfileRevision == null ? null : Number(row.approvedProfileRevision),
    approvedConfigContentSha256:
      typeof row.approvedConfigContentSha256 === "string"
        ? row.approvedConfigContentSha256
        : null,
    lastFailure:
      row.lastFailure && typeof row.lastFailure === "object"
        ? (row.lastFailure as PublicationState["lastFailure"])
        : null,
    qaRequirements: qa,
    updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : new Date().toISOString(),
  };
}

export function writePublicationIntoProfile(
  profileData: Record<string, unknown>,
  publication: PublicationState,
): Record<string, unknown> {
  return {
    ...profileData,
    _publication: {
      ...publication,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function allRequiredQaSatisfied(publication: PublicationState): boolean {
  return publication.qaRequirements
    .filter((r) => r.required)
    .every((r) => r.satisfied);
}

export function markQaRequirement(
  publication: PublicationState,
  requirementId: string,
  satisfied: boolean,
): PublicationState {
  const qaRequirements = publication.qaRequirements.map((r) =>
    r.id === requirementId
      ? {
          ...r,
          satisfied,
          satisfiedAt: satisfied ? new Date().toISOString() : null,
        }
      : r,
  );
  const next: PublicationState = {
    ...publication,
    qaRequirements,
    updatedAt: new Date().toISOString(),
  };
  if (allRequiredQaSatisfied(next) && (next.status === "qa_required" || next.status === "config_generated")) {
    next.status = "qa_passed";
  }
  if (!allRequiredQaSatisfied(next) && next.status === "qa_passed") {
    next.status = "qa_required";
  }
  return next;
}
