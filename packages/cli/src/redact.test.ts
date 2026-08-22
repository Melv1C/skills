import { describe, expect, test } from "bun:test";

import { redact } from "./redact";

describe("redact", () => {
  test("redacts full keys", () => {
    expect(redact("token av_abcdefghijklmnop used")).toBe("token av_*** used");
  });

  test("redacts keys inside multiline stacks", () => {
    const stack = "Error: request failed\n    at fetchKey (file.ts:1:1)\n  key=av_ABCDEFGHIJKL123";
    expect(redact(stack)).not.toMatch(/av_[A-Za-z0-9_-]{8,}/);
  });

  test("leaves short prefixes alone", () => {
    expect(redact("av_short")).toBe("av_short");
  });

  test("invariant: no key survives any string", () => {
    const samples = [
      "av_" + "x".repeat(64),
      JSON.stringify({ token: "av_0123456789abcdef" }),
      "Bearer av_A-B_c-D-E-F-G-H",
      "av_",
      "",
    ];
    for (const sample of samples) {
      expect(redact(sample)).not.toMatch(/av_[A-Za-z0-9_-]{8,}/);
    }
  });
});
