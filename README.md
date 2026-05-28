# Safe Gitlab MCP

GitLab Community Edition has no fine-grained access tokens, your token either has api access or it doesn't.<br>
This MCP enforces the per-project, per-operation restrictions that your GitLab instance can't.

## Features

- **Per-project permission controls**, every tool is opt-in per project path.
- **Protected branch enforcement**, Claude cannot create branches matching your
  protected patterns.
- **MR target branch allowlist**, merge requests can only target branches you
  permit.
- **Repository file size limits**, large files are rejected before content is
  returned.
- **No raw API access**, only named operations are exposed — no shell commands,
  no arbitrary requests.

## Quick Start

1. Install the plugin:

```bash
claude plugin marketplace add mcmanussliam/safe-glab-mcp
claude plugin install safe-glab-mcp@mcmanussliam-safe-glab-mcp
```

2. Set your GitLab token in your shell profile:

```bash
export SAFE_GLAB_TOKEN="glpat-xxxxxxxxxxxxxxxxxxxx"
```

3. Edit your config at `$CLAUDE_PLUGIN_DATA/safe-glab.json` — it's created
   automatically on first start from the bundled example:

```jsonc
{
  "gitlab": {
    "baseUrl": "https://gitlab.example.com",
    "tokenEnv": "SAFE_GLAB_TOKEN"
  },
  "defaults": {
    "protectedBranches": ["main", "master", "production", "release/*"],
    "allowedMergeRequestTargetBranches": ["*"],
    "maxRepositoryFileBytes": 262144
  },
  "projects": [
    {
      "path": "my-group/my-project",
      "permissions": { ... }
    }
  ]
}
```

4. Restart Claude Code and start interacting with GitLab
5. And that's it 🎉

## Config reference

### Permissions

Every project entry requires a full `permissions` object:

```jsonc
"permissions": {
  "branches": { "list": true, "get": true, "create": true },
  "mergeRequests": { "list": true, "get": true, "create": true, "comment": true },
  "issues": { "list": true, "get": true, "create": true, "update": true, "delete": false, "comment": true },
  "metadata": { "labels": true, "milestones": true, "users": true },
  "pipelines": { "list": true, "get": true, "jobs": true },
  "repository": { "readFiles": true, "readTree": true }
}
```

### Policy rules

| Rule                                         | Behaviour                                                           |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `defaults.protectedBranches`                 | `create_branch` denied when the new name matches any pattern        |
| `defaults.allowedMergeRequestTargetBranches` | `create_merge_request` denied when target doesn't match any pattern |
| `defaults.maxRepositoryFileBytes`            | `get_repository_file` denied when the file exceeds this size        |
| `issues.delete: false`                       | `delete_issue` denied for that project regardless of token scope    |

Patterns use glob syntax — `*` matches any sequence of characters.

## Available tools

| Category       | Tools                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Branches       | `list_branches`, `get_branch`, `create_branch`                                                 |
| Merge requests | `list_merge_requests`, `get_merge_request`, `create_merge_request`, `comment_on_merge_request` |
| Issues         | `list_issues`, `get_issue`, `create_issue`, `update_issue`, `delete_issue`, `comment_on_issue` |
| Metadata       | `list_project_labels`, `list_milestones`, `list_project_users`                                 |
| Pipelines      | `list_pipelines`, `get_pipeline`, `list_pipeline_jobs`                                         |
| Repository     | `get_repository_file`, `list_repository_tree`                                                  |

---

Please don't let Claude delete the master branch.
