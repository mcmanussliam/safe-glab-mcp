import { describe, expect, test, vi } from "vitest";
import type { SafeGlabConfig } from "../src/config.js";
import { createSafeGlabTools, expectedToolNames } from "../src/tools.js";

function config(): SafeGlabConfig {
  return {
    gitlab: {
      baseUrl: "https://gitlab.example.com",
      tokenEnv: "SAFE_GLAB_TOKEN",
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

function client() {
  return {
    listBranches: vi.fn().mockResolvedValue([{ name: "main" }]),
    getBranch: vi.fn(),
    createBranch: vi.fn(),
    listMergeRequests: vi.fn(),
    getMergeRequest: vi.fn(),
    createMergeRequest: vi.fn(),
    commentOnMergeRequest: vi.fn(),
    listIssues: vi.fn(),
    getIssue: vi.fn(),
    createIssue: vi.fn(),
    updateIssue: vi.fn(),
    deleteIssue: vi.fn(),
    commentOnIssue: vi.fn(),
    listProjectLabels: vi.fn(),
    listMilestones: vi.fn(),
    listProjectUsers: vi.fn(),
    listPipelines: vi.fn(),
    getPipeline: vi.fn(),
    listPipelineJobs: vi.fn(),
    getRepositoryFile: vi
      .fn()
      .mockResolvedValue({ fileName: "README.md", filePath: "README.md", content: "hello", size: 5 }),
    listRepositoryTree: vi.fn(),
  };
}

describe("safe glab tools", () => {
  test("registers the expected explicit tool surface and no raw command/API tools", () => {
    const tools = createSafeGlabTools(config(), client());
    const names = tools.map((tool) => tool.name).sort();

    expect(names).toEqual([...expectedToolNames].sort());
    expect(names).not.toContain("raw_api");
    expect(names).not.toContain("run_glab");
    expect(names).not.toContain("delete_branch");
    expect(names).not.toContain("delete_project");
  });

  test("calls the GitLab client when policy allows the tool", async () => {
    const gitlab = client();
    const tools = createSafeGlabTools(config(), gitlab);
    const listBranches = tools.find((tool) => tool.name === "list_branches");
    if (!listBranches) {
      throw new Error("Expected list_branches tool to be registered");
    }

    const result = await listBranches.handler({ projectPath: "platform/api", search: "main" });

    expect(gitlab.listBranches).toHaveBeenCalledWith("platform/api", { search: "main" });
    expect(result.content[0]?.text).toContain('"main"');
  });
});
