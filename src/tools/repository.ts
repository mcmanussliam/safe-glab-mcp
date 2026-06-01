import { z } from "zod";
import type { GitLabRepositoryFile, GitLabRepositoryFileRaw, GitLabTreeEntry } from "../gitlab/types.js";
import { defineTool, type ToolDefinition } from "../mcp.js";
import { assertAllowed } from "../policy.js";
import { json, optionalString, projectApiPath, projectPath, type ToolContext } from "./shared.js";

export function createRepositoryTools({ config, request }: ToolContext): ToolDefinition[] {
  return [
    defineTool(
      "get_repository_file",
      "Read one repository file with size limits.",
      { projectPath, filePath: z.string().min(1), ref: z.string().min(1) },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "get_repository_file" });

        const raw = await request<GitLabRepositoryFileRaw>(
          "GET",
          `${projectApiPath(args.projectPath)}/repository/files/${encodeURIComponent(args.filePath)}`,
          { ref: args.ref },
        );

        assertAllowed(config, {
          projectPath: args.projectPath,
          tool: "get_repository_file",
          fileSizeBytes: raw.size,
        });

        const file: GitLabRepositoryFile = {
          fileName: raw.file_name,
          filePath: raw.file_path,
          content: Buffer.from(raw.content, "base64").toString("utf8"),
          size: raw.size,
        };

        return json(file);
      },
    ),

    defineTool(
      "list_repository_tree",
      "List repository tree entries.",
      { projectPath, ref: z.string().min(1), path: optionalString, recursive: z.boolean().optional() },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "list_repository_tree" });
        return json(
          await request<GitLabTreeEntry[]>("GET", `${projectApiPath(args.projectPath)}/repository/tree`, {
            ref: args.ref,
            path: args.path,
            recursive: args.recursive === undefined ? undefined : String(args.recursive),
          }),
        );
      },
    ),
  ];
}
