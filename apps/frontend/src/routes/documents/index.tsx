import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { documentsApi } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/documents/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: DocumentsPage,
});

function DocumentsPage() {
  const queryClient = useQueryClient();
  const [visibility, setVisibility] = useState<"private" | "public">("public");
  const [error, setError] = useState<string | null>(null);

  const documentsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: () => documentsApi.list(),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.upload(file, visibility),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="text-muted-foreground text-sm">
          Hosted HTML for agents and humans. Re-upload a version from the document page.
        </p>
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
              <option value="public">public</option>
              <option value="private">private</option>
            </select>
          </label>
          <input
            type="file"
            accept=".html,.htm,text/html"
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
        <h2 className="text-sm font-medium">Your documents</h2>
        {documentsQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : documentsQuery.isError ? (
          <p className="text-destructive text-sm">{(documentsQuery.error as Error).message}</p>
        ) : documentsQuery.data?.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No documents yet.</p>
        ) : (
          <ul className="divide-border border-border divide-y rounded-lg border">
            {documentsQuery.data?.items.map((document) => (
              <li
                key={document.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    to="/documents/$id"
                    params={{ id: document.id }}
                    className="font-medium hover:underline"
                  >
                    {document.title || document.filename}
                  </Link>
                  <p className="text-muted-foreground truncate text-xs">
                    {document.visibility} · v{document.version} · {document.size} bytes
                    {document.description ? ` · ${document.description}` : ""}
                  </p>
                </div>
                <a
                  href={document.url}
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
