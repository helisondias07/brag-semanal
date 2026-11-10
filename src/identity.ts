import type { AssociationRef, RawRecord, SourceKind } from "./types.ts";

export function sourcePrefix(kind: SourceKind): string {
  switch (kind) {
    case "github_pr":
      return "pr";
    case "github_commit":
      return "commit";
    case "clickup_task":
      return "task";
    case "annotation":
      return "annotation";
  }
}

/** Stable identity: source + scope + native id. Never title-based. */
export function identityOf(record: Pick<RawRecord, "sourceKind" | "scope" | "nativeId">): string {
  return `${record.sourceKind}:${record.scope}:${sourcePrefix(record.sourceKind)}:${record.nativeId}`;
}

export function identityFromRef(ref: AssociationRef): string {
  return identityOf(ref);
}

export function compareIdentity(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function stableClusterId(identities: string[]): string {
  return [...identities].sort(compareIdentity).join("|");
}
