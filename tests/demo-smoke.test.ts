import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { beforeAll, describe, expect, it } from "vitest";
import { startDemo } from "../src/demo/server.ts";

beforeAll(() => {
  if (!existsSync("web/dist/index.html")) {
    execSync("npm run build:web", { stdio: "inherit" });
  }
});

describe("smoke da demo/CLI HTTP", () => {
  it("serve health, draft sintético e recusa publish", async () => {
    const demo = await startDemo({
      port: 43142,
      fixturesDir: "fixtures",
      reviewPath: ".local/review-state-test.json",
      useVite: false,
    });
    try {
      const health = await fetch(`${demo.url}/api/health`).then((r) => r.json());
      expect(health).toMatchObject({ ok: true, synthetic: true, publish: false });
      const draft = await fetch(`${demo.url}/api/draft`).then((r) => r.json());
      expect(draft.synthetic).toBe(true);
      expect(draft.adapters.github).toBe("inactive");
      expect(draft.draft.disclaimer).toMatch(/DADOS FICTÍCIOS/);
      const html = await fetch(demo.url).then((r) => r.text());
      expect(html).toMatch(/DADOS FICTÍCIOS|Brag semanal|synthetic/i);
      const denied = await fetch(`${demo.url}/api/review-state`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ networkPublish: true, decisions: [] }),
      });
      expect(denied.status).toBe(400);
    } finally {
      await demo.close();
    }
  });
});
