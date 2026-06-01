import type { GitLabNote } from "../gitlab/types.js";
import { defineTool, type ToolDefinition } from "../mcp.js";
import { assertAllowed } from "../policy.js";
import { id, json, projectApiPath, projectPath, type ToolContext } from "./shared.js";

export function createCommentTools({ config, request }: ToolContext): ToolDefinition[] {
  return [
    defineTool(
      "list_issue_comments",
      "List all comments on an issue, including system notes.",
      { projectPath, issueIid: id() },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "list_issue_comments" });
        return json(
          await request<GitLabNote[]>("GET", `${projectApiPath(args.projectPath)}/issues/${args.issueIid}/notes`),
        );
      },
    ),

    defineTool(
      "get_issue_comment",
      "Get a single comment on an issue by note ID.",
      { projectPath, issueIid: id(), noteId: id() },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "get_issue_comment" });
        return json(
          await request<GitLabNote>(
            "GET",
            `${projectApiPath(args.projectPath)}/issues/${args.issueIid}/notes/${args.noteId}`,
          ),
        );
      },
    ),

    defineTool(
      "list_merge_request_comments",
      "List all comments on a merge request, including system notes.",
      { projectPath, mergeRequestIid: id() },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "list_merge_request_comments" });
        return json(
          await request<GitLabNote[]>(
            "GET",
            `${projectApiPath(args.projectPath)}/merge_requests/${args.mergeRequestIid}/notes`,
          ),
        );
      },
    ),

    defineTool(
      "get_merge_request_comment",
      "Get a single comment on a merge request by note ID.",
      { projectPath, mergeRequestIid: id(), noteId: id() },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "get_merge_request_comment" });
        return json(
          await request<GitLabNote>(
            "GET",
            `${projectApiPath(args.projectPath)}/merge_requests/${args.mergeRequestIid}/notes/${args.noteId}`,
          ),
        );
      },
    ),
  ];
}
