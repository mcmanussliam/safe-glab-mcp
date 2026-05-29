import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import { loadConfig } from "../src/config.js";

vi.mock("@napi-rs/keyring", () => ({
  Entry: vi.fn().mockImplementation(() => ({ getPassword: () => null })),
}));

function writeConfig(contents: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "safe-glab-config-"));
  const file = join(dir, "config.json");
  writeFileSync(file, JSON.stringify(contents), "utf8");
  return file;
}

const validConfig = {
  gitlab: {
    baseUrl: "https://gitlab.example.com",
    tokenKey: "SAFE_GLAB_TOKEN",
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
  test("loads valid JSON config and resolves the token from the environment variable fallback", async () => {
    const path = writeConfig(validConfig);
    const config = await loadConfig(path, { SAFE_GLAB_TOKEN: "secret-token" });

    expect(config.gitlab.baseUrl).toBe("https://gitlab.example.com");
    expect(config.gitlab.token).toBe("secret-token");
    expect(config.projects[0]?.path).toBe("platform/api");
    expect(config.projects[0]?.permissions.issues.delete).toBe(false);
  });

  test("rejects config when no keychain entry and no environment variable is set", async () => {
    const path = writeConfig(validConfig);

    await expect(loadConfig(path, {})).rejects.toThrow('No token found for "SAFE_GLAB_TOKEN"');
  });

  test("rejects numeric project identifiers because config must use project paths", async () => {
    const path = writeConfig({
      ...validConfig,
      projects: [{ ...validConfig.projects[0], path: "12345" }],
    });

    await expect(loadConfig(path, { SAFE_GLAB_TOKEN: "secret-token" })).rejects.toThrow(
      "Project path must be a namespace/project path, not a numeric ID",
    );
  });

  test("rejects unknown permission keys", async () => {
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

    await expect(loadConfig(path, { SAFE_GLAB_TOKEN: "secret-token" })).rejects.toThrow();
  });
});
