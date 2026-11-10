import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
import { startDemo } from "../src/demo/server.ts";

const outDir = "artifacts/ui";
mkdirSync(outDir, { recursive: true });

const demo = await startDemo({
  port: 43143,
  fixturesDir: "fixtures",
  reviewPath: ".local/review-state-capture.json",
});

const browser = await chromium.launch({ headless: true });
const log: string[] = [`demo ${demo.url}`, `started ${new Date().toISOString()}`];
mkdirSync(`${outDir}/video`, { recursive: true });

async function shot(name: string, viewport: { width: number; height: number }) {
  const page = await browser.newPage({ viewport });
  await page.goto(demo.url, { waitUntil: "networkidle" });
  await page.getByText("DADOS FICTÍCIOS", { exact: false }).first().waitFor();
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
  log.push(`screenshot ${name} ${viewport.width}x${viewport.height}`);
  await page.close();
}

try {
  await shot("desktop-contrib", { width: 1280, height: 800 });
  await shot("mobile-contrib", { width: 390, height: 844 });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: `${outDir}/video`, size: { width: 1280, height: 800 } },
  });
  await page.goto(demo.url, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Aprendizados" }).focus();
  await page.keyboard.press("Enter");
  await page.screenshot({ path: `${outDir}/desktop-learnings.png`, fullPage: true });
  await page.getByRole("tab", { name: "Exportar Markdown" }).click();
  await page.screenshot({ path: `${outDir}/desktop-export.png`, fullPage: true });
  await page.getByRole("tab", { name: "Contribuições" }).click();
  const include = page.getByLabel("Incluir").first();
  await include.focus();
  await include.press("Space");
  await page.screenshot({ path: `${outDir}/desktop-review-include.png`, fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(demo.url, { waitUntil: "networkidle" });
  await mobile.getByRole("tab", { name: "Não-conquistas" }).click();
  await mobile.screenshot({ path: `${outDir}/mobile-rejected.png`, fullPage: true });
  await mobile.close();
  await page.close();
  log.push("tabs keyboard/click captured");
} finally {
  await browser.close();
  await demo.close();
}

writeFileSync(`${outDir}/capture.log`, log.join("\n") + "\n", "utf8");
process.stdout.write(log.join("\n") + "\n");
