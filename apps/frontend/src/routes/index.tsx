import { createFileRoute, Link } from "@tanstack/react-router";

import { useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: session, isPending } = useSession();

  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Asset Vault</h1>
      <p className="text-muted-foreground">
        Upload assets and HTML documents for humans and agents.
      </p>
      <div className="flex justify-center gap-3 pt-2">
        {isPending ? null : session?.user ? (
          <>
            <Link
              to="/assets"
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-2 text-sm"
            >
              Open assets
            </Link>
            <Link
              to="/documents"
              className="border-border hover:bg-muted rounded-md border px-3 py-2 text-sm"
            >
              Open documents
            </Link>
          </>
        ) : (
          <Link
            to="/login"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-3 py-2 text-sm"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
