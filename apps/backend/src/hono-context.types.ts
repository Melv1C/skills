import { User } from "./schemas";

declare module "hono" {
  interface ContextVariableMap {
    user: User | null;
    session: {
      id: string;
      userId: string;
      token: string;
      expiresAt: Date;
      createdAt: Date;
      updatedAt: Date;
      ipAddress?: string | null;
      userAgent?: string | null;
    } | null;
  }
}
