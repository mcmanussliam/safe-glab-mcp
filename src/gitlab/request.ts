import { redactSecret } from "../util/redaction.js";
import type { GitLabJsonObject, GitLabQuery } from "./types.js";

type Fetch = typeof fetch;
type HttpMethod = "DELETE" | "GET" | "POST" | "PUT";

/**
 * An authenticated GitLab API request function.
 *
 * Accepts an HTTP method, a path relative to `/api/v4`, optional query
 * parameters, and an optional JSON body. The type parameter `T` narrows the
 * returned value — callers are responsible for using the correct type for the
 * endpoint they call.
 *
 * @throws {GitLabNotFoundError} when the API returns 404.
 * @throws {Error} for any other non-OK response, with the token redacted from
 *   the error message.
 */
export type GitLabRequest = <T = unknown>(
  method: HttpMethod,
  path: string,
  query?: GitLabQuery,
  body?: GitLabJsonObject,
) => Promise<T>;

/** Raised when the GitLab API returns a 404 response. */
export class GitLabNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitLabNotFoundError";
  }
}

/**
 * Creates an authenticated GitLab API request function bound to a base URL
 * and token.
 *
 * @param baseUrl - The GitLab instance base URL (e.g. `https://gitlab.com`). Trailing slashes are stripped automatically.
 * @param token - A GitLab personal access token, group token, or project token.
 * @param fetchImpl - Optional fetch implementation; defaults to the global `fetch`. Inject a mock here in tests.
 *
 * @example
 * const request = createGitLabRequest("https://gitlab.com", token);
 * const issues = await request<GitLabIssue[]>("GET", "/projects/foo%2Fbar/issues");
 */
export function createGitLabRequest(baseUrl: string, token: string, fetchImpl: Fetch = fetch): GitLabRequest {
  const base = baseUrl.replace(/\/+$/, "");

  return async function request<T = unknown>(
    method: HttpMethod,
    path: string,
    query?: GitLabQuery,
    body?: GitLabJsonObject,
  ): Promise<T> {
    const url = new URL(`${base}/api/v4${path}`);

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }

    const headers: Record<string, string> = { "PRIVATE-TOKEN": token };
    if (body !== undefined) {
      headers["content-type"] = "application/json";
    }

    const response = await fetchImpl(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 404) {
      throw new GitLabNotFoundError(`GitLab resource not found: ${method} ${path}`);
    }

    if (!response.ok) {
      const text = redactSecret(await response.text(), token);
      throw new Error(`GitLab request failed with ${response.status}: ${text}`);
    }

    if (response.status === 204) {
      return null as T;
    }

    return response.json() as Promise<T>;
  };
}
