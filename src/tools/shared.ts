import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { SafeGlabConfig } from "../config.js";
import type { GitLabClientContract } from "../gitlab/types.js";
import type { ToolName } from "../policy.js";

export type ToolContext = {
  config: SafeGlabConfig;
  gitlab: GitLabClientContract;
};

export type ToolDefinition = {
  name: ToolName;
  description: string;
  inputSchema: z.ZodRawShape;
  handler(args: Record<string, unknown>): Promise<CallToolResult>;
};

export const projectPath = z.string().min(1);
export const optionalString = z.string().min(1).optional();
export const optionalNumberArray = z.array(z.number().int().positive()).optional();
export const optionalStringArray = z.array(z.string().min(1)).optional();

export function id(): z.ZodNumber {
  return z.number().int().positive();
}

export function json(value: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

/**
 * Wraps a tool handler with Zod parsing so handlers receive typed arguments.
 *
 * @see registerSafeGlabTools for MCP SDK registration.
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
