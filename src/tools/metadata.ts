import { assertAllowed } from "../policy.js";
import { defineTool, json, projectPath, type ToolContext, type ToolDefinition } from "./shared.js";

export function createMetadataTools({ config, gitlab }: ToolContext): ToolDefinition[] {
  return [
    defineTool("list_project_labels", "List project labels.", { projectPath }, async (args) => {
      assertAllowed(config, { projectPath: args.projectPath, tool: "list_project_labels" });

      return json(await gitlab.listProjectLabels(args.projectPath));
    }),

    defineTool("list_milestones", "List project milestones.", { projectPath }, async (args) => {
      assertAllowed(config, { projectPath: args.projectPath, tool: "list_milestones" });

      return json(await gitlab.listMilestones(args.projectPath));
    }),

    defineTool("list_project_users", "List project users.", { projectPath }, async (args) => {
      assertAllowed(config, { projectPath: args.projectPath, tool: "list_project_users" });

      return json(await gitlab.listProjectUsers(args.projectPath));
    }),
  ];
}
