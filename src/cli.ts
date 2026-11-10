import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ClickUpReadAdapter } from "./adapters/clickup.ts";
import { GitHubReadAdapter } from "./adapters/github.ts";
import { exportMarkdown, stableStringify } from "./exportMarkdown.ts";
import { loadFixtures } from "./loadFixtures.ts";
import { runPipeline } from "./pipeline.ts";
import { loadReviewState } from "./review.ts";
import { DEFAULT_TZ } from "./period.ts";
import type { Period } from "./types.ts";

function arg(flag: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

function has(flag: string): boolean {
  return process.argv.includes(flag);
}

function printHelp(): void {
  process.stdout.write(`brag-semanal — rascunho revisável (fixtures sintéticas)

Comandos:
  generate   Gera draft Markdown/JSON a partir de fixtures
  validate   Valida fixtures e imprime erros
  smoke      Gera output e checa avisos obrigatórios
  demo       Sobe a UI local (sem publicação)

Opções generate:
  --fixtures <dir>  (default: fixtures)
  --out <file.md>
  --json <file.json>
  --review <file.json>  decisões locais opcionais
  --from --to ISO-8601 com offset  --tz America/Sao_Paulo

Nada é publicado. Adaptadores GitHub/ClickUp permanecem inativos.
`);
}

async function cmdGenerate(): Promise<void> {
  const fixturesDir = resolve(arg("--fixtures", "fixtures")!);
  const bundle = loadFixtures(fixturesDir);
  const period: Period = {
    timeZone: (arg("--tz", bundle.period.timeZone) as Period["timeZone"]) ?? DEFAULT_TZ,
    startInclusive: arg("--from", bundle.period.startInclusive)!,
    endExclusive: arg("--to", bundle.period.endExclusive)!,
  };
  const result = runPipeline(bundle.records, {
    period,
    subjectLogin: arg("--subject-login", bundle.subjectLogin)!,
    subjectDisplayName: arg("--subject-name", bundle.subjectDisplayName)!,
    nowIso: arg("--now", bundle.nowIso),
  });
  const reviewPath = arg("--review");
  const review = reviewPath ? loadReviewState(resolve(reviewPath)) : undefined;
  const md = exportMarkdown(result.draft, review);
  const out = arg("--out");
  const jsonOut = arg("--json");
  if (out) {
    mkdirSync(dirname(resolve(out)), { recursive: true });
    writeFileSync(resolve(out), md, "utf8");
  }
  if (jsonOut) {
    mkdirSync(dirname(resolve(jsonOut)), { recursive: true });
    writeFileSync(resolve(jsonOut), stableStringify(result.draft), "utf8");
  }
  if (!out && !jsonOut) process.stdout.write(md);
}

async function cmdValidate(): Promise<void> {
  const fixturesDir = resolve(arg("--fixtures", "fixtures")!);
  const bundle = loadFixtures(fixturesDir);
  const result = runPipeline(bundle.records, {
    period: bundle.period,
    subjectLogin: bundle.subjectLogin,
    subjectDisplayName: bundle.subjectDisplayName,
    nowIso: bundle.nowIso,
  });
  const issues = result.draft.items.flatMap((i) => i.validationIssues.map((m) => `${i.identity}: ${m}`));
  const periodFails = result.draft.items.filter((i) => i.period.qualifyingEvent === "none" && i.timestamps && Object.values(i.timestamps).some((v) => v && /invalid|not-a-date/i.test(v)));
  process.stdout.write(`registros: ${result.sanitizedInputCount}\n`);
  process.stdout.write(`contribuições: ${result.draft.contributions.length}\n`);
  process.stdout.write(`rejeitados: ${result.draft.rejectedAsAchievement.length}\n`);
  process.stdout.write(`issues: ${issues.length}\n`);
  for (const i of issues) process.stdout.write(`- ${i}\n`);
  for (const p of periodFails) process.stdout.write(`- timestamp inválido ${p.identity}: ${p.period.reason}\n`);
  const gh = new GitHubReadAdapter();
  const cu = new ClickUpReadAdapter();
  let inactive = 0;
  for (const a of [gh, cu]) {
    try {
      await a.fetch();
    } catch {
      inactive += 1;
    }
  }
  process.stdout.write(`adaptadores inativos confirmados: ${inactive}/2\n`);
  if (!result.markdown.includes("DADOS FICTÍCIOS")) {
    process.stderr.write("validação falhou: disclaimer ausente\n");
    process.exitCode = 1;
  }
}

async function cmdSmoke(): Promise<void> {
  await cmdGenerate();
  await cmdValidate();
  const bundle = loadFixtures(resolve(arg("--fixtures", "fixtures")!));
  const result = runPipeline(bundle.records, {
    period: bundle.period,
    subjectLogin: bundle.subjectLogin,
    subjectDisplayName: bundle.subjectDisplayName,
    nowIso: bundle.nowIso,
  });
  const must = ["DADOS FICTÍCIOS", "synthetic-fixture", "Revisão humana", "America/Sao_Paulo"];
  for (const m of must) {
    if (!result.markdown.includes(m)) {
      throw new Error(`smoke: markdown sem ${m}`);
    }
  }
  if (result.markdown.includes("ghp_") && result.markdown.match(/ghp_[A-Z]/)) {
    throw new Error("smoke: token não redigido no markdown");
  }
  process.stdout.write("smoke ok\n");
}

async function main(): Promise<void> {
  const cmd = process.argv[2];
  if (!cmd || cmd === "help" || has("--help")) {
    printHelp();
    return;
  }
  if (cmd === "generate") return cmdGenerate();
  if (cmd === "validate") return cmdValidate();
  if (cmd === "smoke") return cmdSmoke();
  if (cmd === "demo") {
    const { startDemo } = await import("./demo/server.ts");
    await startDemo({
      port: Number(arg("--port", "43141")),
      fixturesDir: resolve(arg("--fixtures", "fixtures")!),
      useVite: !has("--no-vite"),
    });
    return;
  }
  printHelp();
  process.exitCode = 1;
}

main().catch((err) => {
  process.stderr.write(String(err instanceof Error ? err.stack ?? err.message : err) + "\n");
  process.exitCode = 1;
});
