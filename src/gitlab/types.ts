import type { StringQuery } from "../util/pick-string-query.js";

export type GitLabJsonObject = Record<string, unknown>;

export type GitLabQuery = StringQuery;

export type GitLabRepositoryFile = {
  fileName: string;
  filePath: string;
  content: string;
  size: number;
};

export type CreateMergeRequestInput = {
  source_branch: string;
  target_branch: string;
  title: string;
  description?: string;
  draft?: boolean;
  labels?: string[];
  assignee_ids?: number[];
  reviewer_ids?: number[];
  remove_source_branch?: boolean;
};

export type IssueInput = {
  title?: string;
  description?: string;
  labels?: string[];
  assignee_ids?: number[];
  confidential?: boolean;
  due_date?: string;
  milestone_id?: number;
  state_event?: "close" | "reopen";
};

export type GitLabClientContract = {
  getProject(projectPath: string): Promise<unknown>;
  listBranches(projectPath: string, query?: GitLabQuery): Promise<unknown>;
  getBranch(projectPath: string, branch: string): Promise<unknown>;
  createBranch(projectPath: string, branch: string, ref: string): Promise<unknown>;
  listMergeRequests(projectPath: string, query?: GitLabQuery): Promise<unknown>;
  getMergeRequest(projectPath: string, mergeRequestIid: number): Promise<unknown>;
  createMergeRequest(projectPath: string, body: CreateMergeRequestInput): Promise<unknown>;
  commentOnMergeRequest(projectPath: string, mergeRequestIid: number, body: string): Promise<unknown>;
  listIssues(projectPath: string, query?: GitLabQuery): Promise<unknown>;
  getIssue(projectPath: string, issueIid: number): Promise<unknown>;
  createIssue(projectPath: string, body: IssueInput): Promise<unknown>;
  updateIssue(projectPath: string, issueIid: number, body: IssueInput): Promise<unknown>;
  deleteIssue(projectPath: string, issueIid: number): Promise<unknown>;
  commentOnIssue(projectPath: string, issueIid: number, body: string): Promise<unknown>;
  listProjectLabels(projectPath: string): Promise<unknown>;
  listMilestones(projectPath: string): Promise<unknown>;
  listProjectUsers(projectPath: string): Promise<unknown>;
  listPipelines(projectPath: string, query?: GitLabQuery): Promise<unknown>;
  getPipeline(projectPath: string, pipelineId: number): Promise<unknown>;
  listPipelineJobs(projectPath: string, pipelineId: number): Promise<unknown>;
  getRepositoryFile(projectPath: string, filePath: string, ref: string): Promise<GitLabRepositoryFile>;
  listRepositoryTree(projectPath: string, query?: GitLabQuery): Promise<unknown>;
};
