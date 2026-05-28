import { describe, expect, test } from "vitest";
import { matchesPattern } from "../../src/util/matches-pattern.js";

describe("matchesPattern", () => {
  test("matches exact values", () => {
    expect(matchesPattern("main", "main")).toBe(true);
  });

  test("matches single wildcard patterns", () => {
    expect(matchesPattern("release/2026-05", "release/*")).toBe(true);
  });

  test("escapes regular expression characters in patterns", () => {
    expect(matchesPattern("release/v1.2", "release/v1.2")).toBe(true);
    expect(matchesPattern("release/v1x2", "release/v1.2")).toBe(false);
  });
});
