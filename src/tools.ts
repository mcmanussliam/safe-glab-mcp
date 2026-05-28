import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SafeGlabConfig } from "./config.js";
import type { GitLabClientContract } from "./gitlab/types.js";
import type { ToolName } from "./policy.js";
import { createBranchTools } from "./tools/branches.js";
import { createIssueTools } from "./tools/issues.js";
import { createMergeRequestTools } from "./tools/merge-requests.js";
import { createMetadataTools } from "./tools/metadata.js";
import { createPipelineTools } from "./tools/pipelines.js";
import { createRepositoryTools } from "./tools/repository.js";
import type { ToolContext, ToolDefinition } from "./tools/shared.js";

export type { GitLabClientContract } from "./gitlab/types.js";
export type { ToolDefinition } from "./tools/shared.js";

export const expectedToolNames = [
  "list_branches",
  "get_branch",
  "create_branch",
  "list_merge_requests",
  "get_merge_request",
  "create_merge_request",
  "comment_on_merge_request",
  "list_issues",
  "get_issue",
  "create_issue",
  "update_issue",
  "delete_issue",
  "comment_on_issue",
  "list_project_labels",
  "list_milestones",
  "list_project_users",
  "list_pipelines",
  "get_pipeline",
  "list_pipeline_jobs",
  "get_repository_file",
  "list_repository_tree",
] as const satisfies readonly ToolName[];

export function createSafeGlabTools(config: SafeGlabConfig, gitlab: GitLabClientContract): ToolDefinition[] {
  const context: ToolContext = { config, gitlab };

  return [
    ...createBranchTools(context),
    ...createMergeRequestTools(context),
    ...createIssueTools(context),
    ...createMetadataTools(context),
    ...createPipelineTools(context),
    ...createRepositoryTools(context),
  ];
}

export function registerSafeGlabTools(server: McpServer, config: SafeGlabConfig, gitlab: GitLabClientContract): void {
  for (const definition of createSafeGlabTools(config, gitlab)) {
    server.registerTool(
      definition.name,
      {
        description: definition.description,
        inputSchema: definition.inputSchema,
      },
      (args) => definition.handler(args),
    );
  }
}
