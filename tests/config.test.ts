import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { loadConfig } from "../src/config.js";

function writeConfig(contents: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "safe-glab-config-"));
  const file = join(dir, "config.json");
  writeFileSync(file, JSON.stringify(contents), "utf8");
  return file;
}

const validConfig = {
  gitlab: {
    baseUrl: "https://gitlab.example.com",
    tokenEnv: "SAFE_GLAB_TOKEN",
  },
  defaults: {
    protectedBranches: ["main", "release/*"],
    allowedMergeRequestTargetBranches: ["main", "develop"],
    maxRepositoryFileBytes: 262144,
  },
  projects: [
    {
      path: "platform/api",
      permissions: {
        branches: { list: true, get: true, create: true },
        mergeRequests: { list: true, get: true, create: true, comment: true },
        issues: { list: true, get: true, create: true, update: true, delete: false, comment: true },
        metadata: { labels: true, milestones: true, users: true },
        pipelines: { list: true, get: true, jobs: true },
        repository: { readFiles: true, readTree: true },
      },
    },
  ],
};

describe("loadConfig", () => {
  test("loads valid JSON config and resolves the token from the configured environment variable", () => {
    const path = writeConfig(validConfig);
    const config = loadConfig(path, { SAFE_GLAB_TOKEN: "secret-token" });

    expect(config.gitlab.baseUrl).toBe("https://gitlab.example.com");
    expect(config.gitlab.token).toBe("secret-token");
    expect(config.projects[0]?.path).toBe("platform/api");
    expect(config.projects[0]?.permissions.issues.delete).toBe(false);
  });

  test("rejects config when the configured token environment variable is missing", () => {
    const path = writeConfig(validConfig);

    expect(() => loadConfig(path, {})).toThrow("Environment variable SAFE_GLAB_TOKEN is required");
  });

  test("rejects numeric project identifiers because config must use project paths", () => {
    const path = writeConfig({
      ...validConfig,
      projects: [{ ...validConfig.projects[0], path: "12345" }],
    });

    expect(() => loadConfig(path, { SAFE_GLAB_TOKEN: "secret-token" })).toThrow(
      "Project path must be a namespace/project path, not a numeric ID",
    );
  });

  test("rejects unknown permission keys", () => {
    const path = writeConfig({
      ...validConfig,
      projects: [
        {
          ...validConfig.projects[0],
          permissions: {
            ...validConfig.projects[0].permissions,
            rawApi: true,
          },
        },
      ],
    });

    expect(() => loadConfig(path, { SAFE_GLAB_TOKEN: "secret-token" })).toThrow();
  });
});
