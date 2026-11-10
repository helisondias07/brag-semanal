export const SYNTHETIC_DISCLAIMER =
  "DADOS FICTÍCIOS / SYNTHETIC FIXTURES. Estas entradas, evidências e rascunhos NÃO descrevem realizações reais de Helison Dias. São material de demonstração rotulado para o MVP.";

export type SourceKind = "github_pr" | "github_commit" | "clickup_task" | "annotation";

export type AttributionKind =
  | "individual_author"
  | "participated"
  | "team_outcome"
  | "unknown";

export type ClaimKind = "fact" | "uncertainty" | "suggestion";

export type QualifyingEventKind =
  | "mergedAt"
  | "committedAt"
  | "completedAt"
  | "createdAt"
  | "none";

export interface Period {
  timeZone: "America/Sao_Paulo";
  startInclusive: string;
  endExclusive: string;
}

export interface AssociationRef {
  sourceKind: SourceKind;
  scope: string;
  nativeId: string;
}

export interface EvidenceRecord {
  id: string;
  sourceKind: SourceKind;
  sourceLabel: "synthetic-fixture";
  scope: string;
  nativeId: string;
  field: string;
  value: string;
  recordedAt?: string;
}

export interface RawActorFields {
  authorLogin?: string;
  committerLogin?: string;
  assignees?: string[];
  reviewers?: string[];
}

export interface RawTimestamps {
  createdAt?: string;
  updatedAt?: string;
  mergedAt?: string;
  closedAt?: string;
  committedAt?: string;
  completedAt?: string;
}

export interface RawRecord {
  sourceKind: SourceKind;
  sourceLabel: "synthetic-fixture";
  nativeId: string;
  scope: string;
  title?: string;
  body?: string;
  url?: string;
  state?: string;
  timestamps: RawTimestamps;
  actors?: RawActorFields;
  associations?: AssociationRef[];
  annotationKind?: "learning" | "impact" | "note";
  claim?: string;
  subjectLogin?: string;
}

export interface AccessPolicy {
  adapter: "github" | "clickup";
  enabled: boolean;
  allowlist: {
    account: string;
    resources: string[];
  };
  window: Period;
  retention: {
    destination: "memory" | "local_sanitized";
    maxDays: number;
  };
}

export interface PeriodMembership {
  inWindow: boolean;
  qualifyingEvent: QualifyingEventKind;
  timestamp?: string;
  reason: string;
}

export interface Attribution {
  kind: AttributionKind;
  reason: string;
  evidenceIds: string[];
}

export interface Claim {
  id: string;
  kind: ClaimKind;
  text: string;
  evidenceIds: string[];
}

export interface NormalizedItem {
  identity: string;
  sourceKind: SourceKind;
  sourceLabel: "synthetic-fixture";
  scope: string;
  nativeId: string;
  synthetic: true;
  title: string;
  body: string;
  canonicalUrl?: string;
  urlRejected?: string;
  state?: string;
  timestamps: RawTimestamps;
  actors: RawActorFields;
  associations: AssociationRef[];
  period: PeriodMembership;
  attribution: Attribution;
  evidence: EvidenceRecord[];
  annotationKind?: "learning" | "impact" | "note";
  claim?: string;
  validationIssues: string[];
}

export interface Cluster {
  clusterId: string;
  memberIdentities: string[];
  primaryIdentity: string;
  sourceKinds: SourceKind[];
}

export interface ContributionCandidate {
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

export interface LearningCandidate {
  id: string;
  text: string;
  evidenceIds: string[];
  annotationIdentity: string;
  facts: Claim[];
}

export interface ReviewableDraft {
  disclaimer: string;
  subject: string;
  period: Period;
  generatedAt: string;
  humanReviewRequired: true;
  autoPublish: false;
  facts: Claim[];
  uncertainties: Claim[];
  suggestions: Claim[];
  contributions: ContributionCandidate[];
  learnings: LearningCandidate[];
  rejectedAsAchievement: Array<{ identity: string; reason: string }>;
  clusters: Cluster[];
  items: NormalizedItem[];
  redactionLog: string[];
}

export interface PipelineResult {
  draft: ReviewableDraft;
  markdown: string;
  sanitizedInputCount: number;
}

export interface PipelineOptions {
  period: Period;
  subjectLogin: string;
  subjectDisplayName: string;
  nowIso?: string;
}

export type ReviewStatus = "include" | "exclude" | "needs_review";

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
