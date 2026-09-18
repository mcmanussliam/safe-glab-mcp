import { describe, expect, test, vi } from "vitest";
import type { SafeGlabConfig } from "../src/config.js";
import type { ToolDefinition } from "../src/mcp.js";
import { type ToolName, toolNames } from "../src/policy.js";
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

function tool(tools: ToolDefinition[], name: ToolName): ToolDefinition {
  const found = tools.find((candidate) => candidate.name === name);
  if (!found) {
    throw new Error(`Expected ${name} tool to be registered`);
  }
  return found;
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
    const listBranches = tool(tools, "list_branches");

    const result = await listBranches.handler({ projectPath: "platform/api", search: "main" });

    expect(request).toHaveBeenCalledWith("GET", "/projects/platform%2Fapi/repository/branches", { search: "main" });
    expect(result.content[0]?.text).toContain('"main"');
  });

  test("anchors a diff comment to the merge request's own diff refs", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ diff_refs: { base_sha: "base", start_sha: "start", head_sha: "head" } })
      .mockResolvedValueOnce({ id: "discussion-1" });
    const tools = createSafeGlabTools(config(), request);
    const comment = tool(tools, "comment_on_merge_request_diff");

    await comment.handler({
      projectPath: "platform/api",
      mergeRequestIid: 38,
      body: "This never clears the session.",
      filePath: "src/services/user.service.ts",
      line: 54,
    });

    expect(request).toHaveBeenNthCalledWith(1, "GET", "/projects/platform%2Fapi/merge_requests/38");
    expect(request).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/projects/platform%2Fapi/merge_requests/38/discussions",
      undefined,
      {
        body: "This never clears the session.",
        position: {
          base_sha: "base",
          start_sha: "start",
          head_sha: "head",
          position_type: "text",
          new_path: "src/services/user.service.ts",
          old_path: "src/services/user.service.ts",
          new_line: 54,
          old_line: undefined,
        },
      },
    );
  });

  test("addresses a removed line by its pre-image path and line number", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ diff_refs: { base_sha: "base", start_sha: "start", head_sha: "head" } })
      .mockResolvedValueOnce({ id: "discussion-2" });
    const tools = createSafeGlabTools(config(), request);
    const comment = tool(tools, "comment_on_merge_request_diff");

    await comment.handler({
      projectPath: "platform/api",
      mergeRequestIid: 38,
      body: "Why was this dropped?",
      filePath: "src/services/renamed.service.ts",
      oldFilePath: "src/services/user.service.ts",
      line: 120,
      lineType: "old",
    });

    const [, , , body] = request.mock.calls[1] ?? [];
    expect(body).toMatchObject({
      position: {
        new_path: "src/services/renamed.service.ts",
        old_path: "src/services/user.service.ts",
        new_line: undefined,
        old_line: 120,
      },
    });
  });

  test("refuses to guess a position when the merge request has no diff refs", async () => {
    const request = vi.fn().mockResolvedValueOnce({ diff_refs: null });
    const tools = createSafeGlabTools(config(), request);
    const comment = tool(tools, "comment_on_merge_request_diff");

    await expect(
      comment.handler({
        projectPath: "platform/api",
        mergeRequestIid: 38,
        body: "Anchored nowhere.",
        filePath: "src/services/user.service.ts",
        line: 54,
      }),
    ).rejects.toThrow("Merge request !38 has no diff refs, so no diff line can be commented on");

    expect(request).toHaveBeenCalledTimes(1);
  });

  test("denies diff comments before any request when merge request commenting is off", async () => {
    const testConfig = config();
    const [project] = testConfig.projects;
    if (!project) {
      throw new Error("Expected config fixture to include a project");
    }
    project.permissions.mergeRequests.comment = false;

    const request = vi.fn();
    const comment = tool(createSafeGlabTools(testConfig, request), "comment_on_merge_request_diff");

    await expect(
      comment.handler({
        projectPath: "platform/api",
        mergeRequestIid: 38,
        body: "Blocked by policy.",
        filePath: "src/services/user.service.ts",
        line: 54,
      }),
    ).rejects.toThrow("Tool comment_on_merge_request_diff is not allowed for project platform/api");

    expect(request).not.toHaveBeenCalled();
  });
});
