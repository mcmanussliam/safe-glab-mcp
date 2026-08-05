import { z } from "zod";
import type { GitLabNote } from "../gitlab/types.js";
import { defineTool, type ToolDefinition } from "../mcp.js";
import { assertAllowed } from "../policy.js";
import { id, json, page, perPage, projectApiPath, projectPath, type ToolContext } from "./shared.js";

export function createCommentTools({ config, request }: ToolContext): ToolDefinition[] {
  return [
    defineTool(
      "list_issue_comments",
      "List comments on an issue, paginated (defaults to GitLab's page size of 20; use page/perPage to fetch more). Set excludeSystem to omit auto-generated system notes.",
      { projectPath, issueIid: id(), page, perPage, excludeSystem: z.boolean().optional() },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "list_issue_comments" });
        const notes = await request<GitLabNote[]>(
          "GET",
          `${projectApiPath(args.projectPath)}/issues/${args.issueIid}/notes`,
          { page: args.page?.toString(), per_page: args.perPage?.toString() },
        );
        return json(args.excludeSystem ? notes.filter((note) => !note.system) : notes);
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
      "List comments on a merge request, paginated (defaults to GitLab's page size of 20; use page/perPage to fetch more, e.g. perPage: 100). Set excludeSystem to omit auto-generated system notes and see discussion threads more clearly.",
      { projectPath, mergeRequestIid: id(), page, perPage, excludeSystem: z.boolean().optional() },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "list_merge_request_comments" });
        const notes = await request<GitLabNote[]>(
          "GET",
          `${projectApiPath(args.projectPath)}/merge_requests/${args.mergeRequestIid}/notes`,
          { page: args.page?.toString(), per_page: args.perPage?.toString() },
        );
        return json(args.excludeSystem ? notes.filter((note) => !note.system) : notes);
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
