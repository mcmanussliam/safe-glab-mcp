import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { ToolName } from "./policy.js";

/** A fully described MCP tool ready for registration. */
export type ToolDefinition = {
  name: ToolName;
  description: string;
  inputSchema: z.ZodRawShape;
  handler(args: Record<string, unknown>): Promise<CallToolResult>;
};

/**
 * Declares an MCP tool with a Zod-validated input schema.
 *
 * The `handler` receives fully parsed, typed arguments — Zod validation runs
 * automatically before the handler is invoked so handlers can treat their
 * arguments as type-safe.
 *
 * @param name - Tool name; must be a known {@link ToolName}.
 * @param description - Human-readable description surfaced to the LLM.
 * @param inputSchema - Zod shape that describes the tool's accepted input.
 * @param handler - Async handler called with validated, typed arguments.
 *
 * @example
 * defineTool("list_issues", "List issues.", { projectPath }, async (args) => {
 *   return json(await request<GitLabIssue[]>("GET", `${projectApiPath(args.projectPath)}/issues`));
 * });
 */
export function defineTool<TSchema extends z.ZodRawShape>(
  name: ToolName,
  description: string,
  inputSchema: TSchema,
  handler: (args: z.objectOutputType<TSchema, z.ZodTypeAny>) => Promise<CallToolResult>,
): ToolDefinition {
  return {
    name,
    description,
    inputSchema,
    handler: async (args) => handler(z.object(inputSchema).parse(args)),
  };
}

/**
 * Registers an array of tool definitions with an MCP server instance.
 *
 * @param server - The MCP server to register tools on.
 * @param tools - Tool definitions to register, typically from
 *   {@link createSafeGlabTools}.
 */
export function registerTools(server: McpServer, tools: ToolDefinition[]): void {
  for (const tool of tools) {
    server.registerTool(tool.name, { description: tool.description, inputSchema: tool.inputSchema }, (args) =>
      tool.handler(args),
    );
  }
}
