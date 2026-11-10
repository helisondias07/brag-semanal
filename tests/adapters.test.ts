import { describe, expect, it } from "vitest";
import { ClickUpReadAdapter } from "../src/adapters/clickup.ts";
import { AdapterInactiveError, AdapterPolicyError } from "../src/adapters/errors.ts";
import { GitHubReadAdapter } from "../src/adapters/github.ts";
import { loadFixtures } from "../src/loadFixtures.ts";
import type { AccessPolicy } from "../src/types.ts";

const period = {
  timeZone: "America/Sao_Paulo" as const,
  startInclusive: "2026-02-02T00:00:00-03:00",
  endExclusive: "2026-02-09T00:00:00-03:00",
};

describe("adaptadores somente leitura inativos", () => {
  it("GitHub e ClickUp recusam fetch sem allowlist/enable", async () => {
    await expect(new GitHubReadAdapter().fetch()).rejects.toBeInstanceOf(AdapterInactiveError);
    await expect(new ClickUpReadAdapter().fetch()).rejects.toBeInstanceOf(AdapterInactiveError);
  });

  it("transporte live não dispara rede", async () => {
    const policy: AccessPolicy = {
      adapter: "github",
      enabled: true,
      allowlist: { account: "synthetic-org", resources: ["synthetic-org/app"] },
      window: period,
      retention: { destination: "memory", maxDays: 7 },
    };
    await expect(new GitHubReadAdapter({ enabled: true, transport: "live" }).fetch(policy)).rejects.toBeInstanceOf(
      AdapterPolicyError,
    );
    await expect(
      new ClickUpReadAdapter({ enabled: true, transport: "live" }).fetch({ ...policy, adapter: "clickup" }),
    ).rejects.toBeInstanceOf(AdapterPolicyError);
  });

  it("fixture + allowlist filtra escopo sem HTTP", async () => {
    const records = loadFixtures("fixtures").records;
    const gh = new GitHubReadAdapter({ enabled: true, transport: "fixture", fixtureRecords: records });
    const got = await gh.fetch({
      adapter: "github",
      enabled: true,
      allowlist: { account: "synthetic-account", resources: ["synthetic-org/app"] },
      window: period,
      retention: { destination: "local_sanitized", maxDays: 14 },
    });
    expect(got.length).toBeGreaterThan(0);
    expect(got.every((r) => r.scope === "synthetic-org/app")).toBe(true);
    const cu = new ClickUpReadAdapter({ enabled: true, transport: "fixture", fixtureRecords: records });
    const tasks = await cu.fetch({
      adapter: "clickup",
      enabled: true,
      allowlist: { account: "synthetic-account", resources: ["synthetic-space/sprint-board"] },
      window: period,
      retention: { destination: "memory", maxDays: 14 },
    });
    expect(tasks.every((r) => r.sourceKind === "clickup_task")).toBe(true);
  });
});
