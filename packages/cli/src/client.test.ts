import { describe, expect, test } from "bun:test";

import { ApiError, requestJson } from "./client";

describe("API client", () => {
  test("sends a bearer token and parses JSON", async () => {
    let receivedHeaders: Headers | undefined;
    const fetcher = async (_input: string | URL | Request, init?: RequestInit) => {
      receivedHeaders = new Headers(init?.headers);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const payload = await requestJson({
      baseUrl: "https://example.test/",
      token: "av_test",
      path: "/api/assets",
      fetcher,
    });

    expect(payload).toEqual({ ok: true });
    expect(receivedHeaders?.get("authorization")).toBe("Bearer av_test");
  });

  test("converts API errors to a useful error", async () => {
    const fetcher = async () =>
      new Response(JSON.stringify({ error: "Invalid HTML", errors: ["missing title"] }), {
        status: 400,
        headers: {
          "content-type": "application/json",
          "x-request-id": "request-1",
        },
      });

    try {
      await requestJson({
        baseUrl: "https://example.test",
        token: "av_test",
        path: "/api/documents",
        fetcher,
      });
      throw new Error("Expected requestJson to throw");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        message: "Invalid HTML: missing title",
        status: 400,
        requestId: "request-1",
      });
    }
  });
});
