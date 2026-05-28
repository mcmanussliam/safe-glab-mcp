/**
 * Extracts a subset of string-valued entries from an unknown argument map.
 *
 * Useful for pulling typed query parameters out of loosely-typed MCP tool
 * arguments. Non-string values and missing keys are coerced to `undefined`.
 */
export function pickStringQuery(args, keys) {
    return Object.fromEntries(keys.map((key) => [key, typeof args[key] === "string" ? args[key] : undefined]));
}
