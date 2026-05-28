#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, type SafeGlabConfig } from "./config.js";
import { GitLabClient } from "./gitlab.js";
import { type GitLabClientContract, registerSafeGlabTools } from "./tools.js";

export function createServer(config: SafeGlabConfig, gitlab: GitLabClientContract): McpServer {
  const server = new McpServer({
    name: "safe-glab-mcp",
    version: "0.1.0",
  });
  registerSafeGlabTools(server, config, gitlab);
  return server;
}

export async function main(argv = process.argv, env = process.env): Promise<void> {
  const configPath = readConfigPath(argv, env);
  initPluginConfig(configPath, env);
  const config = loadConfig(configPath, env);
  const gitlab = new GitLabClient({
    baseUrl: config.gitlab.baseUrl,
    token: config.gitlab.token,
  });

  const server = createServer(config, gitlab);
  await server.connect(new StdioServerTransport());
}

function initPluginConfig(configPath: string, env: NodeJS.ProcessEnv): void {
  if (existsSync(configPath)) {
    return;
  }

  const pluginRoot = env.CLAUDE_PLUGIN_ROOT;
  if (!pluginRoot) {
    return;
  }

  const examplePath = join(pluginRoot, "safe-glab.example.json");
  if (!existsSync(examplePath)) {
    return;
  }

  mkdirSync(dirname(configPath), { recursive: true });
  copyFileSync(examplePath, configPath);
  process.stderr.write(
    `safe-glab-mcp: created config at ${configPath} — edit it to add your GitLab instance and projects.\n`,
  );
}

function readConfigPath(argv: string[], env: NodeJS.ProcessEnv): string {
  const flagIndex = argv.indexOf("--config");
  if (flagIndex >= 0) {
    const value = argv[flagIndex + 1];
    if (!value) {
      throw new Error("`--config` requires a path");
    }

    return value;
  }

  if (env.SAFE_GLAB_CONFIG) {
    return env.SAFE_GLAB_CONFIG;
  }

  throw new Error("Config path is required. Pass `--config <path>` or set `SAFE_GLAB_CONFIG`.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
