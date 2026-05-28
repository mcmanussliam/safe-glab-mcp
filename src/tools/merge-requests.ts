import { z } from "zod";
import type { CreateMergeRequestInput } from "../gitlab/types.js";
import { assertAllowed } from "../policy.js";
import {
  defineTool,
  id,
  json,
  optionalNumberArray,
  optionalString,
  optionalStringArray,
  projectPath,
  type ToolContext,
  type ToolDefinition,
} from "./shared.js";

export function createMergeRequestTools({ config, gitlab }: ToolContext): ToolDefinition[] {
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
          await gitlab.listMergeRequests(args.projectPath, {
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

      return json(await gitlab.getMergeRequest(args.projectPath, args.mergeRequestIid));
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

        return json(await gitlab.createMergeRequest(args.projectPath, body));
      },
    ),

    defineTool(
      "comment_on_merge_request",
      "Add a comment to a merge request.",
      { projectPath, mergeRequestIid: id(), body: z.string().min(1) },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "comment_on_merge_request" });

        return json(await gitlab.commentOnMergeRequest(args.projectPath, args.mergeRequestIid, args.body));
      },
    ),
  ];
}
