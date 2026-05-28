/**
 * Tests whether a string matches a glob-style pattern.
 *
 * @example
 * matchesPattern("feat/my-branch", "feat/*"); // true
 * matchesPattern("main", "feat/*");           // false
 */
export function matchesPattern(value: string, pattern: string): boolean {
  if (pattern === value) {
    return true;
  }

  const escaped = pattern
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");

  return new RegExp(`^${escaped}$`).test(value);
}
