import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { assetsApi } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/assets/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: AssetsPage,
});

function AssetsPage() {
  const queryClient = useQueryClient();
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [error, setError] = useState<string | null>(null);

  const assetsQuery = useQuery({
    queryKey: ["assets"],
    queryFn: () => assetsApi.list(),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => assetsApi.upload(file, visibility),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-muted-foreground text-sm">
            Upload and manage files for agents and humans.
          </p>
        </div>
      </div>

      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Upload</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">
            Visibility{" "}
            <select
              className="border-input bg-background ml-1 rounded-md border px-2 py-1"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "private" | "public")}
            >
              <option value="private">private</option>
              <option value="public">public</option>
            </select>
          </label>
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.currentTarget.value = "";
            }}
          />
          {uploadMutation.isPending ? (
            <span className="text-muted-foreground text-sm">Uploading…</span>
          ) : null}
        </div>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Your assets</h2>
        {assetsQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : assetsQuery.isError ? (
          <p className="text-destructive text-sm">{(assetsQuery.error as Error).message}</p>
        ) : assetsQuery.data?.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No assets yet.</p>
        ) : (
          <ul className="divide-border border-border divide-y rounded-lg border">
            {assetsQuery.data?.items.map((asset) => (
              <li
                key={asset.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    to="/assets/$id"
                    params={{ id: asset.id }}
                    className="font-medium hover:underline"
                  >
                    {asset.filename}
                  </Link>
                  <p className="text-muted-foreground truncate text-xs">
                    {asset.visibility} · {asset.contentType} · {asset.size} bytes
                  </p>
                </div>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  Open
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
