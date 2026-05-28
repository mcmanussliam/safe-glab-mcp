import { describe, expect, test } from "vitest";
import { encodeGitLabProjectPath } from "../../src/util/encode-gitlab-project-path.js";

describe("encodeGitLabProjectPath", () => {
  test("encodes namespace project paths for GitLab project URL segments", () => {
    expect(encodeGitLabProjectPath("platform/api")).toBe("platform%2Fapi");
  });
});
