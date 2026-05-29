#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Pattern for matching specific sections of a commit */
const COMMIT_PATTERN = /^(\w+)(\([^)]+\))?!?: (.+)$/;

const SECTIONS = {
  feat: "Features",
  fix: "Bug Fixes",
  perf: "Performance",
  refactor: "Refactors",
  docs: "Documentation",
  chore: "Chores",
};

/**
 * Finds the last tag through git and returns the range of that tag till the head.
 *
 * @returns `${tag}..HEAD` or '' if no tag is found
 */
function getRangeFromLastTag() {
  let lastTag = "";

  try {
    const opts = { encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] };
    lastTag = execSync('git describe --tags --abbrev=0 --match "safe-glab-mcp--v*"', opts).trim();
  } catch {}

  return lastTag ? `${lastTag}..HEAD` : "";
}

/**
 * Join and format a given list of commits, validate the commit prefix against the set ones in `SECTIONS`.
 *
 * @param commits - List of commit messages
 * @returns Formatted md string of all commits
 */
function generateContentFromCommits(commits) {
  const commitsBySection = Object.fromEntries(Object.keys(SECTIONS).map((k) => [k, []]));

  for (const line of commits) {
    const match = line.match(COMMIT_PATTERN);
    if (!match) {
      continue;
    }

    const [, type, scope, desc] = match;
    if (!commitsBySection[type]) {
      continue;
    }

    const label = scope ? `**${scope.slice(1, -1)}**: ${desc}` : desc;
    commitsBySection[type].push(`- ${label}`);
  }

  const formattedSections = Object.entries(commitsBySection).reduce((formatted, [section, list]) => {
    if (list.length > 0) {
      formatted.push(`### ${SECTIONS[section]}\n\n${list.join("\n")}`);
    }

    return formatted;
  }, []);

  return formattedSections.join("\n\n");
}

const range = getRangeFromLastTag();
const raw = execSync(`git log ${range} --pretty=format:"%s"`.trim(), { encoding: "utf8" }).trim();
const commits = raw ? raw.split("\n") : [];

const content = generateContentFromCommits(commits);
if (!content) {
  process.exit(0);
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;

const date = new Date().toISOString().slice(0, 10);

const entry = `## [${version}] - ${date}\n\n${content}`;
process.stdout.write(`${entry}\n`);
