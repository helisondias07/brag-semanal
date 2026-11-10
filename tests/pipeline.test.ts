import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clusterItems } from "../src/dedup.ts";
import { exportMarkdown, stableStringify } from "../src/exportMarkdown.ts";
import { loadFixtures } from "../src/loadFixtures.ts";
import { normalizeAll } from "../src/normalize.ts";
import { runPipeline } from "../src/pipeline.ts";
import { emptyReviewState, saveReviewState, upsertDecision } from "../src/review.ts";
import type { RawRecord } from "../src/types.ts";

const SUBJECT = "helison-synthetic";

function bundle() {
  return loadFixtures("fixtures");
}

function run(records?: RawRecord[]) {
  const b = bundle();
  return runPipeline(records ?? b.records, {
    period: b.period,
    subjectLogin: b.subjectLogin,
    subjectDisplayName: b.subjectDisplayName,
    nowIso: b.nowIso,
  });
}

describe("normalização de 3 fontes", () => {
  it("normaliza PR, commit e tarefa com identidade estável e rótulo sintético", () => {
    const b = bundle();
    const log: string[] = [];
    const items = normalizeAll(b.records, b.period, SUBJECT, log);
    const kinds = new Set(items.map((i) => i.sourceKind));
    expect(kinds.has("github_pr")).toBe(true);
    expect(kinds.has("github_commit")).toBe(true);
    expect(kinds.has("clickup_task")).toBe(true);
    expect(items.every((i) => i.synthetic && i.sourceLabel === "synthetic-fixture")).toBe(true);
    const pr = items.find((i) => i.nativeId === "12");
    expect(pr?.identity).toBe("github_pr:synthetic-org/app:pr:12");
  });
});

describe("deduplicação", () => {
  it("colapsa a mesma identidade e associações explícitas cross-source, sem fundir títulos parecidos", () => {
    const result = run();
    const cluster12 = result.draft.clusters.find((c) => c.memberIdentities.some((m) => m.includes("pr:12")));
    expect(cluster12?.memberIdentities.some((m) => m.includes("commit:a1b2c3d"))).toBe(true);
    expect(cluster12?.memberIdentities.some((m) => m.includes("commit:e4f5g6h"))).toBe(true);
    expect(cluster12?.memberIdentities.some((m) => m.includes("task:T-100"))).toBe(true);
    const pr12 = result.draft.contributions.filter((c) => c.memberIdentities.some((m) => m.includes("pr:12")));
    expect(pr12).toHaveLength(1);
    const pr13 = result.draft.contributions.find((c) => c.memberIdentities.some((m) => m.includes("pr:13")));
    expect(pr13).toBeTruthy();
    expect(pr12[0].id).not.toBe(pr13?.id);
    const items = result.draft.items;
    const dup = clusterItems([...items, items.find((i) => i.nativeId === "13")!]);
    const c13 = dup.filter((c) => c.memberIdentities.includes("github_pr:synthetic-org/app:pr:13"));
    expect(c13).toHaveLength(1);
  });
});

describe("evidência e atribuição", () => {
  it("toda afirmação factual aponta IDs e fonte sintética", () => {
    const result = run();
    for (const fact of result.draft.facts) {
      expect(fact.evidenceIds.length).toBeGreaterThan(0);
      expect(result.markdown).toContain(fact.evidenceIds[0]);
    }
    expect(result.markdown).toContain("synthetic-fixture");
    expect(result.markdown).toContain("DADOS FICTÍCIOS");
  });

  it("distingue autoria individual, participação e resultado de equipe", () => {
    const result = run();
    const authored = result.draft.contributions.find((c) => c.memberIdentities.some((m) => m.includes("pr:12")));
    expect(authored?.attribution.kind).toBe("individual_author");
    const reviewed = result.draft.contributions.find((c) => c.memberIdentities.some((m) => m.includes("pr:14")));
    expect(reviewed?.attribution.kind).toBe("team_outcome");
    const teamTask = result.draft.contributions.find((c) => c.memberIdentities.some((m) => m.includes("T-300")));
    expect(teamTask?.attribution.kind).toBe("team_outcome");
  });

  it("vazio/incompleto não vira conquista; aprendizado exige anotação", () => {
    const empty = run([]);
    expect(empty.draft.contributions).toEqual([]);
    expect(empty.draft.learnings).toEqual([]);
    expect(empty.markdown).toContain("Nenhuma contribuição");
    const result = run();
    expect(result.draft.rejectedAsAchievement.some((r) => r.identity.includes("T-200"))).toBe(true);
    expect(result.draft.rejectedAsAchievement.some((r) => r.identity.includes("pr:15"))).toBe(true);
    expect(result.draft.learnings.some((l) => l.id === "learn-L-01")).toBe(true);
    expect(result.draft.learnings.some((l) => l.id === "learn-L-02")).toBe(false);
    expect(result.markdown).not.toMatch(/TypeScript me ensinou/i);
  });

  it("PR aberto não vira fato de merge (mergedAt inconsistente não prova entrega)", () => {
    const b = bundle();
    const open: RawRecord = {
      sourceKind: "github_pr",
      sourceLabel: "synthetic-fixture",
      nativeId: "open-99",
      scope: "synthetic-org/app",
      title: "PR aberto sintético",
      state: "open",
      timestamps: { mergedAt: "2026-02-05T12:00:00-03:00", createdAt: "2026-02-04T12:00:00-03:00" },
      actors: { authorLogin: SUBJECT },
    };
    const result = runPipeline([open], {
      period: b.period,
      subjectLogin: SUBJECT,
      subjectDisplayName: "Helison Dias",
      nowIso: b.nowIso,
    });
    expect(result.draft.contributions.some((c) => c.memberIdentities.some((m) => m.includes("open-99")))).toBe(false);
    expect(result.draft.facts.some((f) => f.text.includes("PR sintético open-99") && f.text.includes("merged"))).toBe(
      false,
    );
    expect(result.draft.rejectedAsAchievement.some((r) => r.identity.includes("open-99"))).toBe(true);
  });
});

