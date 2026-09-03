import { describe, expect, test } from "bun:test";

import {
  ApiError,
  DEFAULT_REQUEST_TIMEOUT_MS,
  requestJson,
  UPLOAD_REQUEST_TIMEOUT_MS,
} from "./client";

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

  test("composes caller cancellation with the request timeout", async () => {
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const fetcher = async (_input: string | URL | Request, init?: RequestInit) => {
      receivedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), {
          once: true,
        });
      });
    };

    const request = requestJson({
      baseUrl: "https://example.test",
      token: "av_test",
      path: "/api/assets",
      init: { signal: controller.signal },
      fetcher,
    });
    controller.abort();

    expect(request).rejects.toMatchObject({ name: "ApiError", message: "aborted" });
    expect(receivedSignal?.aborted).toBe(true);
  });

  test("keeps uploads on a longer timeout policy", async () => {
    expect(DEFAULT_REQUEST_TIMEOUT_MS).toBe(30_000);
    expect(UPLOAD_REQUEST_TIMEOUT_MS).toBeGreaterThan(DEFAULT_REQUEST_TIMEOUT_MS);

    let receivedSignal: AbortSignal | undefined;
    const fetcher = async (_input: string | URL | Request, init?: RequestInit) => {
      receivedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("timed out")), {
          once: true,
        });
      });
    };

    const request = requestJson({
      baseUrl: "https://example.test",
      token: "av_test",
      path: "/api/assets",
      timeoutMs: 5,
      fetcher,
    });

    expect(request).rejects.toMatchObject({ name: "ApiError", message: "timed out" });
    expect(receivedSignal?.aborted).toBe(true);
  });
});
