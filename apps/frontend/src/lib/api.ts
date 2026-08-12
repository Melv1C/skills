import { ENV } from "varlock/env";

export type Asset = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  sha256: string;
  visibility: "private" | "public";
  url: string;
  markdown: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
};

export type Token = {
  id: string;
  name: string | null;
  start: string | null;
  prefix: string | null;
  enabled: boolean | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatedToken = Token & { key: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${ENV.BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const assetsApi = {
  list: () => api<{ items: Asset[]; nextCursor: string | null }>("/api/assets"),
  get: (id: string) => api<Asset>(`/api/assets/${id}`),
  upload: async (file: File, visibility: "private" | "public") => {
    const form = new FormData();
    form.append("file", file);
    form.append("visibility", visibility);
    return api<Asset>("/api/assets", { method: "POST", body: form });
  },
  update: (id: string, body: { filename?: string; visibility?: "private" | "public" }) =>
    api<Asset>(`/api/assets/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => api<{ success: true }>(`/api/assets/${id}`, { method: "DELETE" }),
};

export const tokensApi = {
  list: () => api<{ items: Token[]; total: number }>("/api/tokens"),
  create: (name: string) =>
    api<CreatedToken>("/api/tokens", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  remove: (id: string) => api<{ success: boolean }>(`/api/tokens/${id}`, { method: "DELETE" }),
};
