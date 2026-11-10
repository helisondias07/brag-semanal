import type { AssociationRef, Period, RawRecord } from "./types.ts";

export interface FixtureBundle {
  period: Period;
  subjectLogin: string;
  subjectDisplayName: string;
  nowIso: string;
  records: RawRecord[];
}

export interface AssociationFile {
  from: AssociationRef;
  to: AssociationRef;
}

export interface FixtureParts {
  meta: {
    period: Period;
    subjectLogin: string;
    subjectDisplayName: string;
    nowIso: string;
  };
  prs: RawRecord[];
  commits: RawRecord[];
  tasks: RawRecord[];
  annotations: RawRecord[];
  associations: AssociationFile[];
}

function key(ref: AssociationRef): string {
  return `${ref.sourceKind}:${ref.scope}:${ref.nativeId}`;
}

/** Pure assembly — Node e browser. Sem I/O. */
export function assembleFixtures(parts: FixtureParts): FixtureBundle {
  const records = [...parts.prs, ...parts.commits, ...parts.tasks, ...parts.annotations].map((r) => ({
    ...r,
    sourceLabel: "synthetic-fixture" as const,
    associations: [...(r.associations ?? [])],
  }));

  const index = new Map(records.map((r) => [key({ sourceKind: r.sourceKind, scope: r.scope, nativeId: r.nativeId }), r]));
  for (const edge of parts.associations) {
    const a = index.get(key(edge.from));
    const b = index.get(key(edge.to));
    if (a) {
      a.associations = a.associations ?? [];
      if (!a.associations.some((x) => key(x) === key(edge.to))) a.associations.push(edge.to);
    }
    if (b) {
      b.associations = b.associations ?? [];
      if (!b.associations.some((x) => key(x) === key(edge.from))) b.associations.push(edge.from);
    }
  }

  return {
    period: parts.meta.period,
    subjectLogin: parts.meta.subjectLogin,
    subjectDisplayName: parts.meta.subjectDisplayName,
    nowIso: parts.meta.nowIso,
    records,
  };
}
