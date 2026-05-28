import { z } from "zod";
import { assertAllowed } from "../policy.js";
import { pickStringQuery } from "../util/pick-string-query.js";
import { defineTool, id, json, optionalNumberArray, optionalString, optionalStringArray, projectPath, } from "./shared.js";
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
export function createIssueTools({ config, gitlab }) {
    return [
        defineTool("list_issues", "List issues.", { projectPath, state: optionalString, labels: optionalString, search: optionalString }, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "list_issues" });
            return json(await gitlab.listIssues(args.projectPath, pickStringQuery(args, ["state", "labels", "search"])));
        }),
        defineTool("get_issue", "Get one issue.", { projectPath, issueIid: id() }, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "get_issue" });
            return json(await gitlab.getIssue(args.projectPath, args.issueIid));
        }),
        defineTool("create_issue", "Create an issue.", issueInputSchema, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "create_issue" });
            return json(await gitlab.createIssue(args.projectPath, issuePayload(args)));
        }),
        defineTool("update_issue", "Update conservative issue fields.", { ...issueInputSchema, issueIid: id() }, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "update_issue" });
            return json(await gitlab.updateIssue(args.projectPath, args.issueIid, issuePayload(args)));
        }),
        defineTool("delete_issue", "Delete an issue only where project config explicitly allows it.", { projectPath, issueIid: id() }, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "delete_issue" });
            return json(await gitlab.deleteIssue(args.projectPath, args.issueIid));
        }),
        defineTool("comment_on_issue", "Add a comment to an issue.", { projectPath, issueIid: id(), body: z.string().min(1) }, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "comment_on_issue" });
            return json(await gitlab.commentOnIssue(args.projectPath, args.issueIid, args.body));
        }),
    ];
}
function issuePayload(args) {
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
