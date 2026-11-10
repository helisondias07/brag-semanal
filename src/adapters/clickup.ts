import type { AccessPolicy, RawRecord } from "../types.ts";
import { AdapterInactiveError, AdapterPolicyError } from "./errors.ts";
import { assertActivePolicy, resourceAllowed } from "./policy.ts";

export interface ClickUpAdapterOptions {
  enabled?: boolean;
  transport?: "inactive" | "fixture" | "live";
  fixtureRecords?: RawRecord[];
}

export class ClickUpReadAdapter {
  readonly name = "clickup" as const;
  readonly liveImplemented = false;

  constructor(private readonly opts: ClickUpAdapterOptions = {}) {}

  async fetch(policy?: AccessPolicy): Promise<RawRecord[]> {
    const transport = this.opts.transport ?? "inactive";
    if (!this.opts.enabled || transport === "inactive") {
      throw new AdapterInactiveError("clickup");
    }
    if (transport === "live") {
      throw new AdapterPolicyError("transporte live ClickUp não existe neste MVP; nenhum HTTP é disparado");
    }
    const active = assertActivePolicy("clickup", policy);
    const records = (this.opts.fixtureRecords ?? []).filter(
      (r) => r.sourceKind === "clickup_task" && resourceAllowed(active, r.scope),
    );
    return records.map((r) => ({ ...r, sourceLabel: "synthetic-fixture" as const }));
  }
}
