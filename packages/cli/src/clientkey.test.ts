import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

describe("clientKey derivation", () => {
  test("absolute path is stable and normalized", async () => {
    const { resolveClientKey } = await import("./commands/docs");
    const file = path.join(tmpdir(), "some-plan.html");
    const key = resolveClientKey(file);
    expect(path.isAbsolute(key)).toBe(true);
    expect(resolveClientKey(key)).toBe(key);
  });
});
