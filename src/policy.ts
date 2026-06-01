import type { ProjectConfig, SafeGlabConfig } from "./config.js";
import { matchesPattern } from "./util/matches-pattern.js";

type PermissionReader = (project: ProjectConfig) => boolean;

/**
 * Maps every tool name to the {@link ProjectConfig} permission flag that gates
 * it. `ToolName` is derived from this object's keys — it is the single source
 * of truth for the set of supported tools.
 */
const permissionByTool = {
  list_branches: (p) => p.permissions.branches.list,
  get_branch: (p) => p.permissions.branches.get,
  create_branch: (p) => p.permissions.branches.create,
  list_merge_requests: (p) => p.permissions.mergeRequests.list,
  get_merge_request: (p) => p.permissions.mergeRequests.get,
  create_merge_request: (p) => p.permissions.mergeRequests.create,
  comment_on_merge_request: (p) => p.permissions.mergeRequests.comment,
  list_issues: (p) => p.permissions.issues.list,
  get_issue: (p) => p.permissions.issues.get,
  create_issue: (p) => p.permissions.issues.create,
  update_issue: (p) => p.permissions.issues.update,
  delete_issue: (p) => p.permissions.issues.delete,
  comment_on_issue: (p) => p.permissions.issues.comment,
  list_project_labels: (p) => p.permissions.metadata.labels,
  list_milestones: (p) => p.permissions.metadata.milestones,
  list_project_users: (p) => p.permissions.metadata.users,
  list_pipelines: (p) => p.permissions.pipelines.list,
  get_pipeline: (p) => p.permissions.pipelines.get,
  list_pipeline_jobs: (p) => p.permissions.pipelines.jobs,
  get_repository_file: (p) => p.permissions.repository.readFiles,
  list_repository_tree: (p) => p.permissions.repository.readTree,
} satisfies Record<string, PermissionReader>;

/** Union of all tool names supported by safe-glab-mcp. */
export type ToolName = keyof typeof permissionByTool;

/** All supported tool names as a runtime array. */
export const toolNames = Object.keys(permissionByTool) as ToolName[];

type BasePolicyInput = { projectPath: string };

type SimplePolicyInput = BasePolicyInput & {
  tool: Exclude<ToolName, "create_branch" | "create_merge_request" | "get_repository_file">;
};

type CreateBranchPolicyInput = BasePolicyInput & {
  tool: "create_branch";
  branchName: string;
};

type CreateMergeRequestPolicyInput = BasePolicyInput & {
  tool: "create_merge_request";
  targetBranch: string;
};

type GetRepositoryFilePolicyInput = BasePolicyInput & {
  tool: "get_repository_file";
  fileSizeBytes?: number;
};

export type PolicyInput =
  | SimplePolicyInput
  | CreateBranchPolicyInput
  | CreateMergeRequestPolicyInput
  | GetRepositoryFilePolicyInput;

export type PolicyDecision = { allowed: true } | { allowed: false; reason: string };

/**
 * Evaluates local policy before a GitLab request is made.
 *
 * This is the safety boundary that compensates for broad GitLab token scopes
 * on GitLab Community Edition, which has no fine-grained token permissions.
 *
 * @param config - The loaded safe-glab configuration.
 * @param input - The tool and project context to evaluate.
 * @returns A {@link PolicyDecision} indicating whether the action is permitted.
 *
 * @see assertAllowed for the throwing variant used by tool handlers.
 */
export function isAllowed(config: SafeGlabConfig, input: PolicyInput): PolicyDecision {
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
    const protectedPattern = config.defaults.protectedBranches.find((pattern) =>
      matchesPattern(input.branchName, pattern),
    );
    if (protectedPattern) {
      return {
        allowed: false,
        reason: `Branch ${input.branchName} matches protected branch pattern ${protectedPattern}`,
      };
    }
  }

  if (input.tool === "create_merge_request") {
    const allowedTarget = config.defaults.allowedMergeRequestTargetBranches.some((pattern) =>
      matchesPattern(input.targetBranch, pattern),
    );
    if (!allowedTarget) {
      return {
        allowed: false,
        reason: `Merge request target branch ${input.targetBranch} is not allowed`,
      };
    }
  }

  if (
    input.tool === "get_repository_file" &&
    input.fileSizeBytes !== undefined &&
    input.fileSizeBytes > config.defaults.maxRepositoryFileBytes
  ) {
    return {
      allowed: false,
      reason: `Repository file size ${input.fileSizeBytes} exceeds configured limit ${config.defaults.maxRepositoryFileBytes}`,
    };
  }

  return { allowed: true };
}

/**
 * Asserts that the given policy input is allowed, throwing if not.
 *
 * @param config - The loaded safe-glab configuration.
 * @param input - The tool and project context to evaluate.
 * @throws {Error} with the denial reason if the action is not permitted.
 */
export function assertAllowed(config: SafeGlabConfig, input: PolicyInput): void {
  const decision = isAllowed(config, input);
  if (!decision.allowed) {
    throw new Error(decision.reason);
  }
}
