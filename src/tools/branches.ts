import { z } from "zod";
import type { GitLabBranch } from "../gitlab/types.js";
import { defineTool, type ToolDefinition } from "../mcp.js";
import { assertAllowed } from "../policy.js";
import { pickStringQuery } from "../util/pick-string-query.js";
import { json, optionalString, projectApiPath, projectPath, type ToolContext } from "./shared.js";

export function createBranchTools({ config, request }: ToolContext): ToolDefinition[] {
  return [
    defineTool("list_branches", "List repository branches.", { projectPath, search: optionalString }, async (args) => {
      assertAllowed(config, { projectPath: args.projectPath, tool: "list_branches" });
      return json(
        await request<GitLabBranch[]>(
          "GET",
          `${projectApiPath(args.projectPath)}/repository/branches`,
          pickStringQuery(args, ["search"]),
        ),
      );
    }),

    defineTool(
      "get_branch",
      "Get one repository branch.",
      { projectPath, branchName: z.string().min(1) },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "get_branch" });
        return json(
          await request<GitLabBranch>(
            "GET",
            `${projectApiPath(args.projectPath)}/repository/branches/${encodeURIComponent(args.branchName)}`,
          ),
        );
      },
    ),

    defineTool(
      "create_branch",
      "Create a non-protected repository branch.",
      { projectPath, branchName: z.string().min(1), ref: z.string().min(1) },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "create_branch", branchName: args.branchName });
        return json(
          await request<GitLabBranch>("POST", `${projectApiPath(args.projectPath)}/repository/branches`, undefined, {
            branch: args.branchName,
            ref: args.ref,
          }),
        );
      },
    ),
  ];
}
