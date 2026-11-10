import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createApiContext, handleApi } from "./api.ts";

export interface DemoOptions {
  port: number;
  fixturesDir: string;
  reviewPath?: string;
  webDir?: string;
  useVite?: boolean;
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".map": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

export async function startDemo(opts: DemoOptions): Promise<{ url: string; close: () => Promise<void> }> {
  const fixturesDir = resolve(opts.fixturesDir);
  const reviewPath = resolve(opts.reviewPath ?? ".local/review-state.json");
  const webDir = resolve(opts.webDir ?? "web/dist");
  const ctx = createApiContext(fixturesDir, reviewPath);

  const distReady = existsSync(join(webDir, "index.html"));
  let vite: { middlewares: (req: unknown, res: unknown, next: () => void) => void; close: () => Promise<void> } | undefined;
  if (!distReady || opts.useVite) {
    try {
      const { createServer: createViteServer } = await import("vite");
      vite = (await createViteServer({
        configFile: resolve("web/vite.config.ts"),
        root: resolve("web"),
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      })) as unknown as typeof vite;
    } catch {
      vite = undefined;
    }
  }

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${opts.port}`);
    const handled = await handleApi(url, req, res, ctx);
    if (handled) return;
    if (vite) {
      vite.middlewares(req, res, () => {
        res.writeHead(404);
        res.end("not found");
      });
      return;
    }
    const pathName = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = join(webDir, pathName);
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream", "cache-control": "no-store" });
      createReadStream(filePath).pipe(res);
      return;
    }
    if (existsSync(join(webDir, "index.html"))) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      createReadStream(join(webDir, "index.html")).pipe(res);
      return;
    }
    const fallback = fileURLToPath(new URL("./fallback.html", import.meta.url));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(readFileSync(fallback, "utf8"));
  });

  await new Promise<void>((resolveListen) => {
    server.listen(opts.port, "127.0.0.1", () => resolveListen());
  });
  const url = `http://127.0.0.1:${opts.port}`;
  process.stdout.write(`demo local (fixtures sintéticas, sem publicação): ${url}\n`);
  return {
    url,
    close: () =>
      new Promise((resolveClose) => {
        server.close(async () => {
          if (vite) await vite.close();
          resolveClose();
        });
      }),
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const port = Number(process.env.PORT ?? 43141);
  await startDemo({ port, fixturesDir: resolve("fixtures") });
}
