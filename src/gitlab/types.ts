import type { StringQuery } from "../util/pick-string-query.js";

/** A JSON object body sent to or received from the GitLab API. */
export type GitLabJsonObject = Record<string, unknown>;

/** Query parameters for a GitLab API request. */
export type GitLabQuery = StringQuery;

/** A commit object embedded in branch and pipeline responses. */
type GitLabCommit = {
  id: string;
  short_id: string;
  title: string;
  author_name: string;
  authored_date: string;
  committed_date: string;
  message: string;
  web_url: string;
};

/** A minimal user reference embedded in issues, MRs, and similar resources. */
type GitLabUserRef = {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string | null;
  web_url: string;
};

/** A project branch as returned by the Branches API. */
export type GitLabBranch = {
  name: string;
  merged: boolean;
  protected: boolean;
  default: boolean;
  web_url: string;
  commit: GitLabCommit;
};

/** A merge request as returned by the Merge Requests API. */
export type GitLabMergeRequest = {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: "opened" | "closed" | "locked" | "merged";
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  target_branch: string;
  source_branch: string;
  draft: boolean;
  web_url: string;
  author: GitLabUserRef;
  assignees: GitLabUserRef[];
  reviewers: GitLabUserRef[];
  labels: string[];
};

/** An issue as returned by the Issues API. */
export type GitLabIssue = {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: "opened" | "closed";
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: string[];
  assignees: GitLabUserRef[];
  author: GitLabUserRef;
  confidential: boolean;
  due_date: string | null;
  web_url: string;
  milestone: GitLabMilestone | null;
};

/** A CI/CD pipeline as returned by the Pipelines API. */
export type GitLabPipeline = {
  id: number;
  iid: number;
  project_id: number;
  sha: string;
  ref: string;
  status:
    | "created"
    | "waiting_for_resource"
    | "preparing"
    | "pending"
    | "running"
    | "success"
    | "failed"
    | "canceled"
    | "skipped"
    | "manual"
    | "scheduled";
  source: string;
  created_at: string;
  updated_at: string;
  web_url: string;
};

/** A CI/CD job as returned by the Pipeline Jobs API. */
export type GitLabJob = {
  id: number;
  name: string;
  stage: string;
  status: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  web_url: string;
  pipeline: {
    id: number;
    ref: string;
    sha: string;
    status: string;
  };
};

/** A project label as returned by the Labels API. */
export type GitLabLabel = {
  id: number;
  name: string;
  color: string;
  description: string | null;
  text_color: string;
};

/** A project milestone as returned by the Milestones API. */
export type GitLabMilestone = {
  id: number;
  iid: number;
  project_id: number;
  title: string;
  description: string | null;
  state: "active" | "closed";
  created_at: string;
  updated_at: string;
  due_date: string | null;
  start_date: string | null;
  web_url: string;
};

/** A project member as returned by the Members API. */
export type GitLabUser = {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string | null;
  web_url: string;
  access_level: number;
};

/** A repository tree entry as returned by the Repository Tree API. */
export type GitLabTreeEntry = {
  id: string;
  name: string;
  type: "blob" | "tree";
  path: string;
  mode: string;
};

/**
 * Raw file response from the Repository Files API.
 * The `content` field is base64-encoded; use {@link GitLabRepositoryFile} for
 * the decoded form.
 */
export type GitLabRepositoryFileRaw = {
  file_name: string;
  file_path: string;
  content: string;
  size: number;
};

/** A decoded repository file with `content` as a UTF-8 string. */
export type GitLabRepositoryFile = {
  fileName: string;
  filePath: string;
  content: string;
  size: number;
};

/** Body shape for the Create Merge Request API endpoint. */
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

/** Body shape for the Create / Update Issue API endpoints. */
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
