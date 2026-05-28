/**
 * Encodes a GitLab project path for use in API URL segments.
 *
 * @param projectPath - The raw project path, e.g. `"my-group/my-project"`.
 * @returns The encoded path, e.g. `"my-group%2Fmy-project"`.
 */
export function encodeGitLabProjectPath(projectPath: string): string {
  return encodeURIComponent(projectPath);
}
