import { describe, expect, test, vi } from "vitest";
import type { SafeGlabConfig } from "../src/config.js";
import { toolNames } from "../src/policy.js";
import { createSafeGlabTools } from "../src/tools/index.js";

function config(): SafeGlabConfig {
  return {
    gitlab: {
      baseUrl: "https://gitlab.example.com",
      tokenKey: "SAFE_GLAB_TOKEN",
      token: "secret-token",
    },
    defaults: {
      protectedBranches: ["main", "release/*"],
      allowedMergeRequestTargetBranches: ["main", "develop"],
      maxRepositoryFileBytes: 10,
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

describe("safe glab tools", () => {
  test("registers the expected explicit tool surface and no raw command/API tools", () => {
    const request = vi.fn();
    const tools = createSafeGlabTools(config(), request);
    const names = tools.map((tool) => tool.name).sort();

    expect(names).toEqual([...toolNames].sort());
    expect(names).not.toContain("raw_api");
    expect(names).not.toContain("run_glab");
    expect(names).not.toContain("delete_branch");
    expect(names).not.toContain("delete_project");
  });

  test("calls the GitLab API when policy allows the tool", async () => {
    const request = vi.fn().mockResolvedValue([{ name: "main" }]);
    const tools = createSafeGlabTools(config(), request);
    const listBranches = tools.find((tool) => tool.name === "list_branches");
    if (!listBranches) {
      throw new Error("Expected list_branches tool to be registered");
    }

    const result = await listBranches.handler({ projectPath: "platform/api", search: "main" });

    expect(request).toHaveBeenCalledWith("GET", "/projects/platform%2Fapi/repository/branches", { search: "main" });
    expect(result.content[0]?.text).toContain('"main"');
  });
});
