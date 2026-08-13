import { describe, expect, test } from "bun:test";

import { validateHtml } from "./html-policy";

const doc = (body: string, extraHead = "") =>
  `<!doctype html><html><head><title>Hello</title>${extraHead}</head><body>${body}</body></html>`;

describe("validateHtml", () => {
  test("accepts a simple document", () => {
    const result = validateHtml(doc("<p>ok</p>"));
    expect(result.ok).toBe(true);
    expect(result.title).toBe("Hello");
    expect(result.hasInlineScript).toBe(false);
  });

  test("rejects empty HTML", () => {
    const result = validateHtml("   ");
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("empty");
  });

  test("rejects oversized documents", () => {
    const result = validateHtml(doc("x".repeat(100)), { maxBytes: 20 });
    expect(result.ok).toBe(false);
    expect(result.errors.some((error) => error.includes("maximum"))).toBe(true);
  });

  test("rejects blocked tags", () => {
    for (const tag of ["form", "iframe", "object", "embed", "applet", "base", "link"]) {
      const result = validateHtml(doc(`<${tag}></${tag}>`));
      expect(result.ok).toBe(false);
      expect(result.errors.some((error) => error.includes(`<${tag}>`))).toBe(true);
    }

    const frames = validateHtml(
      `<!doctype html><html><head><title>Hello</title></head><frameset><frame src="x"></frameset></html>`,
    );
    expect(frames.ok).toBe(false);
    expect(frames.errors.some((error) => error.includes("<frameset>"))).toBe(true);
    expect(frames.errors.some((error) => error.includes("<frame>"))).toBe(true);
  });

  test("rejects external and module scripts", () => {
    expect(validateHtml(doc('<script src="/x.js"></script>')).ok).toBe(false);
    expect(validateHtml(doc('<script type="module"></script>')).ok).toBe(false);
  });

  test("allows inline classic script", () => {
    const result = validateHtml(doc("<script>void 0</script>"));
    expect(result.ok).toBe(true);
    expect(result.hasInlineScript).toBe(true);
  });

  test("rejects inline handlers, javascript URLs, srcdoc, and meta refresh", () => {
    expect(validateHtml(doc('<p onclick="alert(1)">x</p>')).ok).toBe(false);
    expect(validateHtml(doc('<a href="javascript:alert(1)">x</a>')).ok).toBe(false);
    expect(validateHtml(doc('<iframe srcdoc="<p>x</p>"></iframe>')).ok).toBe(false);
    expect(
      validateHtml(doc("", '<meta http-equiv="refresh" content="0;url=https://example.com">')).ok,
    ).toBe(false);
  });

  test("allows https and data images plus inline CSS", () => {
    const result = validateHtml(
      doc(
        `<style>p{color:#fff}</style><p style="color:#fff"><img src="https://api.skills.melvyn.be/a/x" alt=""><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" alt=""></p>`,
      ),
    );
    expect(result.ok).toBe(true);
  });

  test("truncates title to 140 characters", () => {
    const long = "t".repeat(200);
    const result = validateHtml(
      `<!doctype html><html><head><title>${long}</title></head><body><p>x</p></body></html>`,
    );
    expect(result.ok).toBe(true);
    expect(result.title).toBe("t".repeat(140));
  });

  test("warns when title is missing", () => {
    const result = validateHtml("<!doctype html><html><body><p>x</p></body></html>");
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.title).toBeNull();
  });
});
