import { describe, expect, test, vi } from "vitest";
import type { SafeGlabConfig } from "../src/config.js";
import { createServer } from "../src/index.js";
import { toolNames } from "../src/policy.js";

function config(): SafeGlabConfig {
  return {
    gitlab: {
      baseUrl: "https://gitlab.example.com",
      tokenKey: "SAFE_GLAB_TOKEN",
      token: "secret-token",
    },
    defaults: {
      protectedBranches: ["main"],
      allowedMergeRequestTargetBranches: ["main"],
      maxRepositoryFileBytes: 100,
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
}

describe("createServer", () => {
  test("constructs an MCP server and registers safe GitLab tools without connecting transport", () => {
    const server = createServer(config(), vi.fn());

    const registeredTools = Object.keys(
      (server as unknown as { _registeredTools: Record<string, unknown> })._registeredTools,
    );
    expect(registeredTools.sort()).toEqual([...toolNames].sort());
    expect(server.isConnected()).toBe(false);
  });
});
