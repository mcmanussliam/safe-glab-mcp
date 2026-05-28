import { z } from "zod";
import { assertAllowed } from "../policy.js";
import { defineTool, json, optionalString, projectPath, type ToolContext, type ToolDefinition } from "./shared.js";

export function createRepositoryTools({ config, gitlab }: ToolContext): ToolDefinition[] {
  return [
    defineTool(
      "get_repository_file",
      "Read one repository file with size limits.",
      { projectPath, filePath: z.string().min(1), ref: z.string().min(1) },
      async (args) => {
        assertAllowed(config, { projectPath: args.projectPath, tool: "get_repository_file" });

        const file = await gitlab.getRepositoryFile(args.projectPath, args.filePath, args.ref);
        assertAllowed(config, {
          projectPath: args.projectPath,
          tool: "get_repository_file",
          fileSizeBytes: file.size,
        });

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
          await gitlab.listRepositoryTree(args.projectPath, {
            ref: args.ref,
            path: args.path,
            recursive: args.recursive === undefined ? undefined : String(args.recursive),
          }),
        );
      },
    ),
  ];
}
