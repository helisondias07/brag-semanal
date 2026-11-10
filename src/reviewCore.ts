import { SYNTHETIC_DISCLAIMER, type ReviewDecision, type ReviewState } from "./types.ts";

export function emptyReviewState(): ReviewState {
  return {
    disclaimer: SYNTHETIC_DISCLAIMER,
    persistence: "local-only",
    networkPublish: false,
    decisions: [],
  };
}

export function upsertDecision(state: ReviewState, decision: ReviewDecision): ReviewState {
  const rest = state.decisions.filter((d) => d.targetId !== decision.targetId);
  const next = [...rest, decision].sort((a, b) => a.targetId.localeCompare(b.targetId));
  return { ...state, decisions: next };
}
