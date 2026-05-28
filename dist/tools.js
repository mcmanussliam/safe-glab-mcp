import { createBranchTools } from "./tools/branches.js";
import { createIssueTools } from "./tools/issues.js";
import { createMergeRequestTools } from "./tools/merge-requests.js";
import { createMetadataTools } from "./tools/metadata.js";
import { createPipelineTools } from "./tools/pipelines.js";
import { createRepositoryTools } from "./tools/repository.js";
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
];
export function createSafeGlabTools(config, gitlab) {
    const context = { config, gitlab };
    return [
        ...createBranchTools(context),
        ...createMergeRequestTools(context),
        ...createIssueTools(context),
        ...createMetadataTools(context),
        ...createPipelineTools(context),
        ...createRepositoryTools(context),
    ];
}
export function registerSafeGlabTools(server, config, gitlab) {
    for (const definition of createSafeGlabTools(config, gitlab)) {
        server.registerTool(definition.name, {
            description: definition.description,
            inputSchema: definition.inputSchema,
        }, (args) => definition.handler(args));
    }
}
