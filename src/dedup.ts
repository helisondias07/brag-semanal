import { identityFromRef, identityOf, stableClusterId } from "./identity.ts";
import type { Cluster, NormalizedItem } from "./types.ts";

class UnionFind {
  private parent = new Map<string, string>();

  add(id: string): void {
    if (!this.parent.has(id)) this.parent.set(id, id);
  }

  find(id: string): string {
    this.add(id);
    const p = this.parent.get(id)!;
    if (p !== id) {
      const root = this.find(p);
      this.parent.set(id, root);
      return root;
    }
    return id;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

const PRIMARY_RANK: Record<string, number> = {
  github_pr: 0,
  clickup_task: 1,
  github_commit: 2,
  annotation: 3,
};

/**
 * Dedup only by stable identity and explicit associations.
 * Similar titles never merge distinct identities.
 */
export function clusterItems(items: NormalizedItem[]): Cluster[] {
  const uf = new UnionFind();
  const byIdentity = new Map<string, NormalizedItem>();

  for (const item of items) {
    const id = item.identity;
    uf.add(id);
    const existing = byIdentity.get(id);
    if (existing) {
      uf.union(id, existing.identity);
    }
    byIdentity.set(id, item);
  }

  for (const item of items) {
    for (const assoc of item.associations) {
      const other = identityFromRef(assoc);
      if (byIdentity.has(other) || items.some((i) => i.identity === other)) {
        uf.union(item.identity, other);
      }
    }
  }

  const groups = new Map<string, string[]>();
  for (const item of items) {
    const root = uf.find(item.identity);
    const list = groups.get(root) ?? [];
    list.push(item.identity);
    groups.set(root, list);
  }

  const clusters: Cluster[] = [];
  for (const members of groups.values()) {
    const unique = [...new Set(members)].sort();
    const memberItems = unique.map((id) => byIdentity.get(id)).filter(Boolean) as NormalizedItem[];
    memberItems.sort((a, b) => {
      const r = PRIMARY_RANK[a.sourceKind] - PRIMARY_RANK[b.sourceKind];
      return r !== 0 ? r : a.identity.localeCompare(b.identity);
    });
    const primary = memberItems[0];
    clusters.push({
      clusterId: stableClusterId(unique),
      memberIdentities: unique,
      primaryIdentity: primary.identity,
      sourceKinds: [...new Set(memberItems.map((m) => m.sourceKind))],
    });
  }

  clusters.sort((a, b) => a.clusterId.localeCompare(b.clusterId));
  return clusters;
}

export function sameIdentity(a: NormalizedItem, b: NormalizedItem): boolean {
  return identityOf(a) === identityOf(b);
}
