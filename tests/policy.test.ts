import { describe, expect, test } from "vitest";
import type { SafeGlabConfig } from "../src/config.js";
import { assertAllowed, isAllowed } from "../src/policy.js";

function config(): SafeGlabConfig {
  return {
    gitlab: {
      baseUrl: "https://gitlab.example.com",
      tokenEnv: "SAFE_GLAB_TOKEN",
      token: "secret-token",
    },
    defaults: {
      protectedBranches: ["main", "master", "production", "release/*"],
      allowedMergeRequestTargetBranches: ["main", "develop", "release/*"],
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
      {
        path: "sandbox/experiments",
        permissions: {
          branches: { list: true, get: true, create: true },
          mergeRequests: { list: true, get: true, create: true, comment: true },
          issues: { list: true, get: true, create: true, update: true, delete: true, comment: true },
          metadata: { labels: true, milestones: true, users: true },
          pipelines: { list: true, get: true, jobs: true },
          repository: { readFiles: true, readTree: true },
        },
      },
    ],
  };
}

describe("policy", () => {
  test("denies projects not present in config", () => {
    const decision = isAllowed(config(), {
      projectPath: "other/project",
      tool: "list_branches",
    });

    expect(decision).toEqual({
      allowed: false,
      reason: "Project other/project is not configured",
    });
  });

  test("denies disabled permissions before any GitLab request can be made", () => {
    const testConfig = config();
    const [project] = testConfig.projects;
    if (!project) {
      throw new Error("Expected config fixture to include a project");
    }

    project.permissions.branches.create = false;

    expect(() =>
      assertAllowed(testConfig, {
        projectPath: "platform/api",
        tool: "create_branch",
        branchName: "feature/example",
      }),
    ).toThrow("Tool create_branch is not allowed for project platform/api");
  });

  test("denies creating protected branch names", () => {
    const decision = isAllowed(config(), {
      projectPath: "platform/api",
      tool: "create_branch",
      branchName: "release/2026-05",
    });

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toBe("Branch release/2026-05 matches protected branch pattern release/*");
    }
  });

  test("allows creating non-protected branch names", () => {
    const decision = isAllowed(config(), {
      projectPath: "platform/api",
      tool: "create_branch",
      branchName: "feature/safe-glab",
    });

    expect(decision).toEqual({ allowed: true });
  });

  test("denies merge request target branches outside configured targets", () => {
    const decision = isAllowed(config(), {
      projectPath: "platform/api",
      tool: "create_merge_request",
      targetBranch: "hotfix/private",
    });

    expect(decision.allowed).toBe(false);
    if (!decision.allowed) {
      expect(decision.reason).toBe("Merge request target branch hotfix/private is not allowed");
    }
  });

  test("allows issue deletion only on projects that explicitly enable it", () => {
    expect(
      isAllowed(config(), {
        projectPath: "platform/api",
        tool: "delete_issue",
      }),
    ).toEqual({
      allowed: false,
      reason: "Tool delete_issue is not allowed for project platform/api",
    });

    expect(
      isAllowed(config(), {
        projectPath: "sandbox/experiments",
        tool: "delete_issue",
      }),
    ).toEqual({ allowed: true });
  });

  test("denies repository file reads when the known file size exceeds the configured limit", () => {
    const decision = isAllowed(config(), {
      projectPath: "platform/api",
      tool: "get_repository_file",
      fileSizeBytes: 101,
    });

    expect(decision).toEqual({
      allowed: false,
      reason: "Repository file size 101 exceeds configured limit 100",
    });
  });
});
