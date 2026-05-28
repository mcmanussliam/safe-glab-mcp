import { z } from "zod";
import { assertAllowed } from "../policy.js";
import { pickStringQuery } from "../util/pick-string-query.js";
import { defineTool, json, optionalString, projectPath } from "./shared.js";
export function createBranchTools({ config, gitlab }) {
    return [
        defineTool("list_branches", "List repository branches.", { projectPath, search: optionalString }, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "list_branches" });
            return json(await gitlab.listBranches(args.projectPath, pickStringQuery(args, ["search"])));
        }),
        defineTool("get_branch", "Get one repository branch.", { projectPath, branchName: z.string().min(1) }, async (args) => {
            assertAllowed(config, { projectPath: args.projectPath, tool: "get_branch" });
            return json(await gitlab.getBranch(args.projectPath, args.branchName));
        }),
        defineTool("create_branch", "Create a non-protected repository branch.", { projectPath, branchName: z.string().min(1), ref: z.string().min(1) }, async (args) => {
            assertAllowed(config, {
                projectPath: args.projectPath,
                tool: "create_branch",
                branchName: args.branchName,
            });
            return json(await gitlab.createBranch(args.projectPath, args.branchName, args.ref));
        }),
    ];
}
