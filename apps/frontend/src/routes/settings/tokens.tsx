import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { tokensApi } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/settings/tokens")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: TokensPage,
});

function TokensPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("agent");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokensQuery = useQuery({
    queryKey: ["tokens"],
    queryFn: () => tokensApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => tokensApi.create(name.trim() || "agent"),
    onSuccess: async (token) => {
      setCreatedKey(token.key);
      setError(null);
      setName("agent");
      await queryClient.invalidateQueries({ queryKey: ["tokens"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => tokensApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["tokens"] });
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API tokens</h1>
        <p className="text-sm text-muted-foreground">
          Create keys for agents. Use{" "}
          <code className="rounded bg-muted px-1">Authorization: Bearer av_…</code> or{" "}
          <code className="rounded bg-muted px-1">x-api-key</code>.
        </p>
      </div>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-sm font-medium">Create token</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-56 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Token name"
          />
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create
          </button>
        </div>
        {createdKey ? (
          <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
            <p className="text-sm font-medium">Copy this key now. It will not be shown again.</p>
            <pre className="overflow-x-auto text-xs">{createdKey}</pre>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted"
              onClick={() => void navigator.clipboard.writeText(createdKey)}
            >
              Copy key
            </button>
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Existing tokens</h2>
        {tokensQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : tokensQuery.data?.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tokens yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {tokensQuery.data?.items.map((token) => (
              <li key={token.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium">{token.name ?? "unnamed"}</p>
                  <p className="text-xs text-muted-foreground">
                    {token.prefix}
                    {token.start}… · created {new Date(token.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                  disabled={revokeMutation.isPending}
                  onClick={() => {
                    if (confirm("Revoke this token?")) revokeMutation.mutate(token.id);
                  }}
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
