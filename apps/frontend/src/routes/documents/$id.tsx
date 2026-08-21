import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { documentsApi } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/documents/$id")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: DocumentDetailPage,
});

function DocumentDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const documentQuery = useQuery({
    queryKey: ["documents", id],
    queryFn: () => documentsApi.get(id),
  });

  useEffect(() => {
    setHtml(documentQuery.data?.html ?? null);
  }, [documentQuery.data?.html, documentQuery.data?.versionUrl]);

  const updateMutation = useMutation({
    mutationFn: (body: { description?: string; visibility?: "private" | "public" }) =>
      documentsApi.update(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const versionMutation = useMutation({
    mutationFn: (file: File) => documentsApi.uploadVersion(id, file),
    onSuccess: async () => {
      setHtml(null);
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => documentsApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      void navigate({ to: "/documents" });
    },
  });

  if (documentQuery.isLoading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (documentQuery.isError || !documentQuery.data) {
    return (
      <div className="space-y-3">
        <p className="text-destructive text-sm">
          {(documentQuery.error as Error | undefined)?.message ?? "Document not found"}
        </p>
        <Link to="/documents" className="text-sm underline">
          Back to documents
        </Link>
      </div>
    );
  }

  const document = documentQuery.data;
  const currentDescription = description ?? document.description ?? "";
  const currentHtml = html ?? document.html;

  async function copyUrl() {
    await navigator.clipboard.writeText(document.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/documents" className="text-muted-foreground hover:text-foreground text-sm">
          ← Documents
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {document.title || document.filename}
        </h1>
        <p className="text-muted-foreground text-sm">{document.id}</p>
      </div>

      <dl className="border-border grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Visibility</dt>
          <dd>{document.visibility}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Latest version</dt>
          <dd>
            v{document.version} of {document.versionCount}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Size</dt>
          <dd>{document.size} bytes</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">SHA-256</dt>
          <dd className="truncate font-mono text-xs">{document.sha256}</dd>
        </div>
      </dl>

      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Share</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm"
            onClick={() => void copyUrl()}
          >
            {copied ? "Copied URL" : "Copy URL"}
          </button>
          <a
            href={document.url}
            target="_blank"
            rel="noreferrer"
            className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm"
          >
            Open
          </a>
        </div>
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">{document.url}</pre>
      </section>

      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Versions</h2>
        <ul className="divide-border divide-y text-sm">
          {document.versions.map((version) => (
            <li
              key={version.version}
              className="flex flex-wrap items-center justify-between gap-2 py-2"
            >
              <span>
                v{version.version} · {version.size} bytes
                {version.hasInlineScript ? " · script" : ""}
              </span>
              <a
                href={version.url}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                Open
              </a>
            </li>
          ))}
        </ul>
        <label className="block space-y-1 text-sm">
          <span>Upload new version</span>
          <input
            type="file"
            accept=".html,.htm,text/html"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) versionMutation.mutate(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
        {versionMutation.isError ? (
          <p className="text-destructive text-sm">{(versionMutation.error as Error).message}</p>
        ) : null}
      </section>

      <section className="border-border space-y-3 rounded-lg border p-4">
        <div>
          <h2 className="text-sm font-medium">Edit HTML</h2>
          <p className="text-muted-foreground text-sm">
            Save your changes as a new document version.
          </p>
        </div>
        <textarea
          aria-label="HTML source"
          className="border-input bg-background min-h-96 w-full resize-y rounded-md border px-3 py-2 font-mono text-xs"
          rows={20}
          value={currentHtml}
          onChange={(e) => setHtml(e.target.value)}
          spellCheck={false}
        />
        <button
          type="button"
          className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
          disabled={versionMutation.isPending || currentHtml === document.html}
          onClick={() => {
            const file = new File([currentHtml], document.filename, { type: "text/html" });
            versionMutation.mutate(file);
          }}
        >
          {versionMutation.isPending ? "Saving…" : "Save as new version"}
        </button>
      </section>

      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Edit</h2>
        <label className="block space-y-1 text-sm">
          <span>Description</span>
          <input
            className="border-input bg-background w-full rounded-md border px-3 py-2"
            value={currentDescription}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={
              updateMutation.isPending || currentDescription === (document.description ?? "")
            }
            onClick={() => updateMutation.mutate({ description: currentDescription })}
          >
            Save description
          </button>
          <button
            type="button"
            className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm"
            disabled={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({
                visibility: document.visibility === "public" ? "private" : "public",
              })
            }
          >
            Make {document.visibility === "public" ? "private" : "public"}
          </button>
          <button
            type="button"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-md border px-3 py-1.5 text-sm"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("Delete this document and all versions?")) deleteMutation.mutate();
            }}
          >
            Delete
          </button>
        </div>
        {updateMutation.isError ? (
          <p className="text-destructive text-sm">{(updateMutation.error as Error).message}</p>
        ) : null}
      </section>
    </div>
  );
}
