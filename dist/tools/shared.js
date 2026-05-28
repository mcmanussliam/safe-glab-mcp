import { z } from "zod";
export const projectPath = z.string().min(1);
export const optionalString = z.string().min(1).optional();
export const optionalNumberArray = z.array(z.number().int().positive()).optional();
export const optionalStringArray = z.array(z.string().min(1)).optional();
export function id() {
    return z.number().int().positive();
}
export function json(value) {
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
export function defineTool(name, description, inputSchema, handler) {
    return {
        name,
        description,
        inputSchema,
        handler: async (args) => handler(z.object(inputSchema).parse(args)),
    };
}
