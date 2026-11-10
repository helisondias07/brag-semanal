import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AssociationRef, Period, RawRecord } from "./types.ts";

export interface FixtureBundle {
  period: Period;
  subjectLogin: string;
  subjectDisplayName: string;
  nowIso: string;
  records: RawRecord[];
}

interface AssociationFile {
  from: AssociationRef;
  to: AssociationRef;
}

function readJson<T>(dir: string, name: string): T {
  return JSON.parse(readFileSync(join(dir, name), "utf8")) as T;
}

function key(ref: AssociationRef): string {
  return `${ref.sourceKind}:${ref.scope}:${ref.nativeId}`;
}

export function loadFixtures(dir: string): FixtureBundle {
  const meta = readJson<{
    period: Period;
    subjectLogin: string;
    subjectDisplayName: string;
    nowIso: string;
  }>(dir, "period.json");
  const prs = readJson<RawRecord[]>(dir, "github-prs.json");
  const commits = readJson<RawRecord[]>(dir, "github-commits.json");
  const tasks = readJson<RawRecord[]>(dir, "clickup-tasks.json");
  const annotations = readJson<RawRecord[]>(dir, "annotations.json");
  const associations = readJson<AssociationFile[]>(dir, "associations.json");

  const records = [...prs, ...commits, ...tasks, ...annotations].map((r) => ({
    ...r,
    sourceLabel: "synthetic-fixture" as const,
    associations: [...(r.associations ?? [])],
  }));

  const index = new Map(records.map((r) => [key({ sourceKind: r.sourceKind, scope: r.scope, nativeId: r.nativeId }), r]));
  for (const edge of associations) {
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
    period: meta.period,
    subjectLogin: meta.subjectLogin,
    subjectDisplayName: meta.subjectDisplayName,
    nowIso: meta.nowIso,
    records,
  };
}
