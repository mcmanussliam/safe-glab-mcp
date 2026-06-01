import { z } from "zod";
import type { GitLabIssue, IssueInput } from "../gitlab/types.js";
import { defineTool, type ToolDefinition } from "../mcp.js";
import { assertAllowed } from "../policy.js";
import { pickStringQuery } from "../util/pick-string-query.js";
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

const issueInputSchema = {
  projectPath,
  title: optionalString,
  description: optionalString,
  labels: optionalStringArray,
  assigneeIds: optionalNumberArray,
  confidential: z.boolean().optional(),
  dueDate: optionalString,
  milestoneId: z.number().int().positive().optional(),
  stateEvent: z.enum(["close", "reopen"]).optional(),
};

export function createIssueTools({ config, request }: ToolContext): ToolDefinition[] {
  return [
    defineTool(
      "list_issues",
      "List issues.",
      { projectPath, state: optionalString, labels: optionalString, search: optionalString },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "list_issues" });
        return json(
          await request<GitLabIssue[]>(
            "GET",
            `${projectApiPath(args.projectPath)}/issues`,
            pickStringQuery(args, ["state", "labels", "search"]),
          ),
        );
      },
    ),

    defineTool("get_issue", "Get one issue.", { projectPath, issueIid: id() }, async (args) => {
      assertAllowed(config, { projectPath: args.projectPath, tool: "get_issue" });
      return json(await request<GitLabIssue>("GET", `${projectApiPath(args.projectPath)}/issues/${args.issueIid}`));
    }),

    defineTool("create_issue", "Create an issue.", issueInputSchema, async (args) => {
      assertAllowed(config, { projectPath: args.projectPath, tool: "create_issue" });
      return json(
        await request<GitLabIssue>("POST", `${projectApiPath(args.projectPath)}/issues`, undefined, issueBody(args)),
      );
    }),

    defineTool(
      "update_issue",
      "Update conservative issue fields.",
      { ...issueInputSchema, issueIid: id() },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "update_issue" });
        return json(
          await request<GitLabIssue>(
            "PUT",
            `${projectApiPath(args.projectPath)}/issues/${args.issueIid}`,
            undefined,
            issueBody(args),
          ),
        );
      },
    ),

    defineTool(
      "delete_issue",
      "Delete an issue only where project config explicitly allows it.",
      { projectPath, issueIid: id() },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "delete_issue" });
        return json(await request("DELETE", `${projectApiPath(args.projectPath)}/issues/${args.issueIid}`));
      },
    ),

    defineTool(
      "comment_on_issue",
      "Add a comment to an issue.",
      { projectPath, issueIid: id(), body: z.string().min(1) },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "comment_on_issue" });
        return json(
          await request("POST", `${projectApiPath(args.projectPath)}/issues/${args.issueIid}/notes`, undefined, {
            body: args.body,
          }),
        );
      },
    ),
  ];
}

function issueBody(args: {
  title?: string;
  description?: string;
  labels?: string[];
  assigneeIds?: number[];
  confidential?: boolean;
  dueDate?: string;
  milestoneId?: number;
  stateEvent?: "close" | "reopen";
}): IssueInput {
  return {
    title: args.title,
    description: args.description,
    labels: args.labels,
    assignee_ids: args.assigneeIds,
    confidential: args.confidential,
    due_date: args.dueDate,
    milestone_id: args.milestoneId,
    state_event: args.stateEvent,
  };
}
