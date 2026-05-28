# safe-glab-mcp

A GitLab MCP server for Claude. It exposes a limited, policy-checked set of GitLab operations — no arbitrary shell commands, no raw API access, no destructive project-level actions.

## How it works

Claude connects to MCP servers over a local stdio transport. When you register this server, Claude gains a set of named tools (`list_branches`, `create_issue`, etc.) that it can call during a conversation. Every call passes through a local policy layer first, so only the projects and operations you configure are reachable — even if your GitLab token is broader.

---

## Setup

### 1. Prerequisites

- Node.js 20 or later
- A GitLab personal access token with `api` scope

### 2. Install and build

```bash
npm install
npm run build
```

This produces `dist/index.js`, the entry point Claude will run.

### 3. Create your config file

Copy the example config and edit it:

```bash
cp safe-glab.example.json safe-glab.json
```

Open `safe-glab.json` and update the three top-level sections:

```jsonc
{
  "gitlab": {
    // Your GitLab instance URL — no trailing slash
    "baseUrl": "https://gitlab.com",
    // Name of the environment variable that holds your token (never put the token here)
    "tokenEnv": "SAFE_GLAB_TOKEN"
  },
  "defaults": {
    // Branch name patterns Claude cannot create (glob syntax, * is a wildcard)
    "protectedBranches": ["main", "master", "production", "release/*"],
    // Branch patterns Claude is allowed to target when opening merge requests
    "allowedMergeRequestTargetBranches": ["main", "master", "develop", "release/*"],
    // Maximum file size Claude can read from the repository (bytes)
    "maxRepositoryFileBytes": 262144
  },
  "projects": [
    {
      // Must be namespace/project — numeric IDs are rejected
      "path": "my-group/my-project",
      "permissions": { /* see Config reference below */ }
    }
  ]
}
```

> **Keep `safe-glab.json` out of version control** if it contains team-specific project paths you don't want to share. The file does not contain secrets — the token stays in an environment variable.

### 4. Register with Claude

Pick the client you use and add the server config once.

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). Add a `mcpServers` key if it doesn't exist:

```json
{
  "mcpServers": {
    "safe-glab": {
      "command": "node",
      "args": [
        "/absolute/path/to/safe-mcp/dist/index.js",
        "--config",
        "/absolute/path/to/safe-glab.json"
      ],
      "env": {
        "SAFE_GLAB_TOKEN": "glpat-xxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Restart Claude Desktop. The tools will appear in the tool picker.

#### Claude Code (CLI)

```bash
# Project-level — stores in .claude/settings.json in the current directory
claude mcp add -e SAFE_GLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
  safe-glab -- node /absolute/path/to/safe-mcp/dist/index.js \
  --config /absolute/path/to/safe-glab.json

# User-level — stores in ~/.claude/settings.json, available in all projects
claude mcp add --scope user \
  -e SAFE_GLAB_TOKEN=glpat-xxxxxxxxxxxxxxxxxxxx \
  safe-glab -- node /absolute/path/to/safe-mcp/dist/index.js \
  --config /absolute/path/to/safe-glab.json
```

Or edit the JSON directly — the shape is identical to the Claude Desktop format above. Add the `mcpServers` block to `.claude/settings.json` (project) or `~/.claude/settings.json` (user).

### 5. Verify

Ask Claude: _"List the branches in my-group/my-project"_. If the server is registered and the token is valid, Claude will call `list_branches` and return results. If it errors, check:

- Absolute paths in the config (relative paths won't work because Claude spawns the process from a different working directory)
- Token has `api` scope on your GitLab instance
- `npm run build` has been run after any code changes

---

## Config reference

### Permissions

Every project entry requires a full `permissions` object. Set a flag to `false` to deny that operation for the project — Claude will receive a policy error rather than a GitLab error.

```jsonc
"permissions": {
  "branches":       { "list": true, "get": true, "create": true },
  "mergeRequests":  { "list": true, "get": true, "create": true, "comment": true },
  "issues":         { "list": true, "get": true, "create": true, "update": true, "delete": false, "comment": true },
  "metadata":       { "labels": true, "milestones": true, "users": true },
  "pipelines":      { "list": true, "get": true, "jobs": true },
  "repository":     { "readFiles": true, "readTree": true }
}
```

### Policy rules

| Rule | Behaviour |
|---|---|
| `defaults.protectedBranches` | `create_branch` is denied when the new name matches any pattern |
| `defaults.allowedMergeRequestTargetBranches` | `create_merge_request` is denied when `targetBranch` does not match any pattern |
| `defaults.maxRepositoryFileBytes` | `get_repository_file` is denied when the file exceeds this size |
| `issues.delete: false` | `delete_issue` is denied for that project regardless of the token's actual permissions |

Patterns use glob syntax: `*` matches any sequence of characters within the pattern. Examples: `release/*` matches `release/v1.2`, `feat/*` matches `feat/login`.

---

## Available tools

| Category | Tools |
|---|---|
| Branches | `list_branches`, `get_branch`, `create_branch` |
| Merge requests | `list_merge_requests`, `get_merge_request`, `create_merge_request`, `comment_on_merge_request` |
| Issues | `list_issues`, `get_issue`, `create_issue`, `update_issue`, `delete_issue`, `comment_on_issue` |
| Metadata | `list_project_labels`, `list_milestones`, `list_project_users` |
| Pipelines | `list_pipelines`, `get_pipeline`, `list_pipeline_jobs` |
| Repository | `get_repository_file`, `list_repository_tree` |

## Blocked operations

The server has no tools for: project deletion, branch deletion, protected branch mutation, pushing commits, repository file writes, MR approval, MR merge, token management, project member management, project settings, arbitrary pipeline execution, raw API access, or shell command execution.

---

## Development

```bash
npm test          # run tests
npm run build     # compile TypeScript
npm run check     # build + test + lint
```
