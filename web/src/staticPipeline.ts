import annotations from "../../fixtures/annotations.json";
import associations from "../../fixtures/associations.json";
import tasks from "../../fixtures/clickup-tasks.json";
import commits from "../../fixtures/github-commits.json";
import prs from "../../fixtures/github-prs.json";
import periodMeta from "../../fixtures/period.json";
import { assembleFixtures, type FixtureParts } from "../../src/assembleFixtures.ts";
import { runPipeline } from "../../src/pipeline.ts";
import type { DraftResponse } from "./types";

export function runEmbeddedSyntheticPipeline(): DraftResponse {
  const bundle = assembleFixtures({
    meta: periodMeta,
    prs,
    commits,
    tasks,
    annotations,
    associations,
  } as FixtureParts);
  const result = runPipeline(bundle.records, {
    period: bundle.period,
    subjectLogin: bundle.subjectLogin,
    subjectDisplayName: bundle.subjectDisplayName,
    nowIso: bundle.nowIso,
  });
  return {
    synthetic: true,
    adapters: { github: "inactive", clickup: "inactive", notion: "not-required" },
    persistence: "local-only",
    publish: false,
    draft: result.draft,
    markdown: result.markdown,
  };
}
