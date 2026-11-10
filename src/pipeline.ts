import { contributionCandidates, learningCandidates } from "./candidates.ts";
import { clusterItems } from "./dedup.ts";
import { exportMarkdown, stableStringify } from "./exportMarkdown.ts";
import { normalizeAll } from "./normalize.ts";
import { validatePeriod } from "./period.ts";
import type { PipelineOptions, PipelineResult, RawRecord, ReviewableDraft, ReviewState } from "./types.ts";
import { SYNTHETIC_DISCLAIMER } from "./types.ts";

export function runPipeline(records: RawRecord[], options: PipelineOptions): PipelineResult {
  validatePeriod(options.period);
  const redactionLog: string[] = [];
  const items = normalizeAll(records, options.period, options.subjectLogin, redactionLog);
  const clusters = clusterItems(items);
  const { contributions, rejected } = contributionCandidates(items, clusters);
  const learnings = learningCandidates(items);
  const facts = contributions.flatMap((c) => c.facts).concat(learnings.flatMap((l) => l.facts));
  const uncertainties = contributions.flatMap((c) => c.uncertainties);
  const suggestions = contributions.flatMap((c) => c.suggestions);
  facts.sort((a, b) => a.id.localeCompare(b.id));
  uncertainties.sort((a, b) => a.id.localeCompare(b.id));
  suggestions.sort((a, b) => a.id.localeCompare(b.id));

  const draft: ReviewableDraft = {
    disclaimer: SYNTHETIC_DISCLAIMER,
    subject: options.subjectDisplayName,
    period: options.period,
    generatedAt: options.nowIso ?? "1970-01-01T00:00:00.000Z",
    humanReviewRequired: true,
    autoPublish: false,
    facts,
    uncertainties,
    suggestions,
    contributions,
    learnings,
    rejectedAsAchievement: rejected,
    clusters,
    items,
    redactionLog: [...redactionLog].sort(),
  };

  return {
    draft,
    markdown: exportMarkdown(draft),
    sanitizedInputCount: items.length,
  };
}

export function pipelineFingerprint(result: PipelineResult, review?: ReviewState): string {
  return stableStringify({ draft: result.draft, review: review ?? null });
}
