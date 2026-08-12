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
        <p className="text-muted-foreground text-sm">
          Create keys for agents. Use{" "}
          <code className="bg-muted rounded px-1">Authorization: Bearer av_…</code> or{" "}
          <code className="bg-muted rounded px-1">x-api-key</code>.
        </p>
      </div>

      <section className="border-border space-y-3 rounded-lg border p-4">
        <h2 className="text-sm font-medium">Create token</h2>
        <div className="flex flex-wrap gap-2">
          <input
            className="border-input bg-background min-w-56 flex-1 rounded-md border px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Token name"
          />
          <button
            type="button"
            className="bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm disabled:opacity-50"
            disabled={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            Create
          </button>
        </div>
        {createdKey ? (
          <div className="border-border bg-muted/40 space-y-2 rounded-md border p-3">
            <p className="text-sm font-medium">Copy this key now. It will not be shown again.</p>
            <pre className="overflow-x-auto text-xs">{createdKey}</pre>
            <button
              type="button"
              className="border-border hover:bg-muted rounded-md border px-2 py-1 text-sm"
              onClick={() => void navigator.clipboard.writeText(createdKey)}
            >
              Copy key
            </button>
          </div>
        ) : null}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Existing tokens</h2>
        {tokensQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : tokensQuery.data?.items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tokens yet.</p>
        ) : (
          <ul className="divide-border border-border divide-y rounded-lg border">
            {tokensQuery.data?.items.map((token) => (
              <li
                key={token.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="font-medium">{token.name ?? "unnamed"}</p>
                  <p className="text-muted-foreground text-xs">
                    {token.prefix}
                    {token.start}… · created {new Date(token.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-md border px-3 py-1.5 text-sm"
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
