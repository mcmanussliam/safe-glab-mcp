import { matchesPattern } from "./util/matches-pattern.js";
const permissionByTool = {
    list_branches: (project) => project.permissions.branches.list,
    get_branch: (project) => project.permissions.branches.get,
    create_branch: (project) => project.permissions.branches.create,
    list_merge_requests: (project) => project.permissions.mergeRequests.list,
    get_merge_request: (project) => project.permissions.mergeRequests.get,
    create_merge_request: (project) => project.permissions.mergeRequests.create,
    comment_on_merge_request: (project) => project.permissions.mergeRequests.comment,
    list_issues: (project) => project.permissions.issues.list,
    get_issue: (project) => project.permissions.issues.get,
    create_issue: (project) => project.permissions.issues.create,
    update_issue: (project) => project.permissions.issues.update,
    delete_issue: (project) => project.permissions.issues.delete,
    comment_on_issue: (project) => project.permissions.issues.comment,
    list_project_labels: (project) => project.permissions.metadata.labels,
    list_milestones: (project) => project.permissions.metadata.milestones,
    list_project_users: (project) => project.permissions.metadata.users,
    list_pipelines: (project) => project.permissions.pipelines.list,
    get_pipeline: (project) => project.permissions.pipelines.get,
    list_pipeline_jobs: (project) => project.permissions.pipelines.jobs,
    get_repository_file: (project) => project.permissions.repository.readFiles,
    list_repository_tree: (project) => project.permissions.repository.readTree,
};
/**
 * Evaluates local policy before a GitLab request is made.
 *
 * This is the safety boundary that compensates for broad GitLab tokens on
 * GitLab Community Edition.
 *
 * @see assertAllowed for throwing enforcement used by tool handlers.
 */
export function isAllowed(config, input) {
    const project = config.projects.find((candidate) => candidate.path === input.projectPath);
    if (!project) {
        return { allowed: false, reason: `Project ${input.projectPath} is not configured` };
    }
    if (!permissionByTool[input.tool](project)) {
        return {
            allowed: false,
            reason: `Tool ${input.tool} is not allowed for project ${input.projectPath}`,
        };
    }
    if (input.tool === "create_branch") {
        const protectedPattern = config.defaults.protectedBranches.find((pattern) => matchesPattern(input.branchName, pattern));
        if (protectedPattern) {
            return {
                allowed: false,
                reason: `Branch ${input.branchName} matches protected branch pattern ${protectedPattern}`,
            };
        }
    }
    if (input.tool === "create_merge_request") {
        const allowedTarget = config.defaults.allowedMergeRequestTargetBranches.some((pattern) => matchesPattern(input.targetBranch, pattern));
        if (!allowedTarget) {
            return {
                allowed: false,
                reason: `Merge request target branch ${input.targetBranch} is not allowed`,
            };
        }
    }
    if (input.tool === "get_repository_file" &&
        input.fileSizeBytes !== undefined &&
        input.fileSizeBytes > config.defaults.maxRepositoryFileBytes) {
        return {
            allowed: false,
            reason: `Repository file size ${input.fileSizeBytes} exceeds configured limit ${config.defaults.maxRepositoryFileBytes}`,
        };
    }
    return { allowed: true };
}
export function assertAllowed(config, input) {
    const decision = isAllowed(config, input);
    if (!decision.allowed) {
        throw new Error(decision.reason);
    }
}
