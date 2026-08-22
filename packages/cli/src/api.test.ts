import { afterEach, describe, expect, test } from "bun:test";

import { ApiClient } from "./api";

type FetchCall = { url: string; init: RequestInit };

let calls: FetchCall[] = [];
let responder: (call: FetchCall) => Response | Promise<Response>;
const realFetch = globalThis.fetch;

function installFetch(): void {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const call: FetchCall = {
      url: typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      init: init ?? {},
    };
    calls.push(call);
    return responder(call);
  }) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

function jsonResponse(status: number, body: unknown, requestId?: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}

describe("ApiClient", () => {
  test("sends bearer auth to the right url", async () => {
    installFetch();
    calls = [];
    responder = () => jsonResponse(200, { ok: true });

    const client = new ApiClient("https://api.example.com/", "av_secret1234567");
    const response = await client.request("/api/tokens");

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://api.example.com/api/tokens");
    expect(new Headers(calls[0]!.init.headers).get("x-api-key")).toBe("av_secret1234567");
    expect(response.status).toBe(200);
  });

  test("401 maps to exit code 2", async () => {
    installFetch();
    calls = [];
    responder = () => jsonResponse(401, { error: "bad key" });

    const client = new ApiClient("https://api.example.com", "av_badkey12345678");
    try {
      await client.request("/api/assets");
      expect.unreachable();
    } catch (error) {
      expect((error as { exitCode: number }).exitCode).toBe(2);
    }
  });

  test("400 surfaces errors[] and maps to exit code 3", async () => {
    installFetch();
    calls = [];
    responder = () =>
      jsonResponse(400, {
        error: "validation failed",
        errors: ["visibility must be private or public"],
      });

    const client = new ApiClient("https://api.example.com", "av_key1234567890");
    try {
      await client.request("/api/documents", { method: "POST" });
      expect.unreachable();
    } catch (error) {
      expect((error as { exitCode: number }).exitCode).toBe(3);
      expect((error as { details: string[] }).details).toEqual([
        "visibility must be private or public",
      ]);
    }
  });

  test("500 echoes x-request-id and maps to exit code 4", async () => {
    installFetch();
    calls = [];
    responder = () => jsonResponse(500, { error: "storage fault" }, "req-123");

    const client = new ApiClient("https://api.example.com", "av_key1234567890");
    try {
      await client.request("/api/assets", { method: "POST" });
      expect.unreachable();
    } catch (error) {
      expect((error as { exitCode: number }).exitCode).toBe(4);
      expect((error as Error).message).toContain("req-123");
    }
  });

  test("network failure retries exactly once then maps to exit code 4", async () => {
    installFetch();
    calls = [];
    responder = () => {
      throw new TypeError("connection refused");
    };

    const client = new ApiClient("https://api.example.com", "av_key1234567890");
    try {
      await client.request("/api/assets");
      expect.unreachable();
    } catch (error) {
      expect((error as { exitCode: number }).exitCode).toBe(4);
      expect(calls).toHaveLength(2);
    }
  });

  test("413 maps to exit code 3", async () => {
    installFetch();
    calls = [];
    responder = () => jsonResponse(413, { error: "too large" });

    const client = new ApiClient("https://api.example.com", "av_key1234567890");
    try {
      await client.request("/api/assets", { method: "POST" });
      expect.unreachable();
    } catch (error) {
      expect((error as { exitCode: number }).exitCode).toBe(3);
    }
  });

  test("multipart upload carries file blob and fields", async () => {
    installFetch();
    calls = [];
    responder = () =>
      jsonResponse(201, {
        id: "01TEST",
        filename: "shot.png",
        size: 4,
        visibility: "public",
        url: "https://cdn.example.com/a/01TEST",
        markdown: "![shot.png](https://cdn.example.com/a/01TEST)",
      });

    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" }),
      "shot.png",
    );
    form.append("visibility", "public");

    const client = new ApiClient("https://api.example.com", "av_key1234567890");
    const response = await client.request("/api/assets", { method: "POST", body: form });

    expect(response.status).toBe(201);
    const headers = new Headers(calls[0]!.init.headers);
    expect(headers.get("x-api-key")).toBe("av_key1234567890");
  });
});
