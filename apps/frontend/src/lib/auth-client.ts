import { adminClient, genericOAuthClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ENV } from "varlock/env";

export const authClient = createAuthClient({
  baseURL: ENV.BACKEND_URL,
  plugins: [adminClient(), genericOAuthClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
