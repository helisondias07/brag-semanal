import type { AccessPolicy, RawRecord } from "../types.ts";
import { AdapterInactiveError, AdapterPolicyError } from "./errors.ts";
import { assertActivePolicy, resourceAllowed } from "./policy.ts";

export interface GitHubAdapterOptions {
  enabled?: boolean;
  transport?: "inactive" | "fixture" | "live";
  fixtureRecords?: RawRecord[];
}

export class GitHubReadAdapter {
  readonly name = "github" as const;
  readonly liveImplemented = false;

  constructor(private readonly opts: GitHubAdapterOptions = {}) {}

  async fetch(policy?: AccessPolicy): Promise<RawRecord[]> {
    const transport = this.opts.transport ?? "inactive";
    if (!this.opts.enabled || transport === "inactive") {
      throw new AdapterInactiveError("github");
    }
    if (transport === "live") {
      throw new AdapterPolicyError("transporte live GitHub não existe neste MVP; nenhum HTTP é disparado");
    }
    const active = assertActivePolicy("github", policy);
    const records = (this.opts.fixtureRecords ?? []).filter(
      (r) => (r.sourceKind === "github_pr" || r.sourceKind === "github_commit") && resourceAllowed(active, r.scope),
    );
    return records.map((r) => ({ ...r, sourceLabel: "synthetic-fixture" as const }));
  }
}
