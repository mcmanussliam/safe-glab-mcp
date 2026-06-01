import type { GitLabLabel, GitLabMilestone, GitLabUser } from "../gitlab/types.js";
import { defineTool, type ToolDefinition } from "../mcp.js";
import { assertAllowed } from "../policy.js";
import { json, projectApiPath, projectPath, type ToolContext } from "./shared.js";

export function createMetadataTools({ config, request }: ToolContext): ToolDefinition[] {
  return [
    defineTool("list_project_labels", "List project labels.", { projectPath }, async (args) => {
      assertAllowed(config, { projectPath: args.projectPath, tool: "list_project_labels" });
      return json(await request<GitLabLabel[]>("GET", `${projectApiPath(args.projectPath)}/labels`));
    }),

    defineTool("list_milestones", "List project milestones.", { projectPath }, async (args) => {
      assertAllowed(config, { projectPath: args.projectPath, tool: "list_milestones" });
      return json(await request<GitLabMilestone[]>("GET", `${projectApiPath(args.projectPath)}/milestones`));
    }),

    defineTool("list_project_users", "List project users.", { projectPath }, async (args) => {
      assertAllowed(config, { projectPath: args.projectPath, tool: "list_project_users" });
      return json(await request<GitLabUser[]>("GET", `${projectApiPath(args.projectPath)}/users`));
    }),
  ];
}
