import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { signIn, signUp, useSession } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (session?.user) {
      void navigate({ to: "/assets" });
    }
  }, [session?.user, navigate]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const result =
      mode === "signin"
        ? await signIn.email({ email, password })
        : await signUp.email({ email, password, name: name || email.split("@")[0]! });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Authentication failed");
      return;
    }

    void navigate({ to: "/assets" });
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-10">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="text-muted-foreground text-sm">
          <Link to="/" className="underline-offset-2 hover:underline">
            Skills
          </Link>
        </p>
      </div>

      <form onSubmit={onSubmit} className="border-border space-y-3 rounded-lg border p-4">
        {mode === "signup" ? (
          <label className="block space-y-1 text-sm">
            <span>Name</span>
            <input
              className="border-input bg-background w-full rounded-md border px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
        ) : null}

        <label className="block space-y-1 text-sm">
          <span>Email</span>
          <input
            type="email"
            required
            className="border-input bg-background w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Password</span>
          <input
            type="password"
            required
            minLength={8}
            className="border-input bg-background w-full rounded-md border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
          />
        </label>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <button
          type="submit"
          disabled={pending}
          className="bg-primary text-primary-foreground w-full rounded-md px-3 py-2 text-sm disabled:opacity-50"
        >
          {pending ? "Working…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button type="button" className="underline" onClick={() => setMode("signup")}>
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button type="button" className="underline" onClick={() => setMode("signin")}>
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}
