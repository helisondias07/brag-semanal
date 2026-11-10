import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { emptyReviewState } from "./reviewCore.ts";
import type { ReviewState } from "./types.ts";

export { emptyReviewState, upsertDecision } from "./reviewCore.ts";

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
