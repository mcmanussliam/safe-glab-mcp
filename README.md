# safe-glab-mcp

`safe-glab-mcp` is a GitLab-specific MCP server that exposes a limited, policy-checked set of GitLab tools to Claude.

It does not expose arbitrary `glab`, shell commands, or raw GitLab API calls.

## Tools

- Branches: `list_branches`, `get_branch`, `create_branch`
- Merge requests: `list_merge_requests`, `get_merge_request`, `create_merge_request`, `comment_on_merge_request`
- Issues: `list_issues`, `get_issue`, `create_issue`, `update_issue`, `delete_issue`, `comment_on_issue`
- Metadata: `list_project_labels`, `list_milestones`, `list_project_users`
- Pipelines: `list_pipelines`, `get_pipeline`, `list_pipeline_jobs`
- Repository reads: `get_repository_file`, `list_repository_tree`

## Blocked

The server does not provide tools for project deletion, branch deletion, protected branch mutation, pushing commits, repository file writes, MR approval, MR merge, token management, project member management, project settings, arbitrary pipeline execution, raw API access, or arbitrary `glab` execution.

## Setup

```bash
npm install
npm run build
```

Create a config from `safe-glab.example.json`, then provide the GitLab token through the environment variable named by `gitlab.tokenEnv`.

```bash
export SAFE_GLAB_TOKEN="..."
npm run start -- --config ./safe-glab.json
```

You can also set `SAFE_GLAB_CONFIG` instead of passing `--config`.

```bash
export SAFE_GLAB_CONFIG="./safe-glab.json"
npm run start
```

## Claude MCP Config

```json
{
  "mcpServers": {
    "safe-glab": {
      "command": "node",
      "args": ["/absolute/path/to/safe-mcp/dist/index.js", "--config", "/absolute/path/to/safe-glab.json"],
      "env": {
        "SAFE_GLAB_TOKEN": "your-token"
      }
    }
  }
}
```

## Config Model

Permissions are exact per project path. Numeric project IDs are rejected in config so the file stays human-readable.

Issue deletion is disabled unless `issues.delete` is set to `true` on that specific project.

Branch creation is denied when the new branch matches any `defaults.protectedBranches` pattern. Merge request creation is denied when the target branch does not match `defaults.allowedMergeRequestTargetBranches`.

Repository file reads enforce `defaults.maxRepositoryFileBytes` after GitLab returns file metadata.

## Development

```bash
npm test
npm run build
```
