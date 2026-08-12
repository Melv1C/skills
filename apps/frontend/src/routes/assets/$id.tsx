import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { assetsApi } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/assets/$id")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AssetDetailPage,
});

function AssetDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filename, setFilename] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "markdown" | null>(null);

  const assetQuery = useQuery({
    queryKey: ["assets", id],
    queryFn: () => assetsApi.get(id),
  });

  const updateMutation = useMutation({
    mutationFn: (body: { filename?: string; visibility?: "private" | "public" }) =>
      assetsApi.update(id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => assetsApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
      void navigate({ to: "/assets" });
    },
  });

  if (assetQuery.isLoading) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  if (assetQuery.isError || !assetQuery.data) {
    return (
      <div className="space-y-3">
        <p className="text-destructive text-sm">
          {(assetQuery.error as Error | undefined)?.message ?? "Asset not found"}
        </p>
        <Link to="/assets" className="text-sm underline">
          Back to assets
        </Link>
      </div>
    );
  }

  const asset = assetQuery.data;
  const currentFilename = filename ?? asset.filename;

  async function copy(kind: "url" | "markdown") {
    const value = kind === "url" ? asset.url : asset.markdown;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/assets" className="text-muted-foreground hover:text-foreground text-sm">
          ← Assets
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{asset.filename}</h1>
        <p className="text-muted-foreground text-sm">{asset.id}</p>
      </div>

      {asset.contentType.startsWith("image/") ? (
        <img
          src={asset.url}
          alt={asset.filename}
          className="border-border max-h-96 max-w-full rounded-md border object-contain"
        />
      ) : null}

      <dl className="border-border grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Visibility</dt>
          <dd>{asset.visibility}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Content type</dt>
          <dd>{asset.contentType}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Size</dt>
          <dd>{asset.size} bytes</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">SHA-256</dt>
          <dd className="truncate font-mono text-xs">{asset.sha256}</dd>
        </div>
      </dl>

      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Share</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm"
            onClick={() => void copy("url")}
          >
            {copied === "url" ? "Copied URL" : "Copy URL"}
          </button>
          <button
            type="button"
            className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm"
            onClick={() => void copy("markdown")}
          >
            {copied === "markdown" ? "Copied markdown" : "Copy markdown"}
          </button>
          <a
            href={asset.url}
            target="_blank"
            rel="noreferrer"
            className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm"
          >
            Open public URL
          </a>
        </div>
        <pre className="bg-muted overflow-x-auto rounded-md p-3 text-xs">{asset.markdown}</pre>
      </section>

      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Edit</h2>
        <label className="block space-y-1 text-sm">
          <span>Filename</span>
          <input
            className="border-input bg-background w-full rounded-md border px-3 py-2"
            value={currentFilename}
            onChange={(e) => setFilename(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
            disabled={updateMutation.isPending || currentFilename === asset.filename}
            onClick={() => updateMutation.mutate({ filename: currentFilename })}
          >
            Save filename
          </button>
          <button
            type="button"
            className="border-border hover:bg-muted rounded-md border px-3 py-1.5 text-sm"
            disabled={updateMutation.isPending}
            onClick={() =>
              updateMutation.mutate({
                visibility: asset.visibility === "public" ? "private" : "public",
              })
            }
          >
            Make {asset.visibility === "public" ? "private" : "public"}
          </button>
          <button
            type="button"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-md border px-3 py-1.5 text-sm"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (confirm("Delete this asset?")) deleteMutation.mutate();
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
