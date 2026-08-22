import { CliError, messageOf } from "./errors";
import type { ExitCodeValue } from "./exit-codes";
import { ExitCode } from "./exit-codes";

export interface ApiBodyError {
  error?: string;
  errors?: unknown;
}

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  requestId?: string;
}

const MAX_NETWORK_ATTEMPTS = 2;

function detailLines(body: ApiBodyError): string[] {
  const details: string[] = [];
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    for (const item of body.errors) {
      details.push(typeof item === "string" ? item : JSON.stringify(item));
    }
  }
  return details;
}

function describeStatus(status: number): string {
  if (status === 401) return "Authentication required (401)";
  if (status === 400) return "Request rejected (400)";
  if (status === 413) return "File exceeds max upload size (413)";
  return `API error (${status})`;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toCliError(status: number, body: unknown, requestId?: string): CliError {
  let exitCode: ExitCodeValue = ExitCode.NETWORK;
  if (status === 401) exitCode = ExitCode.AUTH;
  else if (status === 400 || status === 413) exitCode = ExitCode.API;

  const bodyError = (body ?? {}) as ApiBodyError;
  const serverMessage =
    typeof bodyError.error === "string" && bodyError.error.length > 0
      ? bodyError.error
      : describeStatus(status);
  const details = detailLines(bodyError);

  let message = `${describeStatus(status)}: ${serverMessage}`;
  if (requestId && status >= 500) {
    message += ` [x-request-id: ${requestId}]`;
  }

  return new CliError(message, exitCode, details);
}

export class ApiClient {
  readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private token: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request<T = unknown>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    let lastNetworkError: Error | null = null;

    for (let attempt = 0; attempt < MAX_NETWORK_ATTEMPTS; attempt++) {
      let response: Response;
      try {
        const headers = new Headers(init.headers);
        headers.set("x-api-key", this.token);
        response = await fetch(url, {
          ...init,
          headers,
        });
      } catch (cause) {
        lastNetworkError = new Error(messageOf(cause));
        continue;
      }

      const requestId = response.headers.get("x-request-id") ?? undefined;
      const body = await parseBody(response);

      if (response.ok) {
        return { status: response.status, body: body as T, requestId };
      }

      throw toCliError(response.status, body, requestId);
    }

    throw new CliError(
      `Network error talking to ${url}: ${messageOf(lastNetworkError)}`,
      ExitCode.NETWORK,
    );
  }
}
