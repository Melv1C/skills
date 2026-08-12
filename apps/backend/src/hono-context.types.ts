import { User } from "./schemas";

declare module "hono" {
  interface ContextVariableMap {
    user: User | null;
  }
}
