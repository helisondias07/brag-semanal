import type {
  Attribution,
  Claim,
  Cluster,
  ContributionCandidate,
  LearningCandidate,
  NormalizedItem,
} from "./types.ts";

function claim(id: string, kind: Claim["kind"], text: string, evidenceIds: string[]): Claim {
  return { id, kind, text, evidenceIds };
}

function pickAttribution(members: NormalizedItem[]): Attribution {
  const authors = members.filter((m) => m.attribution.kind === "individual_author");
  const parts = members.filter((m) => m.attribution.kind === "participated");
  const prAuthor = members.find((m) => m.sourceKind === "github_pr" && m.attribution.kind === "individual_author");
  if (prAuthor) {
    return prAuthor.attribution;
  }
  if (authors.length && !members.some((m) => m.sourceKind === "github_pr" || m.sourceKind === "clickup_task")) {
    return authors[0].attribution;
  }
  if (parts.length && authors.length) {
    return {
      kind: "participated",
      reason: "há autoria em parte do cluster e participação em outros itens; não promover a autoria exclusiva do resultado",
      evidenceIds: [...new Set(authors.flatMap((a) => a.attribution.evidenceIds).concat(parts.flatMap((p) => p.attribution.evidenceIds)))],
    };
  }
  if (authors.length) return authors[0].attribution;
  if (parts.length) return parts[0].attribution;
  return {
    kind: "unknown",
    reason: "cluster sem evidência de autoria ou participação do sujeito",
    evidenceIds: [],
  };
}

function teamOutcomeIfShared(members: NormalizedItem[], base: Attribution): Attribution {
  const task = members.find((m) => m.sourceKind === "clickup_task");
  const assignees = task?.actors.assignees ?? [];
  if (task && assignees.length > 1 && (base.kind === "individual_author" || base.kind === "participated")) {
    return {
      kind: "team_outcome",
      reason: "tarefa sintética com múltiplos assignees; resultado da equipe, não autoria individual exclusiva",
      evidenceIds: base.evidenceIds,
    };
  }
  const pr = members.find((m) => m.sourceKind === "github_pr");
  if (pr && pr.attribution.kind === "participated" && pr.state === "merged") {
    return {
      kind: "team_outcome",
      reason: "PR sintético merged em que o sujeito não é author; merge é resultado da equipe",
      evidenceIds: pr.attribution.evidenceIds,
    };
  }
  return base;
}

