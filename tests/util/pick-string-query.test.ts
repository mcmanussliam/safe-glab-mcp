import { describe, expect, test } from "vitest";
import { pickStringQuery } from "../../src/util/pick-string-query.js";

describe("pickStringQuery", () => {
  test("keeps only string values from the requested keys", () => {
    expect(
      pickStringQuery(
        {
          search: "main",
          page: 2,
          empty: undefined,
        },
        ["search", "page", "empty", "missing"],
      ),
    ).toEqual({
      search: "main",
      page: undefined,
      empty: undefined,
      missing: undefined,
    });
  });
});
