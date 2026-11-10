import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startDemo } from "../src/demo/server.ts";

const outDir = "/tmp/brag-ui-acceptance";
mkdirSync(outDir, { recursive: true });

let demo: { url: string; close: () => Promise<void> };
const log: string[] = [];

function rec(line: string) {
  log.push(line);
}

async function overflow(page: Page) {
  return page.evaluate(() => ({
    inner: window.innerWidth,
    scroll: document.documentElement.scrollWidth,
  }));
}

describe("aceite UI (teclado, revisão, export, viewport)", () => {
  beforeAll(async () => {
    const { execSync } = await import("node:child_process");
    execSync("npm run build:web", { stdio: "inherit" });
    demo = await startDemo({
      port: 43144,
      fixturesDir: "fixtures",
      reviewPath: ".local/review-state-ui.json",
      useVite: false,
    });
    rec(`demo ${demo.url}`);
  }, 120000);

  afterAll(async () => {
    writeFileSync(`${outDir}/ui-acceptance.log`, log.join("\n") + "\n", "utf8");
    await demo.close();
  });

  it("revisa, exporta com consistência, teclado e sem overflow", async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await desktop.goto(demo.url, { waitUntil: "networkidle" });
      rec("loaded desktop");

      const bodyText = await desktop.locator("body").innerText();
      expect(bodyText).not.toMatch(/GitHub\s+Ativo/);
      expect(bodyText).toContain("GitHub desligado");
      expect(bodyText).toContain("ClickUp desligado");
      rec('chip exact: "GitHub desligado" (not GitHub Ativo)');

      const draft = await desktop.evaluate(async () => {
        const r = await fetch("/api/draft");
        return r.json();
      });
      const firstId = draft.draft.contributions[0].id as string;
      const secondId = draft.draft.contributions[1].id as string;
      rec(`ids ${firstId} | ${secondId}`);

      const ovDesk = await overflow(desktop);
      rec(`overflow desktop inner=${ovDesk.inner} scroll=${ovDesk.scroll}`);
      expect(ovDesk.scroll).toBeLessThanOrEqual(ovDesk.inner + 1);

      await desktop.keyboard.press("Tab");
      const skip = desktop.locator(".skip-link");
      const skipFocused = await skip.evaluate((el) => el === document.activeElement);
      expect(skipFocused).toBe(true);
      rec("skip-link focused via Tab");
      await desktop.keyboard.press("Enter");

      const contribTab = desktop.getByRole("tab", { name: "Contribuições" });
      await contribTab.focus();
      expect(await contribTab.evaluate((el) => el === document.activeElement)).toBe(true);
      await desktop.keyboard.press("ArrowRight");
      expect(await desktop.getByRole("tab", { name: "Aprendizados" }).getAttribute("aria-selected")).toBe("true");
      rec("ArrowRight moved tablist to Aprendizados");
      await desktop.keyboard.press("ArrowLeft");
      expect(await contribTab.getAttribute("aria-selected")).toBe("true");

      const firstCard = desktop.locator("article.card").first();
      await firstCard.getByLabel("Nota (obrigatória para contexto; não publica)").fill("excluir no teste UI");
      await firstCard.getByRole("radio", { name: "Excluir" }).check();
      rec(`excluded ${firstId} with note`);

      const secondCard = desktop.locator("article.card").nth(1);
      await secondCard.getByLabel("Nota (obrigatória para contexto; não publica)").fill("incluir no teste UI");
      await secondCard.getByRole("radio", { name: "Incluir" }).check();
      rec(`included ${secondId} with note`);

      await desktop.getByRole("button", { name: "Salvar decisões localmente" }).click();
      await desktop.getByRole("tab", { name: "Exportar Markdown" }).click();
      await desktop.waitForFunction(
        (id) => (document.querySelector("[data-testid=export-preview]")?.textContent ?? "").includes(id),
        secondId,
      );
      const preview = await desktop.getByTestId("export-preview").innerText();
      expect(preview).not.toContain(firstId);
      expect(preview).toContain(secondId);
      rec("export preview omitted excluded id and kept included id");

      const md = await desktop.evaluate(async () => (await fetch("/api/export.md")).text());
      expect(md).not.toContain(firstId);
      expect(md).toContain(secondId);
      rec("GET /api/export.md matches review selection");

      await desktop.screenshot({ path: `${outDir}/desktop-viewport.png`, fullPage: false });
      rec("wrote desktop-viewport.png 1280x800");

      const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await mobile.goto(demo.url, { waitUntil: "networkidle" });
      const mobileText = await mobile.locator("body").innerText();
      expect(mobileText).toContain("GitHub desligado");
      expect(mobileText).not.toMatch(/GitHub\s+Ativo/);
      const ovMob = await overflow(mobile);
      rec(`overflow mobile inner=${ovMob.inner} scroll=${ovMob.scroll}`);
      expect(ovMob.scroll).toBeLessThanOrEqual(ovMob.inner + 1);
      await mobile.screenshot({ path: `${outDir}/mobile-viewport.png`, fullPage: false });
      rec("wrote mobile-viewport.png 390x844");
      rec("NOT tested: screen readers, 200% zoom, physical device, Safari/Firefox, WCAG full audit");
      await mobile.close();
      await desktop.close();
    } finally {
      await browser.close();
    }
  }, 120000);
});
