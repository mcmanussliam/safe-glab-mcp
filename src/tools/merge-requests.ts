import { z } from "zod";
import type {
  CreateMergeRequestDiscussionInput,
  CreateMergeRequestInput,
  GitLabDiscussion,
  GitLabMergeRequest,
} from "../gitlab/types.js";
import { defineTool, type ToolDefinition } from "../mcp.js";
import { assertAllowed } from "../policy.js";
import {
  id,
  json,
  optionalNumberArray,
  optionalString,
  optionalStringArray,
  projectApiPath,
  projectPath,
  type ToolContext,
} from "./shared.js";

export function createMergeRequestTools({ config, request }: ToolContext): ToolDefinition[] {
  return [
    defineTool(
      "list_merge_requests",
      "List merge requests.",
      {
        projectPath,
        state: optionalString,
        authorUsername: optionalString,
        sourceBranch: optionalString,
        targetBranch: optionalString,
        search: optionalString,
      },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "list_merge_requests" });
        return json(
          await request<GitLabMergeRequest[]>("GET", `${projectApiPath(args.projectPath)}/merge_requests`, {
            state: args.state,
            author_username: args.authorUsername,
            source_branch: args.sourceBranch,
            target_branch: args.targetBranch,
            search: args.search,
          }),
        );
      },
    ),

    defineTool("get_merge_request", "Get one merge request.", { projectPath, mergeRequestIid: id() }, async (args) => {
      assertAllowed(config, { projectPath: args.projectPath, tool: "get_merge_request" });
      return json(
        await request<GitLabMergeRequest>(
          "GET",
          `${projectApiPath(args.projectPath)}/merge_requests/${args.mergeRequestIid}`,
        ),
      );
    }),

    defineTool(
      "create_merge_request",
      "Create a merge request without merge or approval actions.",
      {
        projectPath,
        sourceBranch: z.string().min(1),
        targetBranch: z.string().min(1),
        title: z.string().min(1),
        description: optionalString,
        draft: z.boolean().optional(),
        labels: optionalStringArray,
        assigneeIds: optionalNumberArray,
        reviewerIds: optionalNumberArray,
        removeSourceBranch: z.boolean().optional(),
      },
      async (args) => {
        assertAllowed(config, {
          projectPath: args.projectPath,
          tool: "create_merge_request",
          targetBranch: args.targetBranch,
        });

        const body: CreateMergeRequestInput = {
          source_branch: args.sourceBranch,
          target_branch: args.targetBranch,
          title: args.title,
          description: args.description,
          draft: args.draft,
          labels: args.labels,
          assignee_ids: args.assigneeIds,
          reviewer_ids: args.reviewerIds,
          remove_source_branch: args.removeSourceBranch,
        };

        return json(
          await request<GitLabMergeRequest>(
            "POST",
            `${projectApiPath(args.projectPath)}/merge_requests`,
            undefined,
            body,
          ),
        );
      },
    ),

    defineTool(
      "comment_on_merge_request",
      "Add a comment to a merge request.",
      { projectPath, mergeRequestIid: id(), body: z.string().min(1) },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "comment_on_merge_request" });
        return json(
          await request(
            "POST",
            `${projectApiPath(args.projectPath)}/merge_requests/${args.mergeRequestIid}/notes`,
            undefined,
            { body: args.body },
          ),
        );
      },
    ),

    defineTool(
      "comment_on_merge_request_diff",
      "Open a resolvable review thread anchored to one line of a merge request's diff - the comment that renders inline beside the code, rather than the unanchored note comment_on_merge_request posts on the MR itself. Use this for review findings so each one sits on the line it is about. The diff SHAs are resolved from the merge request automatically, so only the file and line are needed. The line must fall inside the diff (an added, removed, or nearby context line) or GitLab rejects the position; note that the line numbers are those of the merge request's current head commit, so re-check them after a push.",
      {
        projectPath,
        mergeRequestIid: id(),
        body: z.string().min(1),
        filePath: z.string().min(1),
        line: id(),
        lineType: z.enum(["new", "old"]).optional(),
        oldFilePath: optionalString,
      },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "comment_on_merge_request_diff" });

        const mergeRequest = await request<GitLabMergeRequest>(
          "GET",
          `${projectApiPath(args.projectPath)}/merge_requests/${args.mergeRequestIid}`,
        );

        if (!mergeRequest.diff_refs) {
          throw new Error(
            `Merge request !${args.mergeRequestIid} has no diff refs, so no diff line can be commented on`,
          );
        }

        // Removed lines live only in the pre-image, so they are addressed by old_line instead.
        const onOldSide = args.lineType === "old";
        const body: CreateMergeRequestDiscussionInput = {
          body: args.body,
          position: {
            ...mergeRequest.diff_refs,
            position_type: "text",
            new_path: args.filePath,
            old_path: args.oldFilePath ?? args.filePath,
            new_line: onOldSide ? undefined : args.line,
            old_line: onOldSide ? args.line : undefined,
          },
        };

        return json(
          await request<GitLabDiscussion>(
            "POST",
            `${projectApiPath(args.projectPath)}/merge_requests/${args.mergeRequestIid}/discussions`,
            undefined,
            body,
          ),
        );
      },
    ),
  ];
}
