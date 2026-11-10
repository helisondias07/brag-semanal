import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
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

export function loadReviewState(path: string): ReviewState {
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as ReviewState;
    if (parsed.networkPublish) {
      throw new Error("estado de revisão inválido: networkPublish deve ser false");
    }
    return {
      ...emptyReviewState(),
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
    };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return emptyReviewState();
    throw err;
  }
}

export function saveReviewState(path: string, state: ReviewState): void {
  mkdirSync(dirname(path), { recursive: true });
  const safe: ReviewState = { ...state, networkPublish: false, persistence: "local-only" };
  writeFileSync(path, JSON.stringify(safe, null, 2) + "\n", "utf8");
}
