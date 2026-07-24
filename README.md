<h1 align="center">Safe GitLab MCP</h1>
<p align="center">
  GitLab CE has no fine-grained access tokens; your token either has <code>api</code> scope or it doesn't. This Claude plugin enforces per-project, per-operation restrictions that your GitLab instance can't.
</p>

## Quick Start

**1. Install**

```bash
claude plugin marketplace add mcmanussliam/safe-glab-mcp
claude plugin install safe-glab-mcp@mcmanussliam-safe-glab-mcp
```

**2. Store your token in the OS keychain**

```bash
security add-generic-password -s safe-glab -a SAFE_GLAB_TOKEN -w "glpat-xxxxxxxxxxxxxxxxxxxx"
```

**3. Edit your config**

The config is created automatically at `$CLAUDE_PLUGIN_DATA/safe-glab.json` on first start.

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/mcmanussliam/safe-glab-mcp/main/safe-glab.schema.json",
  "gitlab": {
    "baseUrl": "https://gitlab.example.com",
    // Name of the keychain entry (or env var fallback) that holds your token
    "tokenKey": "SAFE_GLAB_TOKEN"
  },
  "defaults": {
    // Claude cannot create branches matching these patterns
    "protectedBranches": ["main", "master", "production", "release/*"],
    // Claude can only open MRs targeting these branches
    "allowedMergeRequestTargetBranches": ["main", "master", "develop", "release/*"],
    // Files larger than this (bytes) are refused — 256 KB default
    "maxRepositoryFileBytes": 262144
  },
  "projects": [
    {
      "path": "my-group/my-project",
      "permissions": {
        "branches": { "list": true,  "get": true,  "create": true },
        "mergeRequests": { "list": true,  "get": true,  "create": true,  "comment": true },
        "issues": { "list": true,  "get": true,  "create": true,  "update": true, "delete": false, "comment": true },
        "metadata": { "labels": true, "milestones": true, "users": true },
        "pipelines": { "list": true,  "get": true,  "jobs": true },
        "repository": { "readFiles": true, "readTree": true }
      }
    }
  ]
}
```

**4. Restart Claude Code and that's you**
