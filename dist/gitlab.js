import { z } from "zod";
import { encodeGitLabProjectPath } from "./util/encode-gitlab-project-path.js";
import { redactSecret } from "./util/redaction.js";
const gitLabRepositoryFileResponseSchema = z.object({
    file_name: z.string(),
    file_path: z.string(),
    content: z.string(),
    size: z.number(),
});
export class GitLabNotFoundError extends Error {
    constructor(message) {
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
export class GitLabClient {
    baseUrl;
    token;
    fetchImpl;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, "");
        this.token = options.token;
        this.fetchImpl = options.fetch ?? fetch;
    }
    getProject(projectPath) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}`);
    }
    listBranches(projectPath, query = {}) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/repository/branches`, query);
    }
    getBranch(projectPath, branch) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/repository/branches/${encodeURIComponent(branch)}`);
    }
    createBranch(projectPath, branch, ref) {
        return this.request("POST", `/projects/${encodeGitLabProjectPath(projectPath)}/repository/branches`, {
            branch,
            ref,
        });
    }
    listMergeRequests(projectPath, query = {}) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/merge_requests`, query);
    }
    getMergeRequest(projectPath, mergeRequestIid) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/merge_requests/${mergeRequestIid}`);
    }
    createMergeRequest(projectPath, body) {
        return this.request("POST", `/projects/${encodeGitLabProjectPath(projectPath)}/merge_requests`, undefined, body);
    }
    commentOnMergeRequest(projectPath, mergeRequestIid, body) {
        return this.request("POST", `/projects/${encodeGitLabProjectPath(projectPath)}/merge_requests/${mergeRequestIid}/notes`, undefined, { body });
    }
    listIssues(projectPath, query = {}) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/issues`, query);
    }
    getIssue(projectPath, issueIid) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/issues/${issueIid}`);
    }
    createIssue(projectPath, body) {
        return this.request("POST", `/projects/${encodeGitLabProjectPath(projectPath)}/issues`, undefined, body);
    }
    updateIssue(projectPath, issueIid, body) {
        return this.request("PUT", `/projects/${encodeGitLabProjectPath(projectPath)}/issues/${issueIid}`, undefined, body);
    }
    deleteIssue(projectPath, issueIid) {
        return this.request("DELETE", `/projects/${encodeGitLabProjectPath(projectPath)}/issues/${issueIid}`);
    }
    commentOnIssue(projectPath, issueIid, body) {
        return this.request("POST", `/projects/${encodeGitLabProjectPath(projectPath)}/issues/${issueIid}/notes`, undefined, {
            body,
        });
    }
    listProjectLabels(projectPath) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/labels`);
    }
    listMilestones(projectPath) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/milestones`);
    }
    listProjectUsers(projectPath) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/users`);
    }
    listPipelines(projectPath, query = {}) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/pipelines`, query);
    }
    getPipeline(projectPath, pipelineId) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/pipelines/${pipelineId}`);
    }
    listPipelineJobs(projectPath, pipelineId) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/pipelines/${pipelineId}/jobs`);
    }
    async getRepositoryFile(projectPath, filePath, ref) {
        const raw = await this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/repository/files/${encodeURIComponent(filePath)}`, { ref });
        const response = gitLabRepositoryFileResponseSchema.parse(raw);
        return {
            fileName: response.file_name,
            filePath: response.file_path,
            content: Buffer.from(response.content, "base64").toString("utf8"),
            size: response.size,
        };
    }
    listRepositoryTree(projectPath, query = {}) {
        return this.request("GET", `/projects/${encodeGitLabProjectPath(projectPath)}/repository/tree`, query);
    }
    async request(method, path, query, body) {
        const url = new URL(`${this.baseUrl}/api/v4${path}`);
        for (const [key, value] of Object.entries(query ?? {})) {
            if (value !== undefined) {
                url.searchParams.set(key, value);
            }
        }
        const headers = { "PRIVATE-TOKEN": this.token };
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