describe("períodos e timezone", () => {
  it("America/Sao_Paulo, fronteiras inclusiva/exclusiva, update fora não prova entrega", () => {
    const result = run();
    const start = result.draft.items.find((i) => i.nativeId === "17");
    const end = result.draft.items.find((i) => i.nativeId === "18");
    const updated = result.draft.items.find((i) => i.nativeId === "16");
    const invalid = result.draft.items.find((i) => i.nativeId === "19");
    expect(start?.period.inWindow).toBe(true);
    expect(end?.period.inWindow).toBe(false);
    expect(updated?.period.inWindow).toBe(false);
    expect(updated?.period.reason).toMatch(/fora/);
    expect(invalid?.period.inWindow).toBe(false);
    expect(invalid?.period.reason).toMatch(/inválido|formato/i);
    expect(result.draft.contributions.some((c) => c.memberIdentities.some((m) => m.includes("pr:17")))).toBe(true);
    expect(result.draft.contributions.some((c) => c.memberIdentities.some((m) => m.includes("pr:18")))).toBe(false);
    expect(result.draft.contributions.some((c) => c.memberIdentities.some((m) => m.includes("pr:16")))).toBe(false);
  });
});

describe("redaction e export", () => {
  it("redige tokens, e-mail, query e userinfo; rejeita javascript:; não deixa token no markdown/log", () => {
    const result = run();
    const blob = stableStringify(result.draft) + result.markdown + result.draft.redactionLog.join("\n");
    expect(blob).not.toMatch(/ghp_[A-Za-z0-9]{20,}/);
    expect(blob).not.toContain("alice@example.com");
    expect(blob).not.toContain("supersecret99");
    expect(blob).not.toMatch(/Bearer\s+zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz/);
    const pr12 = result.draft.items.find((i) => i.nativeId === "12");
    expect(pr12?.canonicalUrl).toMatch(/REDACTED/);
    const pr20 = result.draft.items.find((i) => i.nativeId === "20");
    expect(pr20?.canonicalUrl).not.toContain("pwned");
    const pr19 = result.draft.items.find((i) => i.nativeId === "19");
    expect(pr19?.urlRejected).toMatch(/rejected_protocol/);
    expect(result.markdown).toContain("DADOS FICTÍCIOS");
    expect(result.markdown).toContain("evidência:");
  });

  it("saída determinística na reexecução", () => {
    const a = run();
    const b = run();
    expect(stableStringify(a.draft)).toBe(stableStringify(b.draft));
    expect(a.markdown).toBe(b.markdown);
  });

  it("export markdown e revisão local exclui item", () => {
    const result = run();
    const first = result.draft.contributions[0];
    let state = emptyReviewState();
    state = upsertDecision(state, {
      targetId: first.id,
      targetKind: "contribution",
      status: "exclude",
      note: "excluído no teste",
      updatedAt: "2026-02-09T12:00:00.000Z",
    });
    const md = exportMarkdown(result.draft, state);
    expect(md).not.toContain(first.id);
    const dir = mkdtempSync(join(tmpdir(), "brag-"));
    const path = join(dir, "review.json");
    saveReviewState(path, state);
    expect(readFileSync(path, "utf8")).toContain("excluído no teste");
  });
});

describe("validação", () => {
  it("recusa período invertido", () => {
    const b = bundle();
    expect(() =>
      runPipeline(b.records, {
        period: {
          timeZone: "America/Sao_Paulo",
          startInclusive: "2026-02-09T00:00:00-03:00",
          endExclusive: "2026-02-02T00:00:00-03:00",
        },
        subjectLogin: SUBJECT,
        subjectDisplayName: "Helison Dias",
        nowIso: b.nowIso,
      }),
    ).toThrow(/período inválido/);
  });
});
