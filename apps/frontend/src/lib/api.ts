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

export type Document = {
  id: string;
  description: string | null;
  title: string | null;
  filename: string;
  visibility: "private" | "public";
  clientKey: string | null;
  size: number;
  sha256: string;
  version: number;
  versionCount: number;
  hasInlineScript: boolean;
  url: string;
  versionUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentVersion = {
  version: number;
  size: number;
  sha256: string;
  hasInlineScript: boolean;
  createdAt: string;
  url: string;
};

export type DocumentDetail = Document & {
  versions: DocumentVersion[];
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${ENV.BACKEND_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
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

export const documentsApi = {
  list: () => api<{ items: Document[]; nextCursor: string | null }>("/api/documents"),
  get: (id: string) => api<DocumentDetail>(`/api/documents/${id}`),
  upload: async (file: File, visibility: "private" | "public", description?: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("visibility", visibility);
    if (description) form.append("description", description);
    return api<Document>("/api/documents", { method: "POST", body: form });
  },
  uploadVersion: async (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api<Document>(`/api/documents/${id}`, { method: "PUT", body: form });
  },
  update: (
    id: string,
    body: { filename?: string; visibility?: "private" | "public"; description?: string },
  ) => api<Document>(`/api/documents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  remove: (id: string) => api<{ success: true }>(`/api/documents/${id}`, { method: "DELETE" }),
};
