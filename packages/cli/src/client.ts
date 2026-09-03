export type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
export const UPLOAD_REQUEST_TIMEOUT_MS = 5 * 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function errorMessage(payload: unknown, status: number): string {
  if (isRecord(payload) && typeof payload.error === "string") {
    const details = Array.isArray(payload.errors)
      ? payload.errors.filter((item): item is string => typeof item === "string")
      : [];
    return details.length > 0 ? `${payload.error}: ${details.join(", ")}` : payload.error;
  }
  return `Request failed (HTTP ${status})`;
}

async function responsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return response.text();
}

export async function requestJson(input: {
  baseUrl: string;
  token: string;
  path: string;
  init?: RequestInit;
  timeoutMs?: number;
  fetcher?: Fetcher;
}): Promise<unknown> {
  const baseUrl = input.baseUrl.replace(/\/+$/, "");
  const headers = new Headers(input.init?.headers);
  headers.set("Authorization", `Bearer ${input.token}`);
  if (typeof input.init?.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const fetcher = input.fetcher ?? fetch;
  const timeoutSignal = AbortSignal.timeout(input.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS);
  const signal = input.init?.signal
    ? AbortSignal.any([input.init.signal, timeoutSignal])
    : timeoutSignal;
  const response = await fetcher(`${baseUrl}${input.path}`, {
    ...input.init,
    headers,
    signal,
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new ApiError(message);
  });

  const payload = await responsePayload(response);
  if (!response.ok) {
    throw new ApiError(
      errorMessage(payload, response.status),
      response.status,
      response.headers.get("x-request-id") ?? undefined,
    );
  }
  return payload;
}
