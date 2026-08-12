import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/settings/")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data?.user) {
      throw redirect({ to: "/login" });
    }
    throw redirect({ to: "/settings/tokens" });
  },
  component: SettingsIndexPage,
});

function SettingsIndexPage() {
  return (
    <p className="text-sm text-muted-foreground">
      <Link to="/settings/tokens">Go to tokens</Link>
    </p>
  );
}
