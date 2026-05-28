import { describe, expect, test, vi } from "vitest";
import { GitLabClient, GitLabNotFoundError } from "../src/gitlab.js";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  });
}

describe("GitLabClient", () => {
  test("constructs encoded GitLab URLs and sends the private token header", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse([{ name: "main" }]));
    const client = new GitLabClient({
      baseUrl: "https://gitlab.example.com",
      token: "secret-token",
      fetch,
    });

    await client.listBranches("platform/api", { search: "feature branch" });

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
    const client = new GitLabClient({
      baseUrl: "https://gitlab.example.com",
      token: "secret-token",
      fetch,
    });

    await expect(client.getProject("platform/missing")).rejects.toBeInstanceOf(GitLabNotFoundError);
  });

  test("does not leak token values in GitLab error messages", async () => {
    const fetch = vi.fn().mockResolvedValue(jsonResponse({ message: "token secret-token rejected" }, { status: 401 }));
    const client = new GitLabClient({
      baseUrl: "https://gitlab.example.com",
      token: "secret-token",
      fetch,
    });

    await expect(client.getProject("platform/api")).rejects.toThrow("[[REDACTED_SECRET]]");
    await expect(client.getProject("platform/api")).rejects.not.toThrow("secret-token");
  });

  test("reads repository files and exposes decoded content size", async () => {
    const content = Buffer.from("hello").toString("base64");
    const fetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ file_name: "README.md", file_path: "README.md", content, encoding: "base64", size: 5 }),
      );
    const client = new GitLabClient({
      baseUrl: "https://gitlab.example.com",
      token: "secret-token",
      fetch,
    });

    const file = await client.getRepositoryFile("platform/api", "README.md", "main");

    expect(file).toEqual({
      fileName: "README.md",
      filePath: "README.md",
      content: "hello",
      size: 5,
    });
  });
});
