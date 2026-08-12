import { UserSchema } from "@generated/zod/schemas/models/User.schema";
import * as z from "zod";

export const userRole$ = z.enum(["admin", "user"]);
export type UserRole = z.infer<typeof userRole$>;

export const user$ = UserSchema.extend({
  role: userRole$.default("user"),
});
export type User = z.infer<typeof user$>;
