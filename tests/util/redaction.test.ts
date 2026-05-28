import { describe, expect, test } from "vitest";
import { redactSecret } from "../../src/util/redaction.js";

describe("redactSecret", () => {
  test("replaces every occurrence of a secret value", () => {
    expect(redactSecret("token abc failed: abc", "abc")).toBe("token [[REDACTED_SECRET]] failed: [[REDACTED_SECRET]]");
  });

  test("leaves content unchanged when the secret is empty", () => {
    expect(redactSecret("nothing to redact", "")).toBe("nothing to redact");
  });
});
