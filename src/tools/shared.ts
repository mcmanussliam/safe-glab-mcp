import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { SafeGlabConfig } from "../config.js";
import type { GitLabRequest } from "../gitlab/request.js";

/** Runtime context passed to every tool factory. */
export type ToolContext = {
  /** The loaded safe-glab configuration, including policy rules. */
  config: SafeGlabConfig;
  /** The authenticated GitLab request function for this session. */
  request: GitLabRequest;
};

/** A project path in `namespace/project` format. */
export const projectPath = z.string().min(1);

/** An optional non-empty string. */
export const optionalString = z.string().min(1).optional();

/** An optional array of non-empty strings. */
export const optionalStringArray = z.array(z.string().min(1)).optional();

/** An optional array of positive integer IDs. */
export const optionalNumberArray = z.array(z.number().int().positive()).optional();

/** A positive integer ID (issue IID, MR IID, pipeline ID, etc.). */
export function id(): z.ZodNumber {
  return z.number().int().positive();
}

/**
 * Returns the `/projects/:encoded` API path prefix for a given project path.
 *
 * @example
 * projectApiPath("platform/api") // "/projects/platform%2Fapi"
 */
export function projectApiPath(project: string): string {
  return `/projects/${encodeURIComponent(project)}`;
}

/** Wraps a value as a plain-text MCP {@link CallToolResult} containing pretty-printed JSON. */
export function json(value: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}
