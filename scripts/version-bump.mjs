#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const type = process.argv[2];

if (!["patch", "minor", "major"].includes(type)) {
  console.error("Usage: version-bump.mjs <patch|minor|major>");
  process.exit(1);
}

/**
 * Bump a given version string given a type of release.
 *
 * @param version - Version number, major.minor.patch
 * @param type - Release type; major, minor, patch.
 */
function bump(version, type) {
  const [maj, min, pat] = version.split(".").map(Number);
  if (type === "major") {
    return `${maj + 1}.0.0`;
  }

  if (type === "minor") {
    return `${maj}.${min + 1}.0`;
  }

  return `${maj}.${min}.${pat + 1}`;
}

/**
 * Execute the given fn on the json file and write the change.
 *
 * @param path - Path to the json file to edit
 * @param fn - Function to execute on the json
 */
function updateJson(path, fn) {
  const data = JSON.parse(readFileSync(path, "utf8"));
  fn(data);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  execSync(`pnpm biome format --write ${path}`, { stdio: "inherit" });
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const next = bump(pkg.version, type);

console.log(`${pkg.version} → ${next}`);

updateJson("package.json", (d) => {
  d.version = next;
});

updateJson(".claude-plugin/plugin.json", (d) => {
  d.version = next;
});
