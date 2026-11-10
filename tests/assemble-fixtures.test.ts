import { describe, expect, it } from "vitest";
import { assembleFixtures } from "../src/assembleFixtures.ts";
import { loadFixtures } from "../src/loadFixtures.ts";
import { runPipeline } from "../src/pipeline.ts";
import { readFileSync } from "node:fs";

function json(name: string) {
  return JSON.parse(readFileSync(`fixtures/${name}`, "utf8"));
}

describe("assembleFixtures (núcleo compartilhado)", () => {
  it("produz o mesmo bundle e o mesmo rascunho que loadFixtures (fs)", () => {
    const fromFs = loadFixtures("fixtures");
    const assembled = assembleFixtures({
      meta: json("period.json"),
      prs: json("github-prs.json"),
      commits: json("github-commits.json"),
      tasks: json("clickup-tasks.json"),
      annotations: json("annotations.json"),
      associations: json("associations.json"),
    });
    expect(assembled.subjectLogin).toBe(fromFs.subjectLogin);
    expect(assembled.records.map((r) => `${r.sourceKind}:${r.nativeId}`).sort()).toEqual(
      fromFs.records.map((r) => `${r.sourceKind}:${r.nativeId}`).sort(),
    );
    const a = runPipeline(assembled.records, {
      period: assembled.period,
      subjectLogin: assembled.subjectLogin,
      subjectDisplayName: assembled.subjectDisplayName,
      nowIso: assembled.nowIso,
    });
    const b = runPipeline(fromFs.records, {
      period: fromFs.period,
      subjectLogin: fromFs.subjectLogin,
      subjectDisplayName: fromFs.subjectDisplayName,
      nowIso: fromFs.nowIso,
    });
    expect(a.draft.contributions.map((c) => c.id)).toEqual(b.draft.contributions.map((c) => c.id));
    expect(a.markdown).toBe(b.markdown);
  });
});
