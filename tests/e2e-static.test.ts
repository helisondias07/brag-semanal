import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { chromium } from "playwright";

const DIST = resolve("web/dist-static");
const PORT = 43151;
const LOG = "/tmp/brag-e2e-static.log";
const lines: string[] = [];

function rec(line: string) {
  lines.push(line);
}

function startStaticServer(dir: string, port: number): Promise<{ url: string; close: () => Promise<void> }> {
  const mime: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".woff2": "font/woff2",
  };
  const root = resolve(dir);
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    let pathname = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    if (pathname === "/") pathname = "/index.html";
    const file = resolve(join(root, pathname));
    if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((resolveP, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => {
      resolveP({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

function contrastRatio(fg: string, bg: string): number {
  const parse = (c: string) => {
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) throw new Error(`cor não parseada: ${c}`);
    return [Number(m[1]), Number(m[2]), Number(m[3])].map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
  };
  const lum = (rgb: number[]) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  const L1 = lum(parse(fg));
  const L2 = lum(parse(bg));
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

describe("E2E do build estático (sem backend)", () => {
  let server: { url: string; close: () => Promise<void> };

  beforeAll(async () => {
    execSync("npm run build:static", {
      stdio: "inherit",
      env: { ...process.env, VITE_STATIC_DEMO: "true", NODE_ENV: "production" },
    });
    expect(existsSync(join(DIST, "index.html"))).toBe(true);
    server = await startStaticServer(DIST, PORT);
    rec(`static server ${server.url} dir=${DIST}`);
  }, 180000);

  afterAll(async () => {
    mkdirSync("/tmp", { recursive: true });
    writeFileSync(LOG, lines.join("\n") + "\n", "utf8");
    await server.close();
  });

  it("não chama /api; exclui, persiste, exporta sem o item e reset", async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const apiHits: string[] = [];
    const allUrls: string[] = [];
    const page = await context.newPage();
    page.on("request", (req) => {
      allUrls.push(req.url());
      const u = new URL(req.url());
      if (u.pathname === "/api" || u.pathname.startsWith("/api/")) {
        apiHits.push(req.url());
      }
    });

    await page.goto(server.url, { waitUntil: "networkidle" });
    await page.getByTestId("static-notice").waitFor();
    const notice = await page.getByTestId("static-notice").innerText();
    expect(notice).toContain("Demo com dados sintéticos, sem integrações ativas");
    rec(`notice: ${notice.replace(/\s+/g, " ")}`);

    const styles = await page.locator(".static-notice").evaluate((el) => {
      const cs = getComputedStyle(el);
      return { color: cs.color, background: cs.backgroundColor };
    });
    const ratio = contrastRatio(styles.color, styles.background);
    rec(`contrast static-notice ${styles.color} on ${styles.background} = ${ratio.toFixed(2)}`);
    expect(ratio).toBeGreaterThanOrEqual(4.5);

    expect(await page.locator("a[href='/api/export.md']").count()).toBe(0);

    const title = (await page.locator("#panel-contrib h3").first().innerText()).trim();
    rec(`first contribution title: ${title}`);
    expect(title.length).toBeGreaterThan(0);

    await page.getByLabel("Excluir").first().check();
    rec("excluded first contribution");

    await page.getByRole("tab", { name: "Exportar Markdown" }).click();
    const previewAfterExclude = await page.getByTestId("export-preview").innerText();
    expect(previewAfterExclude).not.toContain(`### ${title}`);
    rec("export preview omits excluded title");

    await page.reload({ waitUntil: "networkidle" });
    await page.getByTestId("static-notice").waitFor();
    const excludedAfterReload = await page.getByLabel("Excluir").first().isChecked();
    expect(excludedAfterReload).toBe(true);
    rec("reload: exclude persisted in localStorage");

    await page.getByRole("tab", { name: "Exportar Markdown" }).click();
    const previewAfterReload = await page.getByTestId("export-preview").innerText();
    expect(previewAfterReload).not.toContain(`### ${title}`);
    rec("export after reload still omits excluded title");

    await page.getByTestId("reset-review").click();
    const excludedAfterReset = await page.getByLabel("Excluir").first().isChecked();
    expect(excludedAfterReset).toBe(false);
    rec("reset: exclude cleared");

    await page.getByRole("tab", { name: "Exportar Markdown" }).click();
    const previewAfterReset = await page.getByTestId("export-preview").innerText();
    expect(previewAfterReset).toContain(title);
    rec("export after reset includes title again");

    rec(`apiHits count=${apiHits.length}`);
    rec(`apiHits urls=${JSON.stringify(apiHits)}`);
    rec(`request count=${allUrls.length}`);
    expect(apiHits, `requisições /api: ${apiHits.join(", ")}`).toHaveLength(0);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: "/tmp/brag-static-desktop-1440.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/brag-static-mobile-390.png", fullPage: true });
    rec("screenshots /tmp/brag-static-desktop-1440.png /tmp/brag-static-mobile-390.png");

    await browser.close();
  }, 180000);

  it("servidor de arquivos não tem rota /api", async () => {
    const r = await fetch(`${server.url}/api/draft`);
    rec(`/api/draft via static server status=${r.status}`);
    expect(r.status).toBe(404);
  });
});
