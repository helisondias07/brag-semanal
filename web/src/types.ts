export type AttributionKind = "individual_author" | "participated" | "team_outcome" | "unknown";
export type ClaimKind = "fact" | "uncertainty" | "suggestion";
export type ReviewStatus = "include" | "exclude" | "needs_review";

export interface EvidenceRecord {
  id: string;
  sourceKind: string;
  sourceLabel: "synthetic-fixture";
  scope: string;
  nativeId: string;
  field: string;
  value: string;
  recordedAt?: string;
}

export interface Claim {
  id: string;
  kind: ClaimKind;
  text: string;
  evidenceIds: string[];
}

export interface Attribution {
  kind: AttributionKind;
  reason: string;
  evidenceIds: string[];
}

export interface Contribution {
  id: string;
  clusterId: string;
  title: string;
  attribution: Attribution;
  facts: Claim[];
  uncertainties: Claim[];
  suggestions: Claim[];
  evidenceIds: string[];
  memberIdentities: string[];
  inWindow: boolean;
}

export interface Learning {
  id: string;
  text: string;
  evidenceIds: string[];
  annotationIdentity: string;
  facts: Claim[];
}

export interface Draft {
  disclaimer: string;
  subject: string;
  period: { timeZone: "America/Sao_Paulo"; startInclusive: string; endExclusive: string };
  generatedAt: string;
  humanReviewRequired: true;
  autoPublish: false;
  facts: Claim[];
  uncertainties: Claim[];
  suggestions: Claim[];
  contributions: Contribution[];
  learnings: Learning[];
  rejectedAsAchievement: Array<{ identity: string; reason: string }>;
  clusters: Array<{ clusterId: string; memberIdentities: string[]; primaryIdentity: string }>;
  items: Array<{
    identity: string;
    sourceKind: string;
    sourceLabel: "synthetic-fixture";
    title: string;
    evidence: EvidenceRecord[];
    period: { inWindow: boolean; reason: string; qualifyingEvent: string; timestamp?: string };
    attribution: Attribution;
    canonicalUrl?: string;
    urlRejected?: string;
    validationIssues: string[];
  }>;
  redactionLog: string[];
}

export interface ReviewDecision {
  targetId: string;
  targetKind: "contribution" | "learning" | "claim";
  status: ReviewStatus;
  note: string;
  updatedAt: string;
}

export interface ReviewState {
  disclaimer: string;
  persistence: "local-only";
  networkPublish: false;
  decisions: ReviewDecision[];
}

export interface DraftResponse {
  synthetic: true;
  adapters: { github: string; clickup: string; notion: string };
  persistence: string;
  publish: false;
  draft: Draft;
  markdown: string;
}
