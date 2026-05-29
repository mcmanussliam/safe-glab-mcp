import { z } from "zod";
import type {
  CreateMergeRequestInput,
  GitLabClientContract,
  GitLabJsonObject,
  GitLabQuery,
  GitLabRepositoryFile,
  IssueInput,
} from "./gitlab/types.js";
import { redactSecret } from "./util/redaction.js";

const gitLabRepositoryFileResponseSchema = z.object({
  file_name: z.string(),
  file_path: z.string(),
  content: z.string(),
  size: z.number(),
});

type Fetch = typeof fetch;
type HttpMethod = "DELETE" | "GET" | "POST" | "PUT";

export type GitLabClientOptions = {
  baseUrl: string;
  token: string;
  fetch?: Fetch;
};

export class GitLabNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitLabNotFoundError";
  }
}

/**
 * Restricted GitLab API client used behind the MCP policy layer.
 *
 * The class intentionally exposes named operations only. Do not add a public
 * raw request method; callers should go through explicit methods plus policy
 * checks in the tool layer.
 *
 * @see GitLabClientContract for the shared contract consumed by tools.
 * @see registerSafeGlabTools for the MCP boundary that exposes operations.
 */
export class GitLabClient implements GitLabClientContract {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: Fetch;

  constructor(options: GitLabClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.token = options.token;
    this.fetchImpl = options.fetch ?? fetch;
  }

  getProject(projectPath: string): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}`);
  }

  listBranches(projectPath: string, query: GitLabQuery = {}): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/repository/branches`, query);
  }

  getBranch(projectPath: string, branch: string): Promise<unknown> {
    return this.request(
      "GET",
      `/projects/${encodeURIComponent(projectPath)}/repository/branches/${encodeURIComponent(branch)}`,
    );
  }

  createBranch(projectPath: string, branch: string, ref: string): Promise<unknown> {
    return this.request("POST", `/projects/${encodeURIComponent(projectPath)}/repository/branches`, {
      branch,
      ref,
    });
  }

  listMergeRequests(projectPath: string, query: GitLabQuery = {}): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/merge_requests`, query);
  }

  getMergeRequest(projectPath: string, mergeRequestIid: number): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/merge_requests/${mergeRequestIid}`);
  }

  createMergeRequest(projectPath: string, body: CreateMergeRequestInput): Promise<unknown> {
    return this.request("POST", `/projects/${encodeURIComponent(projectPath)}/merge_requests`, undefined, body);
  }

  commentOnMergeRequest(projectPath: string, mergeRequestIid: number, body: string): Promise<unknown> {
    return this.request(
      "POST",
      `/projects/${encodeURIComponent(projectPath)}/merge_requests/${mergeRequestIid}/notes`,
      undefined,
      { body },
    );
  }

  listIssues(projectPath: string, query: GitLabQuery = {}): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/issues`, query);
  }

  getIssue(projectPath: string, issueIid: number): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/issues/${issueIid}`);
  }

  createIssue(projectPath: string, body: IssueInput): Promise<unknown> {
    return this.request("POST", `/projects/${encodeURIComponent(projectPath)}/issues`, undefined, body);
  }

  updateIssue(projectPath: string, issueIid: number, body: IssueInput): Promise<unknown> {
    return this.request("PUT", `/projects/${encodeURIComponent(projectPath)}/issues/${issueIid}`, undefined, body);
  }

  deleteIssue(projectPath: string, issueIid: number): Promise<unknown> {
    return this.request("DELETE", `/projects/${encodeURIComponent(projectPath)}/issues/${issueIid}`);
  }

  commentOnIssue(projectPath: string, issueIid: number, body: string): Promise<unknown> {
    return this.request("POST", `/projects/${encodeURIComponent(projectPath)}/issues/${issueIid}/notes`, undefined, {
      body,
    });
  }

  listProjectLabels(projectPath: string): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/labels`);
  }

  listMilestones(projectPath: string): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/milestones`);
  }

  listProjectUsers(projectPath: string): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/users`);
  }

  listPipelines(projectPath: string, query: GitLabQuery = {}): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/pipelines`, query);
  }

  getPipeline(projectPath: string, pipelineId: number): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/pipelines/${pipelineId}`);
  }

  listPipelineJobs(projectPath: string, pipelineId: number): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/pipelines/${pipelineId}/jobs`);
  }

  async getRepositoryFile(projectPath: string, filePath: string, ref: string): Promise<GitLabRepositoryFile> {
    const raw = await this.request(
      "GET",
      `/projects/${encodeURIComponent(projectPath)}/repository/files/${encodeURIComponent(filePath)}`,
      { ref },
    );
    const response = gitLabRepositoryFileResponseSchema.parse(raw);

    return {
      fileName: response.file_name,
      filePath: response.file_path,
      content: Buffer.from(response.content, "base64").toString("utf8"),
      size: response.size,
    };
  }

  listRepositoryTree(projectPath: string, query: GitLabQuery = {}): Promise<unknown> {
    return this.request("GET", `/projects/${encodeURIComponent(projectPath)}/repository/tree`, query);
  }

  private async request(
    method: HttpMethod,
    path: string,
    query?: GitLabQuery,
    body?: GitLabJsonObject,
  ): Promise<unknown> {
    const url = new URL(`${this.baseUrl}/api/v4${path}`);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = { "PRIVATE-TOKEN": this.token };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
    }

    const response = await this.fetchImpl(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 404) {
      throw new GitLabNotFoundError(`GitLab resource not found: ${method} ${path}`);
    }

    if (!response.ok) {
      const text = redactSecret(await response.text(), this.token);
      throw new Error(`GitLab request failed with ${response.status}: ${text}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }
}
