import { Outlet, createRootRoute, Link, useRouterState } from "@tanstack/react-router";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import { signOut, useSession } from "@/lib/auth-client";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const { data: session, isPending } = useSession();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const showNav = pathname !== "/login";

  return (
    <div className="min-h-svh bg-background text-foreground">
      {showNav ? (
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm font-semibold tracking-tight">
                Asset Vault
              </Link>
              {session?.user ? (
                <nav className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Link
                    to="/assets"
                    className="hover:text-foreground data-[status=active]:text-foreground"
                  >
                    Assets
                  </Link>
                  <Link
                    to="/settings/tokens"
                    className="hover:text-foreground data-[status=active]:text-foreground"
                  >
                    Tokens
                  </Link>
                </nav>
              ) : null}
            </div>
            <div className="flex items-center gap-3 text-sm">
              {isPending ? (
                <span className="text-muted-foreground">…</span>
              ) : session?.user ? (
                <>
                  <span className="text-muted-foreground">{session.user.email}</span>
                  <button
                    type="button"
                    className="rounded-md border border-border px-2 py-1 hover:bg-muted"
                    onClick={() => signOut()}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link to="/login" className="rounded-md border border-border px-2 py-1 hover:bg-muted">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </header>
      ) : null}

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>

      <TanStackDevtools
        plugins={[
          {
            name: "TanStack Query",
            render: <ReactQueryDevtoolsPanel />,
          },
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </div>
  );
}
