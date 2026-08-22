import { describe, expect, test } from "bun:test";

import { HTML_MIME, isHtmlPath, mimeFor } from "./mime";

describe("mime", () => {
  test("known extensions map to types", () => {
    expect(mimeFor("shot.png")).toBe("image/png");
    expect(mimeFor("clip.MP4")).toBe("video/mp4");
    expect(mimeFor("doc.pdf")).toBe("application/pdf");
  });

  test("unknown extensions are refused", () => {
    expect(mimeFor("notes.txt")).toBeNull();
    expect(mimeFor("noext")).toBeNull();
  });

  test("html detection", () => {
    expect(isHtmlPath("plan.html")).toBe(true);
    expect(isHtmlPath("plan.htm")).toBe(true);
    expect(isHtmlPath("plan.HTML")).toBe(true);
    expect(isHtmlPath("plan.txt")).toBe(false);
    expect(HTML_MIME).toBe("text/html");
  });
});
