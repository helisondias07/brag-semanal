import type { IncomingMessage, ServerResponse } from "node:http";
import { loadFixtures } from "../loadFixtures.ts";
import { exportMarkdown, stableStringify } from "../exportMarkdown.ts";
import { runPipeline } from "../pipeline.ts";
import { emptyReviewState, loadReviewState, saveReviewState } from "../review.ts";
import { redactText } from "../redact.ts";
import type { PipelineResult, ReviewState } from "../types.ts";

export interface ApiContext {
  result: PipelineResult;
  reviewPath: string;
}

export function createApiContext(fixturesDir: string, reviewPath: string): ApiContext {
  const bundle = loadFixtures(fixturesDir);
  const result = runPipeline(bundle.records, {
    period: bundle.period,
    subjectLogin: bundle.subjectLogin,
    subjectDisplayName: bundle.subjectDisplayName,
    nowIso: bundle.nowIso,
  });
  return { result, reviewPath };
}

export async function handleApi(
  url: URL,
  req: IncomingMessage,
  res: ServerResponse,
  ctx: ApiContext,
): Promise<boolean> {
  const send = (status: number, body: string, type: string) => {
    res.writeHead(status, { "content-type": type, "cache-control": "no-store", "x-brag-synthetic": "true" });
    res.end(body);
  };
  try {
    if (url.pathname === "/api/draft" && req.method === "GET") {
      send(
        200,
        stableStringify({
          synthetic: true,
          adapters: { github: "inactive", clickup: "inactive", notion: "not-required" },
          persistence: "local-only",
          publish: false,
          draft: ctx.result.draft,
          markdown: ctx.result.markdown,
        }),
        "application/json; charset=utf-8",
      );
      return true;
    }
    if (url.pathname === "/api/review-state" && req.method === "GET") {
      send(200, stableStringify(loadReviewState(ctx.reviewPath)), "application/json; charset=utf-8");
      return true;
    }
    if (url.pathname === "/api/review-state" && (req.method === "PUT" || req.method === "POST")) {
      const raw = await readBody(req);
      const parsed = JSON.parse(raw) as ReviewState;
      if (parsed.networkPublish) {
        send(400, "{\"error\":\"networkPublish não permitido\"}", "application/json; charset=utf-8");
        return true;
      }
      const next: ReviewState = { ...emptyReviewState(), decisions: parsed.decisions ?? [] };
      saveReviewState(ctx.reviewPath, next);
      send(200, stableStringify(next), "application/json; charset=utf-8");
      return true;
    }
    if (url.pathname === "/api/export.md") {
      const review = loadReviewState(ctx.reviewPath);
      send(200, exportMarkdown(ctx.result.draft, review), "text/markdown; charset=utf-8");
      return true;
    }
    if (url.pathname === "/api/health") {
      send(200, "{\"ok\":true,\"synthetic\":true,\"publish\":false}", "application/json; charset=utf-8");
      return true;
    }
  } catch (err) {
    send(500, JSON.stringify({ error: redactText(err instanceof Error ? err.message : String(err)).text }), "application/json; charset=utf-8");
    return true;
  }
  return false;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