export function contributionCandidates(
  items: NormalizedItem[],
  clusters: Cluster[],
): { contributions: ContributionCandidate[]; rejected: Array<{ identity: string; reason: string }> } {
  const byId = new Map(items.map((i) => [i.identity, i]));
  const contributions: ContributionCandidate[] = [];
  const rejected: Array<{ identity: string; reason: string }> = [];
  let n = 0;

  for (const cluster of clusters) {
    const members = cluster.memberIdentities.map((id) => byId.get(id)).filter(Boolean) as NormalizedItem[];
    if (members.every((m) => m.sourceKind === "annotation")) {
      continue;
    }

    const workMembers = members.filter((m) => m.sourceKind !== "annotation");
    const inWindowMembers = workMembers.filter((m) => m.period.inWindow);
    const allEvidence = workMembers.flatMap((m) => m.evidence);
    const evidenceIds = allEvidence.map((e) => e.id);

    if (inWindowMembers.length === 0) {
      for (const m of workMembers) {
        rejected.push({ identity: m.identity, reason: m.period.reason });
      }
      continue;
    }

    const facts: Claim[] = [];
    const uncertainties: Claim[] = [];
    const suggestions: Claim[] = [];

    for (const m of inWindowMembers) {
      if (m.sourceKind === "github_pr") {
        const mergedEv = m.evidence.filter((e) => e.field === "timestamps.mergedAt" || (e.field === "state" && e.value === "merged"));
        if (m.state === "merged" && m.timestamps.mergedAt && m.period.qualifyingEvent === "mergedAt") {
          facts.push(
            claim(
              `c-${++n}`,
              "fact",
              `PR sintético ${m.nativeId} em ${m.scope} consta como merged no timestamp qualificável (não é realização real).`,
              mergedEv.map((e) => e.id),
            ),
          );
        }
        // PRs abertos: o evento qualificável é mergedAt, então state=open sem merge
        // comprovado não entra em inWindowMembers. state=open com mergedAt inconsistente
        // não gera fato de merge (exige state===merged). Sem fato, o cluster é rejeitado.
      }
      if (m.sourceKind === "github_commit") {
        const ev = m.evidence.filter((e) => e.field === "timestamps.committedAt");
        facts.push(
          claim(
            `c-${++n}`,
            "fact",
            `Commit sintético ${m.nativeId} em ${m.scope} tem committedAt na janela. Isolado, não prova impacto de produto.`,
            ev.map((e) => e.id),
          ),
        );
      }
      if (m.sourceKind === "clickup_task") {
        if (m.state === "complete" && m.timestamps.completedAt && m.period.qualifyingEvent === "completedAt") {
          facts.push(
            claim(
              `c-${++n}`,
              "fact",
              `Tarefa sintética ${m.nativeId} em ${m.scope} consta complete com completedAt na janela.`,
              m.evidence.filter((e) => e.field === "timestamps.completedAt" || e.field === "state").map((e) => e.id),
            ),
          );
        } else {
          rejected.push({
            identity: m.identity,
            reason: "tarefa sem completedAt/state=complete; assigned/título não viram conquista",
          });
        }
      }
    }

    const attributed = teamOutcomeIfShared(workMembers, pickAttribution(inWindowMembers));
    if (attributed.kind === "unknown") {
      for (const m of workMembers) {
        rejected.push({ identity: m.identity, reason: attributed.reason });
      }
      continue;
    }

    const hasFact = facts.length > 0;
    if (!hasFact) {
      for (const m of inWindowMembers) {
        rejected.push({
          identity: m.identity,
          reason: "ausência de evidência qualificável; nenhuma conquista gerada",
        });
      }
      continue;
    }

    const pr = workMembers.find((m) => m.sourceKind === "github_pr");
    const commits = workMembers.filter((m) => m.sourceKind === "github_commit");
    if (pr && commits.length) {
      suggestions.push(
        claim(
          `c-${++n}`,
          "suggestion",
          "Commits associados ao mesmo PR sintético são evidência do mesmo item; não contabilizar impacto separado (evitar squash/duplicata).",
          commits.flatMap((c) => c.evidence.map((e) => e.id)),
        ),
      );
    } else if (!pr && commits.length) {
      suggestions.push(
        claim(
          `c-${++n}`,
          "suggestion",
          "Commit sintético sem PR/tarefa associada não prova entrega de produto; revisor decide se descreve o trabalho.",
          commits.flatMap((c) => c.evidence.map((e) => e.id)),
        ),
      );
    }

    if (attributed.kind === "team_outcome" || attributed.kind === "participated") {
      suggestions.push(
        claim(
          `c-${++n}`,
          "suggestion",
          "Revisor humano deve decidir se descreve participação versus resultado de equipe. Não inflar autoria individual.",
          attributed.evidenceIds,
        ),
      );
    }

    const primary = byId.get(cluster.primaryIdentity) ?? inWindowMembers[0];
    contributions.push({
      id: `contrib-${primary.sourceKind}-${primary.nativeId}`,
      clusterId: cluster.clusterId,
      title: primary.title || primary.identity,
      attribution: attributed,
      facts,
      uncertainties,
      suggestions,
      evidenceIds,
      memberIdentities: cluster.memberIdentities,
      inWindow: true,
    });
  }

  contributions.sort((a, b) => a.id.localeCompare(b.id));
  rejected.sort((a, b) => a.identity.localeCompare(b.identity));
  return { contributions, rejected };
}

export function learningCandidates(items: NormalizedItem[]): LearningCandidate[] {
  const learnings: LearningCandidate[] = [];
  let n = 0;
  for (const item of items) {
    if (item.sourceKind !== "annotation" || item.annotationKind !== "learning") {
      continue;
    }
    if (!item.claim || !item.claim.trim()) {
      continue;
    }
    if (!item.period.inWindow) {
      continue;
    }
    const evidenceIds = item.evidence.map((e) => e.id);
    if (evidenceIds.length === 0) {
      continue;
    }
    learnings.push({
      id: `learn-${item.nativeId}`,
      text: item.claim,
      evidenceIds,
      annotationIdentity: item.identity,
      facts: [
        claim(
          `l-${++n}`,
          "fact",
          `Aprendizado anotado explicitamente (sintético): ${item.claim}`,
          evidenceIds,
        ),
      ],
    });
  }
  learnings.sort((a, b) => a.id.localeCompare(b.id));
  return learnings;
}
