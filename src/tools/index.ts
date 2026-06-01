import type { SafeGlabConfig } from "../config.js";
import type { GitLabRequest } from "../gitlab/request.js";
import type { ToolDefinition } from "../mcp.js";
import { createBranchTools } from "./branches.js";
import { createCommentTools } from "./comments.js";
import { createIssueTools } from "./issues.js";
import { createMergeRequestTools } from "./merge-requests.js";
import { createMetadataTools } from "./metadata.js";
import { createPipelineTools } from "./pipelines.js";
import { createRepositoryTools } from "./repository.js";

/**
 * Creates all safe-glab MCP tool definitions for the given config and request
 * function.
 *
 * @param config - The loaded safe-glab configuration, including policy rules.
 * @param request - An authenticated GitLab request function from {@link createGitLabRequest}.
 * @returns All tool definitions ready to pass to {@link registerTools}.
 */
export function createSafeGlabTools(config: SafeGlabConfig, request: GitLabRequest): ToolDefinition[] {
  const context = { config, request };
  return [
    ...createBranchTools(context),
    ...createCommentTools(context),
    ...createMergeRequestTools(context),
    ...createIssueTools(context),
    ...createMetadataTools(context),
    ...createPipelineTools(context),
    ...createRepositoryTools(context),
  ];
}
