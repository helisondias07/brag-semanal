import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assembleFixtures, type FixtureBundle, type FixtureParts } from "./assembleFixtures.ts";

export type { AssociationFile, FixtureBundle, FixtureParts } from "./assembleFixtures.ts";
export { assembleFixtures } from "./assembleFixtures.ts";

function readJson<T>(dir: string, name: string): T {
  return JSON.parse(readFileSync(join(dir, name), "utf8")) as T;
}

export function loadFixtures(dir: string): FixtureBundle {
  return assembleFixtures({
    meta: readJson(dir, "period.json"),
    prs: readJson(dir, "github-prs.json"),
    commits: readJson(dir, "github-commits.json"),
    tasks: readJson(dir, "clickup-tasks.json"),
    annotations: readJson(dir, "annotations.json"),
    associations: readJson(dir, "associations.json"),
  } as FixtureParts);
}
