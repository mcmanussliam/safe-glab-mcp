export type StringQuery = Record<string, string | undefined>;

/**
 * Extracts a subset of string-valued entries from an unknown argument map.
 *
 * Useful for pulling typed query parameters out of loosely-typed MCP tool
 * arguments. Non-string values and missing keys are coerced to `undefined`.
 */
export function pickStringQuery(args: Readonly<Record<string, unknown>>, keys: readonly string[]): StringQuery {
  return Object.fromEntries(keys.map((key) => [key, typeof args[key] === "string" ? args[key] : undefined]));
}
