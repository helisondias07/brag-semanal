import { treatAsData } from "./escape.ts";
import { identityOf } from "./identity.ts";
import { membership } from "./period.ts";
import { redactRecord, redactText, sanitizeUrl } from "./redact.ts";
import type {
  Attribution,
  EvidenceRecord,
  NormalizedItem,
  Period,
  RawRecord,
} from "./types.ts";

let evidenceSeq = 0;

export function resetEvidenceSeq(): void {
  evidenceSeq = 0;
}

function evidenceId(): string {
  evidenceSeq += 1;
  return `ev-${String(evidenceSeq).padStart(4, "0")}`;
}

function pushEvidence(
  list: EvidenceRecord[],
  item: Omit<EvidenceRecord, "id">,
): string {
  const id = evidenceId();
  list.push({ id, ...item });
  return id;
}

export function attributionFor(
  record: RawRecord,
  subjectLogin: string,
  evidence: EvidenceRecord[],
): Attribution {
  const login = subjectLogin.toLowerCase();
  const author = record.actors?.authorLogin?.toLowerCase();
  const committer = record.actors?.committerLogin?.toLowerCase();
  const reviewers = (record.actors?.reviewers ?? []).map((x) => x.toLowerCase());
  const assignees = (record.actors?.assignees ?? []).map((x) => x.toLowerCase());

  const ev = (field: string, value: string) =>
    pushEvidence(evidence, {
      sourceKind: record.sourceKind,
      sourceLabel: "synthetic-fixture",
      scope: record.scope,
      nativeId: record.nativeId,
      field,
      value,
    });

  if (record.sourceKind === "github_commit") {
    if (author === login || committer === login) {
      const id = ev("actors.authorLogin", record.actors?.authorLogin ?? record.actors?.committerLogin ?? "");
      return {
        kind: "individual_author",
        reason: "login do sujeito aparece como author/committer do commit sintético",
        evidenceIds: [id],
      };
    }
  }

  if (record.sourceKind === "github_pr") {
    if (author === login) {
      const id = ev("actors.authorLogin", record.actors?.authorLogin ?? "");
      return {
        kind: "individual_author",
        reason: "login do sujeito é author do PR sintético",
        evidenceIds: [id],
      };
    }
    if (reviewers.includes(login) || assignees.includes(login)) {
      const field = reviewers.includes(login) ? "actors.reviewers" : "actors.assignees";
      const id = ev(field, subjectLogin);
      return {
        kind: "participated",
        reason: "login do sujeito aparece como reviewer ou assignee, não como author",
        evidenceIds: [id],
      };
    }
  }

  if (record.sourceKind === "clickup_task") {
    if (assignees.length === 1 && assignees[0] === login) {
      const id = ev("actors.assignees", subjectLogin);
      return {
        kind: "individual_author",
        reason: "único assignee sintético coincide com o sujeito; ainda assim completedAt é exigido para entrega",
        evidenceIds: [id],
      };
    }
    if (assignees.includes(login)) {
      const id = ev("actors.assignees", subjectLogin);
      return {
        kind: "participated",
        reason: "sujeito é um dos assignees; resultado pode ser de equipe",
        evidenceIds: [id],
      };
    }
  }

  if (record.sourceKind === "annotation") {
    const id = ev("annotation", record.annotationKind ?? "note");
    return {
      kind: "participated",
      reason: "anotação explícita; não implica autoria do item associado",
      evidenceIds: [id],
    };
  }

  return {
    kind: "unknown",
    reason: "sem evidência de autoria ou participação do sujeito neste registro",
    evidenceIds: [],
  };
}

export function normalizeRecord(
  rawInput: RawRecord,
  period: Period,
  subjectLogin: string,
  redactionLog: string[],
): NormalizedItem {
  const raw = redactRecord(rawInput, redactionLog);
  const evidence: EvidenceRecord[] = [];
  const validationIssues: string[] = [];

  if (raw.sourceLabel !== "synthetic-fixture") {
    validationIssues.push("sourceLabel deve ser synthetic-fixture neste MVP");
  }

  const title = treatAsData(redactText(raw.title ?? "").text);
  const body = treatAsData(redactText(raw.body ?? "").text);
  let canonicalUrl: string | undefined;
  let urlRejected: string | undefined;
  if (raw.url) {
    const url = sanitizeUrl(raw.url);
    if (url.ok) {
      canonicalUrl = url.url;
      pushEvidence(evidence, {
        sourceKind: raw.sourceKind,
        sourceLabel: "synthetic-fixture",
        scope: raw.scope,
        nativeId: raw.nativeId,
        field: "url",
        value: canonicalUrl ?? "",
      });
    } else {
      urlRejected = url.rejected;
      validationIssues.push(`url rejeitada: ${url.rejected}`);
    }
  }

  if (raw.state) {
    pushEvidence(evidence, {
      sourceKind: raw.sourceKind,
      sourceLabel: "synthetic-fixture",
      scope: raw.scope,
      nativeId: raw.nativeId,
      field: "state",
      value: raw.state,
    });
  }

  for (const [field, value] of Object.entries(raw.timestamps)) {
    if (value) {
      pushEvidence(evidence, {
        sourceKind: raw.sourceKind,
        sourceLabel: "synthetic-fixture",
        scope: raw.scope,
        nativeId: raw.nativeId,
        field: `timestamps.${field}`,
        value,
        recordedAt: value,
      });
    }
  }

  const periodInfo = membership(raw, period);
  const attribution = attributionFor(raw, subjectLogin, evidence);

  if (
    raw.sourceKind === "github_pr" &&
    raw.state === "merged" &&
    !raw.timestamps.mergedAt
  ) {
    validationIssues.push("state=merged sem mergedAt não prova merge");
  }

  return {
    identity: identityOf(raw),
    sourceKind: raw.sourceKind,
    sourceLabel: "synthetic-fixture",
    scope: raw.scope,
    nativeId: raw.nativeId,
    synthetic: true,
    title,
    body,
    canonicalUrl,
    urlRejected,
    state: raw.state,
    timestamps: raw.timestamps,
    actors: raw.actors ?? {},
    associations: raw.associations ?? [],
    period: periodInfo,
    attribution,
    evidence,
    annotationKind: raw.annotationKind,
    claim: raw.claim ? treatAsData(redactText(raw.claim).text) : undefined,
    validationIssues,
  };
}

export function normalizeAll(
  records: RawRecord[],
  period: Period,
  subjectLogin: string,
  redactionLog: string[],
): NormalizedItem[] {
  resetEvidenceSeq();
  const sorted = [...records].sort((a, b) => identityOf(a).localeCompare(identityOf(b)));
  return sorted.map((r) => normalizeRecord(r, period, subjectLogin, redactionLog));
}
