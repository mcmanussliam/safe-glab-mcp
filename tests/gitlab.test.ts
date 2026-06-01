import { describe, expect, test, vi } from "vitest";
import { createGitLabRequest, GitLabNotFoundError } from "../src/gitlab/request.js";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("createGitLabRequest", () => {
  test("constructs encoded GitLab URLs and sends the private token header", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse([{ name: "main" }]));
    const request = createGitLabRequest("https://gitlab.example.com", "secret-token", fetch);

    await request("GET", "/projects/platform%2Fapi/repository/branches", { search: "feature branch" });

    expect(fetch).toHaveBeenCalledWith(
      "https://gitlab.example.com/api/v4/projects/platform%2Fapi/repository/branches?search=feature+branch",
      {
        method: "GET",
        headers: { "PRIVATE-TOKEN": "secret-token" },
      },
    );
  });

  test("throws not found for 404 responses", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ message: "404 Project Not Found" }, { status: 404 }));
    const request = createGitLabRequest("https://gitlab.example.com", "secret-token", fetch);

    await expect(request("GET", "/projects/platform%2Fmissing")).rejects.toBeInstanceOf(GitLabNotFoundError);
  });

  test("does not leak token values in GitLab error messages", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ message: "token secret-token rejected" }, { status: 401 }));
    const request = createGitLabRequest("https://gitlab.example.com", "secret-token", fetch);

    await expect(request("GET", "/projects/platform%2Fapi")).rejects.toThrow("[[REDACTED_SECRET]]");
    await expect(request("GET", "/projects/platform%2Fapi")).rejects.not.toThrow("secret-token");
  });

  test("returns null for 204 no-content responses", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const request = createGitLabRequest("https://gitlab.example.com", "secret-token", fetch);

    const result = await request("DELETE", "/projects/platform%2Fapi/issues/1");

    expect(result).toBeNull();
  });
});
